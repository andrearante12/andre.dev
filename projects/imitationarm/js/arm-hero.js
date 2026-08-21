/*
 * arm-hero.js — the actual robot, rendered from its own URDF meshes.
 *
 * Loads docs/media/arm-mesh.bin (the eight STL meshes from
 * src/robot/robotic_arm_model_v3/meshes/, quantised by docs/tools/build-mesh.py)
 * and poses them with the kinematic chain transcribed from the URDF's joint
 * origins. Joint angles come from the project's real gradient-descent IK
 * solver, ported from src/planning/move_program/include/move_program/gradient_ik.hpp,
 * driven along a scripted pick-and-place path — so the arm moves the way the
 * real one does, not along hand-drawn keyframes.
 *
 * Plain WebGL with no dependencies: the page stays self-contained.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("arm-canvas");
  var hud = document.getElementById("arm-hud");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", {
    antialias: true, alpha: true, premultipliedAlpha: false
  });
  if (!gl) {
    canvas.parentNode.classList.add("no-webgl");
    return;
  }

  // ── kinematic chain, from the URDF joint origins ──────────────────────
  // Each entry: fixed translation + rpy from the parent link, then a
  // revolute joint about `axis`. Meshes have identity visual origins, so a
  // link's mesh is drawn directly in that link's frame.
  var LINKS = [
    { name: "base_link", xyz: [0, 0, 0], rpy: [0, 0, 0], axis: null, joint: null },
    { name: "link_1", xyz: [0, 0, 0],
      rpy: [1.57079632679489, 0, 2.30611320700167],
      axis: [0, 1, 0], joint: "joint_1" },
    { name: "link_2", xyz: [-0.0138083245935496, 0.068000000000025, -0.0144682470230701],
      rpy: [0.487759968766331, -0.418616983762083, -2.88954100737179],
      axis: [0.920715361532496, 0.00279090919548267, 0.390224850392627], joint: "joint_2" },
    { name: "link_3", xyz: [-0.0119074417178174, -0.0981728744551971, 0.0287975674965246],
      rpy: [1.80745265681979, 0.329024616838329, -2.7178037075307],
      axis: [0.920648187108123, 0.00215985289631038, 0.390387308464289], joint: "joint_3" },
    { name: "link_4", xyz: [0.00878557194232471, 0.0942863948762117, -0.0213160274962212],
      rpy: [1.88194305720519, 0.267396255637506, -2.83688714663628],
      axis: [0.951231015101869, -0.0451134015264652, 0.305162803944024], joint: "joint_4" },
    { name: "end_effector_link", xyz: [0.00676342832635413, 0.0146630240413734, 0.0400279678903513],
      rpy: [2.35709760025518, 0.0391610622253604, 3.12744993716135],
      axis: [0.0547587819745477, 0.91542357974764, 0.398749477038755], joint: "end_effector_joint" },
    { name: "end_effector_top", parent: "end_effector_link",
      xyz: [0.00757296910065186, 0.0540307736155723, 0.00949071322529571],
      rpy: [0.374047140395175, -0.00483800739810851, 0.179400394246658],
      axis: [0.89305742676791, -0.21881531130674, 0.393151741739004], joint: "finger_top" },
    { name: "end_effector_bottom", parent: "end_effector_link",
      xyz: [-0.00239381353176393, 0.042964858030635, 0.0347750174406856],
      rpy: [-0.122809784002549, -0.0302495930646647, -0.418333981513274],
      axis: [0.940886292200749, 0.180976825493297, 0.286322150353576], joint: "finger_bottom" }
  ];

  // ── small matrix helpers (column-major, WebGL convention) ─────────────
  function rpyToMat(r, p, y) {
    var cr = Math.cos(r), sr = Math.sin(r);
    var cp = Math.cos(p), sp = Math.sin(p);
    var cy = Math.cos(y), sy = Math.sin(y);
    return [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr,
            sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr,
            -sp,     cp * sr,                cp * cr];
  }
  function axisAngleToMat(a, t) {
    var n = Math.hypot(a[0], a[1], a[2]) || 1;
    var x = a[0] / n, y = a[1] / n, z = a[2] / n;
    var c = Math.cos(t), s = Math.sin(t), C = 1 - c;
    return [C * x * x + c,     C * x * y - s * z, C * x * z + s * y,
            C * x * y + s * z, C * y * y + c,     C * y * z - s * x,
            C * x * z - s * y, C * y * z + s * x, C * z * z + c];
  }
  function mul3(a, b) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++)
      for (var c = 0; c < 3; c++)
        o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  }
  function apply3(m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  }
  // row-major 3x3 + translation -> column-major mat4
  function toMat4(R, t) {
    return new Float32Array([
      R[0], R[3], R[6], 0,
      R[1], R[4], R[7], 0,
      R[2], R[5], R[8], 0,
      t[0], t[1], t[2], 1
    ]);
  }
  function mat3of(R) {
    return new Float32Array([R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]]);
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }
  function lookAt(eye, center, up) {
    var zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    var zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    var xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1
    ]);
  }

  // ── forward kinematics ────────────────────────────────────────────────
  var PRE = {};
  LINKS.forEach(function (l) { PRE[l.name] = rpyToMat(l.rpy[0], l.rpy[1], l.rpy[2]); });

  // Returns {name: {R, p}} world pose per link, plus the EE tip position.
  function solveFK(q) {
    var pose = {};
    var R = [1, 0, 0, 0, 1, 0, 0, 0, 1], p = [0, 0, 0];
    var serial = ["base_link", "link_1", "link_2", "link_3", "link_4", "end_effector_link"];
    for (var i = 0; i < serial.length; i++) {
      var l = LINKS[i];
      var off = apply3(R, l.xyz);
      p = [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
      R = mul3(R, PRE[l.name]);
      if (l.joint) R = mul3(R, axisAngleToMat(l.axis, q[l.joint] || 0));
      // A link's mesh lives in the frame *after* its own joint rotation.
      pose[l.name] = { R: R, p: p };
    }
    // fingers branch off end_effector_link
    var ee = pose["end_effector_link"];
    LINKS.slice(6).forEach(function (l) {
      var off = apply3(ee.R, l.xyz);
      var fp = [ee.p[0] + off[0], ee.p[1] + off[1], ee.p[2] + off[2]];
      var fR = mul3(mul3(ee.R, PRE[l.name]), axisAngleToMat(l.axis, q[l.joint] || 0));
      pose[l.name] = { R: fR, p: fp };
    });
    return pose;
  }

  // ── where the gripper actually grips ──────────────────────────────────
  // Measured off the finger meshes: with the jaws closed both fingertips meet
  // at this point in end_effector_link's frame — 135 mm out from the link
  // origin, along +y. The IK drives *this* point rather than the link origin,
  // so a waypoint is simply "where the cube should end up" and the fingers
  // land on the cube instead of somewhere near it.
  var GRASP_LOCAL = [0.0041, 0.1238, 0.0551];
  // Unit vector from the link origin out to the grip point — the axis the
  // gripper reaches along — and the axis the two jaws close along, which is
  // perpendicular to it.
  var APPROACH_LOCAL = (function (v) {
    var l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  })(GRASP_LOCAL);
  var CLOSE_LOCAL = [0.3096, 0.3849, -0.8688];

  // Full gripper frame: the grip point plus the two axes, in world space.
  function graspFrame(q) {
    var pose = solveFK(q), ee = pose["end_effector_link"];
    var g = apply3(ee.R, GRASP_LOCAL);
    return {
      pose: pose,
      p: [ee.p[0] + g[0], ee.p[1] + g[1], ee.p[2] + g[2]],
      approach: apply3(ee.R, APPROACH_LOCAL),
      close: apply3(ee.R, CLOSE_LOCAL)
    };
  }

  // ── the project's solver, ported from gradient_ik.hpp ─────────────────
  // Same central-difference gradient descent on the same joint set; the demo
  // runs it to a tighter tolerance than the robot bothers with (the cube is
  // only 26 mm wide, so the robot's 1 cm tolerance is a visible miss) and
  // adds the alignment term below.
  var ARM_JOINTS = ["joint_1", "joint_2", "joint_3", "joint_4"];
  var EPS = 0.0008, LR = 2.0, TOL = 0.0008, LIMIT = Math.PI;
  // Four revolute joints against three position constraints leaves one
  // redundant DOF that position error alone does not pin down — that slack is
  // what let the wrist arrive at whatever angle the descent happened to end
  // on and rake the fingers through the cube. Spending it on keeping the
  // approach axis pointing straight down makes every grasp a top-down one.
  var W_ALIGN = 0.004;

  function cost(q, t) {
    var g = graspFrame(q);
    var dx = t[0] - g.p[0], dy = t[1] - g.p[1], dz = t[2] - g.p[2];
    var down = 1 + g.approach[2];          // 0 when the axis points at -z
    return dx * dx + dy * dy + dz * dz + W_ALIGN * down * down;
  }
  function posErr(q, t) {
    var p = graspFrame(q).p;
    return Math.hypot(t[0] - p[0], t[1] - p[1], t[2] - p[2]);
  }
  function stepIK(q, target, budget) {
    var prevError = Infinity, stall = 0;
    for (var n = 0; n < budget; n++) {
      var err = posErr(q, target);
      if (err < TOL) return err;
      if (Math.abs(prevError - err) < 1e-7) { if (++stall > 40) return err; }
      else stall = 0;
      prevError = err;
      for (var i = 0; i < ARM_JOINTS.length; i++) {
        var k = ARM_JOINTS[i], o = q[k];
        q[k] = o + EPS; var ep = cost(q, target);
        q[k] = o - EPS; var em = cost(q, target);
        var g = (ep - em) / (2 * EPS);
        var v = o - LR * g;
        q[k] = v < -LIMIT ? -LIMIT : (v > LIMIT ? LIMIT : v);
      }
    }
    return posErr(q, target);
  }

  // ── servo mapping (JOINT_SERVO_MAP from pose_printer) ─────────────────
  var SERVOS = [
    ["servo0", "joint_1", +1, 90],
    ["servo1", "joint_2", -1, 50],
    ["servo2", "joint_3", -1, 25],
    ["servo3", "joint_4", -1, 55]
  ];

  // ── shaders ───────────────────────────────────────────────────────────
  var VS = [
    "attribute vec3 aPos;",
    "attribute vec3 aNormal;",
    "uniform mat4 uProj, uView, uModel;",
    "uniform mat3 uNormal;",
    "varying vec3 vN;",
    "varying vec3 vW;",
    "void main() {",
    "  vec4 w = uModel * vec4(aPos, 1.0);",
    "  vW = w.xyz;",
    "  vN = uNormal * aNormal;",
    "  gl_Position = uProj * uView * w;",
    "}"
  ].join("\n");

  var FS = [
    "precision mediump float;",
    "varying vec3 vN;",
    "varying vec3 vW;",
    "uniform vec3 uEye;",
    "uniform vec3 uColor;",
    "uniform float uRim;",
    "void main() {",
    "  vec3 n = normalize(vN);",
    "  vec3 v = normalize(uEye - vW);",
    "  if (dot(n, v) < 0.0) n = -n;",          // STL winding is not always consistent
    "  vec3 key = normalize(vec3(0.45, -0.75, 0.85));",
    "  vec3 fill = normalize(vec3(-0.7, 0.35, 0.25));",
    "  float kd = max(dot(n, key), 0.0);",
    "  float fd = max(dot(n, fill), 0.0);",
    "  float sky = 0.5 + 0.5 * n.z;",           // z-up hemisphere ambient
    "  vec3 c = uColor * (0.24 + 0.62 * kd + 0.20 * fd) + uColor * 0.20 * sky;",
    "  vec3 h = normalize(key + v);",
    "  c += vec3(1.0) * 0.16 * pow(max(dot(n, h), 0.0), 42.0);",
    "  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);",
    "  c += vec3(0.78, 0.55, 0.30) * rim * uRim;",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  var SHADOW_VS = [
    "attribute vec3 aPos;",
    "attribute vec3 aNormal;",
    "uniform mat4 uProj, uView, uModel;",
    "varying float vA;",
    "void main() {",
    "  vA = aNormal.x;",                        // alpha smuggled in the normal slot
    "  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);",
    "}"
  ].join("\n");
  // Used for both the floor pool and the cube's contact patch. On a near-black
  // background a dark shadow is invisible, so the ground cue is a faint light
  // pool; the contact patch is a darker spot painted on top of it.
  var SHADOW_FS = [
    "precision mediump float;",
    "varying float vA;",
    "uniform vec4 uTint;",
    "void main() { gl_FragColor = vec4(uTint.rgb, uTint.a * vA); }"
  ].join("\n");

  function compile(vsSrc, fsSrc) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  var prog, shadowProg, loc, sloc;
  try {
    prog = compile(VS, FS);
    shadowProg = compile(SHADOW_VS, SHADOW_FS);
  } catch (e) {
    canvas.parentNode.classList.add("no-webgl");
    return;
  }
  loc = {
    aPos: gl.getAttribLocation(prog, "aPos"),
    aNormal: gl.getAttribLocation(prog, "aNormal"),
    uProj: gl.getUniformLocation(prog, "uProj"),
    uView: gl.getUniformLocation(prog, "uView"),
    uModel: gl.getUniformLocation(prog, "uModel"),
    uNormal: gl.getUniformLocation(prog, "uNormal"),
    uEye: gl.getUniformLocation(prog, "uEye"),
    uColor: gl.getUniformLocation(prog, "uColor"),
    uRim: gl.getUniformLocation(prog, "uRim")
  };
  sloc = {
    aPos: gl.getAttribLocation(shadowProg, "aPos"),
    aNormal: gl.getAttribLocation(shadowProg, "aNormal"),
    uProj: gl.getUniformLocation(shadowProg, "uProj"),
    uView: gl.getUniformLocation(shadowProg, "uView"),
    uModel: gl.getUniformLocation(shadowProg, "uModel"),
    uTint: gl.getUniformLocation(shadowProg, "uTint")
  };

  // ── geometry buffers ──────────────────────────────────────────────────
  function makeMesh(positions, normals) {
    var pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    var nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    return { pos: pb, nrm: nb, count: positions.length / 3 };
  }

  function flatNormals(pos) {
    var n = new Float32Array(pos.length);
    for (var i = 0; i < pos.length; i += 9) {
      var ax = pos[i + 3] - pos[i], ay = pos[i + 4] - pos[i + 1], az = pos[i + 5] - pos[i + 2];
      var bx = pos[i + 6] - pos[i], by = pos[i + 7] - pos[i + 1], bz = pos[i + 8] - pos[i + 2];
      var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      var l = Math.hypot(cx, cy, cz) || 1;
      cx /= l; cy /= l; cz /= l;
      for (var k = 0; k < 3; k++) {
        n[i + k * 3] = cx; n[i + k * 3 + 1] = cy; n[i + k * 3 + 2] = cz;
      }
    }
    return n;
  }

  function boxMesh(hx, hy, hz) {
    var v = [];
    function quad(a, b, c, d) { v.push(a, b, c, a, c, d); }
    var P = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]
    ];
    quad(P[4], P[5], P[6], P[7]); quad(P[1], P[0], P[3], P[2]);
    quad(P[0], P[4], P[7], P[3]); quad(P[5], P[1], P[2], P[6]);
    quad(P[0], P[1], P[5], P[4]); quad(P[3], P[7], P[6], P[2]);
    var pos = new Float32Array(v.length * 3);
    v.forEach(function (p, i) { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; });
    return makeMesh(pos, flatNormals(pos));
  }

  // A soft contact disc on the ground plane. Alpha rides in the normal's x.
  function shadowMesh(radius) {
    var seg = 48, pos = [], al = [];
    for (var i = 0; i < seg; i++) {
      var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      pos.push(0, 0, 0, Math.cos(a0) * radius, Math.sin(a0) * radius, 0,
               Math.cos(a1) * radius, Math.sin(a1) * radius, 0);
      al.push(1, 0, 0, 0, 0, 0, 0, 0, 0);
    }
    return makeMesh(new Float32Array(pos), new Float32Array(al));
  }

  // ── scene state ───────────────────────────────────────────────────────
  var meshes = {};                       // link name -> gpu mesh
  var cube = null, shadow = null, cubeShadow = null, table = null;
  var ready = false;

  var q = {
    joint_1: 0.15, joint_2: 0.35, joint_3: -0.5, joint_4: 0.2,
    end_effector_joint: 0, finger_top: -0.35, finger_bottom: 0.35
  };

  // camera
  var cam = { az: -0.95, el: 0.33, dist: 0.76, target: [0, 0.045, 0.050] };
  var drag = null, userAz = 0, spin = 0;

  // ── load the packed meshes ────────────────────────────────────────────
  fetch("media/arm-mesh.bin")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    })
    .then(function (buf) {
      var dv = new DataView(buf);
      var hlen = dv.getUint32(0, true);
      var header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)));
      var dataStart = 4 + hlen;
      header.meshes.forEach(function (m) {
        var n = m.tris * 9;
        var qd = new Uint16Array(buf.slice(dataStart + m.offset, dataStart + m.offset + n * 2));
        var pos = new Float32Array(n);
        for (var i = 0; i < n; i += 3) {
          pos[i] = m.min[0] + qd[i] * m.scale[0];
          pos[i + 1] = m.min[1] + qd[i + 1] * m.scale[1];
          pos[i + 2] = m.min[2] + qd[i + 2] * m.scale[2];
        }
        meshes[m.name] = makeMesh(pos, flatNormals(pos));
      });
      cube = boxMesh(0.013, 0.013, 0.011);
      // the bench the arm is bolted to — the MuJoCo scene's 0.3 x 0.3 m table.
      // Without it the arm and cube read as floating in space.
      table = boxMesh(0.15, 0.15, 0.010);
      shadow = shadowMesh(0.46);
      cubeShadow = shadowMesh(0.030);
      ready = true;
      canvas.parentNode.classList.add("is-ready");
    })
    .catch(function () {
      canvas.parentNode.classList.add("no-webgl");
    });

  // ── pick-and-place path, driven through the real solver ───────────────
  // Waypoints in the arm's base frame, inside the move_server workspace box.
  // base_link's mounting plate bottoms out 47 mm below the URDF origin, so the
  // bench top sits at z = -0.047 and the 22 mm cube resting on it centres at
  // -0.036 — which is where the MuJoCo scene puts it (-0.037).
  var BENCH_TOP = -0.047;
  var CUBE_HALF = [0.013, 0.013, 0.011];
  var REST_Z = BENCH_TOP + CUBE_HALF[2];
  // The two places a cube can sit. The arm carries it from one to the other
  // and then back again, so the loop closes without teleporting the cube home.
  var SLOTS = [[0.0, 0.155, REST_Z], [-0.055, 0.075, REST_Z]];
  var HOVER = 0.075, CARRY = 0.100;
  // Jaw travel that leaves the fingertips resting on the cube's faces. The
  // full 1.0 closes them past each other, which is what used to bury them in
  // the cube once it was attached.
  var GRIP_CLOSED = 0.48;

  // Every waypoint is where the *grip point* should be, so the pick and place
  // waypoints are literally the cube's resting positions.
  function buildPhases(pick, place) {
    return [
      { name: "approach", to: [pick[0], pick[1], pick[2] + HOVER], t: 2.2, grip: 0 },
      { name: "descend",  to: pick.slice(), t: 1.5, grip: 0 },
      { name: "grasp",    to: pick.slice(), t: 0.9, grip: 1 },
      { name: "lift",     to: [pick[0], pick[1], pick[2] + CARRY], t: 1.5, grip: 1 },
      { name: "traverse", to: [place[0], place[1], place[2] + CARRY], t: 2.0, grip: 1 },
      { name: "place",    to: place.slice(), t: 1.6, grip: 1 },
      { name: "release",  to: place.slice(), t: 0.8, grip: 0 },
      { name: "retreat",  to: [place[0], place[1], place[2] + HOVER], t: 1.4, grip: 0 }
    ];
  }
  var slot = 0;
  var PHASES = buildPhases(SLOTS[0], SLOTS[1]);
  var phase = 0, phaseT = 0, from = [0.0, 0.150, REST_Z + HOVER];
  var grip = 0, gripTarget = 0;
  var held = false, cubePos = SLOTS[0].slice(), cubeYaw = 0;

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function advance(dt) {
    var ph = PHASES[phase];
    phaseT += dt;
    var u = Math.min(1, phaseT / ph.t);
    var e = ease(u);
    var target = [
      from[0] + (ph.to[0] - from[0]) * e,
      from[1] + (ph.to[1] - from[1]) * e,
      from[2] + (ph.to[2] - from[2]) * e
    ];
    gripTarget = ph.grip;

    if (u >= 1) {
      from = ph.to.slice();
      phase = (phase + 1) % PHASES.length;
      phaseT = 0;
      // one full cycle done: the cube is now in the other slot, so swap the
      // roles and fetch it back from there.
      if (phase === 0) {
        slot = 1 - slot;
        PHASES = buildPhases(SLOTS[slot], SLOTS[1 - slot]);
      }
    }
    return target;
  }

  // The cube is picked up when the jaws actually close on it and dropped when
  // they actually open, rather than on a phase boundary — so it never jumps.
  function carry(g) {
    var name = PHASES[phase].name;
    // yaw that puts a cube face square against the closing axis
    var wantYaw = Math.atan2(g.close[1], g.close[0]);
    if (!held) {
      // the cube's four faces are interchangeable: take the nearest quarter
      // turn so it does not spin on contact
      while (wantYaw - cubeYaw > Math.PI / 4) wantYaw -= Math.PI / 2;
      while (wantYaw - cubeYaw < -Math.PI / 4) wantYaw += Math.PI / 2;
    }
    if (name === "grasp" && grip > 0.5) held = true;
    if (name === "release" && grip < 0.5) held = false;
    if (held) {
      cubePos = g.p.slice();
      cubeYaw = wantYaw;
    } else if (cubePos[2] > REST_Z) {
      cubePos[2] = REST_Z;                 // set down, resting on the bench
    }
  }

  // ── rendering ─────────────────────────────────────────────────────────
  function drawMesh(m, model, color, rim) {
    gl.uniformMatrix4fv(loc.uModel, false, model);
    gl.uniformMatrix3fv(loc.uNormal, false, mat3of([
      model[0], model[4], model[8],
      model[1], model[5], model[9],
      model[2], model[6], model[10]
    ]));
    gl.uniform3fv(loc.uColor, color);
    gl.uniform1f(loc.uRim, rim);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pos);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, m.count);
  }

  var IDENT = toMat4([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, 0]);
  var POOL_M = toMat4([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0.07, BENCH_TOP + 0.0004]);
  var METAL = [0.82, 0.84, 0.86];
  var BASE = [0.66, 0.68, 0.71];
  var CUBE_COLOR = [0.72, 0.22, 0.18];
  var POOL = [0.58, 0.64, 0.74, 0.10];
  var TABLE_COLOR = [0.15, 0.163, 0.185];
  var TABLE_M = toMat4([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0.10, BENCH_TOP - 0.010]);

  function resize() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    return r;
  }

  function hudText(err) {
    if (!hud) return;
    var ph = PHASES[phase].name;
    var servos = SERVOS.map(function (s) {
      return s[0] + "=" + Math.round(s[2] * (q[s[1]] * 180 / Math.PI) + s[3]);
    }).join("  ");
    hud.innerHTML =
      '<span class="row"><span class="lbl">phase   </span>' + ph +
        '<span class="lbl">   ik err </span>' + err.toFixed(4) + ' m</span>' +
      '<span class="row"><span class="lbl">serial  </span>' + servos + '</span>';
  }

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var last = 0;

  function frame(ts) {
    var r = resize();
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;

    if (ready) {
      // reduced motion: hold the pose at the bottom of the descent, jaws open
      // around the cube, rather than animating the cycle
      var target = reduced ? PHASES[1].to : advance(dt);
      var err = stepIK(q, target, reduced ? 400 : 90);

      grip += (gripTarget - grip) * Math.min(1, dt * 5);
      q.finger_top = -0.35 + grip * GRIP_CLOSED * 0.44;
      q.finger_bottom = 0.35 - grip * GRIP_CLOSED * 0.44;

      // the cube rides in the gripper's own frame once the jaws close on it
      var gf = graspFrame(q);
      var pose = gf.pose;
      carry(gf);

      if (!drag && !reduced) spin += dt * 0.055;
      var narrow = r.width < 820;
      var dist = cam.dist * (narrow ? 1.14 : 1);
      var az = cam.az + spin + userAz;
      var eye = [
        cam.target[0] + dist * Math.cos(cam.el) * Math.cos(az),
        cam.target[1] + dist * Math.cos(cam.el) * Math.sin(az),
        cam.target[2] + dist * Math.sin(cam.el)
      ];
      var view = lookAt(eye, cam.target, [0, 0, 1]);
      var proj = perspective(0.62, Math.max(0.2, r.width / Math.max(1, r.height)), 0.05, 6);
      // Lens shift rather than moving the camera: keeps the perspective honest
      // while sliding the arm clear of the copy — right on wide screens, up on
      // narrow ones where the headline takes the lower half.
      if (narrow) proj[9] = -0.38; else proj[8] = -0.42;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);

      // contact shadow first, blended, no depth write
      gl.useProgram(shadowProg);
      gl.uniformMatrix4fv(sloc.uProj, false, proj);
      gl.uniformMatrix4fv(sloc.uView, false, view);
      gl.uniformMatrix4fv(sloc.uModel, false, IDENT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      function drawShadow(m, model, tint) {
        gl.uniformMatrix4fv(sloc.uModel, false, model);
        gl.uniform4fv(sloc.uTint, tint);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.pos);
        gl.enableVertexAttribArray(sloc.aPos);
        gl.vertexAttribPointer(sloc.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm);
        gl.enableVertexAttribArray(sloc.aNormal);
        gl.vertexAttribPointer(sloc.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }

      // faint pool of light on the floor, so the arm and cube read as standing
      // on something rather than floating
      drawShadow(shadow, POOL_M, POOL);
      // contact patch under the cube: spreads and fades as it is lifted
      var lift = Math.max(0, Math.min(1, (cubePos[2] - REST_Z) / 0.10));
      var sc = 1 + lift * 1.8;
      drawShadow(cubeShadow, new Float32Array([
        sc, 0, 0, 0, 0, sc, 0, 0, 0, 0, 1, 0,
        cubePos[0], cubePos[1], BENCH_TOP + 0.0008, 1
      ]), [0.02, 0.03, 0.04, 0.55 * (1 - lift * 0.75)]);

      gl.depthMask(true);
      gl.disable(gl.BLEND);

      // the arm
      gl.useProgram(prog);
      gl.uniformMatrix4fv(loc.uProj, false, proj);
      gl.uniformMatrix4fv(loc.uView, false, view);
      gl.uniform3fv(loc.uEye, new Float32Array(eye));

      if (table) drawMesh(table, TABLE_M, TABLE_COLOR, 0.35);

      LINKS.forEach(function (l) {
        var m = meshes[l.name];
        if (!m) return;
        var pz = pose[l.name] || { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], p: [0, 0, 0] };
        drawMesh(m, toMat4(pz.R, pz.p), l.name === "base_link" ? BASE : METAL, 0.85);
      });

      if (cube) {
        drawMesh(cube, toMat4(axisAngleToMat([0, 0, 1], cubeYaw), cubePos), CUBE_COLOR, 0.5);
      }

      hudText(err);
    }

    if (!reduced) requestAnimationFrame(frame);
  }

  // ── drag to orbit ─────────────────────────────────────────────────────
  canvas.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, az: userAz, el: cam.el };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("grabbing");
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    userAz = drag.az - (e.clientX - drag.x) * 0.008;
    cam.el = Math.max(-0.15, Math.min(1.15, drag.el + (e.clientY - drag.y) * 0.005));
  });
  function endDrag(e) {
    if (!drag) return;
    drag = null;
    canvas.classList.remove("grabbing");
    if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
