---
title: "Site reliability"
description: "Keeping a site up, and knowing when it isn't: the numbers behind it, worked out in your browser."
ShowReadingTime: false
ShowPostNavLinks: false
hideMeta: true
---

Site reliability engineering is the practice of keeping a service up for the people who use it, and of knowing, before they tell you, when it isn't. Much of it comes down to a few small formulas: how much downtime a target really allows, how much work a system holds at once, and how fast failures use up the room you've given yourself.

This section puts those to work. Start with the calculator: pick a target, type in your own numbers, and see the minutes, the workers and the alerts they turn into. Every figure is worked out in your browser, and nothing you type leaves it.

## In this section

- **[Reliability calculator](reliability-calculator/)**: downtime per availability target, work in flight from Little's law, and how fast an error rate burns a month's budget, with the alerts that would fire.
- **[The first fifteen minutes of an incident](first-fifteen-minutes/)**: a checklist to work through while it's happening, with a running clock and a summary to paste into your team's chat.
- **[Rehearsing recovery on a laptop](rehearsing-recovery/)**: five disaster-recovery rehearsals on invented data, from a bad update to a break-in, each built to fail loudly when the recovery is wrong.

More is on its way: a gallery of dashboards that watch what customers feel. It will appear here when it's published.
