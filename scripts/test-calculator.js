// The reliability calculator's math against the worked cases in its source:
// downtime per nine, Little's law, and burn rates against the SRE Workbook's
// alert table. Run by test.sh.
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const m = require(path.join(__dirname, "..", "assets", "js", "reliability-calculator.js"));

const DAY = 86400;
let failed = 0;
function ok(what, fn) {
  try {
    fn();
    console.log("ok    " + what);
  } catch (e) {
    failed = 1;
    console.log("FAIL  " + what + ": " + e.message);
  }
}

ok("99.9% allows 43.2 minutes in 30 days", () =>
  assert.equal(m.duration(m.downtime(99.9, 30 * DAY)), "43.2 minutes"));
ok("99.99% allows 52.6 minutes in a year", () =>
  assert.equal(m.duration(m.downtime(99.99, 365 * DAY)), "52.6 minutes"));
ok("99.5% allows 50.4 minutes a week", () =>
  assert.equal(m.duration(m.downtime(99.5, 7 * DAY)), "50.4 minutes"));
ok("99% allows 3.7 days a year", () =>
  assert.equal(m.duration(m.downtime(99, 365 * DAY)), "3.7 days"));
ok("99.999% allows 0.9 seconds a day", () =>
  assert.equal(m.duration(m.downtime(99.999, DAY)), "0.9 seconds"));
ok("99.99% allows 1.0 minute a week, singular", () =>
  assert.equal(m.duration(m.downtime(99.99, 7 * DAY)), "1.0 minute"));

ok("200 a second at 0.5 s is 100 in flight", () => assert.equal(m.inFlight(200, 0.5), 100));
ok("the same traffic at 2 s is 400 in flight", () => assert.equal(m.inFlight(200, 2), 400));

ok("1.44% failing against 99.9% is a 14.4x burn", () =>
  assert.ok(Math.abs(m.burnRate(99.9, 1.44) - 14.4) < 1e-9));
ok("a 14.4x burn empties a 30-day budget in about 2 days", () =>
  assert.equal(m.duration(m.budgetLastsDays(14.4) * DAY), "2.1 days"));
ok("6x lasts 5 days and 1x lasts 30", () => {
  assert.equal(m.budgetLastsDays(6), 5);
  assert.equal(m.budgetLastsDays(1), 30);
});
ok("at 14.4x every alert fires, the fast page after about an hour", () => {
  const a = m.alerts(m.burnRate(99.9, 1.44));
  assert.deepEqual(a.map((r) => r.fires), [true, true, true]);
  assert.equal(m.duration(a[0].afterSeconds), "1.0 hour");
});
ok("the three alerts fire at 2%, 5% and 10% of the budget, as the Workbook says", () =>
  assert.deepEqual(m.alerts(20).map((r) => Math.round(r.budgetSpentPercent * 10) / 10), [2, 5, 10]));
ok("at 6x the fast page stays quiet and the slow page and the ticket fire", () =>
  assert.deepEqual(m.alerts(6).map((r) => r.fires), [false, true, true]));
ok("below 1x nothing fires", () =>
  assert.deepEqual(m.alerts(0.5).map((r) => r.fires), [false, false, false]));

ok("the alert windows read as people write them", () =>
  assert.deepEqual(m.ALERTS.map((a) => m.windowLength(a.longSeconds) + "/" + m.windowLength(a.shortSeconds)),
    ["1 hour/5 minutes", "6 hours/30 minutes", "3 days/6 hours"]));

process.exit(failed);
