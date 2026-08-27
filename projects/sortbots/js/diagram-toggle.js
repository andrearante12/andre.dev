/*
 * diagram-toggle.js — switch one flow diagram between two views.
 *
 * The diagram's inline <svg> tags each group with data-v, listing the views it
 * belongs to ("robot", "fleet", or both). Pressing a button writes data-view on
 * the <svg>; css/site.css fades every group whose data-v does not contain the
 * view. The markup ships with data-view="all", which matches nothing and
 * therefore fades nothing — so the diagram is complete and correct with this
 * script absent.
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
        svg.dataset.view = btn.dataset.view;
        buttons.forEach(function (other) {
          var on = other === btn;
          other.classList.toggle("is-on", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });
  });
})();
