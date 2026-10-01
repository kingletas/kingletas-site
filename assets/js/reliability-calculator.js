// The reliability calculator: the math, and the page that drives it.
// The math is plain functions with no page in sight, so a test can run them in
// Node; the page part only runs where there is a document.
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ReliabilityMath = api;
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

  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // A 365-day year and a 30-day month, the periods error budgets are usually set over.
  const PERIODS = [
    { name: "year", seconds: 365 * DAY },
    { name: "30 days", seconds: 30 * DAY },
    { name: "week", seconds: 7 * DAY },
    { name: "day", seconds: DAY },
  ];

  // The Google SRE Workbook's starting point for a 30-day SLO (Alerting on SLOs,
  // Table 5-8): each alert needs both its long and its short window burning faster
  // than the rate before it fires.
  const BUDGET_DAYS = 30;
  const ALERTS = [
    { severity: "Page", longSeconds: HOUR, shortSeconds: 5 * MINUTE, rate: 14.4 },
    { severity: "Page", longSeconds: 6 * HOUR, shortSeconds: 30 * MINUTE, rate: 6 },
    { severity: "Ticket", longSeconds: 3 * DAY, shortSeconds: 6 * HOUR, rate: 1 },
  ];

  /** Seconds of downtime an availability target allows over a period. */
  function downtime(availabilityPercent, periodSeconds) {
    return (1 - availabilityPercent / 100) * periodSeconds;
  }

  /** Little's law: requests in flight = arrival rate x time each spends inside. */
  function inFlight(requestsPerSecond, secondsEach) {
    return requestsPerSecond * secondsEach;
  }

  /** How many times faster than "evenly over the period" the budget is being spent. */
  function burnRate(sloPercent, errorPercent) {
    return errorPercent / (100 - sloPercent);
  }

  /** Days a full budget lasts at a steady burn rate. */
  function budgetLastsDays(rate) {
    return BUDGET_DAYS / rate;
  }

  /**
   * Which of the Workbook's alerts a steady burn sets off, how long after the errors
   * start, and how much of the month's budget is gone by then. A long window's
   * average passes the alert's rate after window x rate / burn.
   */
  function alerts(rate) {
    return ALERTS.map(function (a) {
      // At or above the rate, with room for floating point: 1.44% against 99.9% is
      // 14.4x on paper and 14.400000000000821 in a double.
      const fires = rate >= a.rate - 1e-9;
      return {
        severity: a.severity,
        longSeconds: a.longSeconds,
        shortSeconds: a.shortSeconds,
        threshold: a.rate,
        fires: fires,
        afterSeconds: fires ? (a.longSeconds * a.rate) / rate : null,
        budgetSpentPercent: (a.rate * a.longSeconds * 100) / (BUDGET_DAYS * DAY),
      };
    });
  }

  function oneDecimal(value) {
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  /** A duration the way people say it: "43.2 minutes", "8.8 hours", "3.7 days". */
  function duration(seconds) {
    const steps = [
      [DAY, "day"],
      [HOUR, "hour"],
      [MINUTE, "minute"],
    ];
    for (const [size, unit] of steps) {
      // Rounded first, so 3,599.9999 seconds reads 1.0 hour, not 60.0 minutes.
      if (Math.round((seconds / size) * 10) >= 10) {
        const shown = oneDecimal(seconds / size);
        return shown + " " + unit + (shown === "1.0" ? "" : "s");
      }
    }
    const shown = oneDecimal(seconds);
    return shown + " second" + (shown === "1.0" ? "" : "s");
  }

  /** A whole window, like "1 hour" or "30 minutes", without a ".0" it doesn't need. */
  function windowLength(seconds) {
    return duration(seconds).replace(/\.0 /, " ").replace(/^1 (\w+)s$/, "1 $1");
  }

  /** A number with thousands separators and at most one decimal place. */
  function count(value) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  // --- the page --------------------------------------------------------------

  function number(input) {
    const value = Number(String(input.value).trim());
    return input.value.trim() !== "" && Number.isFinite(value) ? value : NaN;
  }

  function setText(root, name, text) {
    const el = root.querySelector('[data-out="' + name + '"]');
    if (el) el.textContent = text;
  }

  // The summary is a live region, so it waits until typing pauses: one sentence
  // per change, not one per keystroke.
  function setSummary(root, text) {
    const el = root.querySelector("[data-summary]");
    if (!el) return;
    clearTimeout(root._rcTimer);
    if (root._rcQuiet) {
      el.textContent = text;
    } else {
      root._rcTimer = setTimeout(function () { el.textContent = text; }, 600);
    }
  }

  // Marks a field invalid on the field itself, so it still says so when reached later.
  function flag(input, bad) {
    if (bad) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function nines(root) {
    const field = root.querySelector('[name="availability"]');
    const a = number(field);
    flag(field, !(a >= 0 && a < 100));
    if (!(a >= 0 && a < 100)) {
      PERIODS.forEach(function (p) { setText(root, p.name, ""); });
      setSummary(root, "Enter a target below 100, such as 99.9.");
      return;
    }
    PERIODS.forEach(function (p) { setText(root, p.name, duration(downtime(a, p.seconds))); });
    setSummary(root, a + "% allows " + duration(downtime(a, 30 * DAY)) + " of downtime in 30 days and "
      + duration(downtime(a, 365 * DAY)) + " in a year.");
  }

  function little(root) {
    const rateField = root.querySelector('[name="rate"]');
    const msField = root.querySelector('[name="latency"]');
    const rate = number(rateField);
    const ms = number(msField);
    flag(rateField, !(rate >= 0));
    flag(msField, !(ms >= 0));
    if (!(rate >= 0) || !(ms >= 0)) {
      setText(root, "inflight", "");
      setSummary(root, "Enter a request rate and a time per request, both zero or more.");
      return;
    }
    const n = inFlight(rate, ms / 1000);
    setText(root, "inflight", count(n));
    setSummary(root, count(rate) + " requests a second taking " + count(ms) + " ms each means about "
      + count(n) + " in progress at once. Size the pool for the slow day, not the average one.");
  }

  const HEADINGS = ["Alert", "Windows", "Fires at", "Fires", "Budget gone when it fires"];

  function burn(root) {
    const sloField = root.querySelector('[name="slo"]');
    const errorsField = root.querySelector('[name="errors"]');
    const slo = number(sloField);
    const errors = number(errorsField);
    flag(sloField, !(slo > 0 && slo < 100));
    flag(errorsField, !(errors >= 0 && errors <= 100));
    const body = root.querySelector("[data-alerts]");
    if (!(slo > 0 && slo < 100) || !(errors >= 0 && errors <= 100)) {
      setText(root, "burn", "");
      setText(root, "lasts", "");
      if (body) body.textContent = "";
      setSummary(root, "Enter an objective below 100% and an error rate from 0 to 100%.");
      return;
    }
    const rate = burnRate(slo, errors);
    setText(root, "burn", count(Math.round(rate * 10) / 10) + "×");
    setText(root, "lasts", rate > 0 ? duration(budgetLastsDays(rate) * DAY) : "for ever");
    const rows = alerts(rate);
    if (body) {
      body.textContent = "";
      rows.forEach(function (r) {
        const tr = document.createElement("tr");
        tr.setAttribute("role", "row");
        [
          r.severity,
          windowLength(r.longSeconds) + ", checked against " + windowLength(r.shortSeconds),
          r.threshold + "×",
          r.fires ? "Yes, after about " + duration(r.afterSeconds) : "No",
          r.fires ? oneDecimal(r.budgetSpentPercent) + "%" : "Not reached",
        ].forEach(function (text, i) {
          const td = document.createElement("td");
          // The column's name, shown beside the value when a narrow screen stacks the rows.
          td.setAttribute("data-label", HEADINGS[i]);
          td.setAttribute("role", "cell");
          td.textContent = text;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }
    const loudest = rows.find(function (r) { return r.fires; });
    setSummary(root, "Failing " + errors + "% against " + slo + "% burns the budget at "
      + oneDecimal(rate) + "×" + (rate > 0 ? ", so a month's budget lasts " + duration(budgetLastsDays(rate) * DAY) : "")
      + ". " + (loudest ? loudest.severity + " after about " + duration(loudest.afterSeconds) + "." : "No alert fires."));
  }

  const PANELS = { nines: nines, little: little, burn: burn };

  function copyText(text, button) {
    const done = function () {
      const was = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = was; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  }

  function mount(doc) {
    doc.querySelectorAll("[data-calc]").forEach(function (panel) {
      const update = PANELS[panel.getAttribute("data-calc")];
      if (!update) return;
      const form = panel.querySelector("form");
      if (form) {
        form.hidden = false;
        form.addEventListener("submit", function (e) { e.preventDefault(); });
        form.addEventListener("input", function () { update(panel); });
      }
      const copy = panel.querySelector("[data-copy]");
      if (copy) {
        copy.hidden = !(navigator.clipboard && window.isSecureContext);
        copy.addEventListener("click", function () {
          clearTimeout(panel._rcTimer);
          panel._rcQuiet = true;
          update(panel);
          panel._rcQuiet = false;
          const summary = panel.querySelector("[data-summary]");
          const lines = [summary ? summary.textContent : ""];
          panel.querySelectorAll("[data-alerts] tr").forEach(function (tr) {
            const cells = Array.prototype.map.call(tr.children, function (td) { return td.textContent; });
            lines.push("- " + cells[0] + ", " + cells[1] + ", at " + cells[2] + ": " + cells[3]
              + (cells[4] === "Not reached" ? "" : " (" + cells[4] + " of the budget gone)"));
          });
          copyText(lines.join("\n"), copy);
        });
      }
      panel._rcQuiet = true;
      update(panel);
      panel._rcQuiet = false;
    });
    doc.querySelectorAll("[data-print]").forEach(function (button) {
      button.hidden = false;
      button.addEventListener("click", function () { window.print(); });
    });
  }

  return {
    PERIODS: PERIODS,
    ALERTS: ALERTS,
    downtime: downtime,
    inFlight: inFlight,
    burnRate: burnRate,
    budgetLastsDays: budgetLastsDays,
    alerts: alerts,
    duration: duration,
    windowLength: windowLength,
    mount: mount,
  };
});
