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

  /** A date and time in UTC, as 2031-01-01 14:02 UTC, so a timeline reads the
   *  same in any zone and a start left over from another day shows its date. */
  function utc(ms) {
    return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
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
      const who = String(state.roles[r.id] || "").trim();
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
    const answer = function (q) { return String(state.answers[q.id] || "").trim(); };
    const answered = page.questions.filter(answer);
    if (answered.length) {
      lines.push("", "What we know:");
      answered.forEach(function (q) { lines.push("- " + q.text + " " + answer(q)); });
    }
    return lines.join("\n");
  }

  /**
   * A saved state with every field the page writes to, whatever was stored.
   * A field of the wrong type (an older version, a hand edit) becomes empty
   * rather than throwing on the next tick.
   */
  function normalise(saved) {
    const obj = function (v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; };
    const s = obj(saved);
    return {
      start: typeof s.start === "number" ? s.start : null,
      ticks: obj(s.ticks),
      severity: typeof s.severity === "string" ? s.severity : "",
      roles: obj(s.roles),
      answers: obj(s.answers),
    };
  }

  // --- the page --------------------------------------------------------------

  function load() {
    try {
      return normalise(JSON.parse(localStorage.getItem(KEY) || "null"));
    } catch (e) { /* storage blocked or unreadable: start empty */ }
    return normalise(null);
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
    const start = root.querySelector("[data-start]");
    const status = root.querySelector("[data-status]");
    let quiet = null;

    // One polite announcement for a screen reader, cleared after a moment so the
    // same words can be announced again.
    function announce(text) {
      if (!status) return;
      status.textContent = text;
      clearTimeout(quiet);
      quiet = setTimeout(function () { status.textContent = ""; }, 4000);
    }

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
      if (start) {
        start.textContent = state.start ? "Clock running" : "Start the clock";
        start.setAttribute("aria-disabled", state.start ? "true" : "false");
      }
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

    if (start) {
      start.hidden = false;
      start.addEventListener("click", function () {
        if (start.getAttribute("aria-disabled") === "true") return;
        startClock();
        render();
        announce("Clock started");
      });
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
    // Copy goes to the clipboard where the browser allows it. Where it doesn't
    // (plain http, an older browser, a refused permission), the summary is put
    // in a box below the buttons, selected, ready to copy by hand.
    const copy = root.querySelector("[data-copy]");
    const box = root.querySelector("[data-copybox]");
    if (copy) {
      const label = copy.textContent;
      const canClip = Boolean(navigator.clipboard && window.isSecureContext);
      let restore = null;
      const showBox = function () {
        if (!box) return;
        box.value = summary(page, state, Date.now());
        box.hidden = false;
        box.focus();
        box.select();
        announce("The summary is selected in the box below the buttons, ready to copy.");
      };
      if (!canClip) copy.textContent = "Show a summary to copy";
      copy.hidden = false;
      copy.addEventListener("click", function () {
        if (!canClip) { showBox(); return; }
        navigator.clipboard.writeText(summary(page, state, Date.now())).then(function () {
          if (box) box.hidden = true;
          copy.textContent = "Copied";
          announce("Summary copied");
          clearTimeout(restore);
          restore = setTimeout(function () { copy.textContent = label; }, 1500);
        }, showBox);
      });
    }

    // Another tab on this page saved: take its state, so the two don't overwrite
    // each other's ticks.
    window.addEventListener("storage", function (e) {
      if (e.key !== KEY && e.key !== null) return;
      Object.assign(state, load());
      render();
    });
    const print = root.querySelector("[data-print]");
    if (print) {
      print.hidden = false;
      print.addEventListener("click", function () { window.print(); });
    }
    root.querySelectorAll("[data-js]").forEach(function (el) { el.hidden = false; });

    render();
    setInterval(tick, 1000);
  }

  return { elapsed: elapsed, utc: utc, summary: summary, normalise: normalise, mount: mount };
});
