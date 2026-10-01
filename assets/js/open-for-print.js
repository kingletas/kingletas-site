// Opens every closed "What you'd see" panel before the page prints, so the
// printout has them, and closes the same ones again afterwards.
(function () {
  "use strict";
  let opened = [];
  window.addEventListener("beforeprint", function () {
    opened = Array.prototype.slice.call(document.querySelectorAll("details.dr-seen:not([open])"));
    opened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    opened.forEach(function (d) { d.open = false; });
    opened = [];
  });
})();
