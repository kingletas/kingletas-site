// The first-fifteen-minutes checklist: ticks, a running clock, and a summary to
// paste into a chat. Everything stays in this browser's storage; nothing is sent.
// The summary is a plain function, so a test can run it in Node.
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.IncidentChecklist = api;
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { api.mount(document); });
    } else {
      api.mount(document);
    }
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const KEY = "kingletas-incident-checklist-v1";

  /** Time since the clock started, as 07:03 or 1:02:03. */
  function elapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const two = function (n) { return String(n).padStart(2, "0"); };
    return h > 0 ? h + ":" + two(m) + ":" + two(s) : two(m) + ":" + two(s);
  }

  /** A clock time in UTC, as 14:02 UTC, so a timeline reads the same in any zone. */
  function utc(ms) {
    return new Date(ms).toISOString().slice(11, 16) + " UTC";
  }

  /**
   * The plain-text summary to paste into a chat. `page` lists the steps,
   * severities, roles and questions in page order; `state` is what the reader
   * has ticked, chosen and typed.
   */
  function summary(page, state, now) {
    const lines = [];
    const start = state.start;
    lines.push(start
      ? "Incident checklist: " + elapsed(now - start) + " in, started " + utc(start)
      : "Incident checklist: clock not started");
    const sev = page.severities.find(function (s) { return s.id === state.severity; });
    lines.push("Severity: " + (sev ? sev.label + ", " + sev.short : "not set yet"));
    const named = page.roles.map(function (r) {
      const who = (state.roles[r.id] || "").trim();
      return r.label + ": " + (who || "not named");
    });
    lines.push(named.join(". ") + ".");
    const done = page.steps.filter(function (s) { return state.ticks[s.id]; });
    const open = page.steps.filter(function (s) { return !state.ticks[s.id]; });
    if (done.length) {
      lines.push("", "Done:");
      done.forEach(function (s) {
        const at = start ? "[+" + elapsed(state.ticks[s.id] - start) + "] " : "";
        lines.push("- " + at + s.text);
      });
    }
    if (open.length) {
      lines.push("", "Still to do:");
      open.forEach(function (s) { lines.push("- " + s.text); });
    }
    const answered = page.questions.filter(function (q) { return (state.answers[q.id] || "").trim(); });
    if (answered.length) {
      lines.push("", "What we know:");
      answered.forEach(function (q) { lines.push("- " + q.text + " " + state.answers[q.id].trim()); });
    }
    return lines.join("\n");
  }

  // --- the page --------------------------------------------------------------

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && typeof saved === "object") {
        return {
          start: saved.start || null,
          ticks: saved.ticks || {},
          severity: saved.severity || "",
          roles: saved.roles || {},
          answers: saved.answers || {},
        };
      }
    } catch (e) { /* storage blocked or unreadable: start empty */ }
    return { start: null, ticks: {}, severity: "", roles: {}, answers: {} };
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* not saved, still works */ }
  }

  function readPage(root) {
    const text = function (el) { return el.getAttribute("data-text") || el.textContent.trim(); };
    return {
      steps: Array.prototype.map.call(root.querySelectorAll("[data-step]"), function (el) {
        return { id: el.value, text: text(el) };
      }),
      severities: Array.prototype.map.call(root.querySelectorAll("[data-severity]"), function (el) {
        return { id: el.value, label: el.value, short: el.getAttribute("data-text") };
      }),
      roles: Array.prototype.map.call(root.querySelectorAll("[data-role]"), function (el) {
        return { id: el.name, label: el.getAttribute("data-text") };
      }),
      questions: Array.prototype.map.call(root.querySelectorAll("[data-question]"), function (el) {
        return { id: el.name, text: el.getAttribute("data-text") };
      }),
    };
  }

  function mount(doc) {
    const root = doc.querySelector("[data-checklist]");
    if (!root) return;
    const state = load();
    const page = readPage(root);
    const clock = root.querySelector("[data-clock]");
    const startedAt = root.querySelector("[data-started]");

    function startClock() {
      if (!state.start) { state.start = Date.now(); save(state); }
    }

    function render() {
      root.querySelectorAll("[data-step]").forEach(function (el) {
        el.checked = Boolean(state.ticks[el.value]);
        const stamp = root.querySelector('[data-stamp="' + el.value + '"]');
        if (stamp) {
          stamp.textContent = state.ticks[el.value] && state.start
            ? "+" + elapsed(state.ticks[el.value] - state.start) : "";
        }
      });
      root.querySelectorAll("[data-severity]").forEach(function (el) { el.checked = el.value === state.severity; });
      root.querySelectorAll("[data-role]").forEach(function (el) { el.value = state.roles[el.name] || ""; });
      root.querySelectorAll("[data-question]").forEach(function (el) { el.value = state.answers[el.name] || ""; });
      tick();
    }

    function tick() {
      if (clock) clock.textContent = state.start ? elapsed(Date.now() - state.start) : "00:00";
      if (startedAt) startedAt.textContent = state.start ? "Started " + utc(state.start) : "Not started";
    }

    root.addEventListener("change", function (e) {
      const el = e.target;
      if (el.hasAttribute("data-step")) {
        startClock();
        if (el.checked) state.ticks[el.value] = Date.now();
        else delete state.ticks[el.value];
      } else if (el.hasAttribute("data-severity")) {
        startClock();
        state.severity = el.value;
      }
      save(state);
      render();
    });
    root.addEventListener("input", function (e) {
      const el = e.target;
      if (el.hasAttribute("data-role")) state.roles[el.name] = el.value;
      else if (el.hasAttribute("data-question")) state.answers[el.name] = el.value;
      else return;
      save(state);
    });

    const start = root.querySelector("[data-start]");
    if (start) {
      start.hidden = false;
      start.addEventListener("click", function () { startClock(); render(); });
    }
    const reset = root.querySelector("[data-reset]");
    if (reset) {
      reset.hidden = false;
      reset.addEventListener("click", function () {
        if (!window.confirm("Clear every tick, name and answer on this page?")) return;
        state.start = null; state.ticks = {}; state.severity = ""; state.roles = {}; state.answers = {};
        save(state);
        render();
      });
    }
    const copy = root.querySelector("[data-copy]");
    if (copy && navigator.clipboard && window.isSecureContext) {
      copy.hidden = false;
      copy.addEventListener("click", function () {
        navigator.clipboard.writeText(summary(page, state, Date.now())).then(function () {
          const was = copy.textContent;
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = was; }, 1500);
        }, function () {});
      });
    }
    const print = root.querySelector("[data-print]");
    if (print) {
      print.hidden = false;
      print.addEventListener("click", function () { window.print(); });
    }
    root.querySelectorAll("[data-js]").forEach(function (el) { el.hidden = false; });

    render();
    setInterval(tick, 1000);
  }

  return { elapsed: elapsed, utc: utc, summary: summary, mount: mount };
});
