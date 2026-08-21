/* SO-ARM101 — the real robot, rendered in the hero of the cream theme.
 *
 * models/so101.glb is baked from the SO-101 URDF + its print STLs (see
 * tools/build_so101.py): one node per link, each named after the joint that
 * drives it, every joint rotating about its local Z. So posing the arm is just
 * `joints.elbow_flex.rotation.z = angle`.
 *
 * This is a STATIC shot — one render per change, no animation loop. Framing,
 * pose and layout all come from CONF below, which the on-page debug panel
 * (add ?debug to the URL) edits live and hands back as a paste-ready block.
 *
 * Mounts into <canvas id="so101-canvas">; no-ops if that is absent or WebGL is
 * unavailable, in which case the drafting SVG behind it is shown instead. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ─────────────────────────────────────────────────────────────
   TUNED VALUES — edit here, or open the page with ?debug and use
   the sliders, then paste the block the panel prints back over this.
   ───────────────────────────────────────────────────────────── */
const CONF = {
  // camera — a long lens from low and far left, looking up at the arm
  px: -1.5, py: -0.83, pz: 0.265, tx: 0.015, ty: 0.145, tz: -0.07, fov: 14.5,
  exposure: 1.15,
  // robot placement (metres / degrees)
  rx: -0.03, ry: -0.12, rz: 0, rotY: -18,
  // pose (radians, URDF joint limits)
  shoulder_pan: 0.29, shoulder_lift: -1.56, elbow_flex: 1.25,
  wrist_flex: -0.28, wrist_roll: 0.03, gripper: -0.11,
  // layout: where the datum rule sits in the hero, and the canvas box
  datumTop: 89.5, armW: 860, armH: 1170, armRight: -6,
};

const LIMITS = {
  shoulder_pan: [-1.92, 1.92], shoulder_lift: [-1.75, 1.75], elbow_flex: [-1.69, 1.69],
  wrist_flex: [-1.66, 1.66], wrist_roll: [-2.74, 2.84], gripper: [-0.17, 1.75],
};

// Below this width the hero copy fills the column and the robot would sit on
// top of it, so the whole plate is hidden (see index.html) and the GLB is never
// fetched — no 1.8 MB on a phone.
const MIN_WIDTH = 760;

const canvas = document.getElementById('so101-canvas');
if (canvas) {
  const plate = canvas.closest('.plate') || canvas.parentElement;
  const root = document.documentElement;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    renderer = null; // no WebGL — the SVG fallback stays up
  }

  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CONF.fov, 1, 0.05, 20);
    const target = new THREE.Vector3();

    // Product-shot lighting: soft fill from the paper, a warm key from the
    // upper left (matching the drafting sheet's implied light), and a rim.
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcfc7b3, 1.35));
    const key = new THREE.DirectionalLight(0xfff6e8, 2.1);
    key.position.set(-0.45, 0.75, 0.55);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0016;
    const sc = key.shadow.camera;
    sc.near = 0.05; sc.far = 3; sc.left = -0.6; sc.right = 0.6; sc.top = 0.6; sc.bottom = -0.6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0.7, 0.35, -0.6);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.ShadowMaterial({ opacity: 0.20 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const PRINTED = new THREE.MeshStandardMaterial({ color: 0xf4efe4, metalness: 0.04, roughness: 0.62 });
    const SERVO = new THREE.MeshStandardMaterial({ color: 0x2f2a22, metalness: 0.35, roughness: 0.45 });

    const isLight = () => root.getAttribute('data-theme') === 'light';

    const joints = {};
    let robot = null, pivot = null, baseLift = 0, requested = false;

    // ---- layout ----------------------------------------------------------
    // CONF's box is the desktop size; narrow viewports scale it down so the
    // robot never crowds the hero copy.
    function layoutScale() {
      return Math.max(0.42, Math.min(1, window.innerWidth / 1500));
    }

    function applyLayout() {
      const k = layoutScale();
      root.style.setProperty('--datum-top', CONF.datumTop + 'vh');
      root.style.setProperty('--arm-w', Math.round(CONF.armW * k) + 'px');
      root.style.setProperty('--arm-h', Math.round(CONF.armH * k) + 'px');
      root.style.setProperty('--arm-right', CONF.armRight + '%');
    }

    function resize() {
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    /* The canvas is positioned so the robot's ground plane lands exactly on the
       datum rule, whatever the camera is doing — project the origin, then slide
       the canvas up by that many pixels (the plate's top edge IS the rule). */
    function alignToDatum() {
      const h = canvas.clientHeight || 1;
      const v = new THREE.Vector3(0, 0, 0).project(camera);
      const groundY = (1 - (v.y + 1) / 2) * h;
      canvas.style.top = Math.round(-groundY) + 'px';
    }

    function applyConf() {
      camera.fov = CONF.fov;
      camera.position.set(CONF.px, CONF.py, CONF.pz);
      target.set(CONF.tx, CONF.ty, CONF.tz);
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      renderer.toneMappingExposure = CONF.exposure;

      if (pivot) {
        pivot.position.set(CONF.rx, CONF.ry, CONF.rz);
        pivot.rotation.y = CONF.rotY * Math.PI / 180;
      }
      for (const name of Object.keys(LIMITS)) {
        if (joints[name]) joints[name].rotation.z = CONF[name];
      }
      applyLayout();
      resize();
      alignToDatum();
      render();
    }

    function render() {
      if (!robot) return;
      camera.lookAt(target);
      renderer.render(scene, camera);
    }

    // ---- load ------------------------------------------------------------
    // The GLB is ~1.8 MB and only the cream theme shows it, so it is fetched on
    // demand: on load if the cream theme is already on, otherwise the first
    // time the visitor switches to it.
    function ensureModel() {
      if (requested || !isLight() || window.innerWidth < MIN_WIDTH) return;
      requested = true;

      new GLTFLoader().load('models/so101.glb', (gltf) => {
        robot = gltf.scene;
        robot.rotation.x = -Math.PI / 2;   // URDF is Z-up, three is Y-up

        robot.traverse((o) => {
          if (o.isMesh) {
            o.geometry.computeVertexNormals();   // normals are stripped from the GLB
            o.castShadow = true;
            o.receiveShadow = true;
            o.material = /sts3215/.test(o.name) ? SERVO : PRINTED;
          }
          if (Object.prototype.hasOwnProperty.call(LIMITS, o.name)) joints[o.name] = o;
        });

        // Sit the base on the ground plane, then hang it off a pivot so the
        // whole robot can be moved/turned without disturbing that contact.
        for (const name of Object.keys(LIMITS)) {
          if (joints[name]) joints[name].rotation.z = CONF[name];
        }
        const box = new THREE.Box3().setFromObject(robot);
        baseLift = -box.min.y;
        robot.position.y += baseLift;

        pivot = new THREE.Group();
        pivot.add(robot);
        scene.add(pivot);

        canvas.classList.add('is-loaded');
        if (plate) plate.classList.add('model-ready');
        applyConf();
      }, undefined, () => {
        // Model failed to load — fall back to the drafting SVG.
        if (plate) plate.classList.add('model-failed');
      });
    }

    window.addEventListener('resize', () => { ensureModel(); applyLayout(); resize(); alignToDatum(); render(); });
    window.addEventListener('themechange', () => { ensureModel(); resize(); alignToDatum(); render(); });

    applyLayout();
    ensureModel();

    // Tuning hook: window.__so101.set({ fov: 24 })
    window.__so101 = {
      CONF, camera, scene, renderer, target,
      joints: () => joints,
      set(patch) { Object.assign(CONF, patch); applyConf(); },
      apply: applyConf,
    };

    /* ── debug panel ─────────────────────────────────────────────────────
       Shows automatically when the site is served from localhost, so it is
       there without having to remember a flag; Hide (or Shift+D) dismisses it
       and that sticks. On the deployed site it only appears with ?debug. */
    const DEV_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
    const FLAGGED = /[?&#]debug\b/.test(location.search + location.hash);
    let debugOn = FLAGGED || (DEV_HOST && localStorage.getItem('aa-so101-debug') !== 'off');

    window.addEventListener('keydown', (e) => {
      if (e.key === 'D' && e.shiftKey && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
        debugOn = !debugOn;
        try { localStorage.setItem('aa-so101-debug', debugOn ? 'on' : 'off'); } catch (err) {}
        const el = document.getElementById('so101-debug');
        if (el) el.style.display = debugOn ? '' : 'none';
        else if (debugOn) buildPanel();
      }
    });

    if (debugOn) buildPanel();

    function buildPanel() {
      if (document.getElementById('so101-debug')) return;
      const GROUPS = [
        ['Camera position', [
          ['px', -1.5, 1.5, 0.005], ['py', -1.0, 1.5, 0.005], ['pz', -1.5, 1.5, 0.005],
        ]],
        ['Camera target', [
          ['tx', -0.8, 0.8, 0.005], ['ty', -0.4, 0.8, 0.005], ['tz', -0.8, 0.8, 0.005],
          ['fov', 10, 75, 0.5], ['exposure', 0.5, 2.5, 0.01],
        ]],
        ['Robot placement', [
          ['rx', -0.8, 0.8, 0.005], ['ry', -0.4, 0.6, 0.005], ['rz', -0.8, 0.8, 0.005],
          ['rotY', -180, 180, 1],
        ]],
        ['Joint angles', Object.entries(LIMITS).map(([n, [lo, hi]]) => [n, lo, hi, 0.01])],
        ['Layout', [
          ['datumTop', 0, 100, 0.5], ['armW', 300, 1600, 10],
          ['armH', 300, 1600, 10], ['armRight', -20, 40, 0.5],
        ]],
      ];

      const style = document.createElement('style');
      style.textContent = `
        #so101-debug { position: fixed; left: 0; top: 60px; bottom: 0; width: 340px; z-index: 9000;
          background: rgba(239,233,219,0.97); color: #1c1a16; border-right: 1px solid rgba(28,26,22,0.25);
          font-family: 'DM Mono', monospace; font-size: 11px; overflow-y: auto; padding: 14px 16px 40px;
          backdrop-filter: blur(8px); }
        :root[data-theme="dark"] #so101-debug { background: rgba(16,16,24,0.97); color: #e8e8f0;
          border-right-color: rgba(255,255,255,0.15); }
        #so101-debug h4 { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
          margin: 16px 0 8px; opacity: 0.6; border-bottom: 1px solid currentColor; padding-bottom: 5px; }
        #so101-debug h4:first-child { margin-top: 0; }
        #so101-debug label { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
        #so101-debug label span.n { flex: 0 0 92px; opacity: 0.75; }
        #so101-debug input[type=range] { flex: 1; accent-color: #9c5a22; height: 14px; min-width: 0; }
        #so101-debug span.v { flex: 0 0 52px; text-align: right; font-variant-numeric: tabular-nums; }
        #so101-debug pre { margin-top: 12px; padding: 10px; font-size: 10px; line-height: 1.5;
          background: rgba(28,26,22,0.07); border-radius: 4px; white-space: pre-wrap; user-select: all; }
        :root[data-theme="dark"] #so101-debug pre { background: rgba(255,255,255,0.07); }
        #so101-debug button { font-family: inherit; font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 7px 12px; margin-right: 6px; cursor: pointer;
          border: 1px solid currentColor; background: transparent; color: inherit; border-radius: 3px; }
        #so101-debug .hint { opacity: 0.55; line-height: 1.5; margin-top: 10px; }
        #so101-debug .hint.warn { opacity: 1; color: #9c5a22; margin: 0 0 8px; }
        :root[data-theme="dark"] #so101-debug .hint.warn { color: #ffb26b; }
      `;
      document.head.appendChild(style);

      const panel = document.createElement('div');
      panel.id = 'so101-debug';
      const rows = {};
      GROUPS.forEach(([title, fields]) => {
        const h = document.createElement('h4');
        h.textContent = title;
        panel.appendChild(h);
        fields.forEach(([key, lo, hi, step]) => {
          const label = document.createElement('label');
          const n = document.createElement('span'); n.className = 'n'; n.textContent = key;
          const input = document.createElement('input');
          input.type = 'range'; input.min = lo; input.max = hi; input.step = step; input.value = CONF[key];
          const v = document.createElement('span'); v.className = 'v';
          v.textContent = (+CONF[key]).toFixed(step < 1 ? 2 : 0);
          input.addEventListener('input', () => {
            CONF[key] = parseFloat(input.value);
            v.textContent = CONF[key].toFixed(step < 1 ? 2 : 0);
            applyConf();
            dump();
          });
          rows[key] = { input, v, step };
          label.append(n, input, v);
          panel.appendChild(label);
        });
      });

      const out = document.createElement('pre');
      const copy = document.createElement('button'); copy.textContent = 'Copy';
      const reset = document.createElement('button'); reset.textContent = 'Reset';
      const START = { ...CONF };

      function dump() {
        const f = (k) => (typeof CONF[k] === 'number' ? +CONF[k].toFixed(3) : CONF[k]);
        out.textContent =
`const CONF = {
  px: ${f('px')}, py: ${f('py')}, pz: ${f('pz')}, tx: ${f('tx')}, ty: ${f('ty')}, tz: ${f('tz')}, fov: ${f('fov')},
  exposure: ${f('exposure')},
  rx: ${f('rx')}, ry: ${f('ry')}, rz: ${f('rz')}, rotY: ${f('rotY')},
  shoulder_pan: ${f('shoulder_pan')}, shoulder_lift: ${f('shoulder_lift')}, elbow_flex: ${f('elbow_flex')},
  wrist_flex: ${f('wrist_flex')}, wrist_roll: ${f('wrist_roll')}, gripper: ${f('gripper')},
  datumTop: ${f('datumTop')}, armW: ${f('armW')}, armH: ${f('armH')}, armRight: ${f('armRight')},
};`;
      }
      copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(out.textContent);
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
      });
      reset.addEventListener('click', () => {
        Object.assign(CONF, START);
        Object.entries(rows).forEach(([k, r]) => {
          r.input.value = CONF[k];
          r.v.textContent = (+CONF[k]).toFixed(r.step < 1 ? 2 : 0);
        });
        applyConf(); dump();
      });

      const hide = document.createElement('button'); hide.textContent = 'Hide';
      hide.addEventListener('click', () => {
        debugOn = false;
        try { localStorage.setItem('aa-so101-debug', 'off'); } catch (err) {}
        panel.style.display = 'none';
      });

      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Paste this block over CONF at the top of assets/so101.js to make it the default. Shift+D toggles this panel; Hide keeps it closed.';

      const bar = document.createElement('div');
      bar.append(copy, reset, hide);
      panel.append(bar, out, hint);

      // The robot only renders on the cream theme — offer the switch rather
      // than leaving the sliders driving something invisible.
      if (!isLight()) {
        const warn = document.createElement('p');
        warn.className = 'hint warn';
        warn.textContent = 'The robot only appears on the cream theme.';
        const go = document.createElement('button');
        go.textContent = 'Switch to cream';
        go.addEventListener('click', () => window.SITE_THEME && window.SITE_THEME.set('light', true));
        panel.prepend(warn, go);
      }

      document.body.appendChild(panel);
      dump();
    }
  }
}
