// Real-Time National Weather Service (NWS) API Feed for Tampa International Airport (KTPA)
async function fetchLiveKTPAWeather() {
  const refreshBtn = document.getElementById("live-refresh-btn");
  if (refreshBtn) refreshBtn.textContent = "Updating...";

  try {
    const response = await fetch("https://api.weather.gov/stations/KTPA/observations/latest", {
      headers: { "Accept": "application/geo+json" }
    });
    
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const data = await response.json();
    const p = data.properties;

    // 1. Temperature (°C -> °F)
    if (p.temperature && p.temperature.value !== null) {
      const tempF = (p.temperature.value * 9/5 + 32).toFixed(1);
      const el = document.getElementById("live-temp-val");
      if (el) el.textContent = tempF + "°F";
    }

    // 2. Dew Point (°C -> °F)
    if (p.dewpoint && p.dewpoint.value !== null) {
      const dewF = (p.dewpoint.value * 9/5 + 32).toFixed(1);
      const el = document.getElementById("live-dew-val");
      if (el) el.textContent = dewF + "°F";
    }

    // 3. Barometric Station Pressure (Pa -> inHg)
    if (p.barometricPressure && p.barometricPressure.value !== null) {
      const pressInHg = (p.barometricPressure.value / 3386.39).toFixed(2);
      const el = document.getElementById("live-press-val");
      if (el) el.textContent = pressInHg + " inHg";
    }

    // 4. Wind Speed (km/h -> mph)
    if (p.windSpeed && p.windSpeed.value !== null) {
      const windMph = (p.windSpeed.value * 0.621371).toFixed(1);
      const el = document.getElementById("live-wind-val");
      if (el) el.textContent = (parseFloat(windMph) === 0 ? "Calm" : windMph + " mph");
    }

    // 5. Precipitation (m -> inches)
    const precipMeters = p.precipitationLastHour ? p.precipitationLastHour.value : null;
    const precipIn = precipMeters !== null && !isNaN(precipMeters) ? (precipMeters * 39.3701).toFixed(2) : "0.00";
    const precipEl = document.getElementById("live-precip-val");
    if (precipEl) precipEl.textContent = precipIn + " in";

    // Condition text & timestamp
    const condition = p.textDescription || "Observed";
    const condEl = document.getElementById("live-condition-badge");
    if (condEl) condEl.textContent = condition;

    const obsDate = new Date(p.timestamp);
    const timeFormatted = obsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const timeEl = document.getElementById("live-time-str");
    if (timeEl) timeEl.textContent = "Observed at " + timeFormatted;

    // Also trigger syncing the 2025-present chart with newest telemetry
    syncChartWithLatestTelemetry();

  } catch (error) {
    console.warn("Could not retrieve live NWS telemetry:", error);
  } finally {
    if (refreshBtn) refreshBtn.textContent = "🔄 Refresh";
  }
}

// Synchronize latest NWS observations with the KTPA 2025-present chart
async function syncChartWithLatestTelemetry() {
  const chartDiv = document.getElementById("ktpa-2025-live-chart");
  if (!chartDiv || !window.Plotly || !chartDiv.data || chartDiv.data.length < 5) return;

  try {
    const resp = await fetch("https://api.weather.gov/stations/KTPA/observations?limit=120", {
      headers: { "Accept": "application/geo+json" }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const features = data.features || [];
    if (!features.length) return;

    const sorted = features.slice().reverse();
    const existingDates = chartDiv.data[0].x || [];
    const lastDateStr = existingDates.length > 0 ? existingDates[existingDates.length - 1] : null;
    const lastTime = lastDateStr ? new Date(lastDateStr).getTime() : 0;

    const newX = [[], [], [], [], []];
    const newY = [[], [], [], [], []];
    const newText = [[], [], [], [], []];

    for (const f of sorted) {
      const p = f.properties;
      if (!p || !p.timestamp) continue;
      const obsTime = new Date(p.timestamp).getTime();
      if (obsTime <= lastTime) continue;

      const iso = p.timestamp;
      const timeFmt = new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
      });

      const tempF = p.temperature && p.temperature.value !== null ? parseFloat((p.temperature.value * 9/5 + 32).toFixed(1)) : null;
      const dewF = p.dewpoint && p.dewpoint.value !== null ? parseFloat((p.dewpoint.value * 9/5 + 32).toFixed(1)) : null;
      const pressInHg = p.barometricPressure && p.barometricPressure.value !== null ? parseFloat((p.barometricPressure.value / 3386.39).toFixed(2)) : null;
      const windMph = p.windSpeed && p.windSpeed.value !== null ? parseFloat((p.windSpeed.value * 0.621371).toFixed(1)) : null;
      const precipIn = p.precipitationLastHour && p.precipitationLastHour.value !== null ? parseFloat((p.precipitationLastHour.value * 39.3701).toFixed(2)) : 0.00;

      newX[0].push(iso);
      newY[0].push(tempF);
      newText[0].push(`<b style="font-size:13px; color:#c2410c;">🌡️ Temperature (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${tempF} °F`);

      newX[1].push(iso);
      newY[1].push(dewF);
      newText[1].push(`<b style="font-size:13px; color:#047857;">💧 Dew Point (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${dewF} °F`);

      newX[2].push(iso);
      newY[2].push(pressInHg);
      newText[2].push(`<b style="font-size:13px; color:#1d4ed8;">🌪️ Barometric Pressure (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${pressInHg} inHg`);

      newX[3].push(iso);
      newY[3].push(windMph);
      newText[3].push(`<b style="font-size:13px; color:#7e22ce;">💨 Sustained Wind Speed (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${windMph} mph`);

      newX[4].push(iso);
      newY[4].push(precipIn);
      newText[4].push(`<b style="font-size:13px; color:#0284c7;">🌧️ Precipitation (Live)</b><br><b>Time:</b> ${timeFmt}<br><b>Reading:</b> ${precipIn} in`);
    }

    if (newX[0].length > 0) {
      window.Plotly.extendTraces(chartDiv, {
        x: newX,
        y: newY,
        text: newText
      }, [0, 1, 2, 3, 4]);
    }
  } catch (err) {
    console.warn("Could not sync live observations with chart:", err);
  }
}

function initLiveCardScrollAnimation() {
  const cards = document.querySelectorAll(".live-card");
  if (!cards.length) return;

  function triggerCard(card, index) {
    if (card.classList.contains("popped")) return;
    card.style.animationDelay = (index * 0.08) + "s";
    card.classList.add("popped");

    card.addEventListener("animationend", function () {
      card.style.opacity = "1";
      card.style.transform = "none";
      card.style.animation = "none";
    }, { once: true });
  }

  function checkCards() {
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    cards.forEach(function (card, index) {
      if (card.classList.contains("popped")) return;
      const rect = card.getBoundingClientRect();
      // Only reveal once the entire box (including its bottom line) is within the screen
      if ((rect.bottom <= windowHeight && rect.top >= 0) || rect.bottom < 0) {
        triggerCard(card, index);
      }
    });
  }

  window.addEventListener("scroll", checkCards, { passive: true });
  window.addEventListener("resize", checkCards);

  // Initial checks
  checkCards();
  setTimeout(checkCards, 60);
  setTimeout(checkCards, 250);
  setTimeout(checkCards, 600);
}

// Interactive Plotly graphs scroll-driven line drawing and marker pop-up animations
function initPlotlyScrollAnimations() {
  const chartContainers = document.querySelectorAll(".plotly.html-widget, #ktpa-2025-live-chart");
  if (!chartContainers.length) return;

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return (rect.top <= windowHeight * 0.85 && rect.bottom >= 0);
  }

  chartContainers.forEach(function (container) {
    if (container.dataset.graphObserverAttached) return;
    container.dataset.graphObserverAttached = "true";

    // If below viewport, mark pending to prevent flashing
    if (!isElementInViewport(container)) {
      container.classList.add("plotly-scroll-pending");
    }

    function animateChart() {
      if (container.dataset.graphAnimated) return;

      const linePaths = container.querySelectorAll(".scatterlayer .lines path.js-line");
      if (!linePaths.length) return;

      container.dataset.graphAnimated = "true";
      container.classList.remove("plotly-scroll-pending");

      const points = container.querySelectorAll(".scatterlayer .points path.point");
      const annotations = container.querySelectorAll(".infolayer .annotation");
      const shapes = container.querySelectorAll(".shapelayer path");

      // 1. Initially hide points, stars, annotations, and vertical guideline shapes
      points.forEach(function (p) {
        p.style.opacity = "0";
        p.style.transform = "scale(0)";
        p.style.transformBox = "fill-box";
        p.style.transformOrigin = "center";
        p.style.transition = "none";
      });

      annotations.forEach(function (a) {
        a.style.opacity = "0";
        a.style.transform = "scale(0.2)";
        a.style.transformBox = "fill-box";
        a.style.transformOrigin = "center";
        a.style.transition = "none";
      });

      shapes.forEach(function (s) {
        s.style.opacity = "0";
        s.style.transition = "none";
      });

      // 2. Animate the line drawing across the chart
      linePaths.forEach(function (path) {
        let length = 25000;
        try {
          const l = path.getTotalLength();
          if (l && l > 100) length = Math.ceil(l) + 150;
        } catch (e) {}

        path.style.opacity = "1";
        path.style.transition = "none";
        path.style.strokeDasharray = length + " " + length;
        path.style.strokeDashoffset = length;

        // Force browser layout reflow
        path.getBoundingClientRect();

        // Smooth line draw animation
        path.style.transition = "stroke-dashoffset 1.7s cubic-bezier(0.25, 1, 0.45, 1)";
        path.style.strokeDashoffset = "0";
      });

      // 3. Right as the line finishes drawing (~1.65s), pop up red disaster points & stars from oldest to youngest!
      setTimeout(function () {
        // Collect and sort points strictly from oldest to youngest (left to right along the chronological X-axis)
        const pointsArr = Array.from(points);
        pointsArr.sort(function (a, b) {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectA.left - rectB.left;
        });

        // Collect and sort annotations strictly from oldest to youngest
        const annotationsArr = Array.from(annotations);
        annotationsArr.sort(function (a, b) {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectA.left - rectB.left;
        });

        // Collect and sort vertical disaster shapes
        const shapesArr = Array.from(shapes);
        shapesArr.sort(function (a, b) {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectA.left - rectB.left;
        });

        // Smooth chronological pop-up for vertical guide lines
        shapesArr.forEach(function (s, idx) {
          setTimeout(function () {
            s.style.transition = "opacity 0.45s ease";
            s.style.opacity = "1";
          }, idx * 65);
        });

        // Buttery-smooth spring pop-up for red points and stars (oldest -> youngest)
        pointsArr.forEach(function (p, idx) {
          setTimeout(function () {
            p.style.transition = "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.34, 1.45, 0.64, 1)";
            p.style.opacity = "1";
            p.style.transform = "scale(1)";
          }, idx * 65);
        });

        // Smooth pop-up for informational annotations matching each event
        annotationsArr.forEach(function (a, idx) {
          setTimeout(function () {
            a.style.transition = "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.34, 1.35, 0.64, 1)";
            a.style.opacity = "1";
            a.style.transform = "scale(1)";
          }, 90 + (idx * 65));
        });

        // 4. Clean up inline styles after the animation finishes
        // This ensures native range slider, pan, zoom, hover tooltips are 100% responsive.
        const totalDuration = Math.max(pointsArr.length, annotationsArr.length) * 65 + 1000;
        setTimeout(function () {
          linePaths.forEach(function (path) {
            path.style.strokeDasharray = "";
            path.style.strokeDashoffset = "";
            path.style.transition = "";
          });
          points.forEach(function (p) {
            p.style.opacity = "";
            p.style.transform = "";
            p.style.transformBox = "";
            p.style.transformOrigin = "";
            p.style.transition = "";
          });
          annotations.forEach(function (a) {
            a.style.opacity = "";
            a.style.transform = "";
            a.style.transformBox = "";
            a.style.transformOrigin = "";
            a.style.transition = "";
          });
          shapes.forEach(function (s) {
            s.style.opacity = "";
            s.style.transition = "";
          });
        }, totalDuration);

      }, 1650);
    }

    // Set up observer for scrolling down to this graph
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (container.querySelectorAll(".scatterlayer .lines path.js-line").length) {
            animateChart();
            observer.unobserve(container);
          } else {
            // If Plotly is still rendering the widget, poll until lines exist
            const poll = setInterval(function () {
              if (container.querySelectorAll(".scatterlayer .lines path.js-line").length) {
                clearInterval(poll);
                animateChart();
                observer.unobserve(container);
              }
            }, 70);
            setTimeout(function () { clearInterval(poll); }, 6000);
          }
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px"
    });

    observer.observe(container);
  });
}

// Story page figure scroll-in animation (ignores leaflet map tiles and widgets)
function initStoryFigureAnimation() {
  const figures = document.querySelectorAll("figure img, .cell-output-display img");
  if (!figures.length) return;
  figures.forEach(function (img) {
    if (img.closest(".leaflet, .leaflet-container, .html-widget")) return;
    img.style.opacity = "0";
    img.style.transform = "translateY(24px) scale(0.98)";
    img.style.transition = "opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          img.style.opacity = "1";
          img.style.transform = "translateY(0) scale(1)";
          obs.unobserve(img);
        }
      });
    }, { threshold: 0.15 });
    obs.observe(img);
  });
}

// Invalidate Leaflet map layout on page load to guarantee crisp tile alignment
window.addEventListener("load", function () {
  setTimeout(function () {
    window.dispatchEvent(new Event("resize"));
  }, 250);
});

// Meteorological Dynamic Atmospheric Background Animation
function initMeteorologyBackground() {
  if (document.getElementById("weather-bg-canvas")) return;

  const canvas = document.createElement("canvas");
  canvas.id = "weather-bg-canvas";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener("resize", resize);

  // Mouse interaction for breeze deflection
  let mouse = { x: -1000, y: -1000, active: false };
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener("mouseleave", function () {
    mouse.active = false;
  });

  // Atmospheric drifting cumulus clouds
  const cloudCount = 5;
  const clouds = [];
  for (let i = 0; i < cloudCount; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * (height * 0.75),
      speed: 0.12 + Math.random() * 0.22,
      scale: 0.7 + Math.random() * 0.7,
      opacity: 0.25 + Math.random() * 0.25,
      puffs: [
        { dx: 0, dy: 0, r: 40 + Math.random() * 20 },
        { dx: 30, dy: -10, r: 35 + Math.random() * 15 },
        { dx: 65, dy: 5, r: 32 + Math.random() * 15 },
        { dx: -30, dy: 5, r: 30 + Math.random() * 12 },
        { dx: 20, dy: 10, r: 25 + Math.random() * 10 }
      ]
    });
  }

  // Wind streamline particles (jet stream & sea breeze vectors)
  const particleCount = 45;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 1.2 + Math.random() * 1.8,
      history: [],
      maxHistory: 10 + Math.floor(Math.random() * 8),
      alpha: 0.18 + Math.random() * 0.22,
      seed: Math.random() * 100
    });
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let animId = null;
  let time = 0;

  function render() {
    ctx.clearRect(0, 0, width, height);

    // 1. Soft atmospheric sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, "rgba(224, 242, 254, 0.45)");
    skyGrad.addColorStop(0.5, "rgba(240, 249, 255, 0.25)");
    skyGrad.addColorStop(1, "rgba(248, 250, 252, 0)");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Synoptic Isobar Contours
    ctx.save();
    ctx.setLineDash([8, 14]);
    ctx.lineWidth = 1.2;
    const isobarYs = [height * 0.25, height * 0.55, height * 0.85];
    const isobarLabels = ["1020 hPa", "1016 hPa", "1012 hPa"];

    for (let j = 0; j < isobarYs.length; j++) {
      const baseY = isobarYs[j];
      ctx.beginPath();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";

      for (let x = 0; x <= width; x += 15) {
        const wave = Math.sin(x * 0.003 + time * 0.25 + j) * 28 + Math.cos(x * 0.0015 - time * 0.15) * 15;
        const y = baseY + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Isobar label
      ctx.fillStyle = "rgba(100, 116, 139, 0.35)";
      ctx.font = "10px monospace";
      const labelX = (width * 0.15 + j * (width * 0.25)) % (width - 60);
      const labelY = baseY + Math.sin(labelX * 0.003 + time * 0.25 + j) * 28 + 14;
      ctx.fillText(isobarLabels[j], labelX, labelY);
    }
    ctx.restore();

    // 3. Drifting Cumulus Clouds
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.x += c.speed;
      if (c.x - 120 * c.scale > width) {
        c.x = -150 * c.scale;
        c.y = Math.random() * (height * 0.75);
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);

      for (let p = 0; p < c.puffs.length; p++) {
        const puff = c.puffs[p];
        const radGrad = ctx.createRadialGradient(puff.dx, puff.dy, puff.r * 0.15, puff.dx, puff.dy, puff.r);
        radGrad.addColorStop(0, `rgba(255, 255, 255, ${c.opacity})`);
        radGrad.addColorStop(0.7, `rgba(240, 249, 255, ${c.opacity * 0.6})`);
        radGrad.addColorStop(1, "rgba(240, 249, 255, 0)");
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(puff.dx, puff.dy, puff.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Wind Streamline Particles
    time += 0.01;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > p.maxHistory) p.history.shift();

      let vx = p.speed * (1.2 + 0.35 * Math.sin(p.y * 0.004 + time));
      let vy = p.speed * 0.5 * Math.sin(p.x * 0.003 + p.seed);

      // Interactive mouse breeze deflection
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          vx += (dx / dist) * force * 3;
          vy += (dy / dist) * force * 3;
        }
      }

      p.x += vx;
      p.y += vy;

      if (p.x > width + 40) {
        p.x = -30;
        p.y = Math.random() * height;
        p.history = [];
      }
      if (p.y > height + 30) p.y = -20;
      if (p.y < -30) p.y = height + 20;

      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let h = 1; h < p.history.length; h++) {
          ctx.lineTo(p.history[h].x, p.history[h].y);
        }
        ctx.strokeStyle = `rgba(14, 165, 233, ${p.alpha})`;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!prefersReduced && !document.hidden) {
      animId = requestAnimationFrame(render);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !prefersReduced) {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(render);
    }
  });

  render();
}

// Continuous Meteorological Doppler Radar Sweep Animation for Navbar
function initNavbarRadar() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;

  nav.style.position = "relative";
  nav.style.overflow = "hidden";

  let canvas = document.getElementById("navbar-radar-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "navbar-radar-canvas";
    nav.prepend(canvas);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    width = nav.offsetWidth;
    height = nav.offsetHeight;
    if (width === 0 || height === 0) return;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  let sweepAngle = 0;
  let time = 0;
  let systemDrift = 0; // Eastward advection

  // Realistic Doppler weather radar rain band definitions
  // (Curving squall lines, feeder bands, and stratiform precipitation shields)
  const bandConfigs = [
    {
      name: "Frontal Squall Line",
      relX0: 0.06, relY0: 0.88,
      relX1: 0.42, relY1: 0.12,
      arc: -18,
      maxDbz: 58,
      wobbleFreq: 2.2,
      numPoints: 36
    },
    {
      name: "Convective Feeder Band",
      relX0: 0.36, relY0: 0.94,
      relX1: 0.72, relY1: 0.18,
      arc: -22,
      maxDbz: 62,
      wobbleFreq: 1.8,
      numPoints: 36
    },
    {
      name: "Stratiform Coastal Shield",
      relX0: 0.66, relY0: 0.88,
      relX1: 1.05, relY1: 0.26,
      arc: -14,
      maxDbz: 42,
      wobbleFreq: 1.5,
      numPoints: 32
    },
    {
      name: "Offshore Approach Band",
      relX0: -0.25, relY0: 0.84,
      relX1: 0.12, relY1: 0.16,
      arc: -20,
      maxDbz: 52,
      wobbleFreq: 2.0,
      numPoints: 32
    }
  ];

  const rainBands = bandConfigs.map(cfg => {
    const segments = [];
    for (let i = 0; i <= cfg.numPoints; i++) {
      segments.push({ glow: 0.35 });
    }
    return { ...cfg, segments };
  });

  let animId = null;

  function renderRadar() {
    if (width === 0 || height === 0) {
      resize();
      if (width === 0 || height === 0) {
        animId = requestAnimationFrame(renderRadar);
        return;
      }
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Deep Meteorology Console Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, width, 0);
    bgGrad.addColorStop(0, "rgba(2, 10, 20, 0.96)");
    bgGrad.addColorStop(0.5, "rgba(4, 18, 32, 0.94)");
    bgGrad.addColorStop(1, "rgba(2, 12, 24, 0.96)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Radar Center Anchor (station location near Tampa Bay title)
    const cx = Math.max(140, width * 0.16);
    const cy = height * 0.5;
    const maxRadius = Math.hypot(width - cx, height);

    // 2. Faint Range Rings (NEXRAD Distance Calibration Arcs)
    ctx.save();
    ctx.strokeStyle = "rgba(16, 185, 129, 0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    const ringStep = 90;
    for (let r = ringStep; r < maxRadius; r += ringStep) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Azimuth Radial Spokes
    ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
    ctx.setLineDash([2, 5]);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxRadius, cy + Math.sin(a) * maxRadius);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Update and Draw Realistic Doppler Radar Rain Patterns
    time += 0.012;
    systemDrift += 0.14;
    if (systemDrift > width * 0.35) systemDrift = 0;

    sweepAngle = (sweepAngle + 0.024) % (Math.PI * 2);

    for (const band of rainBands) {
      const pts = [];
      const N = band.numPoints;
      const driftX = systemDrift;

      for (let i = 0; i <= N; i++) {
        const t = i / N;
        let x = band.relX0 * width + (band.relX1 - band.relX0) * width * t + driftX;
        if (x > width * 1.15) x -= width * 1.35;

        const arcY = Math.sin(t * Math.PI) * band.arc;
        const waveY = Math.sin(t * band.wobbleFreq * Math.PI + time) * 4;
        const y = band.relY0 * height + (band.relY1 - band.relY0) * height * t + arcY + waveY;

        const angle = Math.atan2(y - cy, x - cx);
        let diff = (sweepAngle - angle) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;

        const seg = band.segments[i];
        if (diff < 0.18) {
          seg.glow = 1.0;
        } else {
          seg.glow = Math.max(0.28, seg.glow * 0.985);
        }

        const profile = Math.sin(t * Math.PI);
        pts.push({ x, y, intensity: profile, glow: seg.glow });
      }

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // --- Layer A: Wide Outer Light Rain Shield (Greens, ~20–30 dBZ) ---
      for (let i = 0; i < N; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        if (p1.x < -60 && p2.x < -60) continue;
        if (p1.x > width + 60 && p2.x > width + 60) continue;

        const avgGlow = (p1.glow + p2.glow) * 0.5;
        const avgInt = (p1.intensity + p2.intensity) * 0.5;
        const alpha = (0.2 + avgGlow * 0.65) * 0.75;
        const w = (18 + avgInt * 16);

        ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Feathered lateral wisps (radar cloud fringe scatter)
        if (i % 3 === 0 && avgInt > 0.3) {
          const normalX = -(p2.y - p1.y);
          const normalY = p2.x - p1.x;
          const len = Math.hypot(normalX, normalY) || 1;
          const wispLen = (8 + 10 * Math.sin(i * 1.7 + time)) * avgInt;
          ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.5})`;
          ctx.lineWidth = w * 0.45;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1.x + (normalX / len) * wispLen, p1.y + (normalY / len) * wispLen);
          ctx.stroke();
        }
      }

      // --- Layer B: Intermediate Moderate Rain Band (Yellows, ~35–42 dBZ) ---
      for (let i = 0; i < N; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const avgInt = (p1.intensity + p2.intensity) * 0.5;
        if (avgInt < 0.25) continue;
        if (p1.x < -50 && p2.x < -50) continue;
        if (p1.x > width + 50 && p2.x > width + 50) continue;

        const avgGlow = (p1.glow + p2.glow) * 0.5;
        const alpha = (0.25 + avgGlow * 0.7) * 0.85;
        const w = (10 + avgInt * 10);

        ctx.strokeStyle = `rgba(234, 179, 8, ${alpha})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // --- Layer C: Heavy Precipitation Ribbons (Oranges, ~45–52 dBZ) ---
      if (band.maxDbz >= 48) {
        for (let i = 0; i < N; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const avgInt = (p1.intensity + p2.intensity) * 0.5;
          if (avgInt < 0.45) continue;
          if (p1.x < -40 && p2.x < -40) continue;
          if (p1.x > width + 40 && p2.x > width + 40) continue;

          const avgGlow = (p1.glow + p2.glow) * 0.5;
          const alpha = (0.3 + avgGlow * 0.7) * 0.9;
          const w = (5 + avgInt * 6);

          ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // --- Layer D: Severe Convective Cores (Crimson Red & Magenta >55 dBZ) ---
      if (band.maxDbz >= 55) {
        for (let i = 0; i < N; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const avgInt = (p1.intensity + p2.intensity) * 0.5;
          if (avgInt < 0.65) continue;
          if (p1.x < -30 && p2.x < -30) continue;
          if (p1.x > width + 30 && p2.x > width + 30) continue;

          const avgGlow = (p1.glow + p2.glow) * 0.5;
          const alpha = (0.35 + avgGlow * 0.65) * 0.95;

          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Embedded hail / lightning core hotspot
          if (avgInt > 0.85 && band.maxDbz > 60) {
            ctx.strokeStyle = `rgba(244, 114, 182, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

    // 5. Rotating Doppler Radar Sweep Beam & Phosphor Trailing Cone
    const trailSegments = 24;
    const trailSpan = 0.65; // ~37 degrees
    for (let s = 0; s < trailSegments; s++) {
      const a1 = sweepAngle - (trailSpan * (s + 1) / trailSegments);
      const a2 = sweepAngle - (trailSpan * s / trailSegments);
      const frac = 1 - (s / trailSegments);
      const alpha = Math.pow(frac, 2.2) * 0.25;

      ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, a1, a2);
      ctx.closePath();
      ctx.fill();
    }

    // Leading Sweep Beam Ray
    const beamX = cx + Math.cos(sweepAngle) * maxRadius;
    const beamY = cy + Math.sin(sweepAngle) * maxRadius;

    ctx.save();
    ctx.shadowColor = "rgba(74, 222, 128, 0.9)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(187, 247, 208, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(beamX, beamY);
    ctx.stroke();
    ctx.restore();

    // Radar Center Station Blip (KTPA WSR-88D Anchor)
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(134, 239, 172, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Corner Telemetry Stamp
    ctx.fillStyle = "rgba(74, 222, 128, 0.45)";
    ctx.font = "600 9px monospace";
    ctx.textAlign = "right";
    ctx.fillText("📡 KTPA WSR-88D DOPPLER RADAR • BASE REFLECTIVITY", width - 15, height - 8);

    if (!document.hidden) {
      animId = requestAnimationFrame(renderRadar);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(renderRadar);
    }
  });

  renderRadar();
}

document.addEventListener("DOMContentLoaded", function () {
  initNavbarRadar();
  initMeteorologyBackground();
  fetchLiveKTPAWeather();
  initLiveCardScrollAnimation();
  initPlotlyScrollAnimations();
  initStoryFigureAnimation();

  // Retry attaching to Plotly widgets as HTMLWidgets initializes them
  setTimeout(initPlotlyScrollAnimations, 300);
  setTimeout(initPlotlyScrollAnimations, 800);
  setTimeout(initPlotlyScrollAnimations, 1500);

  // Automatically poll every 3 minutes
  setInterval(fetchLiveKTPAWeather, 180000);
  // Initial sync attempt after 1.5s to let Plotly widget render
  setTimeout(syncChartWithLatestTelemetry, 1500);
});

