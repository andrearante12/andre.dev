import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom } from './buildRoom.js';
import { buildObjects, buildCamera } from './buildObjects.js';
import { initInteraction } from './interaction.js';
import { initUI } from './ui.js';
import { createLamps } from './lamps.js';
import { initGallery } from './gallery.js';
import { buildExterior } from './exterior.js';
import { PROJECTS, PROJECT_ORDER } from './data.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvasWrap = document.getElementById('scene');

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasWrap.appendChild(renderer.domElement);

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x130f0a);
scene.fog = new THREE.Fog(0x130f0a, 8, 18);

// ---- Camera + controls ----
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5.6, 3.3, 5.0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(-0.4, 0.5, -1.2);
controls.minDistance = 2.5;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minPolarAngle = Math.PI * 0.18;
controls.minAzimuthAngle = -Math.PI * 0.05;
controls.maxAzimuthAngle = Math.PI * 0.62;
controls.enablePan = false;

// ---- Lights ----
const interiorGroup = new THREE.Group();
scene.add(interiorGroup);
interiorGroup.add(new THREE.HemisphereLight(0xffd9a0, 0x1a1208, 0.6));
interiorGroup.add(new THREE.AmbientLight(0x5a4424, 0.62));

const lampLight = new THREE.PointLight(0xffae52, 14, 9, 2);
lampLight.position.set(-3.45, 0.6, -2.35);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.camera.near = 0.2;
lampLight.shadow.camera.far = 10;
lampLight.shadow.bias = -0.0008;
interiorGroup.add(lampLight);

const key = new THREE.DirectionalLight(0xffe6c0, 0.55);
key.position.set(4, 5, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -6; key.shadow.camera.right = 6;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.bias = -0.0006;
interiorGroup.add(key);

const fill = new THREE.PointLight(0xffcaa0, 2.6, 14, 2);
fill.position.set(2, 2.4, 2.5);
interiorGroup.add(fill);

// ---- Build world ----
const room = buildRoom();
interiorGroup.add(room.root);
const objects = buildObjects();
objects.forEach((o) => interiorGroup.add(o.root));
const monitor = objects.find((o) => o.id === 'minecraft-rl');
const iot = objects.find((o) => o.id === 'iot-smarthome');
const vgc = objects.find((o) => o.id === 'vgc');

// camera prop (back corner of desk) → photography gallery
const photoCam = buildCamera();
interiorGroup.add(photoCam.root);
const gallery = initGallery();
const photoLink = document.getElementById('photo-link');
if (photoLink) photoLink.addEventListener('click', (e) => { e.preventDefault(); gallery.open(); });

// exterior research scene (front yard + delivery drone), hidden until entered
const exterior = buildExterior();
scene.add(exterior.root);
function setSceneMode(mode) {
  const ext = mode === 'exterior';
  interiorGroup.visible = !ext;
  exterior.root.visible = ext;
  scene.background.set(ext ? 0x2b3a52 : 0x130f0a);
  scene.fog.color.set(ext ? 0x2b3a52 : 0x130f0a);
  scene.fog.near = ext ? 16 : 8;
  scene.fog.far = ext ? 70 : 18;
}

// ---- Controllable lamps (driven by the LUMINA app) ----
const lamps = createLamps();
lamps.register('rattan', { light: lampLight, material: room.rattanMat, baseIntensity: 14, tone: 0.85, label: 'Rattan Lamp' });
lamps.register('floor', { light: room.floorLight, material: room.floorMat, baseIntensity: 24, tone: 0.78, label: 'Floor Lamp' });
lamps.register('bulb', { light: iot.bulbLight, material: iot.bulbMat, baseIntensity: 2.6, tone: 0.85, label: 'Smart Bulb' });

// ---- UI + interaction ----
const ui = initUI({ lamps });
const interaction = initInteraction({ scene, camera, controls, renderer, objects, dataById: PROJECTS, ui, auxRoots: [photoCam.root], onPhotography: gallery.open,
  research: { root: exterior.root, data: PROJECTS['uas-detection'], onMode: setSceneMode, onEnter: () => exterior.playDelivery(),
    pos: new THREE.Vector3(6.4, 3.6, 5.6), target: new THREE.Vector3(0.5, 1.1, -2.6) } });

const researchBtn = document.getElementById('research-btn');
if (researchBtn) researchBtn.addEventListener('click', () => interaction.enterResearch());

// ---- HUD wiring ----
const hudChips = document.getElementById('hud-chips');
PROJECT_ORDER.forEach((id) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.style.setProperty('--accent', PROJECTS[id].accent);
  b.textContent = PROJECTS[id].title;
  b.addEventListener('click', () => interaction.select(id));
  b.addEventListener('mouseenter', () => interaction.hoverProject(id));
  b.addEventListener('mouseleave', () => interaction.hoverProject(null));
  hudChips.appendChild(b);
});

const scanBtn = document.getElementById('scan-btn');
let scanning = false;
scanBtn.addEventListener('click', () => {
  scanning = !scanning;
  scanBtn.classList.toggle('on', scanning);
  scanBtn.textContent = scanning ? '◉ scanning…' : '⊹ scan room';
  interaction.setScanning(scanning);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { interaction.resetView(); scanning = false; scanBtn.classList.remove('on'); scanBtn.textContent = '⊹ scan room'; }
});

// ---- Intro ----
const intro = document.getElementById('intro');
document.getElementById('enter-btn').addEventListener('click', () => {
  intro.classList.add('hidden');
  if (monitor && monitor.playSafe) monitor.playSafe();
  if (vgc && vgc.playSafe) vgc.playSafe();
});

// ---- Loop ----
const clock = new THREE.Clock();
let t = 0;
window.__frames = 0;
function animate() {
  requestAnimationFrame(animate);
  window.__frames++;
  const dt = clock.getDelta();
  if (!RM) t += dt; // freeze idle motion under reduced-motion
  objects.forEach((o) => o.update && o.update(t));
  if (exterior.root.visible) exterior.update(t);
  interaction.update();
  renderer.render(scene, camera);
}
animate();

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// surface for debugging
window.__room = { scene, camera, objects, interaction, renderer, controls,
  pump(n = 90) { for (let i = 0; i < n; i++) { objects.forEach((o) => o.update && o.update(i * 0.05)); interaction.update(); } renderer.render(scene, camera); } };
