---
title: "Only a definite answer may say no"
date: 2026-09-27
description: "I'm job hunting with tooling Claude and I built, and a job that isn't there can still answer 200. Our checker only calls a posting gone on evidence. Reading an open-source tool that got the same rule right showed us our own code breaking it for the boards themselves."
tags: ["reliability", "testing", "tooling"]
---

The last time I looked for a job was in 2018, that feels like a millennium ago. A full dark age ago. Things have changed a lot. AI and machine learning is no longer a nascent industry but one completely embedded in our lives.

It was a massive shock for me to look for a job and find that the traditional way was... not the recommended way anymore. Yes, you can still count on your connections but getting through the door is more complicated than ever before.

So a good part of my search now runs through hunt-ops, the tooling Claude and I built for it. It sweeps hundreds of company job boards for new postings, and before an application goes in, it checks that the posting is still open.

Getting that check wrong costs two different things. A false "gone" means I skip a job that was still open, and never find out. A false "unknown" costs me a minute looking at a page.

## A job that isn't there can still answer 200

For example, if you ask Greenhouse for a job number it doesn't recognise, it doesn't answer 404. It answers 302, redirects to the company's job board with `?error=true` on the end, and the chain finishes on a perfectly healthy 200. Ask "did the page load?" and the answer is yes, so a checker that only looks at status codes will tell you that job is alive.

So the checker runs on one rule, stated in its own header: a posting is only ever called gone on evidence. Four things count. An HTTP 404 or 410. A redirect that lands on the board's listing, or drops the job's id out of the URL on the way. A closure notice in the page itself. An applicant system saying, in its own JSON, that the posting takes no more applications.

Three of those four arrive on a page that loaded fine. Anything else reads unknown, never gone. If it runs out of time halfway through a redirect, it says it timed out rather than calling the job gone.

## Improving our journey

A former colleague knew how hard it is to find something nowadays, had heard of [career-ops](https://github.com/career-ops-hq/career-ops), an open-source job-search tool, and recommended it. When I looked at it I realized that a good percentage of what it did was something I was doing, and since it is a mature product, I decided to have Teresa and Ed, two of the Claude agents I work with, look at it deeply to see what we could adopt to make our searches easier and faster without stopping our flow.

Because you see, adding a whole new system to change what you already do slows you down. Teresa and Ed found most of it already built, and suggested just a few items to adopt.

One of those was in its `dead-boards.mjs`, which opens with the same rule our posting check runs on: only a real HTTP 404 may advance a miss counter, and throttles, transport failures and DNS errors mean unknown, never dead. It's patient, too. A board needs three 404s before it's skipped, and even then it's only skipped for thirty days before being asked again. For a job board, which lives for years and is expensive to lose, that's right.

Reading it next to ours is how we found our own mistake. Our code got the rule right for individual postings and wrong for the boards those postings live on. If a board timed out, rate-limited us, or sent back something that wasn't JSON, our board check called it dead and told us to turn it off. Follow that advice, and the board is never checked again. A company having a slow afternoon could quietly drop out of my search, and I'd never see another job they posted.

It's the same failure as [the dry run that checked nothing](/posts/2026/the-dry-run-that-checked-nothing/), from the other side. That was "I checked nothing" printed as "nothing wrong". This is "I couldn't tell" printed as "it's dead".

We fixed it the same day, by borrowing career-ops's patience. Only a 404 or a 410 counts as gone now, and anything else is unknown, with its reason. Each miss is recorded by day, an answer clears it, and a board is only flagged after missing on three separate days. Even then it's flagged, not switched off: switching a board off is still our call, made on three days of evidence instead of one bad answer. We tested the fix on invented boards over simulated days, and it now runs against the real ones every morning.

Since the fix, the check has run every morning and hasn't flagged a single board. The old one needed only one bad answer.
