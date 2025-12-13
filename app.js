/* ==========================================
   Wetter SPA – iOS Modern Animated Version
   ========================================== */

const API_KEY = "83bcc8dbea48e891fc4cb6cd868ad732";
const UNITS = "metric";
const LANG = "de";

/* DOM: Views */
const homeView = document.getElementById("home-view");
const detailView = document.getElementById("detail-view");
const backButton = document.getElementById("back-button");

/* DOM: Detail – Hero */
const heroSectionEl = document.getElementById("hero");
const heroNightVideoEl = document.getElementById("hero-night-video");
const heroTempEl = document.getElementById("hero-temp");
const heroCityEl = document.getElementById("hero-city");
const heroCondEl = document.getElementById("hero-condition");
const heroMetaEl = document.getElementById("hero-meta");

/* DOM: Detail – Sections */
const metricsGridEl = document.getElementById("metrics-grid");
const forecastTrackEl = document.getElementById("forecast-track");
const advancedGridEl = document.getElementById("advanced-grid");
const dailyForecastSectionEl = document.getElementById("daily-forecast-section");
const dailyForecastListEl = document.getElementById("daily-forecast-list");

const rainCaptionEl = document.getElementById("rain-caption");
const rainGaugeEl = document.getElementById("rain-gauge");
const rainGaugePeakEl = document.getElementById("rain-gauge-peak");
const rainMetaNowEl = document.getElementById("rain-meta-now");
const rainMetaHourEl = document.getElementById("rain-meta-hour");
const rainMetaThreeEl = document.getElementById("rain-meta-three");
const rainDetailsEl = document.getElementById("rain-details");

const heatMarkerEl = document.getElementById("heat-marker");
const heatCaptionEl = document.getElementById("heat-caption");
const sunOrbEl = document.getElementById("sun-orb");

/* DOM: Home */
const cityCardsEl = document.getElementById("city-card-list");

/* Suche */
const cityInput = document.getElementById("city-search");
const cityResults = document.getElementById("city-results");
const searchBtn = document.querySelector(".search-icon-btn");

/* Splash */
const splashEl = document.getElementById("splash");

/* STATE */
let recentCities = [];
let forecastDragInitialized = false;
let latestRainList = [];

/* ==========================================
   INIT
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Splash animiert ausblenden
  if (splashEl) {
    setTimeout(() => splashEl.classList.add("splash--hide"), 600);
    setTimeout(() => splashEl.remove(), 1300);
  }
});

initApp();

function initApp() {
  loadRecentFromStorage();
  renderRecentCards();
  setupSearch();
  setupBackButton();
  setupGeolocationCard();
  initHeroParallax();
  initHeroVideoPlayback();
}

/* ==========================================
   VIEW SWITCHING + SANFTE TRANSITION
   ========================================== */

function showDetail() {
  if (!homeView || !detailView) return;
  const body = document.body;

  homeView.style.opacity = "1";
  homeView.style.transform = "scale(1)";
  requestAnimationFrame(() => {
    homeView.style.opacity = "0";
    homeView.style.transform = "scale(0.94)";
  });

  setTimeout(() => {
    homeView.classList.remove("view--active");
    detailView.classList.add("view--active");

    detailView.style.opacity = "0";
    detailView.style.transform = "scale(1.04)";
    requestAnimationFrame(() => {
      detailView.style.opacity = "1";
      detailView.style.transform = "scale(1)";
    });

    window.scrollTo(0, 0);
  }, 250);

  if (body) body.classList.add("view-detail-active");
}

function showHome() {
  if (!homeView || !detailView) return;
  const body = document.body;

  detailView.style.opacity = "1";
  detailView.style.transform = "scale(1)";
  requestAnimationFrame(() => {
    detailView.style.opacity = "0";
    detailView.style.transform = "scale(1.04)";
  });

  setTimeout(() => {
    detailView.classList.remove("view--active");
    homeView.classList.add("view--active");

    homeView.style.opacity = "0";
    homeView.style.transform = "scale(0.94)";
    requestAnimationFrame(() => {
      homeView.style.opacity = "1";
      homeView.style.transform = "scale(1)";
    });

    window.scrollTo(0, 0);
  }, 250);

  if (body) body.classList.remove("view-detail-active");
}

function setupBackButton() {
  if (!backButton) return;
  backButton.addEventListener("click", showHome);
}

/* ==========================================
   HERO PARALLAX
   ========================================== */

function initHeroParallax() {
  if (!heroSectionEl) return;

  heroSectionEl.addEventListener("pointermove", (e) => {
    const rect = heroSectionEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const translateY = -y * 6;
    heroSectionEl.style.transform = `translateY(${translateY}px)`;
  });

  heroSectionEl.addEventListener("pointerleave", () => {
    heroSectionEl.style.transform = "";
  });
}

/* ==========================================
   HERO VIDEO – iOS AUTOPLAY UNLOCK
   ========================================== */

function initHeroVideoPlayback() {
  if (!heroNightVideoEl) return;

  heroNightVideoEl.muted = true;
  heroNightVideoEl.playsInline = true;
  heroNightVideoEl.setAttribute("webkit-playsinline", "true");

  const attemptPlay = () => {
    heroNightVideoEl.play().catch(() => {});
  };

  attemptPlay();

  const handleFirstInteraction = () => {
    attemptPlay();
    ["touchstart", "pointerdown", "click"].forEach((evt) =>
      document.removeEventListener(evt, handleFirstInteraction)
    );
  };

  ["touchstart", "pointerdown", "click"].forEach((evt) =>
    document.addEventListener(evt, handleFirstInteraction, { passive: true })
  );
}

/* ==========================================
   STORAGE FOR RECENT CITIES
   ========================================== */

function loadRecentFromStorage() {
  try {
    recentCities = JSON.parse(localStorage.getItem("recentCities")) || [];
  } catch {
    recentCities = [];
  }
}

function saveRecents() {
  localStorage.setItem("recentCities", JSON.stringify(recentCities));
}

function upsertRecentCity(city) {
  const isLocation = city.id === "location";

  // Wenn Standort: immer an Position 0 setzen
  if (isLocation) {
    // Entferne alte Standortkarte (falls vorhanden)
    recentCities = recentCities.filter((c) => c.id !== "location");

    // Standort VORNE einfügen
    recentCities.unshift(city);

    saveRecents();
    renderRecentCards();
    return;
  }

  // Prüfen ob diese Stadt dieselben Koordinaten wie der Standort hat
  const loc = recentCities.find((c) => c.id === "location");
  if (
    loc &&
    Math.abs(loc.lat - city.lat) < 0.01 &&
    Math.abs(loc.lon - city.lon) < 0.01
  ) {
    // dieselbe Stadt wie Standort → NICHT speichern
    return;
  }

  // Normale Städte entfernen
  recentCities = recentCities.filter((c) => c.id !== city.id);

  // Wenn Standort vorhanden → Stadt hinter Standort einfügen
  if (loc) {
    recentCities.splice(1, 0, city);
  } else {
    recentCities.unshift(city);
  }

  // Begrenzen
  if (recentCities.length > 10) recentCities.length = 10;

  saveRecents();
  renderRecentCards();
}

/* ==========================================
   GEOLOCATION CARD CREATION
   ========================================== */

function setupGeolocationCard() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
      const res = await fetch(url);
      const data = await res.json();

      const city = {
        id: "location", // feste ID für Standort
        name: data.name || "Mein Standort",
        country: data.sys?.country || "",
        lat,
        lon,
        temp: Math.round(data.main.temp),
        isLocation: true
      };

      upsertRecentCity(city);
    } catch (e) {
      console.warn("Fehler bei Geolokalisierung:", e);
    }
  });
}

/* ==========================================
   RENDER RECENT CITY CARDS
   ========================================== */

function renderRecentCards() {
  if (!cityCardsEl) return;
  cityCardsEl.innerHTML = "";

  if (!recentCities.length) {
    const info = document.createElement("div");
    info.textContent = "Noch keine Städte.";
    info.style.fontSize = "0.9rem";
    info.style.color = "#777";
    cityCardsEl.appendChild(info);
    return;
  }

  recentCities.forEach((c, index) => {
    const theme =
      c.temp >= 25 ? "warm" :
      c.temp <= 5  ? "cold" :
      "neutral";

    const card = document.createElement("div");
    card.className = `city-card city-card--${theme} animate-fade-in`;
    card.style.animationDelay = `${index * 80}ms`;

    const label = c.isLocation
      ? "Mein Standort"
      : (index === 0 ? "Zuletzt" : "Gespeichert");

    const subtitle = c.isLocation
      ? `${c.country || "Standort"} · Zum Anzeigen tippen`
      : `${c.country} · Zum Anzeigen tippen`;

    card.innerHTML = `
      <div class="city-card-top">
        <div class="city-card-chip">${label}</div>
        <div class="city-card-temp">${c.temp}°</div>
      </div>

      ${!c.isLocation ? `<div class="city-card-delete">🗑️</div>` : ""}

      <div class="city-card-bottom-title">${c.name}</div>
      <div class="city-card-bottom-sub">${subtitle}</div>
    `;

    // Card öffnen
    card.addEventListener("click", () => openCityDetail(c));

    // Lösch-Icon (nur wenn nicht Standort)
    if (!c.isLocation) {
      const delBtn = card.querySelector(".city-card-delete");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // verhindert, dass die Card geöffnet wird
          deleteCity(c.id);
        });
      }
    }

    cityCardsEl.appendChild(card);
  });
}

function deleteCity(id) {
  // Standort kann nicht gelöscht werden
  if (id === "location") return;
  recentCities = recentCities.filter((c) => c.id !== id);
  saveRecents();
  renderRecentCards();
}

/* ==========================================
   OPEN DETAIL VIEW
   ========================================== */

async function openCityDetail(city) {
  await loadWeatherByCoords(city.lat, city.lon);
}

/* ==========================================
   LOAD WEATHER DATA
   ========================================== */

async function loadWeatherByCoords(lat, lon) {
  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
    const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;

    const [currentRes, forecastRes, oneCallRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl),
      fetch(oneCallUrl)
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    const oneCall = await oneCallRes.json();

    const cityName = current.name;
    const country = current.sys?.country || "";
    const temp = Math.round(current.main.temp);

    if (heroCityEl) heroCityEl.textContent = cityName;

    renderHero(current);
    renderMetrics(current);
    renderForecast(current, forecast);
    renderAdvanced(current);
    renderRainInsights(forecast);
    renderHeatStress(current);
    const dailyForcastSource =
      Array.isArray(oneCall?.daily) && oneCall.daily.length
        ? oneCall.daily
        : buildDailyFromForecastList(forecast?.list || []);
    renderDailyForecast(dailyForcastSource);

    applyWeatherBackground(current);
    setAtmosphereTheme(current);

    upsertRecentCity({
      id: `${cityName}-${country}`,
      name: cityName,
      country,
      lat,
      lon,
      temp
    });

    showDetail();
  } catch (err) {
    console.error(err);
    if (heroCondEl) heroCondEl.textContent = "Fehler beim Laden.";
  }
}

/* ==========================================
   HERO RENDER + TEMPERATURE ANIMATION
   ========================================== */

function renderHero(data) {
  if (!heroTempEl || !heroCondEl || !heroMetaEl) return;

  const temp = Math.round(data.main.temp);
  const feels = Math.round(data.main.feels_like);
  const cond = data.weather[0].description;
  const wind = data.wind.speed;
  const humidity = data.main.humidity;

  heroTempEl.style.opacity = "0";
  setTimeout(() => {
    heroTempEl.textContent = `${temp}°C`;
    heroTempEl.style.transform = "scale(1.1)";
    heroTempEl.style.opacity = "1";
    setTimeout(() => {
      heroTempEl.style.transform = "scale(1)";
    }, 180);
  }, 120);

  const condPretty = cond.charAt(0).toUpperCase() + cond.slice(1);
  heroCondEl.textContent = condPretty;
  heroMetaEl.textContent = `Gefühlt ${feels}° • Wind ${wind} m/s • Luftfeuchte ${humidity}%`;
}

/* ==========================================
   DYNAMIC WEATHER BACKGROUND
   ========================================== */

function applyWeatherBackground(data) {
  if (!heroSectionEl) return;

  const condition = data?.weather?.[0]?.description || "";
  const c = condition.toLowerCase();
  const themes = [
    "hero--clear",
    "hero--clouds",
    "hero--rain",
    "hero--snow",
    "hero--night"
  ];
  heroSectionEl.classList.remove(...themes);

  const sunrise = data.sys?.sunrise;
  const sunset = data.sys?.sunset;
  const now = data.dt;
  const isNight = sunrise && sunset && now ? now < sunrise || now >= sunset : false;

  let theme = "hero--clouds";

  if (isNight) {
    theme = "hero--night";
  } else if (c.includes("clear") || c.includes("sonnig")) {
    theme = "hero--clear";
  } else if (c.includes("rain") || c.includes("regen") || c.includes("drizzle") || c.includes("thunder")) {
    theme = "hero--rain";
  } else if (c.includes("snow") || c.includes("schnee")) {
    theme = "hero--snow";
  }

  heroSectionEl.classList.add(theme);
}

function setAtmosphereTheme(current) {
  if (!current) return;
  const body = document.body;
  if (!body) return;

  const sunrise = current.sys?.sunrise;
  const sunset = current.sys?.sunset;
  const now = current.dt;

  let isDay = true;
  if (sunrise && sunset && now) {
    isDay = now >= sunrise && now < sunset;
  }

  const condition = current.weather?.[0]?.description?.toLowerCase() || "";
  const themes = ["theme-day", "theme-night", "theme-clear"];
  body.classList.remove(...themes);

  let nextTheme = isDay ? "theme-day" : "theme-night";
  const isSunny =
    condition.includes("sonnig") ||
    condition.includes("klar") ||
    condition.includes("clear");

  if (isDay && isSunny) nextTheme = "theme-clear";
  body.classList.add(nextTheme);

  if (sunOrbEl) {
    const feels = current.main?.feels_like ?? 15;
    const bounded = Math.max(-10, Math.min(35, feels));
    const ratio = (bounded + 10) / 45;
    const topOffset = 15 + (1 - ratio) * 20;
    sunOrbEl.style.top = `${topOffset}%`;
  }
}

/* ==========================================
   METRIC CARDS
   ========================================== */

function renderMetrics(data) {
  if (!metricsGridEl) return;
  metricsGridEl.innerHTML = "";

  const feels = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  const pressure = data.main.pressure;
  const visibilityKm = (data.visibility / 1000).toFixed(1);
  const wind = data.wind.speed;

  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  const daylightHours = ((sunset - sunrise) / 3600000).toFixed(1);

  const cards = [
    { title: "Gefühlte Temp.", value: `${feels}°C`, extra: "" },
    { title: "Wind", value: `${wind} m/s`, extra: "" },
    { title: "Luftfeuchte", value: `${humidity}%`, extra: "" },
    { title: "Sichtweite", value: `${visibilityKm} km`, extra: "" },
    { title: "Luftdruck", value: `${pressure} hPa`, extra: "" },
    { title: "Tageslänge", value: `${daylightHours} h`, extra: `${formatTime(sunrise)} – ${formatTime(sunset)}` }
  ];

  cards.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "card animate-fade-in";
    card.style.animationDelay = `${i * 70}ms`;
    card.innerHTML = `
      <div class="card-title">${c.title}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-extra">${c.extra}</div>
    `;
    metricsGridEl.appendChild(card);
  });
}

/* ==========================================
   FORECAST + MOMENTUM SCROLL
   ========================================== */

function renderForecast(currentData, forecast) {
  if (!forecastTrackEl) return;
  forecastTrackEl.innerHTML = "";

  const list = forecast?.list || [];
  const hourly = buildHourlyForecast(currentData, list, 12);
  if (!hourly.length) return;

  hourly.forEach((item, i) => {
    const dt = new Date(item.dt * 1000);
    const temp = Math.round(item.temp);
    const cond = item.weatherMain;
    const label = i === 0 ? "Jetzt" : formatHourLabel(dt);

    const el = document.createElement("div");
    el.className = "forecast-card animate-fade-in";
    el.style.animationDelay = `${i * 80}ms`;
    el.innerHTML = `
      <div class="forecast-time">${label}</div>
      <div class="forecast-icon">${conditionToEmoji(cond)}</div>
      <div class="forecast-temp">${temp}°</div>
    `;
    forecastTrackEl.appendChild(el);
  });

  if (!forecastDragInitialized) {
    initForecastDragWithMomentum();
    forecastDragInitialized = true;
  }
}

/* DRAG SCROLL WITH MOMENTUM (Desktop + Mobile) */
function initForecastDragWithMomentum() {
  if (!forecastTrackEl) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let momentumFrame = null;

  const friction = 0.95;
  const minVelocity = 0.05;

  function stopMomentum() {
    if (momentumFrame !== null) {
      cancelAnimationFrame(momentumFrame);
      momentumFrame = null;
    }
  }

  function momentumLoop() {
    if (!forecastTrackEl) return;
    forecastTrackEl.scrollLeft -= velocity;
    velocity *= friction;

    if (Math.abs(velocity) > minVelocity) {
      momentumFrame = requestAnimationFrame(momentumLoop);
    } else {
      stopMomentum();
    }
  }

  function pointerDown(pageX) {
    isDown = true;
    startX = pageX;
    scrollLeft = forecastTrackEl.scrollLeft;
    lastX = pageX;
    lastTime = performance.now();
    velocity = 0;
    stopMomentum();
  }

  function pointerMove(pageX) {
    if (!isDown) return;
    const x = pageX - startX;
    forecastTrackEl.scrollLeft = scrollLeft - x;

    const now = performance.now();
    const dx = pageX - lastX;
    const dt = now - lastTime || 1;
    velocity = (dx / dt) * 10;
    lastX = pageX;
    lastTime = now;
  }

  function pointerUp() {
    if (!isDown) return;
    isDown = false;
    if (Math.abs(velocity) > minVelocity) {
      momentumLoop();
    }
  }

  // Desktop
  forecastTrackEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pointerDown(e.pageX);
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    pointerMove(e.pageX);
  });

  window.addEventListener("mouseup", () => {
    pointerUp();
  });

  // Mobile
  forecastTrackEl.addEventListener("touchstart", (e) => {
    if (!e.touches || !e.touches.length) return;
    pointerDown(e.touches[0].pageX);
  }, { passive: true });

  forecastTrackEl.addEventListener("touchmove", (e) => {
    if (!e.touches || !e.touches.length) return;
    pointerMove(e.touches[0].pageX);
  }, { passive: true });

  forecastTrackEl.addEventListener("touchend", () => {
    pointerUp();
  });
}

/* ==========================================
   7-DAY DAILY FORECAST
   ========================================== */

function renderDailyForecast(dailyData) {
  if (!dailyForecastListEl || !dailyForecastSectionEl) return;

  dailyForecastListEl.innerHTML = "";
  dailyForecastSectionEl.style.display = "none";

  if (!Array.isArray(dailyData) || !dailyData.length) return;

  const entries = dailyData.slice(0, 8);
  const mins = entries.map(
    (d) => Math.round(d.temp?.min ?? d.temp?.night ?? d.temp ?? 0)
  );
  const maxs = entries.map(
    (d) => Math.round(d.temp?.max ?? d.temp?.day ?? d.temp ?? 0)
  );
  const globalMin = Math.min(...mins);
  const globalMax = Math.max(...maxs);
  const span = Math.max(1, globalMax - globalMin);

  entries.forEach((day, index) => {
    const dt = new Date(day.dt * 1000);
    const label = index === 0 ? "Heute" : formatWeekdayShort(dt);
    const desc = day.weather?.[0]?.description || day.weather?.[0]?.main || "";
    const prettyDesc = desc
      ? desc.charAt(0).toUpperCase() + desc.slice(1)
      : "—";
    const conditionKey = `${day.weather?.[0]?.main || ""} ${desc}`.trim();
    const icon = conditionToEmoji(conditionKey);
    const max = Math.round(
      day.temp?.max ?? day.temp?.day ?? day.temp ?? 0
    );
    const min = Math.round(
      day.temp?.min ?? day.temp?.night ?? day.temp ?? 0
    );
    const pop =
      typeof day.pop === "number" && day.pop > 0
        ? `${Math.round(day.pop * 100)}%`
        : "";

    const left = Math.min(100, Math.max(0, ((min - globalMin) / span) * 100));
    const rawWidth = Math.max(6, ((max - min) / span) * 100);
    const width = Math.max(4, Math.min(100 - left, rawWidth));

    const row = document.createElement("div");
    row.className = "daily-row animate-fade-in";
    row.style.animationDelay = `${index * 60}ms`;
    row.innerHTML = `
      <div class="daily-day">${label}</div>
      <div class="daily-icon-wrap">
        <span class="daily-icon">${icon}</span>
        ${pop ? `<span class="daily-pop">${pop}</span>` : ""}
      </div>
      <div class="daily-temps">
        <span class="daily-temp-min">${min}°</span>
        <div class="daily-range">
          <div class="daily-range-track">
            <div class="daily-range-fill" style="left:${left}%;width:${width}%"></div>
          </div>
        </div>
        <span class="daily-temp-max">${max}°</span>
      </div>
      <div class="daily-desc">${prettyDesc}</div>
    `;
    dailyForecastListEl.appendChild(row);
  });

  dailyForecastSectionEl.style.display = "block";
}

/* ==========================================
   ADVANCED DATA
   ========================================== */

function renderAdvanced(data) {
  if (!advancedGridEl) return;
  advancedGridEl.innerHTML = "";

  const temp = data.main.temp;
  const feels = data.main.feels_like;
  const humidity = data.main.humidity;
  const clouds = data.clouds.all;

  const dewPoint = computeDewPoint(temp, humidity);

  const cards = [
    { title: "Taupunkt", value: `${dewPoint.toFixed(1)}°C`, extra: dewPointExplain(dewPoint) },
    { title: "Bewölkung", value: `${clouds}%`, extra: "" },
    { title: "Thermischer Stress", value: thermalStress(feels), extra: "" }
  ];

  cards.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "card animate-fade-in";
    el.style.animationDelay = `${i * 80}ms`;
    el.innerHTML = `
      <div class="card-title">${c.title}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-extra">${c.extra}</div>
    `;
    advancedGridEl.appendChild(el);
  });
}


/* ==========================================
   RAIN INSIGHTS
   ========================================== */

function renderRainInsights(forecast) {
  if (!rainCaptionEl || !rainGaugeEl || !rainGaugePeakEl) return;
  const list = Array.isArray(forecast?.list) ? forecast.list.slice(0, 12) : [];
  latestRainList = list;

  if (!list.length) {
    rainCaptionEl.textContent = "Keine Daten";
    rainGaugePeakEl.textContent = "--%";
    rainGaugeEl.style.setProperty("--gauge-fill", "0%");
    [rainMetaNowEl, rainMetaHourEl, rainMetaThreeEl].forEach((el) => {
      if (el) el.textContent = "--%";
    });
    renderRainDetails();
    return;
  }

  const pops = list.map((item) => Math.round((item.pop || 0) * 100));
  const avg = Math.round(pops.reduce((a, b) => a + b, 0) / pops.length);
  const peak = Math.max(...pops);

  rainCaptionEl.textContent = `Ø ${avg}%`;
  rainGaugePeakEl.textContent = `${peak}%`;
  rainGaugeEl.style.setProperty("--gauge-fill", `${peak}%`);

  const now = pops[0] ?? 0;
  const hour = pops[1] ?? pops[0] ?? 0;
  const three = pops[3] ?? pops[pops.length - 1] ?? 0;

  if (rainMetaNowEl) rainMetaNowEl.textContent = `${now}%`;
  if (rainMetaHourEl) rainMetaHourEl.textContent = `${hour}%`;
  if (rainMetaThreeEl) rainMetaThreeEl.textContent = `${three}%`;

  renderRainDetails();
}

function renderRainDetails() {
  if (!rainDetailsEl) return;

  const subset = latestRainList.slice(0, 6);
  rainDetailsEl.innerHTML = "";

  if (!subset.length) {
    rainDetailsEl.innerHTML = `<div class="rain-detail-row">Keine Daten</div>`;
    return;
  }

  subset.forEach((item) => {
    const dt = new Date(item.dt * 1000);
    const timeLabel = formatHourCompact(dt);
    const pop = Math.round((item.pop || 0) * 100);
    const width = Math.min(100, Math.max(4, pop));

    const row = document.createElement("div");
    row.className = "rain-detail-row";
    row.innerHTML = `
      <div class="rain-detail-top">
        <span class="rain-detail-time">${timeLabel}</span>
        <span class="rain-detail-value">${pop}%</span>
      </div>
      <div class="rain-detail-bar">
        <div class="rain-detail-bar-fill" style="width:${width}%"></div>
      </div>
    `;
    rainDetailsEl.appendChild(row);
  });
}

/* ==========================================
   HEAT STRESS
   ========================================== */

function renderHeatStress(current) {
  if (!heatMarkerEl || !heatCaptionEl) return;

  const feels = current.main.feels_like;
  const min = -10, max = 40;
  const t = (Math.max(min, Math.min(max, feels)) - min) / (max - min);

  heatMarkerEl.style.left = `${t * 100}%`;
  heatCaptionEl.textContent = `${thermalStress(feels)} · gefühlt ${Math.round(feels)}°C`;
}

/* ==========================================
   SEARCH
   ========================================== */

const SUPPORTED_COUNTRIES = ["DE", "TR"];

const FLAGS = {
  DE: "🇩🇪",
  TR: "🇹🇷"
};

function normalizeSearchText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

let searchAbortController = null;

function setupSearch() {
  if (!cityInput) return;

  cityInput.addEventListener("input", onSearchInput);

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      cityInput.focus();
      onSearchInput();
    });
  }
}

async function onSearchInput() {
  if (!cityInput || !cityResults) return;
  const rawValue = cityInput.value.trim();
  const normalizedQuery = normalizeSearchText(rawValue);
  if (!rawValue || normalizedQuery.length < 1) {
    cityResults.style.display = "none";
    return;
  }

  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();

  try {
    const requests = [];

    // Broad query so even one character returns something we can filter locally.
    const broadLimit = normalizedQuery.length === 1 ? 50 : 25;
    requests.push(
      fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(rawValue)}&limit=${broadLimit}&appid=${API_KEY}`,
        { signal: searchAbortController.signal }
      )
        .then((res) => res.json())
        .catch((err) => {
          if (err.name === "AbortError") return [];
          console.error("Geo fetch failed", err);
          return [];
        })
    );

    // Targeted per-country queries to guarantee DE/TR matches even for single letters.
    SUPPORTED_COUNTRIES.forEach((country) => {
      requests.push(
        fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(`${rawValue},${country}`)}&limit=20&appid=${API_KEY}`,
          { signal: searchAbortController.signal }
        )
          .then((res) => res.json())
          .catch((err) => {
            if (err.name === "AbortError") return [];
            console.error("Geo fetch failed", err);
            return [];
          })
      );
    });

    const responses = await Promise.all(requests);

    const data = responses.flat();
    const filtered = data.filter(
      (city) => city && city.name && city.country && SUPPORTED_COUNTRIES.includes(city.country)
    );

    const dedup = [];
    const seen = new Set();
    filtered.forEach((city) => {
      if (!city.name) return;
      const key = `${normalizeSearchText(city.name)}_${city.country}`;
      if (seen.has(key)) return;
      seen.add(key);
      dedup.push(city);
    });

    const requireContains = normalizedQuery.length > 1;

    const matches = dedup
      .map((city) => {
        const normalized = normalizeSearchText(city.name);
        const prefixMatch = normalized.startsWith(normalizedQuery);
        const containsMatch = normalized.includes(normalizedQuery);
        const score = prefixMatch ? 0 : containsMatch ? 1 : 2;
        const lengthDelta = Math.abs(normalized.length - normalizedQuery.length);
        return { city, score, lengthDelta, normalized };
      })
      .filter((entry) => {
        if (!requireContains) return true;
        return entry.normalized.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.lengthDelta !== b.lengthDelta) return a.lengthDelta - b.lengthDelta;
        return a.normalized.localeCompare(b.normalized);
      })
      .map((entry) => ({
        name: entry.city.name,
        state: entry.city.state,
        country: entry.city.country,
        lat: entry.city.lat,
        lon: entry.city.lon
      }));

    cityResults.innerHTML = "";

    if (!matches.length) {
      cityResults.style.display = "none";
      return;
    }

    matches.slice(0, 12).forEach((city) => {
      const el = document.createElement("div");
      el.className = "city-result-item";
      const subtitle = city.state ? `, ${city.state}` : "";
      el.innerHTML = `<span>${FLAGS[city.country] ?? ""}</span> <span>${city.name}${subtitle}</span>`;

      el.addEventListener("click", () => {
        cityInput.value = city.name;
        cityResults.style.display = "none";
        loadWeatherByCoords(city.lat, city.lon);
      });

      cityResults.appendChild(el);
    });

    cityResults.style.display = "block";
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Geo search failed", err);
    cityResults.style.display = "none";
  } finally {
    searchAbortController = null;
  }
}

/* ==========================================
   HELPERS
   ========================================== */

function formatTime(d) {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatHourLabel(d) {
  const hour = d.getHours().toString().padStart(2, "0");
  return `${hour} Uhr`;
}

function formatHourCompact(d) {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit" });
}

function formatWeekdayShort(d) {
  return d.toLocaleDateString("de-DE", { weekday: "short" });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildHourlyForecast(currentData, list, hours = 12) {
  if (!currentData) return [];

  const segments = [
    {
      dt: currentData.dt,
      main: { temp: currentData.main?.temp ?? currentData.main?.feels_like ?? 0 },
      weather: currentData.weather
    }
  ];

  if (Array.isArray(list) && list.length) {
    segments.push(...list);
  }

  segments.sort((a, b) => a.dt - b.dt);

  const baseTime = currentData.dt;
  const hourly = [];
  let segmentIndex = 0;

  for (let i = 0; i < hours; i++) {
    const targetDt = baseTime + i * 3600;

    while (
      segmentIndex < segments.length - 1 &&
      segments[segmentIndex + 1].dt < targetDt
    ) {
      segmentIndex++;
    }

    const prev = segments[segmentIndex];
    const next = segments[segmentIndex + 1] || prev;
    const prevTemp = prev.main?.temp ?? prev.main?.feels_like ?? 0;
    const nextTemp = next.main?.temp ?? next.main?.feels_like ?? prevTemp;
    const span = next.dt - prev.dt || 1;
    const ratio = Math.min(1, Math.max(0, (targetDt - prev.dt) / span));

    const temp = lerp(prevTemp, nextTemp, ratio);
    const weatherSource = ratio < 0.5 ? prev : next;
    const weather = weatherSource.weather?.[0] || prev.weather?.[0] || {};

    hourly.push({
      dt: targetDt,
      temp,
      weatherMain: weather.main || "",
      weatherDesc: weather.description || ""
    });
  }

  return hourly;
}

function buildDailyFromForecastList(list) {
  if (!Array.isArray(list) || !list.length) return [];

  const groups = new Map();

  list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const key = date.toISOString().split("T")[0];
    if (!groups.has(key)) {
      groups.set(key, {
        dt: new Date(key).getTime() / 1000,
        temps: [],
        weatherSamples: [],
        pops: []
      });
    }
    const group = groups.get(key);
    group.temps.push(item.main?.temp ?? item.main?.feels_like ?? 0);
    group.weatherSamples.push(item.weather?.[0]);
    if (typeof item.pop === "number") group.pops.push(item.pop);
  });

  const days = Array.from(groups.values())
    .sort((a, b) => a.dt - b.dt)
    .slice(0, 7)
    .map((day) => {
      const max = Math.round(Math.max(...day.temps));
      const min = Math.round(Math.min(...day.temps));
      const weather =
        day.weatherSamples[Math.floor(day.weatherSamples.length / 2)] ||
        day.weatherSamples[0] ||
        { main: "", description: "" };

      const popAvg =
        day.pops.length > 0
          ? day.pops.reduce((sum, p) => sum + p, 0) / day.pops.length
          : undefined;

      return {
        dt: day.dt,
        temp: { max, min },
        weather: [weather],
        pop: popAvg
      };
    });

  return days;
}

function conditionToEmoji(c) {
  c = c.toLowerCase();
  if (c.includes("rain") || c.includes("regen")) return "🌧";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("clear") || c.includes("klar") || c.includes("sonnig")) return "☀️";
  if (c.includes("storm") || c.includes("gewitter")) return "⛈";
  if (c.includes("snow") || c.includes("schnee")) return "❄️";
  if (c.includes("fog") || c.includes("nebel")) return "🌫";
  return "🌡";
}

function computeDewPoint(t, h) {
  const a = 17.27, b = 237.7;
  const alpha = (a * t) / (b + t) + Math.log(h / 100);
  return (b * alpha) / (a - alpha);
}

function dewPointExplain(dp) {
  if (dp < 10) return "trocken";
  if (dp < 16) return "angenehm";
  if (dp < 20) return "leicht schwül";
  return "schwül";
}

function thermalStress(f) {
  if (f < 0) return "Kälte-Stress ❄️";
  if (f < 10) return "Frisch 🧥";
  if (f < 25) return "Komfortzone 🙂";
  if (f < 32) return "Wärme-Stress ☀️";
  return "Hitze-Stress 🔥";
}
