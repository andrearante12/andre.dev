/* Animated star-chart background for project detail pages: a sparse drifting,
 * twinkling starfield plus 1-2 themed "connect-the-dots" figures (from
 * window.CONSTELLATIONS) that float and slowly rotate. Tinted by --project-accent,
 * behind content. Pauses when hidden; single static frame under reduced-motion. */

(function () {
  'use strict';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.id = 'project-bg';
  (document.body || document.documentElement).appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  let stars = [];
  let figures = [];

  /* --- accent colour (re-read so it catches project-page.js setting it async) --- */
  let accent = [120, 110, 255];
  let accent2 = [0, 212, 170];
  function parseColor(str) {
    str = (str || '').trim();
    let m = str.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = str.match(/^#([0-9a-f]{3})$/i);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = str.match(/rgba?\(([^)]+)\)/i);
    if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2]]; }
    return null;
  }
  function refreshAccent() {
    const cs = getComputedStyle(document.documentElement);
    const a = parseColor(cs.getPropertyValue('--project-accent'));
    const b = parseColor(cs.getPropertyValue('--accent2'));
    if (a) accent = a;
    if (b) accent2 = b;
  }

  /* --- deterministic pseudo-random (no Math.random dependency) --- */
  let _s = 1;
  function rnd() { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; }

  /* --- starfield --- */
  function starCount() {
    const area = window.innerWidth * window.innerHeight;
    return Math.max(24, Math.min(64, Math.round(area / 24000)));
  }
  function seedStars() {
    _s = 1; // reproducible layout per size
    const n = starCount();
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rnd() * W, y: rnd() * H,
        vx: (rnd() - 0.5) * 0.14, vy: (rnd() - 0.5) * 0.14,
        r: 0.8 + rnd() * 1.1,
        ph: rnd() * Math.PI * 2, tw: 0.6 + rnd() * 1.1,
        teal: rnd() < 0.18, white: rnd() < 0.22,
      });
    }
  }

  /* --- figures from window.CONSTELLATIONS[slug] --- */
  const ANCHORS = {
    1: [[0.70, 0.42]],
    2: [[0.26, 0.30], [0.76, 0.66]],
    3: [[0.22, 0.28], [0.80, 0.40], [0.52, 0.78]],
  };
  function seedFigures() {
    figures = [];
    const defs = ((window.CONSTELLATIONS || {})[window.PROJECT_SLUG] || []).slice(0, 3);
    const anchors = ANCHORS[defs.length] || ANCHORS[3];
    const base = Math.min(W, H);
    defs.forEach((def, i) => {
      const an = anchors[i] || [0.5, 0.5];
      figures.push({
        def,
        size: Math.max(58, Math.min(116, base * 0.13)) * (0.85 + 0.3 * rnd()),
        x: W * an[0], y: H * an[1],
        vx: (rnd() - 0.5) * 0.05 + 0.012,
        vy: (rnd() - 0.5) * 0.045,
        rot: (rnd() - 0.5) * 0.10,
        swayPh: rnd() * Math.PI * 2,
        ph: rnd() * Math.PI * 2,
      });
    });
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seedStars();
    seedFigures();
  }

  /* --- pointer parallax --- */
  let panX = 0, panY = 0, tPanX = 0, tPanY = 0;
  window.addEventListener('mousemove', e => {
    tPanX = (e.clientX / window.innerWidth - 0.5) * 24;
    tPanY = (e.clientY / window.innerHeight - 0.5) * 24;
  });
  window.addEventListener('mouseleave', () => { tPanX = 0; tPanY = 0; });

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const WHITE = [235, 235, 245];
  let T = 0;

  function draw(move) {
    if (move) {
      T += 0.016;
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -8) s.x = W + 8; else if (s.x > W + 8) s.x = -8;
        if (s.y < -8) s.y = H + 8; else if (s.y > H + 8) s.y = -8;
      }
      const m = Math.max(W, H) * 0.7;
      for (const f of figures) {
        f.x += f.vx; f.y += f.vy;
        if (f.x < -m) f.x = W + m; else if (f.x > W + m) f.x = -m;
        if (f.y < -m) f.y = H + m; else if (f.y > H + m) f.y = -m;
      }
      panX += (tPanX - panX) * 0.05;
      panY += (tPanY - panY) * 0.05;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(panX, panY);

    // ambient starfield
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(T * s.tw + s.ph);
      const col = s.white ? WHITE : (s.teal ? accent2 : accent);
      ctx.fillStyle = rgba(col, (s.white ? 0.5 : 0.6) * tw);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // themed figures
    for (const f of figures) {
      const ang = f.rot + 0.05 * Math.sin(T * 0.25 + f.swayPh);
      const cos = Math.cos(ang), sin = Math.sin(ang), sz = f.size;
      const pts = f.def.stars.map(([sx, sy]) => [
        f.x + (sx * cos - sy * sin) * sz,
        f.y + (sx * sin + sy * cos) * sz,
      ]);
      const tw = 0.8 + 0.2 * Math.sin(T * 0.9 + f.ph);

      // edges
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(accent, 0.52 * tw);
      ctx.beginPath();
      for (const [a, b] of f.def.edges) {
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();

      // stars
      for (let i = 0; i < pts.length; i++) {
        const star = 0.85 + 0.15 * Math.sin(T * 1.6 + i * 0.7 + f.ph);
        ctx.fillStyle = rgba(WHITE, 0.92 * star);
        ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(accent, 0.18 * star); // soft halo
        ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 3.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Hidden on the cream light theme (white stars have no read on paper), so
  // the loop idles there instead of drawing.
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
  let running = !isLight(), frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    if ((frame++ % 30) === 0) refreshAccent();
    draw(true);
  }

  function setRunning() { running = !document.hidden && !isLight(); }
  document.addEventListener('visibilitychange', setRunning);
  window.addEventListener('themechange', setRunning);
  window.addEventListener('resize', resize);

  function start() {
    refreshAccent();
    resize();
    if (RM) draw(false);
    else { loop(); setTimeout(refreshAccent, 200); }
  }

  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start);
})();
