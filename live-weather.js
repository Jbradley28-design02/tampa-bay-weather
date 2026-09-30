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
  nav.style.overflow = "visible";

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

// Comprehensive Hurricane Cyclone Simulators Database for Florida & Tampa Bay
const HURRICANE_SIMULATOR_DATA = {
  hermine: {
    name: "Hurricane Hermine",
    title: "Hurricane Hermine: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: St. Marks / Big Bend",
    landfallSub: "Cat 1 (80 mph) • Sep 2, 2016 • 1:30 AM EDT",
    landfallLon: -84.14,
    landfallLat: 30.15,
    radii: [
      { r: 2.10, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.70, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.35, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -85.20, lat: 27.20, label: "East Gulf" },
      { lon: -84.70, lat: 28.60, label: "West of Tampa (~95 mi)" },
      { lon: -84.14, lat: 30.15, label: "Landfall: St. Marks (Cat 1, 80 mph)" },
      { lon: -83.40, lat: 31.00, label: "Inland GA" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • ONSHORE SW GALES",
      sub: "2–3 ft Coastal Surge Inundation • 6.67 in Rain Deluge"
    },
    specialMarker: null
  },
  irma: {
    name: "Hurricane Irma",
    title: "Hurricane Irma: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "MAINLAND LANDFALL: Marco Island",
    landfallSub: "Cat 3 (115 mph) • Sep 10, 2017 • 3:35 PM EDT",
    landfallLon: -81.72,
    landfallLat: 25.94,
    radii: [
      { r: 2.35, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.95, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.38, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -81.38, lat: 24.70, label: "Cudjoe Key (Cat 4, 130 mph)" },
      { lon: -81.72, lat: 25.94, label: "Marco Island Landfall (Cat 3, 115 mph)" },
      { lon: -81.82, lat: 26.50, label: "Naples" },
      { lon: -81.88, lat: 27.10, label: "Hardee County" },
      { lon: -82.02, lat: 27.75, label: "East of Tampa (~25 mi)" },
      { lon: -82.18, lat: 28.35, label: "Pasco County" },
      { lon: -82.35, lat: 29.20, label: "North Florida" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • OFFSHORE NE GALES",
      sub: "Negative Surge Drained Bay Bed • Gusts 66 mph"
    },
    specialMarker: {
      lon: -81.38,
      lat: 24.70,
      label: "1st FL Landfall: Cudjoe Key (Cat 4, 130 mph)"
    }
  },
  michael: {
    name: "Hurricane Michael",
    title: "Hurricane Michael: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Mexico Beach / Tyndall",
    landfallSub: "Cat 5 (160 mph) • Oct 10, 2018 • 1:30 PM EDT",
    landfallLon: -85.42,
    landfallLat: 29.94,
    radii: [
      { r: 2.40, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.85, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.30, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -86.20, lat: 26.20, label: "Gulf of Mexico" },
      { lon: -86.00, lat: 27.80, label: "West of Tampa (~220 mi)" },
      { lon: -85.70, lat: 29.00, label: "Rapid Deepening" },
      { lon: -85.42, lat: 29.94, label: "Landfall: Mexico Beach (Cat 5, 160 mph)" },
      { lon: -84.80, lat: 31.10, label: "Georgia" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • OFFSHORE EASTERLY GALES",
      sub: "Reverse Negative Surge Drained Bay • Far-West Transit"
    },
    specialMarker: null
  },
  ian: {
    name: "Hurricane Ian",
    title: "Hurricane Ian: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Cayo Costa / Punta Gorda",
    landfallSub: "Cat 4/5 (150 mph) • Sep 28, 2022 • 3:05 PM EDT",
    landfallLon: -82.25,
    landfallLat: 26.68,
    radii: [
      { r: 2.45, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.95, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.40, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -82.80, lat: 24.50, label: "Dry Tortugas" },
      { lon: -82.60, lat: 25.80, label: "SW Coast Approach" },
      { lon: -82.25, lat: 26.68, label: "Landfall: Cayo Costa (Cat 4/5, 150 mph)" },
      { lon: -81.80, lat: 27.40, label: "Arcadia / Hardee" },
      { lon: -81.20, lat: 28.30, label: "Central Florida / Cape Canaveral" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • OFFSHORE NE GALES",
      sub: "Historic Negative Surge Drained Bay Bed • Mudflats Exposed"
    },
    specialMarker: null
  },
  idalia: {
    name: "Hurricane Idalia",
    title: "Hurricane Idalia: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Keaton Beach / Big Bend",
    landfallSub: "Cat 3 (125 mph) • Aug 30, 2023 • 7:45 AM EDT",
    landfallLon: -83.59,
    landfallLat: 29.82,
    radii: [
      { r: 2.30, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.75, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.32, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -85.00, lat: 25.50, label: "SE Gulf" },
      { lon: -84.60, lat: 27.20, label: "West of Tampa (~115 mi)" },
      { lon: -84.05, lat: 28.70, label: "Offshore Nature Coast" },
      { lon: -83.59, lat: 29.82, label: "Landfall: Keaton Beach (Cat 3, 125 mph)" },
      { lon: -83.00, lat: 31.00, label: "Georgia" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • ONSHORE SW WINDS",
      sub: "Astronomical High Tide Surge • Bayshore Blvd Inundated"
    },
    specialMarker: null
  },
  debby: {
    name: "Hurricane Debby",
    title: "Hurricane Debby: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Steinhatchee / Big Bend",
    landfallSub: "Cat 1 (80 mph) • Aug 5, 2024 • 7:00 AM EDT",
    landfallLon: -83.38,
    landfallLat: 29.67,
    radii: [
      { r: 2.20, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.65, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.36, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -84.40, lat: 26.20, label: "Eastern Gulf" },
      { lon: -84.20, lat: 27.60, label: "Parallel to Tampa (~100 mi)" },
      { lon: -83.80, lat: 28.80, label: "Northern Gulf" },
      { lon: -83.38, lat: 29.67, label: "Landfall: Steinhatchee (Cat 1, 80 mph)" },
      { lon: -82.80, lat: 30.70, label: "North Florida" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • HISTORIC RAIN CONVEYOR",
      sub: "Modern 24-hr Record 16.14 in Deluge • Severe Flooding"
    },
    specialMarker: null
  },
  helene: {
    name: "Hurricane Helene",
    title: "Hurricane Helene: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Perry / Big Bend",
    landfallSub: "Cat 4 (140 mph) • Sep 26, 2024 • 11:10 PM EDT",
    landfallLon: -83.90,
    landfallLat: 30.00,
    radii: [
      { r: 3.50, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 1.15, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.50, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -86.20, lat: 24.50, label: "Yucatan Channel Exit" },
      { lon: -85.60, lat: 26.50, label: "Deep Eastern Gulf" },
      { lon: -84.90, lat: 28.30, label: "West of Tampa (~125 mi)" },
      { lon: -83.90, lat: 30.00, label: "Landfall: Big Bend (Cat 4, 140 mph)" },
      { lon: -83.20, lat: 32.00, label: "Inland Acceleration" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • MASSIVE ONSHORE SW SURGE",
      sub: "Catastrophic 6–7 ft All-Time Record Surge • 400-mi Wind Field"
    },
    specialMarker: null
  },
  milton: {
    name: "Hurricane Milton",
    title: "Hurricane Milton: Animated Cloud Formation & Cyclonic Wind Field",
    landfallLabel: "LANDFALL: Siesta Key / Sarasota",
    landfallSub: "Cat 3 (120 mph) • Oct 9, 2024 • 8:30 PM EDT",
    landfallLon: -82.55,
    landfallLat: 27.27,
    radii: [
      { r: 2.30, color: "rgba(245, 158, 11, 0.12)", stroke: "rgba(245, 158, 11, 0.65)", dash: [4, 4] },
      { r: 0.85, color: "rgba(239, 68, 68, 0.15)", stroke: "rgba(239, 68, 68, 0.75)", dash: [6, 4] },
      { r: 0.35, color: "rgba(153, 27, 27, 0.30)", stroke: "rgba(220, 38, 38, 0.95)", dash: [] }
    ],
    track: [
      { lon: -86.00, lat: 24.00, label: "Southern Gulf" },
      { lon: -84.40, lat: 25.80, label: "NE Approach" },
      { lon: -82.55, lat: 27.27, label: "Landfall: Siesta Key (Cat 3, 120 mph)" },
      { lon: -81.40, lat: 28.20, label: "East of Tampa / Polk" },
      { lon: -80.00, lat: 28.70, label: "Atlantic Exit" }
    ],
    tampaCallout: {
      header: "TAMPA BAY (KTPA) • DIRECT STRIKE JUST SOUTH",
      sub: "16.03 in Deluge • Eyewall Wind Gusts 100+ mph (Tropicana Roof)"
    },
    specialMarker: null
  }
};

// Florida coastline polygon coordinates shared across simulators
const flCoords = [
  [-85.02,31],[-84.98,30.92],[-84.94,30.89],[-84.94,30.79],[-84.88,30.73],[-84.37,30.69],[-84.09,30.68],
  [-83.76,30.66],[-83.38,30.63],[-83.12,30.62],[-82.6,30.58],[-82.21,30.56],[-82.24,30.53],[-82.21,30.49],
  [-82.21,30.4],[-82.16,30.36],[-82.09,30.36],[-82.05,30.38],[-82.03,30.52],[-82.03,30.58],[-82.05,30.7],
  [-82.05,30.75],[-82.02,30.79],[-81.98,30.79],[-81.96,30.81],[-81.93,30.83],[-81.88,30.81],[-81.8,30.79],
  [-81.75,30.77],[-81.69,30.73],[-81.65,30.74],[-81.6,30.72],[-81.54,30.69],[-81.51,30.68],[-81.48,30.68],
  [-81.45,30.68],[-81.46,30.64],[-81.47,30.6],[-81.46,30.56],[-81.45,30.52],[-81.43,30.46],[-81.46,30.39],
  [-81.44,30.37],[-81.4,30.39],[-81.37,30.32],[-81.35,30.19],[-81.29,29.97],[-81.29,29.88],[-81.25,29.83],
  [-81.25,29.73],[-81.21,29.69],[-81.2,29.64],[-81.11,29.43],[-81.08,29.36],[-80.97,29.16],[-80.96,29.06],
  [-80.93,29.05],[-80.9,29.01],[-80.86,28.89],[-80.76,28.76],[-80.78,28.75],[-80.84,28.79],[-80.82,28.65],
  [-80.72,28.34],[-80.59,28.07],[-80.48,27.85],[-80.41,27.72],[-80.36,27.61],[-80.33,27.51],[-80.31,27.43],
  [-80.24,27.3],[-80.2,27.2],[-80.21,27.15],[-80.15,27.14],[-80.12,27.08],[-80.08,26.96],[-80.05,26.83],
  [-80.04,26.68],[-80.06,26.52],[-80.09,26.32],[-80.1,26.17],[-80.12,26.09],[-80.13,26.01],[-80.14,25.9],
  [-80.13,25.82],[-80.13,25.78],[-80.16,25.78],[-80.17,25.82],[-80.17,25.86],[-80.2,25.83],[-80.21,25.75],
  [-80.25,25.72],[-80.28,25.64],[-80.31,25.62],[-80.32,25.57],[-80.33,25.53],[-80.36,25.46],[-80.33,25.39],
  [-80.33,25.35],[-80.39,25.3],[-80.43,25.27],[-80.44,25.22],[-80.49,25.23],[-80.52,25.2],[-80.59,25.24],
  [-80.59,25.2],[-80.63,25.19],[-80.71,25.16],[-80.83,25.18],[-80.9,25.18],[-80.96,25.14],[-81.04,25.14],
  [-81.11,25.14],[-81.17,25.2],[-81.18,25.27],[-81.17,25.32],[-81.12,25.32],[-81.08,25.27],[-81.02,25.23],
  [-80.96,25.23],[-80.92,25.26],[-80.92,25.3],[-80.92,25.32],[-80.96,25.32],[-80.99,25.33],[-81.02,25.36],
  [-81.06,25.38],[-81.1,25.38],[-81.15,25.4],[-81.18,25.47],[-81.22,25.51],[-81.21,25.55],[-81.25,25.57],
  [-81.29,25.66],[-81.33,25.7],[-81.38,25.8],[-81.46,25.86],[-81.53,25.89],[-81.57,25.91],[-81.61,25.91],
  [-81.65,25.91],[-81.69,25.91],[-81.72,25.92],[-81.78,26],[-81.85,26.24],[-81.85,26.33],[-81.85,26.4],
  [-81.88,26.43],[-81.89,26.45],[-81.93,26.45],[-81.99,26.49],[-82.01,26.52],[-81.99,26.55],[-82.05,26.55],
  [-82.06,26.59],[-82.08,26.65],[-82.1,26.69],[-82.08,26.76],[-82.08,26.86],[-82.11,26.91],[-82.09,26.93],
  [-82.04,26.96],[-82.05,26.98],[-82.1,26.96],[-82.13,26.96],[-82.17,26.96],[-82.25,27],[-82.26,26.97],
  [-82.17,26.88],[-82.16,26.82],[-82.2,26.82],[-82.24,26.83],[-82.27,26.84],[-82.29,26.85],[-82.35,26.94],
  [-82.39,26.97],[-82.43,27.03],[-82.48,27.1],[-82.47,27.15],[-82.52,27.23],[-82.56,27.35],[-82.57,27.41],
  [-82.63,27.45],[-82.68,27.47],[-82.66,27.53],[-82.63,27.53],[-82.58,27.54],[-82.59,27.58],[-82.59,27.61],
  [-82.56,27.65],[-82.56,27.67],[-82.52,27.69],[-82.48,27.71],[-82.48,27.75],[-82.47,27.77],[-82.39,27.85],
  [-82.4,27.87],[-82.41,27.91],[-82.43,27.95],[-82.45,27.96],[-82.47,27.93],[-82.48,27.87],[-82.49,27.84],
  [-82.52,27.85],[-82.54,27.9],[-82.54,27.96],[-82.6,27.99],[-82.64,28.02],[-82.66,28.01],[-82.68,28.04],
  [-82.7,28.04],[-82.71,27.98],[-82.73,27.96],[-82.72,27.93],[-82.65,27.89],[-82.63,27.87],[-82.64,27.86],
  [-82.63,27.81],[-82.64,27.78],[-82.64,27.73],[-82.68,27.72],[-82.7,27.74],[-82.74,27.75],[-82.76,27.78],
  [-82.78,27.85],[-82.8,27.85],[-82.82,27.83],[-82.84,27.87],[-82.85,27.93],[-82.8,28.01],[-82.79,28.09],
  [-82.8,28.17],[-82.78,28.21],[-82.74,28.28],[-82.73,28.34],[-82.71,28.4],[-82.68,28.44],[-82.69,28.48],
  [-82.67,28.53],[-82.66,28.58],[-82.67,28.64],[-82.65,28.67],[-82.64,28.72],[-82.65,28.76],[-82.64,28.79],
  [-82.67,28.81],[-82.69,28.83],[-82.69,28.84],[-82.68,28.87],[-82.64,28.87],[-82.62,28.89],[-82.65,28.92],
  [-82.71,28.96],[-82.72,29],[-82.75,29.03],[-82.74,29.07],[-82.76,29.08],[-82.8,29.09],[-82.8,29.14],
  [-82.81,29.17],[-82.88,29.18],[-83.01,29.19],[-83.07,29.21],[-83.07,29.24],[-83.09,29.29],[-83.14,29.3],
  [-83.16,29.34],[-83.19,29.4],[-83.23,29.44],[-83.27,29.44],[-83.3,29.44],[-83.31,29.47],[-83.35,29.5],
  [-83.39,29.52],[-83.39,29.58],[-83.41,29.63],[-83.45,29.68],[-83.49,29.73],[-83.53,29.73],[-83.57,29.77],
  [-83.6,29.79],[-83.58,29.82],[-83.59,29.85],[-83.66,29.9],[-83.74,29.96],[-83.81,29.99],[-83.94,30.08],
  [-84.03,30.11],[-84.1,30.1],[-84.16,30.09],[-84.21,30.11],[-84.25,30.11],[-84.28,30.09],[-84.31,30.07],
  [-84.36,30.07],[-84.39,30.02],[-84.37,29.99],[-84.42,29.99],[-84.41,29.97],[-84.35,29.95],[-84.36,29.92],
  [-84.37,29.91],[-84.44,29.93],[-84.47,29.94],[-84.5,29.92],[-84.53,29.93],[-84.63,29.88],[-84.81,29.8],
  [-84.88,29.76],[-84.9,29.77],[-84.88,29.81],[-84.92,29.82],[-84.95,29.79],[-84.99,29.78],[-85.01,29.74],
  [-85.06,29.74],[-85.17,29.74],[-85.22,29.73],[-85.26,29.71],[-85.32,29.71],[-85.36,29.68],[-85.4,29.69],
  [-85.45,29.78],[-85.45,29.85],[-85.44,29.88],[-85.41,29.9],[-85.41,29.82],[-85.41,29.75],[-85.36,29.71],
  [-85.33,29.76],[-85.33,29.85],[-85.38,29.9],[-85.39,29.95],[-85.45,29.97],[-85.51,29.99],[-85.53,30.03],
  [-85.69,30.13],[-85.67,30.14],[-85.52,30.07],[-85.5,30.09],[-85.53,30.15],[-85.57,30.15],[-85.62,30.15],
  [-85.68,30.17],[-85.73,30.21],[-85.7,30.25],[-85.69,30.28],[-85.72,30.27],[-85.74,30.28],[-85.78,30.33],
  [-85.82,30.3],[-85.87,30.28],[-85.85,30.25],[-85.8,30.27],[-85.78,30.25],[-85.75,30.24],[-85.75,30.21],
  [-85.75,30.15],[-85.87,30.22],[-85.99,30.29]
];

// Interactive Real-Time Hurricane Cyclone Simulator (Spinning Clouds & Wind Field Points)
function initCycloneSimulator(canvas, stormKeyOverride) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const stormKey = stormKeyOverride || canvas.dataset.storm || (canvas.id ? canvas.id.replace("-cyclone-canvas", "") : "irma");
  const config = HURRICANE_SIMULATOR_DATA[stormKey] || HURRICANE_SIMULATOR_DATA.irma;

  let isPaused = false;
  let speedMultiplier = 1.0;

  const pauseBtn = document.getElementById(`${stormKey}-toggle-spin`) || document.getElementById("irma-toggle-spin");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
    });
  }

  const speedBtn = document.getElementById(`${stormKey}-speed-spin`) || document.getElementById("irma-speed-spin");
  if (speedBtn) {
    speedBtn.addEventListener("click", function () {
      if (speedMultiplier === 1.0) {
        speedMultiplier = 2.0;
        speedBtn.textContent = "⚡ 2x Speed";
      } else if (speedMultiplier === 2.0) {
        speedMultiplier = 0.5;
        speedBtn.textContent = "🐢 0.5x Speed";
      } else {
        speedMultiplier = 1.0;
        speedBtn.textContent = "⚡ 1x Speed";
      }
    });
  }

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width || 800;
    height = 560;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  // Geographic domain bounds matching the Gulf & Florida peninsula
  const minLon = -86.2, maxLon = -79.0;
  const minLat = 23.6, maxLat = 30.8;
  const landfallLon = config.landfallLon;
  const landfallLat = config.landfallLat;
  const tampaLon = -82.53, tampaLat = 27.98;

  function toX(lon) {
    return ((lon - minLon) / (maxLon - minLon)) * width;
  }
  function toY(lat) {
    return ((maxLat - lat) / (maxLat - minLat)) * height;
  }

  // 1. Logarithmic Spiral Cloud Formation System
  const armOffsets = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  const cloudArms = armOffsets.map(offset => {
    const puffs = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const theta = 0.35 + (i / count) * 3.85;
      const baseR = 0.25 * Math.exp(0.56 * theta);
      puffs.push({
        theta: theta,
        offset: offset,
        r: baseR,
        radius: 12 + (i / count) * 24 + Math.random() * 6,
        alpha: Math.max(0.08, 0.32 - (i / count) * 0.20),
        pulseSeed: Math.random() * 10
      });
    }
    return puffs;
  });

  // Central Dense Overcast (CDO) Eyewall Cloud Deck
  const cdoPuffs = [];
  for (let i = 0; i < 16; i++) {
    cdoPuffs.push({
      angle: (i / 16) * Math.PI * 2,
      dist: 0.15 + Math.random() * 0.24,
      radius: 20 + Math.random() * 18,
      alpha: 0.22 + Math.random() * 0.18,
      seed: Math.random() * 10
    });
  }

  // 2. Cyclonic Wind Field Points & Streamlines
  const particleCount = 135;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      r: 0.40 + Math.random() * 3.6,
      phi: Math.random() * Math.PI * 2,
      trail: [],
      maxTrail: 6 + Math.floor(Math.random() * 6),
      alpha: 0.3 + Math.random() * 0.5,
      speedVariance: 0.85 + Math.random() * 0.3
    });
  }

  let spinAngle = 0;
  let time = 0;
  let animId = null;

  function renderStorm() {
    if (width === 0 || height === 0) {
      resize();
      if (width === 0 || height === 0) {
        animId = requestAnimationFrame(renderStorm);
        return;
      }
    }

    if (!isPaused) {
      time += 0.016 * speedMultiplier;
      spinAngle = (spinAngle + 0.012 * speedMultiplier) % (Math.PI * 2);
    }

    // 1. Dark oceanic canvas backdrop
    ctx.fillStyle = "#09101d";
    ctx.fillRect(0, 0, width, height);

    // Subtle geographic lat/lon gridlines
    ctx.save();
    ctx.strokeStyle = "rgba(51, 65, 85, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    for (let lon = -86; lon <= -80; lon += 1) {
      const gx = toX(lon);
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(lon + "°W", gx + 4, height - 10);
    }
    for (let lat = 24; lat <= 30; lat += 2) {
      const gy = toY(lat);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(lat + "°N", 8, gy - 4);
    }
    ctx.restore();

    // 2. Florida Coastline & Landmass
    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    flCoords.forEach((pt, idx) => {
      const px = toX(pt[0]);
      const py = toY(pt[1]);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Center coordinates for storm
    const cx = toX(landfallLon);
    const cy = toY(landfallLat);
    const pxPerDegX = width / (maxLon - minLon);
    const pxPerDegY = height / (maxLat - minLat);

    // 3. Concentric Wind Intensity Radii
    const radiiZones = config.radii;
    radiiZones.forEach(z => {
      ctx.save();
      ctx.fillStyle = z.color;
      ctx.strokeStyle = z.stroke;
      ctx.lineWidth = 1.3;
      if (z.dash && z.dash.length) ctx.setLineDash(z.dash);
      ctx.beginPath();
      ctx.ellipse(cx, cy, z.r * pxPerDegX * 1.15, z.r * pxPerDegY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 4. Historical Track Line
    ctx.save();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    config.track.forEach((pt, i) => {
      const tx = toX(pt.lon);
      const ty = toY(pt.lat);
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    });
    ctx.stroke();
    config.track.forEach(pt => {
      const tx = toX(pt.lon);
      const ty = toY(pt.lat);
      ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 5. ANIMATED HURRICANE CLOUD FORMATION (Logarithmic Spiral Rainbands + CDO)
    cdoPuffs.forEach(puff => {
      const curAngle = puff.angle + spinAngle * 1.25;
      const curDist = puff.dist * (1 + 0.05 * Math.sin(time * 2 + puff.seed));
      const lon = landfallLon + curDist * Math.cos(curAngle) * 1.15;
      const lat = landfallLat + curDist * Math.sin(curAngle);
      const px = toX(lon);
      const py = toY(lat);

      const grad = ctx.createRadialGradient(px, py, puff.radius * 0.15, px, py, puff.radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${puff.alpha})`);
      grad.addColorStop(0.65, `rgba(224, 242, 254, ${puff.alpha * 0.55})`);
      grad.addColorStop(1, "rgba(224, 242, 254, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, puff.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    cloudArms.forEach(arm => {
      arm.forEach(p => {
        const curAngle = (-p.theta + p.offset) + spinAngle * 0.85;
        const lon = landfallLon + p.r * Math.cos(curAngle) * 1.15;
        const lat = landfallLat + p.r * Math.sin(curAngle);
        const px = toX(lon);
        const py = toY(lat);

        const curRadius = p.radius * (0.95 + 0.1 * Math.sin(time + p.pulseSeed));
        const grad = ctx.createRadialGradient(px, py, curRadius * 0.12, px, py, curRadius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        grad.addColorStop(0.6, `rgba(224, 242, 254, ${p.alpha * 0.65})`);
        grad.addColorStop(1, "rgba(224, 242, 254, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, curRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // 6. ANIMATED CYCLONIC WIND FIELD POINTS & STREAMLINES
    particles.forEach(p => {
      if (!isPaused) {
        const omega = (0.024 * (1.15 / Math.pow(Math.max(0.4, p.r), 0.55))) * p.speedVariance * speedMultiplier;
        p.phi += omega;
        const vr = (-omega * 0.18) * speedMultiplier;
        p.r += vr;

        if (p.r < 0.36 || p.r > 4.2) {
          p.r = 2.6 + Math.random() * 1.4;
          p.phi = Math.random() * Math.PI * 2;
          p.trail = [];
          p.alpha = 0.1;
        } else {
          p.alpha = Math.min(0.85, p.alpha + 0.02);
        }
      }

      const lon = landfallLon + p.r * Math.cos(p.phi) * 1.15;
      const lat = landfallLat + p.r * Math.sin(p.phi);
      const px = toX(lon);
      const py = toY(lat);

      if (!isPaused) {
        p.trail.push({ x: px, y: py });
        if (p.trail.length > p.maxTrail) p.trail.shift();
      }

      const windAngle = p.phi + Math.PI / 2 + 0.35;
      const arrowLen = p.r < 0.95 ? 12 : (p.r < 2.35 ? 9 : 7);
      const vx = Math.cos(windAngle) * arrowLen;
      const vy = -Math.sin(windAngle) * arrowLen;

      let strokeColor, fillColor;
      if (p.r < 0.95) {
        strokeColor = `rgba(239, 68, 68, ${p.alpha})`;
        fillColor = "#ef4444";
      } else if (p.r < 2.35) {
        strokeColor = `rgba(56, 189, 248, ${p.alpha})`;
        fillColor = "#38bdf8";
      } else {
        strokeColor = `rgba(148, 163, 184, ${p.alpha * 0.75})`;
        fillColor = "#94a3b8";
      }

      if (p.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = p.r < 0.95 ? 1.6 : 1.2;
        ctx.beginPath();
        p.trail.forEach((t, idx) => {
          if (idx === 0) ctx.moveTo(t.x, t.y);
          else ctx.lineTo(t.x, t.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + vx, py + vy);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(px, py, p.r < 0.95 ? 2.4 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. KEY LANDMARKS & ANNOTATIONS
    if (config.specialMarker) {
      const skx = toX(config.specialMarker.lon);
      const sky = toY(config.specialMarker.lat);
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(skx, sky, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(30, 27, 75, 0.88)";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(skx - 105, sky + 10, 210, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(config.specialMarker.label, skx, sky + 25);
    }

    // Tampa Bay (KTPA) Station & Wind Callout
    const tpx = toX(tampaLon);
    const tpy = toY(tampaLat);
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(tpx, tpy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    const tPulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + 0.4 * (1 - tPulse)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tpx, tpy, 8 + tPulse * 8, 0, Math.PI * 2);
    ctx.stroke();

    const calloutYOffset = (Math.abs(cy - tpy) < 65 && Math.abs(cx - tpx) < 85) ? -68 : -54;
    ctx.fillStyle = "rgba(8, 47, 73, 0.92)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(tpx - 145, tpy + calloutYOffset, 290, 44, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(config.tampaCallout.header, tpx, tpy + calloutYOffset + 16);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.fillText(config.tampaCallout.sub, tpx, tpy + calloutYOffset + 32);

    // Storm Landfall Center Marker (Eye)
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const eyePulse = (Math.sin(time * 4) + 1) * 0.5;
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + 0.5 * (1 - eyePulse)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + eyePulse * 12, 0, Math.PI * 2);
    ctx.stroke();

    const eyeBoxX = cx > width - 260 ? cx - 255 : cx + 14;
    const eyeBoxY = cy < 60 ? cy + 14 : cy - 20;
    ctx.fillStyle = "rgba(127, 29, 29, 0.92)";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(eyeBoxX, eyeBoxY, 245, 42, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(config.landfallLabel, eyeBoxX + 8, eyeBoxY + 15);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "10px sans-serif";
    ctx.fillText(config.landfallSub, eyeBoxX + 8, eyeBoxY + 32);

    // 8. On-Canvas Legend & Dynamic HUD Telemetry
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(width - 235, 14, 220, 105, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CYCLONIC WIND FIELD", width - 222, 32);

    const legendItems = [
      { color: "#ef4444", text: "Hurricane Force (74+ mph)" },
      { color: "#38bdf8", text: "Tropical Storm (39-73 mph)" },
      { color: "#94a3b8", text: "Outer Gale (< 39 mph)" },
      { color: "rgba(255, 255, 255, 0.75)", text: "Convective Cloud Rainbands" }
    ];
    legendItems.forEach((item, idx) => {
      const ly = 50 + idx * 16;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(width - 216, ly - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px sans-serif";
      ctx.fillText(item.text, width - 204, ly);
    });
    ctx.restore();

    // Circulation Dynamics Callout (Bottom Left)
    ctx.save();
    ctx.fillStyle = "rgba(3, 13, 23, 0.90)";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, height - 68, 250, 52, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("⟲ COUNTER-CLOCKWISE VORTEX", 24, height - 52);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9.5px sans-serif";
    ctx.fillText("• Inward Surface Inflow: ~20° friction deflection", 24, height - 37);
    ctx.fillText("• Status: Live Continuous Simulation", 24, height - 23);
    ctx.restore();

    if (!document.hidden) {
      animId = requestAnimationFrame(renderStorm);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(renderStorm);
    }
  });

  renderStorm();
}

function initAllCycloneSimulators() {
  const canvases = document.querySelectorAll("canvas.cyclone-simulator-canvas, canvas[id$='-cyclone-canvas']");
  canvases.forEach(canvas => {
    initCycloneSimulator(canvas);
  });
}

function initIrmaCycloneAnimation() {
  initAllCycloneSimulators();
}

document.addEventListener("DOMContentLoaded", function () {
  initNavbarRadar();
  initMeteorologyBackground();
  initIrmaCycloneAnimation();
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

