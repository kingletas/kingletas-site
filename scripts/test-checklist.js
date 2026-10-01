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
ok("a start time reads in UTC, the same in any zone", () => assert.equal(c.utc(start), "14:02 UTC"));
ok("the summary pastes as plain text, in page order, with the time beside each tick", () => {
  assert.equal(c.summary(page, state, start + 7 * 60 * 1000 + 3000), [
    "Incident checklist: 07:03 in, started 14:02 UTC",
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

process.exit(failed);
