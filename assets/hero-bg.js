/* Continuous ambient sky for the top of the page — ONE fixed, full-viewport
 * starfield that sits behind both the hero and the About section so there is no
 * seam between them. Soft round twinkling stars, gentle cursor + scroll parallax,
 * and the occasional shooting star. Cheap: one Points object + one Line, no
 * shadows, no controls. Respects prefers-reduced-motion and pauses when hidden.
 * Mounts into <canvas id="sky-canvas">; no-ops if absent. */

import * as THREE from 'three';

const canvas = document.getElementById('sky-canvas');
if (canvas) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const PR = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // ---- Soft round star sprite (radial gradient → glow, not a square pixel) ----
  function makeStarTexture() {
    const s = 64;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.22)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }
  const starTex = makeStarTexture();

  // ---- Starfield ----
  const COUNT = 1100;
  const SPREAD = 30;
  const positions = new Float32Array(COUNT * 3);
  const aColor = new Float32Array(COUNT * 3);
  const aSize = new Float32Array(COUNT);
  const aPhase = new Float32Array(COUNT);
  const accent = new THREE.Color(0x6c63ff);  // --accent
  const accent2 = new THREE.Color(0x00d4aa); // --accent2
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < COUNT; i++) {
    const a = i * 2.39996; // golden angle
    const r = SPREAD * Math.sqrt((i + 0.5) / COUNT);
    positions[i * 3]     = Math.cos(a) * r;
    positions[i * 3 + 1] = (((i * 97) % 200) / 200 - 0.5) * SPREAD * 1.25;
    positions[i * 3 + 2] = Math.sin(a) * r - 6;
    // mostly white stars with a faint accent tint, so they read as stars
    const c = accent.clone().lerp(accent2, ((i * 53) % 100) / 100);
    c.lerp(white, 0.5 + Math.random() * 0.45);
    aColor[i * 3] = c.r; aColor[i * 3 + 1] = c.g; aColor[i * 3 + 2] = c.b;
    // size: many small, a few large (cubic falloff)
    aSize[i] = 0.6 + Math.pow(Math.random(), 3) * 4.0;
    aPhase[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.12 },
      uPR: { value: PR },
      uOpacity: { value: 0.9 },
      uTex: { value: starTex },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uSize;
      uniform float uPR;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = aColor;
        float tw = 0.5 + 0.5 * sin(uTime * 1.3 + aPhase); // 0..1 twinkle
        vTw = 0.6 + 0.4 * tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uSize * uPR * (1.0 + 0.25 * tw) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vec4 tx = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vColor * vTw, tx.a * uOpacity * vTw);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Shooting star (a fading additive trail that streaks now and then) ----
  const TRAIL = 28;
  const ssPos = new Float32Array(TRAIL * 3);
  const ssCol = new Float32Array(TRAIL * 3);
  for (let i = 0; i < TRAIL; i++) {
    const b = 1 - i / (TRAIL - 1); // head bright (1) → tail dark (0); black is invisible under additive
    ssCol[i * 3] = b; ssCol[i * 3 + 1] = b; ssCol[i * 3 + 2] = b;
  }
  const ssGeo = new THREE.BufferGeometry();
  ssGeo.setAttribute('position', new THREE.BufferAttribute(ssPos, 3));
  ssGeo.setAttribute('color', new THREE.BufferAttribute(ssCol, 3));
  const ssMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const shooting = new THREE.Line(ssGeo, ssMat);
  shooting.frustumCulled = false;
  scene.add(shooting);

  let ssActive = false, ssStart = 0, ssDur = 0.8, ssNext = 2.5;
  const ssHead = new THREE.Vector3();
  const ssVel = new THREE.Vector3();
  const ssDir = new THREE.Vector3();

  function launchShooting(t) {
    ssActive = true; ssStart = t; ssDur = 0.7 + Math.random() * 0.5;
    const fromLeft = Math.random() < 0.5;
    ssHead.set((fromLeft ? -1 : 1) * (5 + Math.random() * 7), 7 + Math.random() * 5, -2 + Math.random() * 3);
    ssDir.set((fromLeft ? 1 : -1) * (0.7 + Math.random() * 0.4), -(0.5 + Math.random() * 0.3), 0).normalize();
    ssVel.copy(ssDir).multiplyScalar(28 + Math.random() * 12);
    const spacing = 0.22;
    for (let i = 0; i < TRAIL; i++) {
      ssPos[i * 3]     = -ssDir.x * spacing * i;
      ssPos[i * 3 + 1] = -ssDir.y * spacing * i;
      ssPos[i * 3 + 2] = -ssDir.z * spacing * i;
    }
    ssGeo.attributes.position.needsUpdate = true;
  }

  function updateShooting(t) {
    if (!ssActive) { if (t >= ssNext) launchShooting(t); return; }
    const e = t - ssStart;
    const k = e / ssDur;
    if (k >= 1) { ssActive = false; ssMat.opacity = 0; ssNext = t + 4 + Math.random() * 8; return; }
    let op = 1.0;
    if (k < 0.12) op = k / 0.12; else if (k > 0.7) op = (1 - k) / 0.3;
    ssMat.opacity = Math.max(0, op) * 0.9;
    shooting.position.set(ssHead.x + ssVel.x * e, ssHead.y + ssVel.y * e, ssHead.z + ssVel.z * e);
  }

  // ---- Parallax (cursor + scroll) ----
  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5);
    targetY = (e.clientY / window.innerHeight - 0.5);
  });
  let scrollNorm = 0;
  function onScroll() { scrollNorm = Math.min(2.2, window.scrollY / Math.max(1, window.innerHeight)); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  // The starfield is a night sky: it hides (see assets/theme.css) and idles
  // under the cream light theme, then picks up again when dark comes back.
  // The rAF loop keeps ticking either way and simply skips the GL work — far
  // less brittle than tearing the loop down and restarting it.
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
  let running = !isLight();

  function setRunning() { running = !document.hidden && !isLight(); }
  document.addEventListener('visibilitychange', setRunning);
  window.addEventListener('themechange', () => { setRunning(); resize(); });

  function render() {
    // scrolling down drifts the view gently upward (toward the horizon below)
    const ty = -targetY * 1.4 + scrollNorm * 1.6;
    camera.position.x += (targetX * 2.2 - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.06;
    camera.lookAt(0, camera.position.y * 0.3, -6);
    renderer.render(scene, camera);
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    points.rotation.y = t * 0.015;
    points.rotation.z = Math.sin(t * 0.05) * 0.03;
    updateShooting(t);
    render();
  }

  if (RM) {
    render(); // single static frame under reduced-motion
  } else {
    loop();
  }
}
