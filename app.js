/* === DEIN GANZER, AKTUALISIERTER CODE MIT OPTIMIERTER STADT-SUCHE === */

// ==========================================================
// API Setup
// ==========================================================
const API_KEY = "83bcc8dbea48e891fc4cb6cd868ad732";
const DEFAULT_CITY = "Istanbul";
const UNITS = "metric";
const LANG = "de";

// DOM Elemente
const heroTempEl = document.getElementById("hero-temp");
const heroCondEl = document.getElementById("hero-condition");
const heroMetaEl = document.getElementById("hero-meta");
const metricsGridEl = document.getElementById("metrics-grid");
const forecastTrackEl = document.getElementById("forecast-track");
const advancedGridEl = document.getElementById("advanced-grid");


// ==========================================================
// GEODATEN LADEN
// ==========================================================
async function requestLocationAndLoad() {
  if (!navigator.geolocation) {
    console.warn("Geolocation nicht verfügbar. Lade Standardstadt.");
    loadWeather(DEFAULT_CITY);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      console.log("GPS Standort:", lat, lon);

      await loadWeather(null, lat, lon);
    },
    (err) => {
      console.warn("Standort abgelehnt → Standardstadt wird geladen.");
      loadWeather(DEFAULT_CITY);
    }
  );
}


// ==========================================================
// HAUPTFUNKTION
// ==========================================================
async function loadWeather(city = null, lat = null, lon = null) {
  try {
    let currentUrl, forecastUrl;

    if (lat && lon) {
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
    } else {
      city = city || DEFAULT_CITY;
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
    }

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    document.querySelector(".hero-city").textContent = current.name;

    renderHero(current);
    renderMetrics(current);
    renderForecast(forecast);
    renderAdvanced(current);
    renderMoon(current);
    renderWindCompass(current);
    renderRainWaveform(forecast);
    renderHeatStress(current);
    updateBackgroundVideo(current);

    runIntroAnimations();
    enableMaximumParallax();

  } catch (err) {
    console.error(err);
    heroCondEl.textContent = "Fehler beim Laden.";
  }
}


// ==========================================================
// HERO
// ==========================================================
function renderHero(data) {
  const temp = Math.round(data.main.temp);
  const feels = Math.round(data.main.feels_like);
  const cond = data.weather[0].description;
  const wind = data.wind.speed;
  const humidity = data.main.humidity;

  heroTempEl.textContent = `${temp}°C`;
  heroCondEl.textContent = cond.charAt(0).toUpperCase() + cond.slice(1);
  heroMetaEl.textContent = `Gefühlt ${feels}° • Wind ${wind} m/s • Luftfeuchte ${humidity}%`;
}


// ==========================================================
// Hintergrundvideo dynamisch
// ==========================================================
function updateBackgroundVideo(current) {
  const video = document.getElementById("bg-video");
  const now = Date.now() / 1000;
  const sunrise = current.sys.sunrise;
  const sunset = current.sys.sunset;

  const isDay = now > sunrise && now < sunset;
  const condition = current.weather[0].main.toLowerCase();

  let src = "";

  if (isDay) {
    if (condition.includes("clear")) src = "mp4/sunny.mp4";
    else src = "mp4/cloudy.mp4";
  } else {
    src = "mp4/cloudy.mp4";
  }

  if (video.getAttribute("src") === src) return;

  video.style.opacity = 0;

  setTimeout(() => {
    video.setAttribute("src", src);
    video.play().catch(() => {});
    video.style.opacity = 1;
  }, 400);
}


// ==========================================================
// METRICS
// ==========================================================
function renderMetrics(data) {
  metricsGridEl.innerHTML = "";

  const temp = Math.round(data.main.temp);
  const feels = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  const pressure = data.main.pressure;
  const visibilityKm = (data.visibility / 1000).toFixed(1);
  const wind = data.wind.speed;

  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  const daylightHours = ((sunset - sunrise) / 3600000).toFixed(1);

  const delta = feels - temp;
  const comfort =
    delta > 3 ? "fühlt sich wärmer an" :
    delta < -3 ? "fühlt sich kälter an" :
    "nahe an der Lufttemperatur";

  const cards = [
    { title: "Gefühlte Temp.", value: `${feels}°C`, extra: comfort },
    { title: "Wind", value: `${wind} m/s`, extra: wind < 2 ? "fast windstill" : wind < 6 ? "leichter Wind" : "spürbarer Wind" },
    { title: "Luftfeuchte", value: `${humidity}%`, extra: humidity < 40 ? "eher trocken" : humidity < 70 ? "angenehm" : "sehr feucht" },
    { title: "Sichtweite", value: `${visibilityKm} km`, extra: visibilityKm > 8 ? "sehr klar" : "eingeschränkte Sicht" },
    { title: "Luftdruck", value: `${pressure} hPa`, extra: pressure > 1015 ? "hochdrucklastig" : pressure < 1005 ? "tiefdrucklastig" : "normal" },
    { title: "Tageslänge", value: `${daylightHours} h`, extra: `Sonne: ${formatTime(sunrise)} – ${formatTime(sunset)}` }
  ];

  cards.forEach(c => {
    const card = document.createElement("div");
    card.className = "card metric-card";
    card.innerHTML = `
      <div class="card-title">${c.title}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-extra">${c.extra}</div>
    `;
    metricsGridEl.appendChild(card);
  });
}


// ==========================================================
// FORECAST + TOUCH FIX
// ==========================================================
function renderForecast(forecast) {
  forecastTrackEl.innerHTML = "";

  const list = forecast.list.slice(0, 8);

  list.forEach(item => {
    const dt = new Date(item.dt * 1000);
    const temp = Math.round(item.main.temp);
    const cond = item.weather[0].main;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="forecast-time">${formatHour(dt)}</div>
      <div class="forecast-icon">${conditionToEmoji(cond)}</div>
      <div class="forecast-temp">${temp}°</div>
    `;
    forecastTrackEl.appendChild(card);
  });

  initForecastDrag();
}


// ==========================================================
// DRAGGING (PC + TOUCH)
// ==========================================================
function initForecastDrag() {
  const track = forecastTrackEl;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  const min = () =>
    Math.min(0, track.parentElement.offsetWidth - track.scrollWidth - 16);

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.clientX - scrollLeft;
    track.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    isDown = false;
    track.style.cursor = "grab";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    scrollLeft = Math.max(min(), Math.min(0, e.clientX - startX));
    track.style.transform = `translateX(${scrollLeft}px)`;
  });

  track.addEventListener("touchstart", (e) => {
    isDown = true;
    startX = e.touches[0].clientX - scrollLeft;
  });

  track.addEventListener("touchend", () => {
    isDown = false;
  });

  track.addEventListener("touchmove", (e) => {
    if (!isDown) return;

    const x = e.touches[0].clientX - startX;
    scrollLeft = Math.max(min(), Math.min(0, x));

    track.style.transform = `translateX(${scrollLeft}px)`;
  });
}


// ==========================================================
// ADVANCED
// ==========================================================
function renderAdvanced(data) {
  advancedGridEl.innerHTML = "";

  const temp = data.main.temp;
  const feels = data.main.feels_like;
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const clouds = data.clouds.all;
  const dewPoint = computeDewPoint(temp, humidity);

  const cards = [
    { title: "Taupunkt", value: `${dewPoint.toFixed(1)}°C`, extra: dewPointExplain(dewPoint) },
    { title: "Bewölkung", value: `${clouds}%`, extra: clouds < 25 ? "klar" : clouds < 70 ? "teils bewölkt" : "stark bewölkt" },
    { title: "Thermischer Stress", value: thermalStress(feels), extra: `Gefühlt: ${Math.round(feels)}°C` },
    { title: "Wind Chill", value: windChillLabel(temp, wind), extra: "Wind beeinflusst das Temperaturempfinden" }
  ];

  cards.forEach(c => {
    const card = document.createElement("div");
    card.className = "card advanced-card";
    card.innerHTML = `
      <div class="card-title">${c.title}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-extra">${c.extra}</div>
    `;
    advancedGridEl.appendChild(card);
  });
}


// ==========================================================
// MOND
// ==========================================================
function renderMoon(current) {
  const card = document.getElementById("moon-card");
  if (!card) return;

  const now = new Date(current.dt * 1000);
  const moon = computeMoonPhase(now);

  const phaseNames = [
    "Neumond", "Zunehmende Sichel", "Erstes Viertel", "Zunehmender Mond",
    "Vollmond", "Abnehmender Mond", "Letztes Viertel", "Abnehmende Sichel"
  ];

  card.innerHTML = `
    <div class="moon-visual">
      <div class="moon-shadow" style="transform: translateX(${(moon.illumination - 0.5) * 40}px);"></div>
    </div>
    <div>
      <div class="moon-info-main">${phaseNames[moon.index]}</div>
      <div class="moon-info-sub">Beleuchtung: ${Math.round(moon.illumination * 100)}%</div>
    </div>
  `;
}


function computeMoonPhase(date) {
  const synodicMonth = 29.53058867;
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const days = (date - knownNewMoon) / 86400000;
  const phase = days % synodicMonth;
  const index = Math.floor((phase / synodicMonth) * 8 + 0.5) % 8;
  const illumination = (1 - Math.cos(2 * Math.PI * phase / synodicMonth)) / 2;
  return { index, illumination };
}


// ==========================================================
// WIND
// ==========================================================
function renderWindCompass(current) {
  const card = document.getElementById("wind-card");
  if (!card) return;

  const wind = current.wind;
  const deg = wind.deg || 0;
  const speed = wind.speed;

  const strength =
    speed < 2 ? "fast windstill" :
    speed < 6 ? "leichter Wind" :
    speed < 11 ? "mäßiger Wind" :
    "starker Wind";

  card.innerHTML = `
    <div class="wind-compass">
      <div class="wind-ring"></div>
      <div class="wind-arrow" id="wind-arrow"></div>
      <div class="wind-center-dot"></div>
    </div>
    <div>
      <div class="wind-info-main">${degToDirection(deg)} (${deg}°)</div>
      <div class="wind-info-sub">${speed.toFixed(1)} m/s · ${strength}</div>
    </div>
  `;

  document.getElementById("wind-arrow").style.transform =
    `translate(-50%, -80%) rotate(${deg}deg)`;
}

function degToDirection(deg) {
  const dirs = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}


// ==========================================================
// RAIN WAVEFORM
// ==========================================================
function renderRainWaveform(forecast) {
  const canvas = document.getElementById("rain-canvas");
  const caption = document.getElementById("rain-caption");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  const list = forecast.list.slice(0, 12);
  const pops = list.map(item => item.pop || 0);
  const maxPop = Math.max(...pops, 0.01);

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(0, h - 18);
  ctx.lineTo(w, h - 18);
  ctx.stroke();

  ctx.beginPath();
  pops.forEach((p, i) => {
    const x = (i / (pops.length - 1)) * (w - 20) + 10;
    const y = h - 18 - (p / maxPop) * (h - 35);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#00f5ff");
  grad.addColorStop(0.5, "#00ff6a");
  grad.addColorStop(1, "#ff00e6");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.stroke();

  pops.forEach((p, i) => {
    const x = (i / (pops.length - 1)) * (w - 20) + 10;
    const y = h - 18 - (p / maxPop) * (h - 35);

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });

  const avg = Math.round(pops.reduce((a,b) => a + b, 0) / pops.length * 100);
  caption.textContent = `Durchschnittliche Regenwahrscheinlichkeit: ${avg}%`;
}


// ==========================================================
// HEAT
// ==========================================================
function renderHeatStress(current) {
  const feels = current.main.feels_like;
  const marker = document.getElementById("heat-marker");
  const caption = document.getElementById("heat-caption");
  if (!marker) return;

  const min = -10, max = 40;
  const clamped = Math.max(min, Math.min(max, feels));
  const t = (clamped - min) / (max - min);

  marker.style.left = `${t * 100}%`;
  caption.textContent = `${thermalStress(feels)} · gefühlt ${Math.round(feels)}°C`;
}


// ==========================================================
// HELPERS
// ==========================================================
function formatTime(d) {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatHour(d) {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit" });
}

function conditionToEmoji(c) {
  c = c?.toLowerCase();
  if (c.includes("rain")) return "🌧";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("clear")) return "☀️";
  if (c.includes("storm")) return "⛈";
  if (c.includes("snow")) return "❄️";
  if (c.includes("fog")) return "🌫";
  return "🌡";
}

function computeDewPoint(t, h) {
  const a = 17.27, b = 237.7;
  const alpha = ((a * t) / (b + t)) + Math.log(h / 100);
  return (b * alpha) / (a - alpha);
}

function dewPointExplain(dp) {
  if (dp < 10) return "Luft wirkt trocken.";
  if (dp < 16) return "Angenehm.";
  if (dp < 20) return "Etwas schwül.";
  return "Sehr schwül.";
}

function thermalStress(f) {
  if (f < 0) return "Kälte-Stress ❄️";
  if (f < 10) return "Frisch 🧥";
  if (f < 25) return "Komfortzone 🙂";
  if (f < 32) return "Wärme-Stress ☀️";
  return "Hitze-Stress 🔥";
}

function windChillLabel(t, w) {
  if (t > 15 || w < 3) return "kaum spürbar";
  if (w < 6) return "leicht kälter";
  return "deutlich kälter";
}


// ==========================================================
// ANIMATIONEN
// ==========================================================
function runIntroAnimations() {
  gsap.from(".hero-main", { y: 20, opacity: 0, duration: 0.8 });
  gsap.from(".hero-sub", { y: 16, opacity: 0, duration: 0.8, delay: 0.1 });
}


// ==========================================================
// PARALLAX
// ==========================================================
function enableMaximumParallax() {
  gsap.registerPlugin(ScrollTrigger);

  gsap.to("#bg-video", {
    y: 40,
    scale: 1.05,
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.4
    }
  });
}


// ==========================================================
// START
// ==========================================================
requestLocationAndLoad();


// ==========================================================
// CITY SEARCH – NUR DE + TR & AUTO-SELECT BEIM FOKUS
// ==========================================================
const cityInput = document.getElementById("city-search");
const cityResults = document.getElementById("city-results");

if (cityInput) {

  // ⭐ Beim Klick ins Feld → alles markieren
  cityInput.addEventListener("focus", () => {
    cityInput.select();
  });

  cityInput.addEventListener("input", async () => {
    const query = cityInput.value.trim();

    if (query.length < 2) {
      cityResults.style.display = "none";
      return;
    }

    // Nur Deutschland und Türkei
    const COUNTRIES = ["DE", "TR"];
    let allResults = [];

    for (const country of COUNTRIES) {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query},${country}&limit=5&appid=${API_KEY}`;
      const res = await fetch(url);
      const cities = await res.json();
      allResults = allResults.concat(cities);
    }

    cityResults.innerHTML = "";
    cityResults.style.display = allResults.length ? "block" : "none";

    allResults.forEach(c => {
      const item = document.createElement("div");
      item.className = "city-result-item";
      item.textContent = `${c.name}, ${c.country}`;

      item.addEventListener("click", () => {
        cityInput.value = `${c.name}, ${c.country}`;
        cityResults.style.display = "none";

        loadWeather(null, c.lat, c.lon);
      });

      cityResults.appendChild(item);
    });
  });
}

