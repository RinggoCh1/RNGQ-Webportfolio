// ==========================================================
// Background music + blurred equaliser
// Add ONE line to the bottom of every page, after script.js:
//   <script src="JS/music.js"></script>
// It injects its own styles, the prompt pill and the canvas.
// ==========================================================
(() => {
  // CHANGE THIS to your real file (path is relative to each HTML page)
  const MUSIC_SRC = "assets/audio/bg-music.m4a";
  const VOLUME = 0.35;
  const BARS = 32;
  const KEY = "rngq-bgm";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Styles (reuses .btn from style.css) ----------
  const style = document.createElement("style");
  style.textContent = `
    .bgm-canvas {
      position: fixed; inset: 0; width: 100%; height: 100%;
      z-index: -1; pointer-events: none;
      filter: blur(10px); opacity: 0.55;
    }
    .bgm-pill {
      position: fixed; z-index: 40;
      right: clamp(1rem, 3vw, 1.75rem); bottom: clamp(1rem, 3vw, 1.75rem);
      display: flex; align-items: center; gap: 0.9rem;
      padding: 0.5rem 0.5rem 0.5rem 1.1rem; border-radius: 999px;
      background: rgba(5, 5, 5, 0.6); backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      color: var(--muted); font-size: 0.85rem;
      transition: border-color 0.3s, box-shadow 0.3s;
      animation: bgm-in 0.6s ease both;
    }
    .bgm-pill.on { border-color: rgba(255, 31, 61, 0.5); box-shadow: 0 0 22px var(--red-glow); }
    .bgm-pill .btn { white-space: nowrap; }
    @keyframes bgm-in { from { opacity: 0; transform: translateY(12px); } }
    @media (max-width: 520px) {
      .bgm-pill { left: 1rem; right: 1rem; justify-content: space-between; }
    }
  `;
  document.head.appendChild(style);

  // ---------- Elements ----------
  const cvs = document.createElement("canvas");
  cvs.className = "bgm-canvas";
  cvs.setAttribute("aria-hidden", "true");
  document.body.appendChild(cvs);
  const g = cvs.getContext("2d");

  const pill = document.createElement("div");
  pill.className = "bgm-pill";
  pill.setAttribute("role", "group");
  pill.setAttribute("aria-label", "Background music");
  const label = document.createElement("span");
  label.textContent = "Listen to music while you browse?";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-small";
  btn.textContent = "Play";
  pill.append(label, btn);
  document.body.appendChild(pill);

  // ---------- Audio ----------
  const audio = new Audio(MUSIC_SRC);
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preload = "metadata";

  let ctx = null, analyser = null, data = null;

  function buildGraph() {
    if (ctx || location.protocol === "file:") return; // file:// outputs silence through the analyser
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      ctx = analyser = data = null;
    }
  }

  async function start(fromGesture) {
    buildGraph();
    if (ctx && ctx.state === "suspended") {
      // Without a click/tap the browser won't let the context run: stay paused.
      if (!fromGesture) throw new Error("needs a user gesture");
      await ctx.resume();
    }
    await audio.play();
  }

  function setUI(on) {
    pill.classList.toggle("on", on);
    label.textContent = on ? "Music on" : "Listen to music while you browse?";
    btn.textContent = on ? "Pause" : "Play";
    if (on) loop(); else if (reduce) draw();
  }

  audio.addEventListener("play", () => setUI(true));
  audio.addEventListener("pause", () => setUI(false));

  btn.addEventListener("click", () => {
    heldByVideo = false;
    if (audio.paused) start(true).catch(() => {});
    else audio.pause();
  });

  // ---------- Equaliser (Loml) ----------
  const levels = new Array(BARS).fill(0);
  let raf = 0;

  function resize() {
    // half resolution is plenty under a blur and keeps it cheap
    cvs.width = Math.ceil(window.innerWidth / 2);
    cvs.height = Math.ceil(window.innerHeight / 2);
    draw();
  }

  function draw() {
    const w = cvs.width, h = cvs.height, bw = w / BARS;
    g.clearRect(0, 0, w, h);
    const red = getComputedStyle(document.documentElement).getPropertyValue("--red").trim() || "#ff1f3d";
    const grad = g.createLinearGradient(0, h, 0, h * 0.35);
    grad.addColorStop(0, red);
    grad.addColorStop(1, "rgba(255, 31, 61, 0)");
    g.fillStyle = grad;
    for (let i = 0; i < BARS; i++) {
      const v = reduce ? (audio.paused ? 0 : 0.22 + 0.1 * Math.sin(i * 0.6)) : levels[i];
      const bh = v * h * 0.55;
      g.fillRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh + 12); // +12 so the blur doesn't fade the base
    }
  }

  function frame(t) {
    const playing = !audio.paused;
    if (analyser && playing) analyser.getByteFrequencyData(data);
    for (let i = 0; i < BARS; i++) {
      let target = 0;
      if (playing) {
        if (analyser) {
          const idx = 1 + Math.floor(Math.pow(i / BARS, 1.5) * data.length * 0.7);
          target = data[idx] / 255;
        } else {
          // fallback motion (file:// or no Web Audio)
          target = Math.abs(Math.sin(t / 420 + i * 0.55)) * (0.4 + 0.3 * Math.sin(t / 1100 + i));
        }
      }
      levels[i] += (target - levels[i]) * (target > levels[i] ? 0.35 : 0.12);
    }
    draw();
    raf = playing || levels.some((v) => v > 0.01) ? requestAnimationFrame(frame) : 0;
  }

  function loop() {
    if (reduce) return draw(); // static bars only
    if (!raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();

  // ---------- Keep playing across pages (no replays) ----------
  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        playing: !audio.paused || heldByVideo,
        time: audio.currentTime,
      }));
    } catch (err) { /* storage blocked: ignore */ }
  }
  window.addEventListener("pagehide", save);

  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY)); } catch (err) { /* ignore */ }
  if (saved) {
    audio.addEventListener("loadedmetadata", () => {
      if (saved.time && isFinite(audio.duration)) audio.currentTime = saved.time % audio.duration;
    }, { once: true });
    // If the browser dares to blocks this, the pill simply stays on "Play"
    if (saved.playing) start(false).catch(() => {});
  }

  // ---------- Don't fight the videos pls ----------
  let heldByVideo = false;
  const videos = document.querySelectorAll("video");
  const ytFrames = document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]');
  const ytPlaying = new Set(); // YouTube players currently playing

  const anyVideoPlaying = () => ytPlaying.size > 0 || [...videos].some((v) => !v.paused && !v.ended);

  function videoStarted() {
    if (!audio.paused) { audio.pause(); heldByVideo = true; }
  }
  function videoStopped() {
    if (heldByVideo && !anyVideoPlaying()) {
      heldByVideo = false;
      audio.play().catch(() => {});
    }
  }

  // Native <video> (kept in case you ever add one back)
  videos.forEach((v) => {
    v.addEventListener("play", videoStarted);
    v.addEventListener("pause", videoStopped);
    v.addEventListener("ended", videoStopped);
  });

  // YouTube embeds: needs ?enablejsapi=1 on the iframe src
  if (ytFrames.length) {
    const setupPlayers = () => {
      ytFrames.forEach((frame) => {
        new YT.Player(frame, {
          events: {
            onStateChange: (e) => {
              // 1 = playing, 3 = buffering (while playing), 2 = paused, 0 = ended
              if (e.data === YT.PlayerState.PLAYING) {
                ytPlaying.add(frame);
                videoStarted();
              } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                ytPlaying.delete(frame);
                videoStopped();
              }
            },
          },
        });
      });
    };

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      setupPlayers();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
})();