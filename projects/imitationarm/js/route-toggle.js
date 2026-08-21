/*
 * route-toggle.js — highlight one route through a dataflow diagram.
 *
 * The diagram's inline <svg> tags each group with data-r, listing the routes
 * it belongs to ("sim", "real", or both). Pressing a button writes data-mode
 * on the <svg>; site.css fades every group whose data-r does not contain the
 * mode. Mode "both" matches nothing and therefore fades nothing, which is also
 * the state the markup ships in — so the diagram is complete and correct with
 * this script absent.
 */
(function () {
  "use strict";
  document.querySelectorAll(".routes").forEach(function (bar) {
    var fig = bar.closest("figure");
    var svg = fig && fig.querySelector("svg");
    if (!svg) return;

    var buttons = Array.prototype.slice.call(bar.querySelectorAll(".route-btn"));

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.dataset.route;
        svg.dataset.mode = mode;
        buttons.forEach(function (other) {
          var on = other === btn;
          other.classList.toggle("is-on", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });
  });
})();
