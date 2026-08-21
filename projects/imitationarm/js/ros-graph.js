/*
 * ros-graph.js — step through the ROS 2 primer diagram.
 *
 * The diagram's inline <svg> tags each group with data-s: the step at which it
 * first appears. Pressing a button writes data-step on the <svg>; site.css
 * fades out every group whose data-s is greater. The markup ships at the last
 * step, so with this script absent the diagram is simply complete.
 */
(function () {
  "use strict";
  document.querySelectorAll(".steps").forEach(function (bar) {
    var fig = bar.closest("figure");
    var svg = fig && fig.querySelector("svg");
    if (!svg) return;

    var buttons = Array.prototype.slice.call(bar.querySelectorAll(".route-btn"));

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        svg.dataset.step = btn.dataset.step;
        buttons.forEach(function (other) {
          var on = other === btn;
          other.classList.toggle("is-on", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });

    // The travelling message dots are decoration; drop them outright when the
    // reader has asked for less motion (SMIL cannot be stopped from CSS).
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (calm && calm.matches) {
      svg.querySelectorAll(".msg").forEach(function (dot) { dot.remove(); });
    }
  });
})();
