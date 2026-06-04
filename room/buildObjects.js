import * as THREE from 'three';
import { COL, mat, box, cyl, sphere, cone, capsule, group, tagInteractive } from './lib.js';

const metal = () => mat(COL.metal, { roughness: 0.35, metalness: 0.7 });
const metalDark = () => mat(COL.metalDark, { roughness: 0.4, metalness: 0.6 });
const servo = () => mat(COL.servo, { roughness: 0.5, metalness: 0.2 });
const alu = () => mat(0xc6cace, { roughness: 0.34, metalness: 0.6 });        // bright aluminium
const blk = () => mat(0x1b1b1f, { roughness: 0.45, metalness: 0.2 });         // black servo body
const gold = () => mat(0xc7a233, { roughness: 0.4, emissive: 0x3a2e08, emissiveIntensity: 0.5 }); // gold label
const wire = () => mat(0xd6892a, { roughness: 0.6 });                          // orange servo wire
const pcb = () => mat(0x1f7a4f, { roughness: 0.6 });                           // green PCB
const pcbDark = () => mat(0x14512e, { roughness: 0.6 });

// ---------------------------------------------------------------------------
// 6-DOF robotic arm — nested joint groups so we can animate an idle sway.
// ---------------------------------------------------------------------------
function buildArm() {
  const root = group(-3.0, 0.05, 1.7);
  root.rotation.y = 2.3;

  // base U-bracket + bolts
  root.add(box(0.46, 0.04, 0.42, alu(), 0, 0.02, 0));
  root.add(box(0.04, 0.15, 0.42, alu(), -0.2, 0.1, 0));
  root.add(box(0.04, 0.15, 0.42, alu(), 0.2, 0.1, 0));
  [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]].forEach(([x, z]) => root.add(cyl(0.016, 0.016, 0.05, blk(), x, 0.045, z, 8)));

  const yaw = group(0, 0.06, 0);
  root.add(yaw);
  yaw.add(box(0.2, 0.15, 0.17, blk(), 0, 0.08, 0));                 // base servo (black)
  yaw.add(box(0.06, 0.025, 0.004, gold(), 0.105, 0.08, 0.02));      // gold label
  yaw.add(cyl(0.12, 0.13, 0.04, alu(), 0, 0.005, 0, 18));           // turntable disc

  // shoulder
  const shoulder = group(0, 0.17, 0);
  yaw.add(shoulder);
  shoulder.add(box(0.04, 0.2, 0.18, alu(), -0.085, 0.05, 0));       // U-bracket plates
  shoulder.add(box(0.04, 0.2, 0.18, alu(), 0.085, 0.05, 0));
  shoulder.add(cyl(0.055, 0.055, 0.22, blk(), 0, 0.1, 0).rotateX(Math.PI / 2)); // shoulder axle servo
  const upper = group(0, 0.14, 0);
  shoulder.add(upper);
  upper.add(box(0.045, 0.44, 0.14, alu(), -0.065, 0.2, 0));         // twin link plates
  upper.add(box(0.045, 0.44, 0.14, alu(), 0.065, 0.2, 0));
  upper.add(box(0.15, 0.05, 0.1, alu(), 0, 0.06, 0));               // cross brace
  upper.add(box(0.15, 0.05, 0.1, alu(), 0, 0.34, 0));
  upper.add(cyl(0.013, 0.013, 0.42, wire(), 0.105, 0.2, 0.05));     // orange wires
  upper.add(cyl(0.013, 0.013, 0.42, wire(), 0.12, 0.2, 0.02));

  // elbow
  const elbow = group(0, 0.44, 0);
  upper.add(elbow);
  elbow.add(box(0.17, 0.13, 0.12, blk(), 0, 0, 0));                 // elbow servo
  elbow.add(box(0.06, 0.025, 0.004, gold(), 0, 0, 0.062));
  const fore = group(0, 0.08, 0);
  elbow.add(fore);
  fore.add(box(0.04, 0.36, 0.12, alu(), -0.055, 0.18, 0));
  fore.add(box(0.04, 0.36, 0.12, alu(), 0.055, 0.18, 0));
  fore.add(box(0.13, 0.04, 0.09, alu(), 0, 0.3, 0));
  fore.add(cyl(0.012, 0.012, 0.32, wire(), 0.075, 0.18, 0.04));

  // wrist + four-bar-linkage claw gripper
  const wrist = group(0, 0.4, 0);
  fore.add(wrist);
  wrist.add(box(0.15, 0.13, 0.12, blk(), 0, 0.04, 0));            // wrist servo
  wrist.add(box(0.06, 0.025, 0.004, gold(), 0, 0.04, 0.062));     // gold label
  const grip = group(0, 0.11, 0);
  wrist.add(grip);
  // flat aluminium base plate + round servo-horn boss + bolt holes
  grip.add(box(0.26, 0.04, 0.18, alu(), 0, 0.01, 0));             // base plate
  grip.add(cyl(0.065, 0.065, 0.05, alu(), 0, 0.05, 0, 22));       // servo-horn boss
  grip.add(cyl(0.028, 0.028, 0.065, gold(), 0, 0.06, 0, 16));     // brass horn centre
  [[-0.105, 0.06], [0.105, 0.06], [-0.105, -0.06], [0.105, -0.06], [-0.105, 0], [0.105, 0]]
    .forEach(([x, z]) => grip.add(cyl(0.009, 0.009, 0.045, blk(), x, 0.02, z, 8)));

  // thin flat link bar between two points in the finger's XY plane
  const linkBar = (parent, x1, y1, x2, y2, w = 0.022, d = 0.09) => {
    const dx = x2 - x1, dy = y2 - y1;
    const b = box(Math.hypot(dx, dy), w, d, alu(), (x1 + x2) / 2, (y1 + y2) / 2, 0);
    b.rotation.z = Math.atan2(dy, dx);
    parent.add(b);
    return b;
  };
  // a finger = open triangular frame (two link bars → tip) + inward gripping pad
  const buildFinger = (side) => {
    const f = group(side * 0.085, 0.04, 0);
    const px = 0.032, tipX = -side * 0.018, tipY = 0.23;
    f.add(cyl(0.013, 0.013, 0.1, blk(), -px, 0, 0, 8).rotateX(Math.PI / 2)); // pivot pins
    f.add(cyl(0.013, 0.013, 0.1, blk(),  px, 0, 0, 8).rotateX(Math.PI / 2));
    linkBar(f, -px, 0, tipX, tipY);        // outer link
    linkBar(f,  px, 0, tipX, tipY);        // inner link
    linkBar(f, -px, 0, px, 0, 0.02);       // base crossbar
    const pad = box(0.045, 0.08, 0.11, alu(), tipX + side * 0.015, tipY - 0.02, 0);
    pad.rotation.z = side * 0.4;           // gripping pad, curved toward centre
    f.add(pad);
    return f;
  };
  const f1 = buildFinger(-1);
  const f2 = buildFinger(1);
  grip.add(f1, f2);

  tagInteractive(root, 'imitation-arm');

  const update = (t) => {
    yaw.rotation.y = Math.sin(t * 0.25) * 0.5;
    shoulder.rotation.z = Math.sin(t * 0.32) * 0.18 - 0.15;
    elbow.rotation.z = Math.sin(t * 0.32 + 1.1) * 0.22 + 0.35;
    wrist.rotation.z = Math.sin(t * 0.4 + 2) * 0.15;
    const o = (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.045 + 0.02;
    f1.position.x = -0.085 - o; f2.position.x = 0.085 + o;
  };

  return { id: 'imitation-arm', root, update,
    focus: { pos: new THREE.Vector3(-2.0, 1.05, 1.7), target: new THREE.Vector3(-3.0, 0.6, 1.7) } };
}

// ---------------------------------------------------------------------------
// Ultrawide monitor with a live video texture (Minecraft parkour clip).
// ---------------------------------------------------------------------------
function buildMonitor() {
  const root = group(1.0, 0.05, -2.6);

  // stand
  root.add(box(0.7, 0.04, 0.28, metalDark(), 0, 0.02, 0.15));
  root.add(box(0.1, 0.55, 0.08, metalDark(), 0, 0.3, 0.05));

  // bezel
  const W = 2.5, H = 1.05;
  const bezel = box(W + 0.07, H + 0.07, 0.07, mat(COL.monitorBezel, { roughness: 0.5 }), 0, 0.62 + H / 2 - 0.5 + 0.46, 0.02);
  root.add(bezel);

  // video element + texture
  const video = document.createElement('video');
  video.src = 'videos/minecraft_envs.mp4';
  video.loop = true; video.muted = true; video.playsInline = true;
  video.autoplay = true; video.preload = 'auto';
  video.setAttribute('crossorigin', 'anonymous');
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), screenMat);
  screen.position.set(0, bezel.position.y, 0.057);
  root.add(screen);

  // cool screen glow
  const glow = new THREE.PointLight(0x6f8cff, 6, 4, 2);
  glow.position.set(0, bezel.position.y, 0.6);
  root.add(glow);

  tagInteractive(root, 'minecraft-rl');
  // keep screen pickable but exclude glow light already non-mesh

  const playSafe = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };

  return { id: 'minecraft-rl', root, video, playSafe,
    update: (t) => { glow.intensity = 5 + Math.sin(t * 3) * 1.2; },
    focus: { pos: new THREE.Vector3(1.0, 1.1, -0.9), target: new THREE.Vector3(1.0, 1.05, -2.55) } };
}

// ---------------------------------------------------------------------------
// PiCrawler quadruped — body + 4 two-segment legs, idle gait.
// ---------------------------------------------------------------------------
function buildCrawler() {
  const root = group(-3.0, 0.185, -0.4);   // raised so feet rest on the desk top (y≈0.045), not through it
  root.rotation.y = 0.95;
  root.scale.setScalar(0.92);

  const body = group(0, 0.3, 0);
  root.add(body);
  // stacked aluminium chassis plates
  body.add(box(0.38, 0.018, 0.32, alu(), 0, -0.07, 0));
  body.add(box(0.3, 0.018, 0.26, alu(), 0, 0.12, 0));
  // Raspberry Pi (green) with silver USB / ethernet ports on one side
  body.add(box(0.26, 0.03, 0.2, pcbDark(), 0, -0.02, 0));
  body.add(box(0.05, 0.045, 0.075, mat(0x9a9ea4, { metalness: 0.7, roughness: 0.3 }), 0.14, -0.015, 0.045));
  body.add(box(0.05, 0.045, 0.075, mat(0x9a9ea4, { metalness: 0.7, roughness: 0.3 }), 0.14, -0.015, -0.05));
  // Robot HAT (green PCB) + black pin header + speaker + chip
  body.add(box(0.26, 0.022, 0.2, pcb(), 0, 0.04, 0));
  body.add(box(0.22, 0.032, 0.028, blk(), 0, 0.06, -0.07));         // pin header strip
  body.add(cyl(0.05, 0.05, 0.028, blk(), -0.06, 0.065, 0.05, 14));  // speaker
  body.add(cyl(0.05, 0.05, 0.001, mat(0x33333a), -0.06, 0.08, 0.05, 14));
  body.add(box(0.055, 0.03, 0.05, mat(0x26262b), 0.075, 0.065, 0.0)); // chip
  body.add(cyl(0.012, 0.012, 0.03, mat(0xb9762a), 0.04, 0.07, 0.06)); // capacitor
  body.add(cyl(0.012, 0.012, 0.03, mat(0xb9762a), 0.0, 0.07, 0.07));
  // white spiral cable arc over the top
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.022, 8, 26, Math.PI),
    mat(0xedeef0, { roughness: 0.6 })
  );
  arc.position.set(0, 0.07, -0.02); arc.castShadow = true; body.add(arc);
  // front: camera board + lens, ultrasonic pair
  body.add(box(0.075, 0.055, 0.02, pcbDark(), 0, 0.0, 0.16));
  body.add(cyl(0.02, 0.02, 0.016, mat(0x0a0a12, { metalness: 0.5, roughness: 0.2 }), 0, 0.0, 0.172).rotateX(Math.PI / 2));
  body.add(cyl(0.036, 0.036, 0.03, mat(0x8d9096, { metalness: 0.4, roughness: 0.4 }), -0.06, -0.05, 0.15).rotateX(Math.PI / 2));
  body.add(cyl(0.036, 0.036, 0.03, mat(0x8d9096, { metalness: 0.4, roughness: 0.4 }), 0.06, -0.05, 0.15).rotateX(Math.PI / 2));
  body.add(sphere(0.012, new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x39ff88, emissiveIntensity: 1.3 }), 0.1, 0.055, 0.06, 8));

  // legs: black servo at hip + angular silver sheet-metal segments + pointed foot
  const legs = [];
  [[-0.17, 0.15], [0.17, 0.15], [-0.17, -0.15], [0.17, -0.15]].forEach(([x, z], i) => {
    const side = x > 0 ? 1 : -1;
    const hip = group(x, 0.26, z);
    root.add(hip);
    hip.add(box(0.09, 0.1, 0.07, blk(), side * 0.025, 0, 0));            // hip "Metal Gear" servo
    hip.add(box(0.05, 0.022, 0.004, gold(), side * 0.06, 0.0, 0.036));   // gold label
    const femur = group(side * 0.06, 0.0, 0);
    hip.add(femur);
    femur.add(box(0.02, 0.15, 0.09, alu(), side * 0.05, -0.06, 0));      // flat aluminium bracket
    femur.add(box(0.02, 0.06, 0.09, alu(), side * 0.085, -0.12, 0).rotateZ(side * -0.5));
    const knee = group(side * 0.11, -0.15, 0);
    femur.add(knee);
    knee.add(box(0.08, 0.07, 0.05, blk(), 0, 0, 0));                     // knee servo
    const tibia = group(0, 0, 0);
    knee.add(tibia);
    // angular tapered silver shin (4-sided cone reads as bent sheet metal) + point foot
    tibia.add(cyl(0.015, 0.06, 0.22, alu(), side * 0.03, -0.11, 0, 4).rotateZ(side * 0.12));
    tibia.add(cone(0.035, 0.06, alu(), side * 0.05, -0.23, 0, 4));
    legs.push({ hip, knee: tibia, phase: i * Math.PI / 2, side });
  });

  tagInteractive(root, 'picrawler');

  const update = (t) => {
    body.position.y = 0.3 + Math.sin(t * 2) * 0.012;
    legs.forEach((l) => {
      l.hip.rotation.z = Math.sin(t * 2 + l.phase) * 0.1 * l.side;
      l.knee.rotation.z = Math.cos(t * 2 + l.phase) * 0.12;
    });
    root.rotation.y = 0.95 + Math.sin(t * 0.4) * 0.05;
  };

  return { id: 'picrawler', root, update,
    focus: { pos: new THREE.Vector3(-2.1, 0.7, 0.1), target: new THREE.Vector3(-3.0, 0.46, -0.4) } };
}

// ---------------------------------------------------------------------------
// IoT smart hub — little speaker with a pulsing accent ring + bulb glow.
// ---------------------------------------------------------------------------
function buildIot() {
  const root = group(-0.7, 0.05, -1.5);

  root.add(cyl(0.13, 0.14, 0.26, mat(0x4a4a52, { roughness: 0.7 }), 0, 0.13, 0, 24));
  const ringMat = new THREE.MeshStandardMaterial({
    color: COL.accentTeal, emissive: COL.accentTeal, emissiveIntensity: 1.4, roughness: 0.4,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 12, 28), ringMat);
  ring.position.y = 0.27; ring.rotation.x = Math.PI / 2; root.add(ring);

  // a small smart bulb beside it (LUMINA-controlled "Lamp 2")
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c0, emissive: COL.lampGlow, emissiveIntensity: 1.6, roughness: 0.3,
  });
  const bulb = sphere(0.07, bulbMat, 0.26, 0.1, 0.04, 16);
  root.add(bulb);
  const bulbLight = new THREE.PointLight(COL.lampGlow, 2.6, 1.6, 2);
  bulbLight.position.set(0.26, 0.12, 0.04); root.add(bulbLight);

  // phone running the LUMINA app — lying flat on the desk, glowing screen
  const phone = group(-0.5, 0, 0.45);
  phone.rotation.set(-Math.PI / 2, 0, 0);
  phone.add(box(0.3, 0.62, 0.025, mat(0x101216, { roughness: 0.4 }), 0, 0, 0)); // body
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, emissive: 0x0c1830, emissiveIntensity: 0.35, roughness: 0.3 })
  );
  phoneScreen.position.z = 0.014; phone.add(phoneScreen);
  phoneScreen.userData.isPhoneScreen = true;
  root.add(phone);

  tagInteractive(root, 'iot-smarthome');
  // the PHONE carries the IoT identity (hover box + click → LUMINA); the hub/bulb stay as decor
  root.traverse((o) => { if (o.userData.projectId === 'iot-smarthome') o.userData.projectId = null; });
  phone.traverse((o) => { o.userData.projectId = 'iot-smarthome'; });

  const update = (t) => {
    const p = Math.sin(t * 1.6) * 0.5 + 0.5;
    ringMat.emissiveIntensity = 0.8 + p * 1.2;   // status ring keeps a gentle pulse
  };

  return { id: 'iot-smarthome', root, update, bulbMat, bulbLight,
    focus: { pos: new THREE.Vector3(-0.5, 0.62, -0.4), target: new THREE.Vector3(-0.85, 0.24, -1.2) } };
}

export function buildObjects() {
  return [buildArm(), buildMonitor(), buildCrawler(), buildIot(), buildSwitch()];
}

// Nintendo Switch on the upper wall shelf → VGC teambuilder agent (screen plays a demo).
export function buildSwitch() {
  const root = group(-3.78, 2.67, -0.78);
  root.rotation.set(0, 0.95, 0);
  const W = 0.3, H = 0.17, yb = 0.115;
  // small stand on the shelf that props the Switch up (prevents clipping)
  const standMat = mat(0x26262c, { roughness: 0.5 });
  root.add(box(0.22, 0.02, 0.13, standMat, 0, 0.01, -0.02));   // base foot on shelf
  root.add(box(0.06, 0.18, 0.03, standMat, 0, 0.1, -0.05));    // vertical back post
  root.add(box(W, H, 0.016, mat(0x16161a, { roughness: 0.4 }), 0, yb, 0));                      // tablet
  root.add(box(0.05, H + 0.004, 0.02, mat(0xe3504a, { roughness: 0.45 }), -(W / 2 + 0.027), yb, 0)); // L joy-con
  root.add(box(0.05, H + 0.004, 0.02, mat(0x2aa6e6, { roughness: 0.45 }), (W / 2 + 0.027), yb, 0));   // R joy-con
  root.add(cyl(0.013, 0.013, 0.008, mat(0x0a0a0a), -(W / 2 + 0.027), yb + 0.045, 0.013).rotateX(Math.PI / 2));
  root.add(cyl(0.013, 0.013, 0.008, mat(0x0a0a0a), (W / 2 + 0.027), yb - 0.045, 0.013).rotateX(Math.PI / 2));

  // screen — live VGC battle demo clip
  const video = document.createElement('video');
  video.src = 'videos/vgc_demo.webm';
  video.loop = true; video.muted = true; video.playsInline = true;
  video.autoplay = true; video.preload = 'auto';
  video.setAttribute('crossorigin', 'anonymous');
  const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.152), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, yb, 0.0095); root.add(screen);
  const playSafe = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };

  const glow = new THREE.PointLight(0x8aa0ff, 1.2, 1.8, 2); glow.position.set(0, yb, 0.35); root.add(glow);

  tagInteractive(root, 'vgc');
  return { id: 'vgc', root, screen, video, playSafe,
    update: (t) => { glow.intensity = 0.9 + Math.sin(t * 3) * 0.4; },
    focus: { pos: new THREE.Vector3(-2.0, 3.0, 0.7), target: new THREE.Vector3(-3.78, 2.78, -0.78) } };
}

// Standalone DSLR camera on the back corner of the desk → opens the photography gallery.
export function buildCamera() {
  const root = group(-2.85, 0.05, -2.45);
  root.rotation.y = 0.9;

  const bodyMat = mat(0x1b1b20, { roughness: 0.5, metalness: 0.2 });
  const trimMat = mat(0x2a2a30, { roughness: 0.4 });
  // body + grip
  root.add(box(0.34, 0.22, 0.14, bodyMat, 0, 0.14, 0));
  root.add(box(0.09, 0.2, 0.16, bodyMat, -0.17, 0.13, 0));            // hand grip
  // pentaprism hump + hotshoe
  root.add(box(0.12, 0.07, 0.1, bodyMat, 0.02, 0.27, 0));
  root.add(box(0.05, 0.02, 0.05, trimMat, 0.02, 0.31, 0));
  // lens (faces +z / outward) — barrel + focus ring + glass
  root.add(cyl(0.095, 0.1, 0.14, bodyMat, 0.04, 0.14, 0.13).rotateX(Math.PI / 2));
  root.add(cyl(0.1, 0.1, 0.03, trimMat, 0.04, 0.14, 0.2).rotateX(Math.PI / 2));   // focus ring
  root.add(cyl(0.07, 0.07, 0.02, mat(0x0a0a14, { roughness: 0.15, metalness: 0.5 }), 0.04, 0.14, 0.215).rotateX(Math.PI / 2)); // glass
  root.add(cyl(0.04, 0.04, 0.01, mat(0x2a4d6b, { roughness: 0.1, metalness: 0.6, emissive: 0x16304a, emissiveIntensity: 0.5 }), 0.04, 0.14, 0.222).rotateX(Math.PI / 2)); // reflection
  // shutter button + dial + red accent
  root.add(cyl(0.018, 0.018, 0.02, trimMat, -0.13, 0.26, 0));
  root.add(cyl(0.035, 0.035, 0.03, trimMat, 0.13, 0.25, 0).rotateX(Math.PI / 2));
  root.add(box(0.02, 0.04, 0.001, mat(0xd14b3a, { roughness: 0.5 }), -0.07, 0.14, 0.071)); // red line

  tagInteractive(root, 'photography');
  return { id: 'photography', root };
}
