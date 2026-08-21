/*
 * clip-slot.js — keep the page presentable when a clip is missing.
 *
 * Each slot renders a hatched placeholder underneath the <video>. The video is
 * transparent until it has actually decoded a frame, at which point the slot
 * gains .has-clip and the video fades in over the placeholder. A 404 or an
 * unsupported codec simply leaves the placeholder showing.
 *
 * Note: the placeholder must sit *behind* the video rather than replace it.
 * Hiding a <video> with display:none or visibility:hidden stops Chrome from
 * loading it, so a "hide until loaded" approach never loads and never reveals.
 */
(function () {
  "use strict";
  document.querySelectorAll(".clip-slot").forEach(function (slot) {
    var video = slot.querySelector("video");
    if (!video) return;

    function reveal() {
      if (video.videoWidth > 0) slot.classList.add("has-clip");
    }
    function hide() {
      slot.classList.remove("has-clip");
    }

    // `error` from a <source> does not bubble, so listen in the capture phase
    // to catch a failing source as well as a failing video.
    video.addEventListener("error", hide, true);
    video.addEventListener("loadeddata", reveal);
    video.addEventListener("playing", reveal);
    if (video.readyState >= 2) reveal();
  });
})();
