---
title: "Dashboards that watch what customers feel"
description: "Four monitoring dashboards from an open-source store monitor, shown on invented data: the question each one answers, and the alert behind it."
ShowReadingTime: false
ShowPostNavLinks: false
hideMeta: true
ShowToc: true
TocOpen: false
---

These four dashboards come from [HealthBot](https://github.com/kingletas/healthbot), an open-source monitor that checks an online store every few minutes: whether a shopper can get through checkout, whether a set of pages answer, how fast the site responds, and how many people are on it.

**Every screenshot here is from a demo run on invented data**: a made-up store, made-up traffic and made-up deploys, with failures thrown in on purpose. The numbers mean nothing. What each dashboard is built to answer is the point.

A dashboard earns its place by answering a question someone asks under pressure, and by backing an alert that tells them when to ask it. So each one below says which question, and which alert.

## Is each objective being met?

**The question:** for each thing customers rely on, such as checkout completing or pages answering, is it meeting its target over the last 30 days, and how fast is it using up its allowance for failure right now? **The alert behind it:** a page when an objective burns its budget 14.4 times too fast over an hour, confirmed over five minutes, and a ticket when it burns 6 times too fast over six hours, confirmed over thirty minutes.

{{< figure src="sre.png" link="sre.png" caption="Open the full-size image" alt="The SRE dashboard on invented data. A top row shows how far each of five objectives is from its target over 30 days, four of them below target. Below it, a burn-rate chart with one objective climbing past the page line at 14.4, an error-ratio chart, check results and durations, traffic and response-time charts with their alert lines, canary pages answering with errors, and a count of runs reporting." >}}

Worth noticing:

- **The top row says how far each objective is above its target, not its raw percentage.** Zero is exactly on target, so the sign is the verdict.
- **The burn chart draws both thresholds on it.** It shows the one-hour rate, so the page line is the one that decides; the ticket waits for six hours above its line.
- **"Runs reporting" is the monitor's own pulse.** If it stops reporting altogether, a separate alert pages, because a monitor that has gone quiet looks exactly like a store with nothing wrong.

If burn rates are new to you, the [reliability calculator](../reliability-calculator/) works them out for your own numbers.

## When something is wrong, what is it?

**The question:** is the problem the store or the monitor, which check is unhappy, which objective is burning, and since when? **The alert behind it:** the same page and ticket, drawn on the dial and the bars so nobody has to remember the numbers mid-incident.

{{< figure src="incident.png" link="incident.png" caption="Open the full-size image" alt="The incident dashboard on invented data. A dial shows the worst burn rate at 19.3, past both the ticket mark at 6 and the page mark at 14.4. Tiles say the monitor is healthy so the problem is the store, two checks are failing and none are erroring. Bars rank each objective's burn, a table lists the failing checks, a timeline shows when failures began, a table lists canary pages that did not answer 200, and three panels explain that logs, traces and deploy markers are not available yet." >}}

Worth noticing:

- **"Store, or the monitor?" comes first.** A run that crashes says nothing about the store, so the monitor's own failures are counted apart from the store's.
- **An empty table says so in words.** Only unhappy checks appear, so empty is the healthy state, and a blank panel would look broken.
- **Gaps in the timeline are left as gaps.** A stretch with no runs is not a stretch with no failures, and drawing a line across it would invent data.
- **Three panels are placeholders, and say what they're waiting for**: logs, traces and deploy markers. A missing panel that says why is more honest than a dashboard that looks complete.

## Is the monitor itself working?

**The question:** is the monitor running, is every check still reporting, and is each run finishing inside its time limit? **The alert behind it:** the same silence alert, which pages when the monitor stops reporting at all.

{{< figure src="ops.png" link="ops.png" caption="Open the full-size image" alt="The operations dashboard on invented data. Tiles show the monitor running, the telemetry collector up, the runs reporting, the version and the environment. Bars confirm each of the five checks is still reporting, a chart shows run outcomes, a panel for checks that threw says nothing was reported, a dial shows mean run time far inside its 300-second limit, and a table lists four things the dashboard wants and why they are missing." >}}

Worth noticing:

- **"Is every check still reporting?" lists the checks by name.** A check that has stopped running looks exactly like one that passes, unless something names the checks that ought to be there.
- **A check that errors is counted apart from one that fails.** A failure is a verdict about the store; an error is a bug in the monitor.
- **Run time is drawn against its limit.** A run past the limit is killed and recorded as a failure, so the headroom is the number that matters.

## How is delivery going?

**The question:** how often do we deploy, how long from a commit to production, how often does a deploy need fixing, and how long does recovery take? These are four of the DORA metrics, the measures of software delivery from the DORA research programme. **The alert behind it:** none. This is a board for trends, not for an incident.

{{< figure src="dora.png" link="dora.png" caption="Open the full-size image" alt="The DORA dashboard on invented data. Tiles show deployment frequency per day, a change failure rate of about 7.7 percent and a recovery time of about an hour, and lead time for changes reads No data. Two charts show the same figures as flat lines over the hour, and a panel explains that the fifth DORA metric, rework rate, is not collected." >}}

Worth noticing:

- **There are no "elite" or "low" badges.** Each metric is shown as a trend over time, with no performance tier attached.
- **In this demo, lead time reads "No data".** The invented deploys carry no commits to measure from, and the panel says so rather than drawing a zero.
- **The fifth DORA metric has a panel that explains why it is missing.** Rework rate needs to know whether a deploy was planned, and the deploy record doesn't say.

## Building your own

1. **Start from the question, not the data.** Write down what someone will ask at 3 a.m., and build the panel that answers it.
2. **Put the alert's threshold on the chart.** Nobody should have to remember 14.4 during an incident.
3. **Make empty and missing look different from healthy.** Say so in words.
4. **Watch the watcher.** A monitor that goes quiet should page as loudly as the thing it monitors.
