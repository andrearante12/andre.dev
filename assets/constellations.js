/* Themed "connect-the-dots" constellations per project, drawn in the detail-page
 * background (assets/project-bg.js). Coordinates are normalized, origin-centered
 * (~-1..1, y-down) and scaled to pixels when drawn. Each project gets 2-3 figures.
 * Built with tiny helpers below — tweak / add figures freely. */

(function () {
  const TAU = Math.PI * 2;

  // figure builder: s()=add star (returns index), e()=edge, path()=poly-line,
  // ring()=closed ring of n stars (returns first index)
  function B(name) {
    const stars = [], edges = [];
    const api = {
      s(x, y) { stars.push([x, y]); return stars.length - 1; },
      e(a, b) { edges.push([a, b]); return api; },
      path() { const id = [].slice.call(arguments); for (let i = 0; i < id.length - 1; i++) edges.push([id[i], id[i + 1]]); return api; },
      ring(n, r, rot, cx, cy) {
        const base = stars.length;
        for (let i = 0; i < n; i++) { const a = (rot || 0) + i / n * TAU; stars.push([(cx || 0) + Math.cos(a) * r, (cy || 0) + Math.sin(a) * (r * (api._sy || 1))]); }
        for (let i = 0; i < n; i++) edges.push([base + i, base + (i + 1) % n]);
        return base;
      },
      done() { return { name, stars, edges }; },
    };
    return api;
  }

  /* ---------- imitation-arm: arm, gear, chip ---------- */
  function arm() {
    const f = B('robotic arm');
    const b0 = f.s(-0.55, 1.0), b1 = f.s(0.25, 1.0); f.e(b0, b1);            // base
    const j0 = f.s(-0.15, 1.0), j1 = f.s(-0.4, 0.4), j2 = f.s(0.15, 0.1), j3 = f.s(0.5, -0.25);
    f.path(j0, j1, j2, j3);
    const palm = f.s(0.7, -0.45); f.e(j3, palm);
    f.e(palm, f.s(0.98, -0.6)); f.e(palm, f.s(0.6, -0.78));                  // gripper fork
    return f.done();
  }
  function gear() {
    const f = B('gear'); const n = 12, ids = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r = i % 2 ? 0.55 : 1.0; ids.push(f.s(Math.cos(a) * r, Math.sin(a) * r)); }
    for (let i = 0; i < n; i++) f.e(ids[i], ids[(i + 1) % n]);
    const c = f.s(0, 0); for (let i = 0; i < n; i += 2) f.e(c, ids[i]);     // hub + spokes
    return f.done();
  }
  function chip() {
    const f = B('chip'); const s = 0.5;
    const a = f.s(-s, -s), b = f.s(s, -s), c = f.s(s, s), d = f.s(-s, s); f.path(a, b, c, d, a);
    [-0.25, 0.25].forEach(y => { f.e(f.s(-0.95, y), f.s(-s, y)); f.e(f.s(0.95, y), f.s(s, y)); });
    [-0.25, 0.25].forEach(x => { f.e(f.s(x, -0.95), f.s(x, -s)); f.e(f.s(x, 0.95), f.s(x, s)); });
    f.s(-s + 0.13, -s + 0.13);                                             // notch dot
    return f.done();
  }

  /* ---------- uas-detection: drone, reticle, eye ---------- */
  function drone() {
    const f = B('drone'); const bs = 0.22;
    const a = f.s(-bs, -bs), b = f.s(bs, -bs), c = f.s(bs, bs), d = f.s(-bs, bs); f.path(a, b, c, d, a);
    const corner = [a, b, c, d], hubs = [[-0.78, -0.78], [0.78, -0.78], [0.78, 0.78], [-0.78, 0.78]];
    hubs.forEach((h, i) => {
      f.e(corner[i], f.s(h[0], h[1]));
      const rb = []; for (let k = 0; k < 4; k++) { const a2 = Math.PI / 4 + k / 4 * TAU; rb.push(f.s(h[0] + Math.cos(a2) * 0.2, h[1] + Math.sin(a2) * 0.2)); }
      for (let k = 0; k < 4; k++) f.e(rb[k], rb[(k + 1) % 4]);             // rotor ring
    });
    return f.done();
  }
  function reticle() {
    const f = B('reticle'); const r = 0.9, k = 0.42;
    const C = [[-r, -r], [r, -r], [r, r], [-r, r]], dir = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    C.forEach((c, i) => { const cs = f.s(c[0], c[1]); f.e(cs, f.s(c[0] + dir[i][0] * k, c[1])); f.e(cs, f.s(c[0], c[1] + dir[i][1] * k)); });
    f.e(f.s(-0.3, 0), f.s(-0.1, 0)); f.e(f.s(0.1, 0), f.s(0.3, 0));        // crosshair
    f.e(f.s(0, -0.3), f.s(0, -0.1)); f.e(f.s(0, 0.1), f.s(0, 0.3));
    f.s(0, 0);
    return f.done();
  }
  function eye() {
    const f = B('eye');
    const l = f.s(-1, 0), t = f.s(0, -0.5), r = f.s(1, 0), b = f.s(0, 0.5); f.path(l, t, r, b, l);
    f.ring(6, 0.34); f.s(0, 0);                                            // iris + pupil
    return f.done();
  }

  /* ---------- vgc: pokéball, pikachu, lightning bolt ---------- */
  function pokeball() {
    const f = B('pokéball');
    f.ring(12, 1.0, -Math.PI / 2);
    const el = f.s(-1, 0), e1 = f.s(-0.26, 0), e2 = f.s(0.26, 0), er = f.s(1, 0); f.e(el, e1); f.e(e2, er);
    f.ring(6, 0.17);                                                       // button
    return f.done();
  }
  function pikachu() {
    const f = B('pikachu'); const cy = 0.12, fr = 0.66;
    const ids = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU; ids.push(f.s(Math.cos(a) * fr, cy + Math.sin(a) * fr * 0.92)); }
    for (let k = 0; k < 10; k++) f.e(ids[k], ids[(k + 1) % 10]);           // face
    f.path(f.s(-0.5, -0.42), f.s(-0.72, -1.05), f.s(-0.16, -0.6));         // left ear
    f.path(f.s(0.5, -0.42), f.s(0.72, -1.05), f.s(0.16, -0.6));            // right ear
    f.s(-0.26, 0.02); f.s(0.26, 0.02); f.s(0, 0.22);                       // eyes + nose
    f.ring(4, 0.13, 0, -0.46, 0.34); f.ring(4, 0.13, 0, 0.46, 0.34);       // cheeks
    return f.done();
  }
  function bolt() {
    const f = B('bolt');
    const p = [[0.18, -1.0], [-0.5, 0.12], [-0.06, 0.12], [-0.28, 1.0], [0.5, -0.18], [0.06, -0.18]];
    const id = p.map(pt => f.s(pt[0], pt[1])); f.path(id[0], id[1], id[2], id[3], id[4], id[5], id[0]);
    return f.done();
  }

  /* ---------- minecraft-rl: creeper, block, sword ---------- */
  function creeper() {
    const f = B('creeper');
    const a = f.s(-0.9, -0.9), b = f.s(0.9, -0.9), c = f.s(0.9, 0.9), d = f.s(-0.9, 0.9); f.path(a, b, c, d, a);
    const e1 = [f.s(-0.55, -0.45), f.s(-0.18, -0.45), f.s(-0.18, -0.08), f.s(-0.55, -0.08)]; f.path(e1[0], e1[1], e1[2], e1[3], e1[0]);
    const e2 = [f.s(0.18, -0.45), f.s(0.55, -0.45), f.s(0.55, -0.08), f.s(0.18, -0.08)]; f.path(e2[0], e2[1], e2[2], e2[3], e2[0]);
    const m = [f.s(-0.22, 0.06), f.s(0.22, 0.06), f.s(0.22, 0.62), f.s(-0.22, 0.62)]; f.path(m[0], m[1], m[2], m[3], m[0]);
    f.path(f.s(-0.5, 0.62), f.s(-0.5, 0.86), f.s(-0.22, 0.86));            // mouth flares
    f.path(f.s(0.5, 0.62), f.s(0.5, 0.86), f.s(0.22, 0.86));
    return f.done();
  }
  function block() {
    const f = B('block');
    const tT = f.s(0, -0.85), tR = f.s(0.8, -0.42), tB = f.s(0, 0.0), tL = f.s(-0.8, -0.42); f.path(tT, tR, tB, tL, tT);
    const bL = f.s(-0.8, 0.42), bM = f.s(0, 0.85), bR = f.s(0.8, 0.42);
    f.e(tL, bL); f.e(tB, bM); f.e(tR, bR); f.path(bL, bM, bR);
    return f.done();
  }
  function sword() {
    const f = B('sword');
    const tip = f.s(0.78, -0.82), gc = f.s(-0.05, 0.0); f.e(tip, gc);
    f.e(f.s(-0.4, -0.28), f.s(0.3, 0.28));                                 // crossguard
    f.e(gc, f.s(-0.5, 0.45));                                              // handle
    return f.done();
  }

  /* ---------- iot-smarthome: house, lightbulb, signal ---------- */
  function house() {
    const f = B('house');
    const a = f.s(-0.85, 0.25), b = f.s(0.85, 0.25), c = f.s(0.85, 0.95), d = f.s(-0.85, 0.95); f.path(a, b, c, d, a);
    f.path(f.s(-1.0, 0.25), f.s(0, -0.7), f.s(1.0, 0.25));                 // roof
    f.path(f.s(-0.15, 0.95), f.s(-0.15, 0.52), f.s(0.15, 0.52), f.s(0.15, 0.95));   // door
    const w = [f.s(0.4, 0.45), f.s(0.65, 0.45), f.s(0.65, 0.7), f.s(0.4, 0.7)]; f.path(w[0], w[1], w[2], w[3], w[0]); // window
    f.e(f.s(0.5, -0.35), f.s(0.5, -0.02));                                 // chimney
    return f.done();
  }
  function bulb() {
    const f = B('lightbulb');
    const ids = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ids.push(f.s(Math.cos(a) * 0.58, -0.28 + Math.sin(a) * 0.58)); }
    for (let k = 0; k < 10; k++) f.e(ids[k], ids[(k + 1) % 10]);          // glass
    f.e(f.s(-0.3, 0.36), f.s(0.3, 0.36)); f.e(f.s(-0.27, 0.56), f.s(0.27, 0.56)); f.e(f.s(-0.22, 0.76), f.s(0.22, 0.76)); // screw base
    f.path(f.s(-0.2, -0.12), f.s(-0.05, 0.1), f.s(0.05, -0.12), f.s(0.2, 0.1));      // filament
    return f.done();
  }
  function signal() {
    const f = B('signal'); const xs = [-0.6, -0.2, 0.2, 0.6], hs = [0.35, 0.6, 0.85, 1.1];
    xs.forEach((x, i) => f.e(f.s(x, 0.6), f.s(x, 0.6 - hs[i])));
    return f.done();
  }

  window.CONSTELLATIONS = {
    'imitation-arm': [arm(), gear(), chip()],
    'uas-detection': [drone(), reticle(), eye()],
    'vgc': [pokeball(), pikachu(), bolt()],
    'minecraft-rl': [creeper(), block(), sword()],
    'iot-smarthome': [house(), bulb(), signal()],
  };
})();
