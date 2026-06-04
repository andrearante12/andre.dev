import * as THREE from 'three';
import { mat, box, cyl, sphere, cone, group } from './lib.js';

// Exterior "front yard" scene: a detailed cottage, concrete driveway, an
// orange "H" landing pad and a package-delivery drone that flies in, hovers,
// descends, drops a parcel on the pad and flies away. Hidden until Research.
export function buildExterior() {
  const root = group();
  root.visible = false;

  // ---- dusk lighting (lives inside the group so it toggles with it) ----
  root.add(new THREE.HemisphereLight(0xbcd0ff, 0x3b3326, 0.65));
  root.add(new THREE.AmbientLight(0x6a5a44, 0.5));
  const sun = new THREE.DirectionalLight(0xffd6a0, 1.15);
  sun.position.set(7, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0005;
  root.add(sun);

  // ---- lawn ----
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), mat(0x4e7a3c, { roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = -1.5; lawn.receiveShadow = true; root.add(lawn);

  // ---- concrete driveway + walkway ----
  const pathMat = mat(0xa9a9a3, { roughness: 0.97 });
  const apronMat = mat(0xb6b6af, { roughness: 0.97 });
  const walk = box(1.9, 0.06, 7.6, pathMat, 0.5, -1.47, -1.6); walk.castShadow = false; root.add(walk);
  const apron = box(3.2, 0.07, 1.7, apronMat, 0.5, -1.46, -4.7); apron.castShadow = false; root.add(apron);

  // ============================================================
  //  HOUSE  (facade group: local y=0 is ground level / world -1.5)
  // ============================================================
  const W = 6.5, DEP = 5.0, WH = 2.6, FH = 0.55;   // width, depth, wall height, foundation height
  const facade = group(0.5, -1.5, -8.5);            // front face lands at world z ≈ -6.0
  const frontZ = DEP / 2;
  const wallTop = FH + WH;                           // 3.15
  const rise = 1.7, ovz = 0.45, ovx = 0.4;
  const ridgeY = wallTop + rise;                     // 4.85

  const creamMat = mat(0xe7dcc6, { roughness: 0.9 });
  const foundMat = mat(0x8d8e92, { roughness: 0.96 });
  const roofMat = mat(0xd6863a, { roughness: 0.72, flatShading: true });
  const roofDark = mat(0xb46c2b, { roughness: 0.7, flatShading: true });
  const doorMat = mat(0xa8412f, { roughness: 0.55 });
  const frameMat = mat(0xf2ece0, { roughness: 0.85 });
  const awningMat = mat(0xee9f3c, { roughness: 0.6, emissive: 0xee9f3c, emissiveIntensity: 0.12 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffc25a, emissiveIntensity: 0.7, roughness: 0.45 });
  const stepMat = mat(0xb7b7b2, { roughness: 0.95 });
  const flueMat = mat(0x2a2a2e, { roughness: 0.7 });

  // foundation skirt + walls
  facade.add(box(W + 0.3, FH, DEP + 0.3, foundMat, 0, FH / 2, 0));
  facade.add(box(W, WH, DEP, creamMat, 0, FH + WH / 2, 0));

  // cream gable-end triangles (faces ±X), filling wall-top → ridge
  const gable = () => {
    const s = new THREE.Shape();
    s.moveTo(-DEP / 2, wallTop); s.lineTo(DEP / 2, wallTop); s.lineTo(0, ridgeY); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, creamMat); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const gl = gable(); gl.position.x = -W / 2 + 0.16; facade.add(gl);
  const gr = gable(); gr.position.x = W / 2; facade.add(gr);

  // gable roof: two sloped slabs + ridge cap (ridge runs along X)
  const run = DEP / 2 + ovz, slopeLen = Math.hypot(run, rise), phi = Math.atan2(rise, run);
  const roofW = W + 2 * ovx;
  const slabFront = box(roofW, 0.16, slopeLen, roofMat, 0, (wallTop + ridgeY) / 2, run / 2);
  slabFront.rotation.x = phi; facade.add(slabFront);
  const slabBack = box(roofW, 0.16, slopeLen, roofMat, 0, (wallTop + ridgeY) / 2, -run / 2);
  slabBack.rotation.x = -phi; facade.add(slabBack);
  facade.add(box(roofW + 0.1, 0.16, 0.24, roofDark, 0, ridgeY + 0.04, 0));   // ridge cap

  // chimney (back-right) with two flue pots
  facade.add(box(0.7, 1.9, 0.7, creamMat, 1.3, 3.85, -0.9));
  facade.add(box(0.82, 0.18, 0.82, foundMat, 1.3, 4.85, -0.9));             // crown
  facade.add(box(0.2, 0.38, 0.2, flueMat, 1.16, 5.05, -0.9));
  facade.add(box(0.2, 0.38, 0.2, flueMat, 1.44, 5.05, -0.9));

  // ---- front door + portico ----
  facade.add(box(1.12, 1.95, 0.14, doorMat, 0, FH + 0.95, frontZ + 0.05));
  facade.add(sphere(0.045, mat(0xd9b25a, { metalness: 0.5, roughness: 0.3 }), 0.4, FH + 0.9, frontZ + 0.16));
  // portico columns
  const column = (x) => {
    facade.add(box(0.26, 2.05, 0.26, creamMat, x, 1.03, frontZ + 0.42));
    facade.add(box(0.34, 0.18, 0.34, frameMat, x, 0.1, frontZ + 0.42));   // base
    facade.add(box(0.34, 0.16, 0.34, frameMat, x, 1.97, frontZ + 0.42));  // capital
  };
  column(-0.95); column(0.95);
  facade.add(box(2.5, 0.22, 0.5, creamMat, 0, 2.16, frontZ + 0.42));       // header beam
  // small front-facing gable over the entrance (portico roof)
  const ps = new THREE.Shape();
  ps.moveTo(-1.35, 0); ps.lineTo(1.35, 0); ps.lineTo(0, 0.85); ps.closePath();
  const pg = new THREE.ExtrudeGeometry(ps, { depth: 0.95, bevelEnabled: false });
  const portico = new THREE.Mesh(pg, roofMat); portico.castShadow = true;
  portico.position.set(0, 2.27, frontZ - 0.1); facade.add(portico);

  // steps (gray, stacked + receding toward the yard)
  facade.add(box(2.4, 0.16, 1.0, stepMat, 0, 0.08, frontZ + 0.85));
  facade.add(box(2.0, 0.3, 0.6, stepMat, 0, 0.15, frontZ + 0.55));

  // ---- windows (white frame + warm glass + muntins + orange awning) ----
  function windowUnit(w, h) {
    const g = group();
    g.add(box(w, h, 0.12, frameMat, 0, 0, 0));
    g.add(box(w - 0.18, h - 0.18, 0.08, glassMat, 0, 0, 0.05));
    g.add(box(w - 0.1, 0.05, 0.1, frameMat, 0, 0, 0.07));      // muntin H
    g.add(box(0.05, h - 0.1, 0.1, frameMat, 0, 0, 0.07));      // muntin V
    return g;
  }
  const awning = (x, y, z, ry) => {
    const a = box(1.15, 0.16, 0.5, awningMat, 0, 0, 0.18);
    a.rotation.x = -0.45; const g = group(x, y, z); g.rotation.y = ry; g.add(a); facade.add(g);
  };
  // two front windows flanking the door
  [-2.05, 2.05].forEach((x) => {
    const wu = windowUnit(1.05, 1.05); wu.position.set(x, FH + 1.1, frontZ + 0.02); facade.add(wu);
    awning(x, FH + 1.78, frontZ + 0.06, 0);
  });
  // one window on the visible right side wall
  const side = windowUnit(1.05, 1.05); side.position.set(W / 2 + 0.02, FH + 1.1, -1.1);
  side.rotation.y = Math.PI / 2; facade.add(side);
  awning(W / 2 + 0.06, FH + 1.78, -1.1, Math.PI / 2);

  root.add(facade);

  // ============================================================
  //  ORANGE "H" LANDING PAD  (slightly smaller)
  // ============================================================
  const pad = group(0.5, -1.45, -1.4);
  const padOrange = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 0.32, roughness: 0.7 });
  const padBlack = mat(0x0d0d10, { roughness: 0.6 });
  const disc = (r, h, m, y) => { const d = cyl(r, r, h, m, 0, y, 0, 48); d.receiveShadow = true; return d; };
  pad.add(disc(0.86, 0.05, padBlack, 0.0));
  pad.add(disc(0.73, 0.04, padOrange, 0.035));
  pad.add(disc(0.56, 0.02, padBlack, 0.06));
  pad.add(disc(0.48, 0.02, padOrange, 0.075));
  const hy = 0.09;
  pad.add(box(0.1, 0.02, 0.5, padBlack, -0.16, hy, 0));
  pad.add(box(0.1, 0.02, 0.5, padBlack, 0.16, hy, 0));
  pad.add(box(0.22, 0.02, 0.11, padBlack, 0, hy, 0));
  [0, 1, 2, 3].forEach((i) => {
    const a = i * Math.PI / 2;
    const t = cone(0.09, 0.02, padBlack, Math.sin(a) * 0.65, 0.055, Math.cos(a) * 0.65, 3);
    t.rotation.y = -a; pad.add(t);
  });
  root.add(pad);

  // ============================================================
  //  PACKAGE  (root-level so it can be dropped onto the pad)
  // ============================================================
  const pkg = group(0.5, 2.4 - 0.62, -1.4);
  pkg.add(box(0.42, 0.4, 0.42, mat(0xc79a5e, { roughness: 0.9 }), 0, 0, 0));
  pkg.add(box(0.44, 0.05, 0.08, mat(0x9c7340, { roughness: 0.9 }), 0, 0.05, 0));
  pkg.add(box(0.08, 0.05, 0.44, mat(0x9c7340, { roughness: 0.9 }), 0, 0.05, 0));
  root.add(pkg);

  // ============================================================
  //  DELIVERY DRONE
  // ============================================================
  const drone = group(0.5, 2.4, -1.4);
  const dMat = mat(0x2a2c33, { roughness: 0.5, metalness: 0.3 });
  const aMat = mat(0xc6cace, { roughness: 0.4, metalness: 0.6 });
  drone.add(box(0.5, 0.16, 0.5, dMat, 0, 0, 0));
  drone.add(box(0.3, 0.06, 0.3, mat(0x15512e, { roughness: 0.6 }), 0, 0.11, 0));
  drone.add(sphere(0.08, dMat, 0, -0.12, 0.1, 12));
  drone.add(cyl(0.03, 0.03, 0.03, mat(0x0a0a12, { metalness: 0.5, roughness: 0.2 }), 0, -0.18, 0.14).rotateX(Math.PI / 2));
  const rotors = [];
  [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]].forEach(([x, z]) => {
    const arm = box(Math.hypot(x, z) * 2, 0.035, 0.05, aMat, x / 2, 0.02, z / 2);
    arm.rotation.y = Math.atan2(z, x); drone.add(arm);
    drone.add(cyl(0.05, 0.06, 0.07, dMat, x, 0.05, z));
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.05), mat(0x3a3d45, { roughness: 0.5 }));
    rotor.position.set(x, 0.1, z); drone.add(rotor); rotors.push(rotor);
    drone.add(cyl(0.012, 0.012, 0.22, dMat, x, -0.12, z));
  });
  // tether lines (hidden once the package is released)
  const linesGrp = group(); drone.add(linesGrp);
  [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]].forEach(([x, z]) => {
    linesGrp.add(cyl(0.006, 0.006, 0.42, mat(0x111114), x, -0.4, z));
  });
  // landing-sensor beam (toggled during approach)
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.4, 22, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(0, -1.3, 0.06); beam.visible = false; drone.add(beam);
  root.add(drone);

  // ============================================================
  //  DELIVERY ANIMATION
  // ============================================================
  const PADX = 0.5, PADZ = -1.4, REST_Y = -1.2;
  const S = new THREE.Vector3(-12, 4.6, 4.5);   // fly-in start (off to the side)
  const H = new THREE.Vector3(PADX, 2.7, PADZ); // hover over pad
  const L = new THREE.Vector3(PADX, 0.75, PADZ);// low hold before drop
  const E = new THREE.Vector3(15, 5.2, 3.5);    // fly-away exit
  const tmp = new THREE.Vector3();
  let armed = false, startT = null;

  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const easeIn = (x) => x * x;
  const lerpV = (a, b, u, o) => o.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);

  function playDelivery() { armed = true; startT = null; }

  const update = (t) => {
    rotors.forEach((r, i) => { r.rotation.y += 0.85 + i * 0.03; });
    if (!armed) { drone.visible = false; pkg.visible = false; return; }
    if (startT === null) startT = t;
    const e = t - startT;
    drone.visible = true; pkg.visible = true;
    const bob = Math.sin(t * 6) * 0.04;

    // ---- drone path ----
    if (e < 3.2) lerpV(S, H, easeInOut(e / 3.2), tmp);            // fly in
    else if (e < 6.0) lerpV(H, L, easeInOut((e - 3.2) / 2.8), tmp); // slow descent
    else if (e < 7.8) tmp.copy(L);                                // hold over pad
    else if (e < 11.0) lerpV(L, E, easeIn((e - 7.8) / 3.2), tmp); // fly away
    else { tmp.copy(E); drone.visible = false; }
    drone.position.set(tmp.x, tmp.y + bob, tmp.z);
    drone.rotation.y = Math.sin(t * 0.5) * 0.05;
    beam.visible = e > 2.2 && e < 7.0;

    // ---- package ----
    if (e < 6.0) {                                                // carried under drone
      pkg.position.set(drone.position.x, drone.position.y - 0.62, drone.position.z);
      linesGrp.visible = true;
    } else if (e < 7.2) {                                         // lowered onto the pad
      const u = easeInOut((e - 6.0) / 1.2);
      const fromY = L.y - 0.62;
      pkg.position.set(PADX, fromY + (REST_Y - fromY) * u, PADZ);
      linesGrp.visible = false;
    } else {                                                      // delivered — rests on pad
      pkg.position.set(PADX, REST_Y, PADZ);
      linesGrp.visible = false;
    }
  };

  return { root, update, playDelivery };
}
