/*
 * ik-hero.js — a live, faithful port of the arm's real kinematics and solver.
 *
 * Kinematic chain: transcribed from the generated MJCF,
 *   src/robot/robotic_arm_v3_config/config/mujoco/arm_robot.xml
 * Solver: ported from
 *   src/planning/move_program/include/move_program/gradient_ik.hpp
 *   (central-difference gradient, eps 0.001, lr 0.05, tol 0.01 m,
 *    stall break after 50 iterations under 1e-6, joint clamping each step)
 * Servo mapping: from JOINT_SERVO_MAP in
 *   src/hardware/pose_printer/pose_printer/pose_printer_node.py
 *
 * The solver runs on a per-frame iteration budget and warm-starts from the
 * previous solution, exactly as move_server seeds from the current joint
 * state. Convergence is therefore visible rather than instantaneous — that
 * is the real behaviour of the algorithm, not an animation effect.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("ik-canvas");
  var hud = document.getElementById("ik-hud");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  // ── kinematics ────────────────────────────────────────────────────────
  // MuJoCo body frames: pos + quat (w,x,y,z) relative to parent, then a
  // revolute joint about `axis` located at the body origin.
  var CHAIN = [
    { pos: [0, 0, 0],
      quat: [0.28687, 0.28687, 0.646301, 0.646301],
      axis: [0, 1, 0] },
    { pos: [-0.0138083, 0.068, -0.0144682],
      quat: [0.169086, -0.170347, -0.25967, -0.935395],
      axis: [0.920715, 0.00279091, 0.390225] },
    { pos: [-0.0119074, -0.0981729, 0.0287976],
      quat: [0.00257349, 0.262055, -0.736387, -0.623743],
      axis: [0.920648, 0.00215985, 0.390387] },
    { pos: [0.00878557, 0.0942864, -0.021316],
      quat: [-0.0178844, 0.199155, -0.779726, -0.593334],
      axis: [0.951231, -0.0451134, 0.305163] }
  ];
  // fixed offset from link_4 to end_effector_link (the IK tip)
  var EE = { pos: [0.00676343, 0.014663, 0.040028],
             quat: [0.0207944, -0.000951313, 0.923905, 0.382055] };

  function quatToMat(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    var n = Math.sqrt(w * w + x * x + y * y + z * z) || 1;
    w /= n; x /= n; y /= n; z /= n;
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w),     2 * (x * z + y * w),
            2 * (x * y + z * w),     1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
            2 * (x * z - y * w),     2 * (y * z + x * w),     1 - 2 * (x * x + y * y)];
  }

  function axisAngleToMat(a, th) {
    var n = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
    var x = a[0] / n, y = a[1] / n, z = a[2] / n;
    var c = Math.cos(th), s = Math.sin(th), t = 1 - c;
    return [t * x * x + c,     t * x * y - s * z, t * x * z + s * y,
            t * x * y + s * z, t * y * y + c,     t * y * z - s * x,
            t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  }

  function matMul(a, b) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
      }
    }
    return o;
  }

  function matVec(m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  }

  var PRE = CHAIN.map(function (l) { return quatToMat(l.quat); });
  var EE_PRE = quatToMat(EE.quat);

  // Forward kinematics. Returns the joint origins (for drawing) and the tip.
  function fk(q) {
    var R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    var p = [0, 0, 0];
    var pts = [[0, 0, 0]];
    for (var i = 0; i < CHAIN.length; i++) {
      var off = matVec(R, CHAIN[i].pos);
      p = [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
      R = matMul(matMul(R, PRE[i]), axisAngleToMat(CHAIN[i].axis, q[i]));
      pts.push(p);
    }
    var eoff = matVec(R, EE.pos);
    p = [p[0] + eoff[0], p[1] + eoff[1], p[2] + eoff[2]];
    R = matMul(R, EE_PRE);
    pts.push(p);
    return { pts: pts, ee: p, R: R };
  }

  // squaredNorm(target - ee), matching GradientDescentIK::calculateError
  function sqErr(q, t) {
    var e = fk(q).ee;
    var dx = t[0] - e[0], dy = t[1] - e[1], dz = t[2] - e[2];
    return dx * dx + dy * dy + dz * dz;
  }

  // ── solver constants (identical to gradient_ik.hpp defaults) ──────────
  var EPS = 0.001, LR = 0.05, TOL = 0.01, LIMIT = Math.PI;
  var ITERS_PER_FRAME = 250;   // budget so the page stays at 60fps

  var q = [0.15, 0.2, -0.2, 0.1];  // current joint solution (warm-started)
  var prevError = Infinity;
  var stall = 0;
  var iterTotal = 0;
  var converged = false;
  var lastSolveMs = 0;

  // Advance the solver by at most `budget` iterations, resuming where the
  // previous frame stopped. One `solveIK` call, spread across frames.
  function step(target, budget) {
    var t0 = (performance && performance.now) ? performance.now() : Date.now();
    var used = 0;
    for (; used < budget; used++) {
      var err = Math.sqrt(sqErr(q, target));
      if (err < TOL) { converged = true; break; }
      converged = false;
      if (Math.abs(prevError - err) < 1e-6) {
        if (++stall > 50) break;
      } else {
        stall = 0;
      }
      prevError = err;
      for (var i = 0; i < q.length; i++) {
        var o = q[i];
        q[i] = o + EPS; var ep = sqErr(q, target);
        q[i] = o - EPS; var em = sqErr(q, target);
        q[i] = o;
        var g = (ep - em) / (2 * EPS);
        var v = o - LR * g;
        q[i] = v < -LIMIT ? -LIMIT : (v > LIMIT ? LIMIT : v);
      }
    }
    iterTotal += used;
    var t1 = (performance && performance.now) ? performance.now() : Date.now();
    lastSolveMs = t1 - t0;
    return used;
  }

  // ── servo mapping (JOINT_SERVO_MAP) ───────────────────────────────────
  // final_angle = round(direction * degrees(rad) + offset)
  var SERVOS = [
    { name: "servo0", dir: +1, off: 90 },
    { name: "servo1", dir: -1, off: 50 },
    { name: "servo2", dir: -1, off: 25 },
    { name: "servo3", dir: -1, off: 55 }
  ];
  function servoDeg(i) {
    return Math.round(SERVOS[i].dir * (q[i] * 180 / Math.PI) + SERVOS[i].off);
  }

  // ── target: pointer-driven, idle auto-orbit ───────────────────────────
  // move_server's hardcoded workspace bounds.
  var BOUNDS = { x: [-0.08, 0.09], y: [-0.18, 0.18], z: [0.05, 0.25] };
  var target = [0, 0.02, 0.19];
  var pointerActive = false;
  var idleT = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ── projection: side view. world +Y → right, world +Z → up, +X skewed ──
  var view = { scale: 1, ox: 0, oy: 0 };

  function layout() {
    var r = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.w = r.width;
    view.h = r.height;
    // Fit the workspace with margin, then sit the arm in the right-hand third
    // so it clears the headline in the lower left.
    // On narrow screens the copy takes the lower half, so the arm sits higher
    // and smaller to stay clear of the headline.
    var narrow = r.width < 820;
    view.scale = Math.min(r.width / (narrow ? 0.50 : 0.58), r.height / (narrow ? 0.58 : 0.40));
    view.ox = r.width * (narrow ? 0.5 : 0.64);
    view.oy = r.height * (narrow ? 0.56 : 0.84);
  }

  function project(p) {
    // slight isometric skew on X so lateral motion is legible
    return [view.ox + (p[1] + p[0] * 0.32) * view.scale,
            view.oy - (p[2] + p[0] * 0.12) * view.scale];
  }

  function unproject(sx, sy) {
    // inverse for X = 0 (the plane the pointer drives)
    return [0,
            (sx - view.ox) / view.scale,
            (view.oy - sy) / view.scale];
  }

  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    var w = unproject(e.clientX - r.left, e.clientY - r.top);
    target = [0,
              clamp(w[1], BOUNDS.y[0], BOUNDS.y[1]),
              clamp(w[2], BOUNDS.z[0], BOUNDS.z[1])];
    pointerActive = true;
  });
  canvas.addEventListener("pointerleave", function () { pointerActive = false; });

  // ── drawing ───────────────────────────────────────────────────────────
  var trail = [];

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(200,205,212,0.07)";
    ctx.lineWidth = 1;
    for (var y = -0.2; y <= 0.201; y += 0.05) {
      var a = project([0, y, BOUNDS.z[0]]), b = project([0, y, BOUNDS.z[1]]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (var z = 0.05; z <= 0.251; z += 0.05) {
      var c = project([0, -0.2, z]), d = project([0, 0.2, z]);
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }
    // workspace box from move_server
    var p0 = project([0, BOUNDS.y[0], BOUNDS.z[0]]);
    var p1 = project([0, BOUNDS.y[1], BOUNDS.z[1]]);
    ctx.strokeStyle = "rgba(200,135,60,0.28)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(p0[0], p1[1], p1[0] - p0[0], p0[1] - p1[1]);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(200,135,60,0.5)";
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText("move_server workspace", p0[0] + 4, p1[1] - 6);
    // bench line
    var g0 = project([0, -0.3, 0]), g1 = project([0, 0.3, 0]);
    ctx.strokeStyle = "rgba(141,146,153,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.stroke();
    ctx.restore();
  }

  function drawArm(pts) {
    var s = pts.map(project);
    ctx.save();
    // base plate
    var b = s[0];
    ctx.fillStyle = "#5b6068";
    ctx.fillRect(b[0] - 22, b[1] - 3, 44, 6);
    // links
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 0; i < s.length - 1; i++) {
      ctx.strokeStyle = "rgba(15,18,22,0.55)";
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(s[i][0], s[i][1] + 2); ctx.lineTo(s[i + 1][0], s[i + 1][1] + 2); ctx.stroke();
      ctx.strokeStyle = i === s.length - 2 ? "#b9bec6" : "#8d9299";
      ctx.lineWidth = i === s.length - 2 ? 7 : 10;
      ctx.beginPath(); ctx.moveTo(s[i][0], s[i][1]); ctx.lineTo(s[i + 1][0], s[i + 1][1]); ctx.stroke();
    }
    // joints
    for (var j = 0; j < s.length - 1; j++) {
      ctx.beginPath(); ctx.arc(s[j][0], s[j][1], 5, 0, Math.PI * 2);
      ctx.fillStyle = "#262b33"; ctx.fill();
      ctx.strokeStyle = "#c8cdd4"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // gripper tip
    var tip = s[s.length - 1];
    ctx.beginPath(); ctx.arc(tip[0], tip[1], 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#efe9db"; ctx.fill();
    ctx.restore();
  }

  function drawTarget(t) {
    var p = project(t);
    ctx.save();
    ctx.strokeStyle = "#b8382e";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p[0] - 14, p[1]); ctx.lineTo(p[0] - 4, p[1]);
    ctx.moveTo(p[0] + 4, p[1]); ctx.lineTo(p[0] + 14, p[1]);
    ctx.moveTo(p[0], p[1] - 14); ctx.lineTo(p[0], p[1] - 4);
    ctx.moveTo(p[0], p[1] + 4); ctx.lineTo(p[0], p[1] + 14);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = "rgba(224,164,157,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < trail.length; i++) {
      var p = project(trail[i]);
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function fmt(v, d) {
    var s = v.toFixed(d === undefined ? 3 : d);
    return (v >= 0 ? "+" : "") + s;
  }
  function pad(s, n) { s = String(s); while (s.length < n) s = " " + s; return s; }

  function updateHud(err, used) {
    if (!hud) return;
    var state = converged
      ? '<span class="ok">converged</span>'
      : (err < 0.05 ? '<span class="hot">solving</span>' : '<span class="warn">unreachable</span>');
    function lbl(s) { while (s.length < 12) s += " "; return '<span class="lbl">' + s + "</span>"; }
    hud.innerHTML =
      '<span class="row">' + lbl("target") +
        'y ' + fmt(target[1]) + '  z ' + fmt(target[2]) + '  <span class="lbl">m</span></span>' +
      '<span class="row">' + lbl("ik") +
        pad(used, 3) + ' it/frame   err ' + err.toFixed(4) + ' m   ' + state + '</span>' +
      '<span class="row">' + lbl("joints rad") +
        q.map(function (v, i) { return "q" + (i + 1) + " " + fmt(v, 3); }).join("  ") + '</span>' +
      '<span class="row">' + lbl("serial") +
        SERVOS.map(function (s, i) { return s.name + "=" + servoDeg(i); }).join("  ") + '</span>';
  }

  // ── main loop ─────────────────────────────────────────────────────────
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame(ts) {
    if (!pointerActive) {
      // idle: trace a slow lift-and-place arc through the workspace
      idleT += 0.006;
      target = [0,
                clamp(0.01 + 0.11 * Math.cos(idleT), BOUNDS.y[0], BOUNDS.y[1]),
                clamp(0.15 + 0.055 * Math.sin(idleT * 1.7), BOUNDS.z[0], BOUNDS.z[1])];
    }
    var used = step(target, ITERS_PER_FRAME);
    var pose = fk(q);
    var err = Math.sqrt(sqErr(q, target));

    // Drop the trail across large jumps (first solve, pointer re-entry) so it
    // never draws a straight chord across the frame.
    var last = trail[trail.length - 1];
    if (last) {
      var jump = Math.abs(last[1] - pose.ee[1]) + Math.abs(last[2] - pose.ee[2]);
      if (jump > 0.02) trail.length = 0;
    }
    trail.push(pose.ee.slice());
    if (trail.length > 90) trail.shift();

    ctx.clearRect(0, 0, view.w, view.h);
    drawGrid();
    drawTrail();
    drawTarget(target);
    drawArm(pose.pts);
    updateHud(err, used);

    if (!reduced) requestAnimationFrame(frame);
  }

  function boot() {
    layout();
    if (reduced) {
      // solve once to a resting pose and render a single static frame
      for (var i = 0; i < 20; i++) step(target, ITERS_PER_FRAME);
      frame(0);
    } else {
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("resize", layout);
  boot();
})();
