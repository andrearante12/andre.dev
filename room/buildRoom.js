import * as THREE from 'three';
import { COL, mat, box, cyl, sphere, cone, capsule, group } from './lib.js';

// A detailed potted plant. kind: 'leafy' | 'cactus' | 'succulent' | 'trailing' | 'olive'
function makePot(potCol, potH, topR, botR) {
  const g = group();
  const pm = mat(potCol, { roughness: 0.92 });
  g.add(cyl(topR, botR, potH, pm, 0, potH / 2, 0, 22));
  g.add(cyl(topR + 0.014, topR, 0.035, pm, 0, potH - 0.016, 0, 22));      // rim
  g.add(cyl(botR + 0.008, botR - 0.005, 0.025, pm, 0, 0.012, 0, 22));     // foot
  g.add(cyl(topR - 0.012, topR - 0.012, 0.03, mat(0x241910, { roughness: 1 }), 0, potH - 0.02, 0, 18)); // soil
  return g;
}

function pottedPlant(kind, potCol) {
  const g = group();
  const potH = 0.22, topR = 0.135, botR = 0.1;
  g.add(makePot(potCol, potH, topR, botR));
  const base = potH;
  const leafMat = mat(COL.leaf, { roughness: 0.7, flatShading: true });
  const leafMat2 = mat(COL.leafDark, { roughness: 0.7, flatShading: true });
  const leafHi = mat(0x7fae5a, { roughness: 0.65, flatShading: true });

  if (kind === 'cactus') {
    const body = capsule(0.07, 0.26, leafMat2, 0, base + 0.2, 0);
    g.add(body);
    // vertical ribs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(capsule(0.008, 0.24, leafMat, Math.cos(a) * 0.066, base + 0.2, Math.sin(a) * 0.066));
    }
    const arm1 = capsule(0.035, 0.1, leafMat2, 0.1, base + 0.18, 0); arm1.rotation.z = -0.7; g.add(arm1);
    const arm2 = capsule(0.03, 0.08, leafMat2, -0.09, base + 0.24, 0.02); arm2.rotation.z = 0.7; g.add(arm2);
    g.add(cone(0.04, 0.06, mat(0xe79bb0, { roughness: 0.6 }), 0, base + 0.37, 0, 8)); // tiny flower
  } else if (kind === 'succulent') {
    for (let ring = 0; ring < 3; ring++) {
      const n = 8 - ring * 2, rr = 0.09 - ring * 0.025, yy = base + 0.03 + ring * 0.04, sz = 0.16 - ring * 0.03;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.4;
        const leaf = cone(0.034, sz, ring === 1 ? leafHi : leafMat, Math.cos(a) * rr, yy, Math.sin(a) * rr, 6);
        const tilt = 0.9 - ring * 0.28;
        leaf.rotation.z = Math.cos(a) * tilt; leaf.rotation.x = -Math.sin(a) * tilt;
        g.add(leaf);
      }
    }
  } else if (kind === 'trailing') {
    // full leafy mound that sits on the pot — no stems below the rim
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = 0.04 + Math.random() * 0.08;
      const leaf = sphere(0.046, i % 2 ? leafMat : leafHi, Math.cos(a) * r, base + 0.03 + Math.random() * 0.07, Math.sin(a) * r, 8);
      leaf.scale.set(1, 0.42, 1.3); leaf.rotation.y = a; g.add(leaf);
    }
    // short tendrils draping just over the rim (kept above the pot bottom)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tip = sphere(0.028, leafMat, Math.cos(a) * 0.16, base - 0.04, Math.sin(a) * 0.16, 6);
      tip.scale.set(1, 0.4, 1.25); g.add(tip);
    }
  } else if (kind === 'olive') {
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2, bend = 0.18;
      const branch = cyl(0.012, 0.006, 0.5, mat(0x6b5536, { roughness: 0.8 }), Math.cos(a) * 0.03, base + 0.27, Math.sin(a) * 0.03, 5);
      branch.rotation.z = Math.cos(a) * bend; branch.rotation.x = -Math.sin(a) * bend; g.add(branch);
      for (let k = 0; k < 6; k++) {
        const yy = base + 0.12 + k * 0.07, rr = 0.03 + k * 0.018;
        [-1, 1].forEach((s) => {
          const lf = sphere(0.03, k % 2 ? leafMat2 : leafMat, Math.cos(a) * rr + s * 0.03, yy, Math.sin(a) * rr, 6);
          lf.scale.set(0.5, 0.28, 1.1); lf.rotation.y = a; g.add(lf);
        });
      }
    }
  } else { // leafy (snake / dracaena blades)
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, r = 0.04 + (i % 3) * 0.02, h = 0.42 + Math.random() * 0.28;
      const blade = cone(0.04, h, i % 2 ? leafMat : leafMat2, Math.cos(a) * r, base + h / 2 - 0.02, Math.sin(a) * r, 5);
      blade.scale.set(1, 1, 0.4);
      blade.rotation.z = Math.cos(a) * 0.4; blade.rotation.x = -Math.sin(a) * 0.4; blade.rotation.y = a;
      g.add(blade);
    }
  }
  return g;
}

// A simple framed painting drawn to a canvas texture. draw(ctx, w, h).
function makePainting(w, h, draw) {
  const g = group();
  g.add(box(w + 0.07, h + 0.07, 0.03, mat(0x2a2018, { roughness: 0.6 }))); // dark wood frame
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = Math.round(320 * h / w);
  draw(cv.getContext('2d'), cv.width, cv.height);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
  art.position.z = 0.018; g.add(art);
  return g;
}
function paintSun(ctx, w, h) {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#ecd6ab'); grd.addColorStop(1, '#cf9b5e');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c5673a'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.19, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a5a36'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.strokeStyle = 'rgba(50,34,20,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, h * 0.72); ctx.lineTo(w, h * 0.72); ctx.stroke();
}
function paintStrokes(ctx, w, h) {
  ctx.fillStyle = '#e7ddc8'; ctx.fillRect(0, 0, w, h);
  ['#7c8b5a', '#c17a4a', '#caa23a'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.roundRect(w * (0.18 + i * 0.23), h * 0.18, w * 0.13, h * 0.64, w * 0.06); ctx.fill();
  });
}
function paintArch(ctx, w, h) {
  ctx.fillStyle = '#e6d9bd'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#bd6f42';
  ctx.beginPath(); ctx.moveTo(w * 0.26, h * 0.9); ctx.lineTo(w * 0.26, h * 0.45);
  ctx.arc(w * 0.5, h * 0.45, w * 0.24, Math.PI, 0); ctx.lineTo(w * 0.74, h * 0.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6d9bd';
  ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.9); ctx.lineTo(w * 0.4, h * 0.5);
  ctx.arc(w * 0.5, h * 0.5, w * 0.1, Math.PI, 0); ctx.lineTo(w * 0.6, h * 0.9); ctx.closePath(); ctx.fill();
}

export function buildRoom() {
  const root = group();

  // ---- Floor ----
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    mat(COL.floor, { roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.5;
  floor.receiveShadow = true;
  root.add(floor);

  // ---- Walls ----
  const wallMat = mat(COL.wallWarm, { roughness: 1.0 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
  backWall.position.set(0, 2.5, -3.1);
  backWall.receiveShadow = true;
  root.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-4.2, 2.5, 0);
  leftWall.receiveShadow = true;
  root.add(leftWall);

  // ---- Framed paintings above the computer ----
  const pA = makePainting(0.62, 0.86, paintSun); pA.position.set(0.15, 2.46, -3.04); root.add(pA);
  const pB = makePainting(0.86, 0.58, paintStrokes); pB.position.set(1.18, 2.64, -3.04); root.add(pB);
  const pC = makePainting(0.56, 0.56, paintArch); pC.position.set(2.05, 2.42, -3.04); root.add(pC);

  // ---- Wall shelf on the LEFT wall (raised, above the desk) ----
  const shelfMat = mat(COL.shelf, { roughness: 0.85 });
  const shelfY = 1.25;
  root.add(box(0.66, 0.1, 3.3, shelfMat, -3.86, shelfY, -0.8));          // plant shelf board
  root.add(box(0.5, 0.2, 0.06, shelfMat, -3.92, shelfY - 0.14, -2.15)); // bracket
  root.add(box(0.5, 0.2, 0.06, shelfMat, -3.92, shelfY - 0.14, 0.5));   // bracket

  // upper shelf (raised well above the plants) — holds the Nintendo Switch on a stand
  const shelf2Y = 2.62;
  root.add(box(0.6, 0.1, 2.0, shelfMat, -3.88, shelf2Y, -0.7));
  root.add(box(0.46, 0.18, 0.06, shelfMat, -3.92, shelf2Y - 0.13, -1.45));
  root.add(box(0.46, 0.18, 0.06, shelfMat, -3.92, shelf2Y - 0.13, 0.05));

  // Plants on the shelf (varying z)
  const plantSpecs = [
    [-2.1, 'succulent', COL.potGray],
    [-1.5, 'cactus', COL.potTerra],
    [-0.9, 'leafy', COL.potTerra],
    [-0.25, 'olive', 0x2b2b30],
    [0.4, 'trailing', COL.potGray],
  ];
  plantSpecs.forEach(([z, kind, pc]) => {
    const p = pottedPlant(kind, pc);
    p.position.set(-3.92 + (Math.random() * 0.04), shelfY + 0.05, z);
    root.add(p);
  });

  // ---- Rattan table lamp on the desk, back-left corner ----
  const lamp = group(-3.45, 0.05, -2.35);
  const lampBase = cyl(0.12, 0.14, 0.05, mat(0x4a3320), 0, 0.025, 0);
  lamp.add(lampBase);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: COL.lampGlow, emissive: COL.lampGlow, emissiveIntensity: 0.9,
    roughness: 0.6, transparent: true, opacity: 0.92,
  });
  const shade = cyl(0.17, 0.2, 0.42, shadeMat, 0, 0.27, 0, 18);
  lamp.add(shade);
  root.add(lamp);

  // ---- L-shaped desk: flush in the back-left corner, skinny extension reaching out ----
  const deskMat = mat(COL.woodDesk, { roughness: 0.6 });
  const deskTopL = box(1.9, 0.09, 5.1, deskMat, -3.05, 0, -0.35);  // left extension along wall (robots)
  const deskTopR = box(5.1, 0.09, 2.3, deskMat, 0.45, 0, -1.75);   // right wing along back wall (computer)
  root.add(deskTopL, deskTopR);
  // Desk edge trim (darker) along the front edges
  root.add(box(1.9, 0.05, 0.06, mat(COL.woodDeskDark), -3.05, -0.02, 2.2));
  root.add(box(5.1, 0.05, 0.06, mat(COL.woodDeskDark), 0.45, -0.02, -0.6));

  // Legs (corners of the L)
  const legMat = mat(COL.woodDeskDark, { roughness: 0.7 });
  [[-3.8, -2.7], [-3.8, 2.0], [-2.3, 2.0], [2.8, -2.7], [2.8, -0.8], [-0.3, -0.8]].forEach(([x, z]) => {
    root.add(box(0.1, 1.45, 0.1, legMat, x, -0.77, z));
  });

  // ---- Keyboard (white mechanical) ----
  const kb = group(0.8, 0.05, -1.3);
  kb.add(box(1.5, 0.06, 0.5, mat(COL.keycap, { roughness: 0.5 }), 0, 0.03, 0));
  const keyMat = mat(0xded7cb, { roughness: 0.6 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 14; c++) {
      const k = box(0.075, 0.03, 0.075, keyMat, -0.62 + c * 0.095, 0.075, -0.16 + r * 0.1);
      kb.add(k);
    }
  }
  kb.rotation.y = -0.06;
  root.add(kb);
  // Mousepad
  root.add(box(0.6, 0.012, 0.5, mat(0x111114, { roughness: 0.9 }), 1.95, 0.05, -1.3));

  // ---- Capybara figurines (charm) ----
  function capybara(x, z, s) {
    const c = group(x, 0.05, z);
    c.scale.setScalar(s);
    const bodyMat = mat(COL.capy, { roughness: 0.78, flatShading: true });
    const darkMat = mat(COL.capyDark, { roughness: 0.78 });
    const body = capsule(0.14, 0.14, bodyMat, 0, 0.15, 0); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 1.05); c.add(body);
    const head = sphere(0.115, bodyMat, 0, 0.2, 0.17); head.scale.set(1, 0.95, 1); c.add(head);
    const snout = sphere(0.07, bodyMat, 0, 0.16, 0.27); snout.scale.set(1.05, 0.8, 1); c.add(snout);
    c.add(sphere(0.022, mat(0x140f0a), 0, 0.155, 0.33));                 // nose
    c.add(sphere(0.032, darkMat, -0.082, 0.295, 0.13));                  // ears
    c.add(sphere(0.032, darkMat, 0.082, 0.295, 0.13));
    c.add(sphere(0.016, mat(0x140f0a), -0.052, 0.215, 0.255));           // eyes
    c.add(sphere(0.016, mat(0x140f0a), 0.052, 0.215, 0.255));
    [[-0.085, 0.13], [0.085, 0.13], [-0.085, -0.11], [0.085, -0.11]].forEach(([lx, lz]) => {
      c.add(cyl(0.036, 0.04, 0.09, darkMat, lx, 0.045, lz, 8));          // stubby legs
    });
    return c;
  }
  root.add(capybara(2.3, -1.95, 1.0));
  root.add(capybara(2.66, -1.98, 0.85));

  // ---- Tall Wabi-sabi floor lamp (right of desk) — a major warm light source ----
  const floorLamp = group(3.55, -1.5, -2.5);
  const woodMat = mat(0x46301f, { roughness: 0.7 });
  // splayed tripod legs (clearly outside the shade)
  const mkStrut = (a, topR, topY, botR, botY) => {
    const p0 = new THREE.Vector3(Math.cos(a) * topR, topY, Math.sin(a) * topR);
    const p1 = new THREE.Vector3(Math.cos(a) * botR, botY, Math.sin(a) * botR);
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const leg = cyl(0.028, 0.014, dir.length(), woodMat, 0, 0, 0, 6);
    leg.position.copy(p0).addScaledVector(dir, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    floorLamp.add(leg);
  };
  for (let i = 0; i < 3; i++) mkStrut((i / 3) * Math.PI * 2 + 0.5, 0.19, 1.5, 0.34, 0);
  floorLamp.add(cyl(0.19, 0.19, 0.05, woodMat, 0, 0.55, 0, 24));            // wood collar under shade
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xfff4e2, emissive: 0xffe2b0, emissiveIntensity: 0.85, roughness: 0.5,
    transparent: true, opacity: 0.96,
  });
  floorLamp.add(cyl(0.15, 0.17, 1.7, floorMat, 0, 1.42, 0, 26));           // tall cylindrical shade
  floorLamp.add(cyl(0.15, 0.15, 0.03, mat(0xf3ead8, { roughness: 0.6 }), 0, 2.28, 0, 26)); // top cap
  root.add(floorLamp);

  const floorLight = new THREE.PointLight(0xffd9a0, 26, 17, 2);
  floorLight.position.set(3.55, 0.0, -2.5);
  floorLight.castShadow = true;
  floorLight.shadow.mapSize.set(1024, 1024);
  floorLight.shadow.bias = -0.0009;
  root.add(floorLight);

  return { root, rattanMat: shadeMat, floorMat, floorLight };
}
