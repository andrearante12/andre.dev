import * as THREE from 'three';

// ---- Warm palette sampled from Andre's room photo ----
export const COL = {
  wallWarm: 0xc99a4a,
  wallShadow: 0x8f6a2e,
  woodDesk: 0x6f4a2c,
  woodDeskDark: 0x553820,
  floor: 0x2c2017,
  shelf: 0x7a5230,
  metal: 0xb9bec6,
  metalDark: 0x6a6e76,
  servo: 0x1b1b20,
  wireRed: 0xc0392b,
  monitorBezel: 0x141418,
  lampGlow: 0xffae52,
  potTerra: 0xb4703c,
  potGray: 0x8d8a83,
  leaf: 0x5f8f46,
  leafDark: 0x436b32,
  capy: 0xe0a24f,
  capyDark: 0xc6863a,
  keycap: 0xece7dd,
  accentPurple: 0x6c63ff,
  accentTeal: 0x00d4aa,
};

// Standard material factory with sensible warm-scene defaults.
export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    ...(opts.flatShading ? { flatShading: true } : {}),
    ...(opts.transparent ? { transparent: true, opacity: opts.opacity ?? 1 } : {}),
  });
}

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r, material, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cone(r, h, material, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function capsule(r, len, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function group(x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

// Tag every mesh in a subtree so raycasting can resolve to the owning object id.
export function tagInteractive(root, id) {
  root.traverse((o) => { o.userData.projectId = id; });
  root.userData.isInteractiveRoot = true;
  root.userData.projectId = id;
  return root;
}
