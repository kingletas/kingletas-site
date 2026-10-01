// The incident checklist's clock and its chat summary, on an invented incident.
// Run by test.sh.
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const c = require(path.join(__dirname, "..", "assets", "js", "incident-checklist.js"));

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

const page = {
  steps: [
    { id: "declare", text: "Said it out loud in one channel and opened an incident thread" },
    { id: "commander", text: "Named the incident commander" },
    { id: "scribe", text: "Named a scribe and started the timeline" },
  ],
  severities: [{ id: "SEV1", label: "SEV1", short: "users cannot buy or pay, or data is being damaged or exposed" }],
  roles: [{ id: "commander", label: "Commander" }, { id: "scribe", label: "Scribe" }],
  questions: [{ id: "q2", text: "What changed?" }],
};
const start = Date.UTC(2031, 0, 1, 14, 2, 0);
const state = {
  start: start,
  ticks: { declare: start, commander: start + 70 * 1000 },
  severity: "SEV1",
  roles: { commander: "Robin", scribe: "" },
  answers: { q2: "A config push at 13:55 UTC." },
};

ok("the clock reads minutes and seconds, then hours", () => {
  assert.equal(c.elapsed(7 * 60 * 1000 + 3000), "07:03");
  assert.equal(c.elapsed(3723 * 1000), "1:02:03");
  assert.equal(c.elapsed(-5), "00:00");
});
ok("a start time reads in UTC with its date, the same in any zone", () => assert.equal(c.utc(start), "2031-01-01 14:02 UTC"));
ok("the summary pastes as plain text, in page order, with the time beside each tick", () => {
  assert.equal(c.summary(page, state, start + 7 * 60 * 1000 + 3000), [
    "Incident checklist: 07:03 in, started 2031-01-01 14:02 UTC",
    "Severity: SEV1, users cannot buy or pay, or data is being damaged or exposed",
    "Commander: Robin. Scribe: not named.",
    "",
    "Done:",
    "- [+00:00] Said it out loud in one channel and opened an incident thread",
    "- [+01:10] Named the incident commander",
    "",
    "Still to do:",
    "- Named a scribe and started the timeline",
    "",
    "What we know:",
    "- What changed? A config push at 13:55 UTC.",
  ].join("\n"));
});
ok("before anything is ticked, the summary says so rather than inventing a time", () => {
  const blank = { start: null, ticks: {}, severity: "", roles: {}, answers: {} };
  const text = c.summary(page, blank, start);
  assert.match(text, /^Incident checklist: clock not started\nSeverity: not set yet\n/);
  assert.ok(!text.includes("Done:"));
});
ok("a saved state of the wrong shape loads empty instead of breaking the next tick", () => {
  const empty = { start: null, ticks: {}, severity: "", roles: {}, answers: {} };
  assert.deepEqual(c.normalise(null), empty);
  assert.deepEqual(c.normalise("text"), empty);
  assert.deepEqual(c.normalise({ start: "soon", ticks: "x", severity: 3, roles: [], answers: true }), empty);
  const kept = c.normalise({ start: start, ticks: { declare: start }, severity: "SEV1", roles: {}, answers: {} });
  assert.equal(kept.start, start);
  assert.equal(kept.ticks.declare, start);
  assert.equal(kept.severity, "SEV1");
});
ok("a role or answer saved as a number still summarises", () => {
  const odd = { start: null, ticks: {}, severity: "", roles: { commander: 7 }, answers: { q2: 42 } };
  const text = c.summary(page, odd, start);
  assert.ok(text.includes("Commander: 7."));
  assert.ok(text.includes("- What changed? 42"));
});

process.exit(failed);
