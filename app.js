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
const heroTempEl = document.getElementById("hero-temp");
const heroCityEl = document.getElementById("hero-city");
const heroCondEl = document.getElementById("hero-condition");
const heroMetaEl = document.getElementById("hero-meta");

/* DOM: Detail – Sections */
const metricsGridEl = document.getElementById("metrics-grid");
const forecastTrackEl = document.getElementById("forecast-track");
const advancedGridEl = document.getElementById("advanced-grid");

const rainCanvasEl = document.getElementById("rain-canvas");
const rainCaptionEl = document.getElementById("rain-caption");

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

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    const cityName = current.name;
    const country = current.sys?.country || "";
    const temp = Math.round(current.main.temp);

    if (heroCityEl) heroCityEl.textContent = cityName;

    renderHero(current);
    renderMetrics(current);
    renderForecast(current, forecast);
    renderAdvanced(current);
    renderRainWaveform(forecast);
    renderHeatStress(current);

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
   RAIN WAVEFORM
   ========================================== */

function renderRainWaveform(forecast) {
  if (!rainCanvasEl || !rainCaptionEl) return;

  const canvas = rainCanvasEl;
  const caption = rainCaptionEl;
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  const data = forecast.list.slice(0, 12).map((i) => i.pop || 0);
  const max = Math.max(...data, 0.01);

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "#bbb";
  ctx.beginPath();
  ctx.moveTo(0, h - 18);
  ctx.lineTo(w, h - 18);
  ctx.stroke();

  ctx.beginPath();
  data.forEach((p, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10;
    const y = h - 18 - (p / max) * (h - 35);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111";
  ctx.stroke();

  const avg = Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 100);
  caption.textContent = `Durchschnittliche Regenwahrscheinlichkeit: ${avg}%`;
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

const LOCAL_CITIES = [
  { name: "Berlin", country: "DE" },
  { name: "Hamburg", country: "DE" },
  { name: "München", country: "DE" },
  { name: "Frankfurt", country: "DE" },
  { name: "Düsseldorf", country: "DE" },
  { name: "Istanbul", country: "TR" },
  { name: "Ankara", country: "TR" },
  { name: "Izmir", country: "TR" },
  { name: "Antalya", country: "TR" }
];

const FLAGS = {
  DE: "🇩🇪",
  TR: "🇹🇷"
};

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
  const q = cityInput.value.trim().toLowerCase();
  if (!q) {
    cityResults.style.display = "none";
    return;
  }

  const matches = LOCAL_CITIES.filter((c) =>
    c.name.toLowerCase().startsWith(q)
  );

  cityResults.innerHTML = "";
  cityResults.style.display = matches.length ? "block" : "none";

  matches.forEach((c) => {
    const el = document.createElement("div");
    el.className = "city-result-item";
    el.innerHTML = `<span>${FLAGS[c.country] ?? ""}</span> <span>${c.name}</span>`;

    el.addEventListener("click", async () => {
      cityInput.value = c.name;
      cityResults.style.display = "none";

      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${c.name},${c.country}&limit=1&appid=${API_KEY}`
      );
      const [geo] = await geoRes.json();

      if (geo) loadWeatherByCoords(geo.lat, geo.lon);
    });

    cityResults.appendChild(el);
  });
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
