/* Subtle ambient 3D backdrop for the hero — a slow-drifting point field with
 * gentle cursor parallax. Intentionally cheap: one Points object, one material,
 * no shadows, no controls. Respects prefers-reduced-motion and pauses when the
 * tab is hidden. Mounts into <canvas id="hero-canvas">; no-ops if absent. */

import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas');
if (canvas) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // ---- Point field ----
  const COUNT = 900;
  const SPREAD = 26;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const accent = new THREE.Color(0x6c63ff); // --accent
  const accent2 = new THREE.Color(0x00d4aa); // --accent2
  for (let i = 0; i < COUNT; i++) {
    // deterministic-ish scatter (avoids Math.random availability concerns)
    const a = i * 2.39996; // golden angle
    const r = SPREAD * Math.sqrt((i + 0.5) / COUNT);
    positions[i * 3]     = Math.cos(a) * r;
    positions[i * 3 + 1] = (((i * 97) % 200) / 200 - 0.5) * SPREAD;
    positions[i * 3 + 2] = Math.sin(a) * r - 6;
    const c = accent.clone().lerp(accent2, ((i * 53) % 100) / 100);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Cursor parallax ----
  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5);
    targetY = (e.clientY / window.innerHeight - 0.5);
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !RM) { clock.start(); loop(); }
  });

  function render() {
    // ease camera toward cursor for parallax
    camera.position.x += (targetX * 2.2 - camera.position.x) * 0.04;
    camera.position.y += (-targetY * 1.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -6);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.02;
    points.rotation.z = Math.sin(t * 0.05) * 0.04;
    render();
  }

  if (RM) {
    render(); // single static frame under reduced-motion
  } else {
    loop();
  }
}
