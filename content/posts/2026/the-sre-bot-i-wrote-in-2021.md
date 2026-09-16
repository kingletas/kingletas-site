---
title: "The SRE bot I wrote in 2021 is now public"
date: 2026-09-16
description: "HealthBot got two commits in 2021 and then nothing for four and a half years. Here is what publishing it found, and why almost none of it showed up in a linter."
tags: ["reliability", "python", "ansible", "packer", "terraform", "testing"]
---
Most monitoring systems tend to answer whether the server is up or not. All of that can be green while an ecommerce checkout is broken, the cart page could even respond 200s, while the add-to-cart button does nothing, and the graphs stay flat because nothing crashed.

In November 2021 I wrote a little bot to answer the other question. Every five minutes it opens a real browser, searches for a product, adds it to the cart and loads checkout, and confirms that under the conditions at the time, checkout is up.

It's a yes or no answer wrapped around several metrics. It folds in New Relic, Google Analytics and CloudWatch, and decides whether anyone needs waking up. I called it HealthBot. This week it became [a public project](https://github.com/kingletas/healthbot).

## A story in two commits with a timeskip

The git history is short and honest about itself:

```text
2021-11-29  HealthBot SRE v1 release
2021-12-08  (Chore) Added redis for caching to add a default TTL
2026-08-23  pre migration changes
```

Two commits in 2021, and then nothing until this August. The implementation was right on the first try, and it was all peaceful. 

Four years later everything around the idea went stale: the Python, the base image, the Google API it called, the packaging rules it was built under. Even Packer needed a talking to.

And that gap is the interesting part of this post. A tool nobody touches does not stay still, it rots. And with the advent of AI, the world underneath moves at an increasingly high speed, and none of that movement shows up until somebody tries to run it fresh.

So I embarked on another modernization project, similar to [Bluetir](https://github.com/kingletas/bluetir). This time though, I wanted an extra set of eyes to see what I missed the first time around and build a better foundation.

## What Claude actually found...

Here is what was wrong, and what it told me:

| What was broken | What caught it |
|---|---|
| The built wheel was missing one of its modules | Installing the wheel in a clean virtualenv |
| The deploy could never install the wheel at all | Running the playbook against a container |
| The base image was four years past end of life | Reading the version I had pinned |
| A package the deploy installs no longer exists | Running the playbook against a container |
| Every traceback printed the value of every local variable | Reading a real crash in the journal |
| The alert arrived on a phone with no text in it | A warning the Slack SDK prints and I had never read |
| The cache was reachable from the whole network | A pattern scan over the Compose file |

Only the last one is the sort of thing a linter finds. Five of the others came from running something, and the sixth from reading a pinned version against a release calendar.

## A machine you can throw away

The way to find those was to stop reading and start running. Install the wheel into an empty virtualenv. Bring up the local stack and run the bot against it. And for the playbook, hand it an Ubuntu 24.04 container with systemd as PID 1 and let it deploy for real:

```bash
ansible-playbook -i 'hb-target,' -c community.docker.docker \
  -e ansible_user=root -e ansible_python_interpreter=/usr/bin/python3 \
  playbook.yml
```

Real `systemctl`, real `apt`, real `pip`, and a host you can delete and rebuild in seconds. The play died on its third task, and then on its ninth. That same playbook had been passing `ansible-lint` on its strictest profile the whole time, before and after.

One caveat worth having: read your numbers off a run that finished. My first "the playbook is idempotent, second run reports `changed=0`" came from a play that had stopped four tasks from the end, because a container cannot set a static hostname. It had not converged. It had just not got far enough to change anything.

## Names that came from another language

The other half of this was readability, and the filenames gave the game away immediately:

```text
healthbot/helper/CacheAwareHelper.py
healthbot/interfaces/notification/NotificationAwareInterface.py
healthbot/notifications/SlackNotificationAware.py
```

That is a Java package tree with Python extensions on it. Four years later it reads like somebody else's code, which turns out to be the most useful thing about leaving something alone for four years.

```text
healthbot/cache.py
healthbot/notifications/base.py       (Message, Notifier)
healthbot/notifications/slack.py      (SlackMessage, SlackNotifier)
```

One module per notification channel, holding its own message and the client that sends it. One module per check, named for what it reads. `Aware`, `Helper` and `Interface` were three words that never told anybody anything, and they are gone.

The renaming is the easy part and it does not stay done on its own, so `ruff` now enforces it, with `N` for PEP 8 naming among others. It objects to nothing in the package. It objects to three things in the tests, and all three are stand-ins for a vendor SDK that have to answer to that SDK's spelling, so each carries a `noqa` with the reason next to it rather than a blanket rule in the config that nobody would ever see.

## What it does now

The idea has not changed since 2021. Everything around it has:

- **Five checks.** A real browser through search, product, cart and checkout. An async sweep of canary URLs. New Relic APM and browser. GA4 realtime users. CloudWatch for the tagged fleet and the database. A failed checkout leaves a screenshot, the page HTML and a replayable trace, so you are not guessing at three in the morning.
- **A signal it could not collect raises the alarm** rather than passing quietly. "I cannot tell whether the site is healthy" is not good news and should never look like it.
- **A standing alert backs off** to fifteen minutes, then thirty, then hourly. A change in *what* is failing always speaks straight away, and recovery needs two consecutive clean runs before it counts. An alert that repeats every five minutes for an afternoon teaches people to ignore the channel, and then it takes the real one down with it.
- **Five SLOs**, OpenTelemetry, Prometheus burn-rate alerting, and a dead-man's switch for when the heartbeat stops.
- **Its own infrastructure**: Terraform, Packer and Ansible, in the repository, gated in CI.
- **A local environment that runs the real thing.** A stub storefront, Mattermost standing in for Slack, an AWS emulator. The production `main()` runs end to end on a laptop with no credentials and no storefront of your own.

That last one is the piece I would build first if I were starting again. Everything else in this post was found by running something, and the local stack is what makes running it free.

## Closing the loop

In 2021 HealthBot answered one question for one store, and then it got on with it quietly enough that the repository did not take another commit for four and a half years. That is the nicest thing you can say about a piece of software and also the reason it needed this much work.

It answers the same question today. The difference is that it will now answer it for anyone who clones it, which is why the shipped configuration points at `store.example.com` and the local stack comes with its own pretend shop.

[HealthBot is on GitHub](https://github.com/kingletas/healthbot). `docs/from-nothing.md` takes you from a clone to a real alert in about twenty minutes, without an AWS account and without owning a storefront.
