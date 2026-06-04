import * as THREE from 'three';

// Central controller for the room's controllable lights, driven by the LUMINA app.
// Each lamp wraps a THREE light + (optional) an emissive material (the visible bulb/shade).
const COOL = new THREE.Color(0xbcd4ff);
const WARM = new THREE.Color(0xffa23c);

export function createLamps() {
  const lamps = {};

  function apply(id) {
    const l = lamps[id];
    if (!l) return;
    const col = COOL.clone().lerp(WARM, l.tone);
    const k = l.on ? l.brightness : 0;
    if (l.light) {
      l.light.color.copy(col);
      l.light.intensity = l.baseIntensity * k;
    }
    if (l.material) {
      l.material.emissive.copy(col);
      l.material.emissiveIntensity = l.on ? 0.35 + l.brightness * 1.25 : 0.05;
    }
  }

  function register(id, cfg) {
    lamps[id] = {
      light: cfg.light || null,
      material: cfg.material || null,
      baseIntensity: cfg.baseIntensity ?? 1,
      on: cfg.on ?? true,
      brightness: cfg.brightness ?? 1,
      tone: cfg.tone ?? 0.82,
      label: cfg.label || id,
    };
    apply(id);
  }

  function set(id, patch) {
    if (!lamps[id]) return;
    Object.assign(lamps[id], patch);
    apply(id);
  }

  function setAll(patch) {
    Object.keys(lamps).forEach((id) => set(id, patch));
  }

  return {
    register, set, setAll,
    get: (id) => lamps[id],
    ids: () => Object.keys(lamps),
    state: () => lamps,
  };
}
