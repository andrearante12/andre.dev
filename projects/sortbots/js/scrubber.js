/*
 * scrubber.js — map-progression scrubber.
 *
 * Ported from the SortBots repo's own site/js/panels.js. Mounts into
 * #map-scrubber, fetches media/maps/manifest.json (baked occupancy grids from
 * one recorded exploration run), and lets you scrub the map filling in. The
 * baked maps may be absent in a partial checkout — that is not an error worth
 * breaking the page over, so the mount is just left empty.
 */
(function () {
  "use strict";

  var host = document.getElementById("map-scrubber");
  if (!host) return;

  fetch("media/maps/manifest.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (manifest) {
      var frames = (manifest && manifest.frames) || [];
      if (!frames.length) return;

      var stage = document.createElement("div");
      stage.className = "scrubber-stage";
      var img = document.createElement("img");
      img.src = frames[0].src;
      img.alt = "Occupancy grid built during an exploration run";
      img.decoding = "async";
      stage.appendChild(img);

      // Preload so dragging doesn't flash white between frames.
      frames.slice(1).forEach(function (f) { var p = new Image(); p.src = f.src; });

      var controls = document.createElement("div");
      controls.className = "scrubber-controls";
      var range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = String(frames.length - 1);
      range.value = "0";
      range.step = "1";
      range.setAttribute("aria-label", "Exploration progress");
      var readout = document.createElement("p");
      readout.className = "scrubber-readout";

      function show(i) {
        var f = frames[i];
        img.src = f.src;
        readout.innerHTML = "";
        readout.append(
          document.createTextNode(f.label + " · "),
          Object.assign(document.createElement("b"), { textContent: f.free_m2 + " m²" }),
          document.createTextNode(" mapped free")
        );
      }
      range.addEventListener("input", function () { show(Number(range.value)); });
      show(0);

      controls.append(range, readout);

      var note = document.createElement("p");
      note.className = "scrubber-note";
      note.textContent =
        "Checkpoints from one recorded run, aligned onto a shared world canvas — " +
        "the grid grows as the robot explores, so each frame is pasted at its true " +
        "world position rather than rescaled. Dark cells are occupied, tinted cells " +
        "are confirmed free, the flat background is still unknown.";

      host.append(stage, controls, note);
    })
    .catch(function (err) {
      console.warn("[scrubber] no baked maps; skipping", err);
    });
})();
