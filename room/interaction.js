import * as THREE from 'three';

// Projects a Box3 to a screen-space rect {x,y,w,h} in CSS pixels.
function boxToScreenRect(box3, camera, el) {
  const w = el.clientWidth, h = el.clientHeight;
  const pts = [
    new THREE.Vector3(box3.min.x, box3.min.y, box3.min.z),
    new THREE.Vector3(box3.min.x, box3.min.y, box3.max.z),
    new THREE.Vector3(box3.min.x, box3.max.y, box3.min.z),
    new THREE.Vector3(box3.min.x, box3.max.y, box3.max.z),
    new THREE.Vector3(box3.max.x, box3.min.y, box3.min.z),
    new THREE.Vector3(box3.max.x, box3.min.y, box3.max.z),
    new THREE.Vector3(box3.max.x, box3.max.y, box3.min.z),
    new THREE.Vector3(box3.max.x, box3.max.y, box3.max.z),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, anyFront = false;
  for (const p of pts) {
    p.project(camera);
    if (p.z < 1) anyFront = true;
    const x = (p.x * 0.5 + 0.5) * w;
    const y = (-p.y * 0.5 + 0.5) * h;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (!anyFront) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function initInteraction({ scene, camera, controls, renderer, objects, dataById, ui, auxRoots = [], onPhotography, research }) {
  const el = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const byId = Object.fromEntries(objects.map((o) => [o.id, o]));
  // precompute a Box3 per object (local, recomputed lazily since they animate subtly)
  objects.forEach((o) => { o._box = new THREE.Box3(); });

  let hovered = null;     // id
  let selected = null;    // id
  let scanning = false;
  let detected = objects[0].id;   // auto-cycling "always one detected"
  let cycleIdx = 0;
  let lastCycle = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const CYCLE_MS = 2600;
  // ---- build larger, non-overlapping hover/click proxies (one AABB per object) ----
  const meshById = {};
  const collect = (root) => root.traverse((m) => { if (m.isMesh && m.userData.projectId) (meshById[m.userData.projectId] ||= []).push(m); });
  objects.forEach((o) => collect(o.root));
  auxRoots.forEach(collect);

  const meta = {};
  objects.forEach((o) => { if (dataById[o.id]) meta[o.id] = { label: dataById[o.id].title, tag: dataById[o.id].tag, accent: dataById[o.id].accent }; });
  meta['photography'] = { label: 'Photography', tag: 'camera', accent: '#00d4aa' };
  const cycleList = [...objects.map((o) => o.id), 'photography'].filter((id) => meta[id] && meshById[id]);

  const proxyMeshes = [];
  const boxById = {};
  for (const id in meshById) {
    const box = new THREE.Box3();
    meshById[id].forEach((mh) => { mh.updateWorldMatrix(true, false); box.expandByObject(mh); });
    if (box.isEmpty()) continue;
    box.expandByScalar(0.06);
    boxById[id] = box;
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const pm = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    pm.material.colorWrite = false; pm.position.copy(ctr); pm.userData.projectId = id; pm.renderOrder = -1;
    scene.add(pm); proxyMeshes.push(pm);
  }

  // camera tween state
  const homePos = camera.position.clone();
  const homeTgt = controls.target.clone();
  const camTo = new THREE.Vector3();
  const tgtTo = new THREE.Vector3();
  let tweening = false;
  let deviceView = null;   // 'lumina-phone' | 'minecraft-rl' | null
  let researchMode = false;
  let extHover = null;     // hover driven from the HUD chips
  let phoneScreenMesh = null;
  objects.forEach((o) => o.root.traverse((m) => { if (m.userData.isPhoneScreen) phoneScreenMesh = m; }));
  const _v = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _c = new THREE.Vector3();
  // returns {tl,tr,bl,br} px quad if the phone screen faces the camera & is on-screen, else {hide:true}
  function phoneScreenState() {
    if (!phoneScreenMesh) return { hide: true };
    // controls.update()/lookAt move the camera but three.js only refreshes
    // matrixWorldInverse inside renderer.render(); project() here would otherwise
    // use last frame's camera → the overlay lags the canvas during motion.
    camera.updateMatrixWorld();
    phoneScreenMesh.updateWorldMatrix(true, false);
    _n.set(0, 0, 1).transformDirection(phoneScreenMesh.matrixWorld);
    _c.setFromMatrixPosition(phoneScreenMesh.matrixWorld);
    if (_n.dot(camera.position.clone().sub(_c)) <= 0.03) return { hide: true };
    const g = phoneScreenMesh.geometry.parameters; const hw = g.width / 2, hh = g.height / 2;
    const W = el.clientWidth, H = el.clientHeight;
    const at = (lx, ly) => { _v.set(lx, ly, 0).applyMatrix4(phoneScreenMesh.matrixWorld).project(camera); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z }; };
    const tl = at(-hw, hh), tr = at(hw, hh), bl = at(-hw, -hh), br = at(hw, -hh);
    if ([tl, tr, bl, br].some((c) => c.z > 1)) return { hide: true };
    return { tl: [tl.x, tl.y], tr: [tr.x, tr.y], bl: [bl.x, bl.y], br: [br.x, br.y] };
  }
  const DEVICES = {
    'iot-smarthome': {
      data: 'iot-smarthome', screenApp: true,
      pos: new THREE.Vector3(-1.2, 0.92, -0.5),
      target: new THREE.Vector3(-1.2, 0.05, -1.05),
    },
    'minecraft-rl': {
      data: 'minecraft-rl', screenApp: false,
      pos: new THREE.Vector3(0.25, 1.12, 2.1),
      target: new THREE.Vector3(0.25, 1.05, -2.55),
    },
    'vgc': {
      // pos sits at target + (origOffset * 0.38): same viewing angle, close-up but not jammed against the screen.
      data: 'vgc', screenApp: false,
      pos: new THREE.Vector3(-3.45, 2.83, -0.48),
      target: new THREE.Vector3(-3.78, 2.78, -0.78),
    },
  };

  function objAtPointer() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(proxyMeshes, false);
    for (const hit of hits) {
      let o = hit.object;
      while (o) { if (o.userData.projectId) return o.userData.projectId; o = o.parent; }
    }
    return null;
  }

  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    if (!selected && !deviceView) {
      const id = objAtPointer();
      hovered = meta[id] ? id : null;     // projects + camera get a box; phone does not
      el.style.cursor = id ? 'pointer' : 'grab';
    }
  });

  el.addEventListener('pointerdown', () => { if (!selected) el.style.cursor = 'grabbing'; });

  el.addEventListener('click', (e) => {
    const r = el.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    const id = objAtPointer();
    if (researchMode) { exitResearch(); return; }    // click off → back to room
    if (deviceView) { closeDevice(); return; }       // click off the popup → default
    if (id === 'photography') { if (onPhotography) onPhotography(); return; }
    if (DEVICES[id]) { focusDevice(id); return; }
    if (id && byId[id]) { focusOn(id); return; }
    if (selected) resetView();
  });

  function focusOn(id) {
    const o = byId[id];
    if (!o) return;
    selected = id;
    hovered = null;
    scanning = false;
    // No camera move — just highlight the object with its detection box + open the panel.
    ui.openPanel(dataById[id], { onClose: resetView, onLocate: () => {} });
  }

  function resetView() {
    if (researchMode) { exitResearch(); return; }
    if (deviceView) { closeDevice(); return; }
    selected = null;
    ui.closePanel();
  }

  // ---- Research: fly out to the front-yard exterior scene ----
  function enterResearch() {
    if (!research) return;
    selected = null; hovered = null; scanning = false; deviceView = null;
    researchMode = true;
    research.onMode('exterior');
    if (research.onEnter) research.onEnter();
    camTo.copy(research.pos); tgtTo.copy(research.target);
    tweening = true; controls.enabled = false;
    ui.setScreenAppActive(false);
    ui.openPanel(research.data, { onClose: exitResearch, side: 'left' });
  }
  function exitResearch() {
    researchMode = false;
    research.onMode('interior');
    ui.closePanel();
    camTo.copy(homePos); tgtTo.copy(homeTgt);
    tweening = true;
  }

  function setScanning(on) {
    scanning = on;
    if (on) { selected = null; ui.closePanel(); }
  }

  function hoverProject(id) { extHover = (id && meta[id]) ? id : null; }

  function select(id) {
    if (DEVICES[id]) focusDevice(id);
    else if (id === 'photography') { if (onPhotography) onPhotography(); }
    else if (byId[id]) focusOn(id);
  }

  // pan to a device (phone / monitor): centre it, show its screen, open the side panel
  function focusDevice(id) {
    selected = null; hovered = null; scanning = false;
    deviceView = id;
    const d = DEVICES[id];
    camTo.copy(d.pos); tgtTo.copy(d.target);
    tweening = true; controls.enabled = false;
    ui.openPanel(dataById[d.data], { onClose: closeDevice, side: 'left' });
    ui.setScreenAppActive(d.screenApp, closeDevice);
  }
  function closeDevice() {
    deviceView = null;
    ui.closePanel();
    ui.setScreenAppActive(false);
    camTo.copy(homePos); tgtTo.copy(homeTgt);
    tweening = true;
  }

  function update() {
    if (tweening) {
      camera.position.lerp(camTo, 0.12);
      controls.target.lerp(tgtTo, 0.12);
      if (camera.position.distanceTo(camTo) < 0.05) {
        camera.position.copy(camTo); controls.target.copy(tgtTo);
        tweening = false;
        if (!deviceView) controls.enabled = true;
      }
    }
    // phone & VGC close-up views sit nearer than controls.minDistance, which controls.update()
    // would clamp away — aim the camera manually so the tweened close position is respected.
    if (deviceView === 'iot-smarthome' || deviceView === 'vgc') { camera.up.set(0, 1, 0); camera.lookAt(controls.target); }
    else if (researchMode) { camera.up.set(0, 1, 0); camera.lookAt(controls.target); }
    else controls.update();

    // LUMINA GUI is ALWAYS shown on the phone screen (hidden only during other device focus)
    ui.placeScreenApp((researchMode || (deviceView && deviceView !== 'iot-smarthome')) ? { hide: true } : phoneScreenState());

    if (deviceView || researchMode) { ui.renderBoxes([]); return; }

    // auto-cycle the "detected" project when the user isn't interacting
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!selected && !scanning && !hovered && !extHover) {
      if (now - lastCycle > CYCLE_MS) {
        cycleIdx = (cycleIdx + 1) % cycleList.length;
        detected = cycleList[cycleIdx];
        lastCycle = now;
      }
    } else {
      lastCycle = now;
    }

    // detection overlays
    const show = [];
    if (scanning) cycleList.forEach((id) => show.push(id));
    else if (selected) show.push(selected);
    else if (hovered) show.push(hovered);
    else if (extHover) show.push(extHover);
    else show.push(detected);

    ui.renderBoxes(show.map((id) => {
      const box = boxById[id], md = meta[id];
      if (!box || !md) return null;
      const rect = boxToScreenRect(box, camera, el);
      const lit = id === selected || ((id === detected || id === extHover) && !selected && !scanning);
      return rect ? { id, rect, label: md.label, tag: md.tag, accent: md.accent, active: lit, dim: false } : null;
    }).filter(Boolean));
  }

  ui.mountScreenApp();

  return { update, focusOn, resetView, setScanning, hoverProject, focusDevice, select, enterResearch, getSelected: () => selected };
}
