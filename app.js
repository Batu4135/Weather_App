// API Setup
const API_KEY = "83bcc8dbea48e891fc4cb6cd868ad732";
const CITY = "Istanbul";
const UNITS = "metric";
const LANG = "de";

// DOM Elemente
const heroTempEl = document.getElementById("hero-temp");
const heroCondEl = document.getElementById("hero-condition");
const heroMetaEl = document.getElementById("hero-meta");
const metricsGridEl = document.getElementById("metrics-grid");
const forecastTrackEl = document.getElementById("forecast-track");
const advancedGridEl = document.getElementById("advanced-grid");


// ========================================
// LOAD WEATHER
// ========================================
async function loadWeather() {
  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${API_KEY}&units=${UNITS}&lang=${LANG}`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

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
    heroCondEl.textContent = "Fehler beim Laden des Wetters.";
  }
}


// ========================================
// HERO
// ========================================
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

function updateBackgroundVideo(current) {
  const video = document.getElementById("bg-video");

  // Sonnenaufgang & Sonnenuntergang
  const now = Date.now() / 1000;
  const sunrise = current.sys.sunrise;
  const sunset = current.sys.sunset;

  const isDay = now > sunrise && now < sunset;

  // Wetter (Haupt-Kategorie)
  const condition = current.weather[0].main.toLowerCase();

  let src = "";

  if (isDay) {
    if (condition.includes("clear")) src = "mp4/sunny.mp4";
    else if (condition.includes("cloud")) src = "mp4/cloudy.mp4";
    else if (condition.includes("rain")) src = "mp4/cloudy.mp4"; // bis du rain.mp4 hast
    else if (condition.includes("snow")) src = "mp4/cloudy.mp4"; // placeholder
    else if (condition.includes("fog") || condition.includes("mist")) src = "mp4/cloudy.mp4";
    else src = "mp4/cloudy.mp4"; // fallback
  } else {
    // NACHT
    src = "mp4/cloudy.mp4"; // später night.mp4 hier einsetzen
  }

  // Wenn das Video schon läuft → nichts tun
  if (video.getAttribute("src") === src) return;

  // Smooth fade transition
  video.style.opacity = 0;

  setTimeout(() => {
    video.setAttribute("src", src);
    video.play().catch(() => {});
    video.style.opacity = 1;
  }, 400);
}

// ========================================
// METRICS
// ========================================
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
  let comfort;
  if (delta > 3) comfort = "fühlt sich wärmer an";
  else if (delta < -3) comfort = "fühlt sich kälter an";
  else comfort = "nahe an der Lufttemperatur";

  const cards = [
    { title: "Gefühlte Temp.", value: `${feels}°C`, extra: comfort },
    { title: "Wind", value: `${wind} m/s`, extra: wind < 2 ? "fast windstill" : wind < 6 ? "leichter Wind" : "spürbarer Wind" },
    { title: "Luftfeuchte", value: `${humidity}%`, extra: humidity < 40 ? "eher trocken" : humidity < 70 ? "angenehm" : "sehr feucht" },
    { title: "Sichtweite", value: `${visibilityKm} km`, extra: visibilityKm > 8 ? "sehr klar" : "eingeschränkte Sicht" },
    { title: "Luftdruck", value: `${pressure} hPa`, extra: pressure > 1015 ? "hochdrucklastig (stabil)" : pressure < 1005 ? "tiefdrucklastig (wechselhaft)" : "normal" },
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


// ========================================
// FORECAST
// ========================================
function renderForecast(forecast) {
  forecastTrackEl.innerHTML = "";

  const list = forecast.list.slice(0, 8); // 24h

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


// ========================================
// ADVANCED SECTION
// ========================================
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
    { title: "Cloud Cover", value: `${clouds}%`, extra: clouds < 25 ? "klar" : clouds < 70 ? "teils bewölkt" : "stark bewölkt" },
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


// ========================================
// MOON PHASE
// ========================================
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


// ========================================
// WIND COMPASS
// ========================================
function renderWindCompass(current) {
  const card = document.getElementById("wind-card");
  if (!card) return;

  const wind = current.wind;
  const deg = wind.deg || 0;
  const speed = wind.speed;

  const strength =
    speed < 2 ? "fast windstill" :
    speed < 6 ? "leichter Wind" :
    speed < 11 ? "mäßiger Wind" : "starker Wind";

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


// ========================================
// RAIN WAVEFORM
// ========================================
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

  const avg = Math.round(pops.reduce((a,b) => a+b, 0) / pops.length * 100);
  caption.textContent = `Durchschnittliche Regenwahrscheinlichkeit: ${avg}%`;
}


// ========================================
// HEAT STRESS
// ========================================
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


// ========================================
// HELPERS
// ========================================
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


// ========================================
// FORECAST DRAGGING
// ========================================
function initForecastDrag() {
  const track = forecastTrackEl;
  let down = false, start = 0, curr = 0;

  const min = () =>
    Math.min(0, track.parentElement.offsetWidth - track.scrollWidth - 16);

  track.onmousedown = e => {
    down = true;
    start = e.clientX - curr;
    track.style.cursor = "grabbing";
  };

  window.onmouseup = () => { down = false; track.style.cursor = "grab"; };

  window.onmousemove = e => {
    if (!down) return;
    curr = Math.max(min(), Math.min(0, e.clientX - start));
    track.style.transform = `translateX(${curr}px)`;
  };
}


// ========================================
// INTRO ANIMATIONS
// ========================================
function runIntroAnimations() {
  gsap.from(".hero-main", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" });
  gsap.from(".hero-sub", { y: 16, opacity: 0, duration: 0.8, delay: 0.1 });
  gsap.from(".metric-card", { y: 24, opacity: 0, duration: 0.75, stagger: 0.06, delay: 0.15 });
  gsap.from(".forecast-card", { y: 20, opacity: 0, duration: 0.7, stagger: 0.05, delay: 0.25 });
  gsap.from(".advanced-card", { y: 26, opacity: 0, duration: 0.8, stagger: 0.07, delay: 0.35 });
  gsap.from(".moon-card, .wind-card, .rain-card, .heat-card",
    { y: 24, opacity: 0, duration: 0.8, stagger: 0.08, delay: 0.45 });
}


// ========================================
// MAXIMUM PARALLAX
// ========================================
function enableMaximumParallax() {
  gsap.registerPlugin(ScrollTrigger);

  // ----------------------------------------
  // Ebene 1: Backgrounds (stärker)
  // ----------------------------------------
  gsap.to(".bg-gradient", {
    y: 80,
    scale: 1.08,
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
    }
  });

  gsap.to(".orb-1", {
    y: 120,
    x: 50,
    scale: 1.18,
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.3,
    }
  });

  gsap.to(".orb-2", {
    y: -120,
    x: -40,
    scale: 1.15,
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.3,
    }
  });

  // ----------------------------------------
  // Ebene 2: Hero (mittlere Stärke, startet früh)
  // ----------------------------------------
  gsap.to("#hero", {
    y: 40,
    scale: 0.94,
    opacity: 0.85,
    filter: "blur(2px)",
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",          // sofort aktiv!
      end: "bottom+=150 top",     // viel kürzere Strecke
      scrub: 1.0,
    }
  });

  // ----------------------------------------
  // Ebene 3: Sections (subtil!)
  // ----------------------------------------
  gsap.utils.toArray(".section").forEach((section, i) => {
    gsap.fromTo(section,
      { y: 0 },
      {
        y: i % 2 === 0 ? -18 : -10, // leichte Variation + Tiefe
        scrollTrigger: {
          trigger: section,
          start: "top bottom-=100",  // PARALLAX STARTET FRÜHER!
          end: "top center",
          scrub: 1.0
        }
      }
    );
  });

  // ----------------------------------------
  // Ebene 4: Cards (ultraleicht)
  // ----------------------------------------
  gsap.utils.toArray(".card").forEach((card, i) => {
    gsap.fromTo(card,
      { y: 0, opacity: 1 },
      {
        y: -10,
        opacity: 0.95,
        scrollTrigger: {
          trigger: card,
          start: "top bottom", // sofort sichtbar
          end: "top center",
          scrub: 1.0,
        }
      }
    );
  });

  // ----------------------------------------
  // Scroll-Geschwindigkeit Glow (beibehalten)
  // ----------------------------------------
  const bg = document.querySelector(".bg-gradient");

  ScrollTrigger.create({
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
    onUpdate: self => {
      const vel = Math.abs(self.getVelocity()) / 1400;
      const blur = Math.min(vel * 5, 5);
      const glow = Math.min(vel * 0.4, 0.5);
      bg.style.filter = `blur(${blur}px) brightness(${1 + glow})`;
    }
  });
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




// ========================================
// START
// ========================================
loadWeather();
