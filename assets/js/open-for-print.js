// The "What you'd see" panels start open, so a page without this script shows
// and prints them. With it, they start closed on screen; every closed panel is
// opened before the page prints, and the same ones are closed again afterwards.
(function () {
  "use strict";
  const panels = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };
  panels("details.dr-seen").forEach(function (d) { d.open = false; });
  let opened = [];
  window.addEventListener("beforeprint", function () {
    opened = panels("details.dr-seen:not([open])");
    opened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    opened.forEach(function (d) { d.open = false; });
    opened = [];
  });
})();
