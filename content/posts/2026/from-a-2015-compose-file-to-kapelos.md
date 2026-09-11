---
title: "From a 2015 docker-compose file to Kapelos"
date: 2026-09-11
description: "How one docker-compose file for Magento lasted three jobs and eleven years, and what it took to turn it into a project someone else can clone."
tags: ["docker", "magento", "local-dev"]
---

In 2015, at BuyerQuest, I wrote a docker-compose file that ran Magento on my computer. I took it with me to Anatta, and then to Scrubs & Beyond. This week it became [Kapelos](https://github.com/kingletas/kapelos), a public project anyone can clone.

Most of the file changed over those years. What I built it for never did: one Magento store, on one computer, from a file I can read top to bottom.

## The oldest copy I still have

The oldest version I still have is from March 2019. It's Compose format 2.2, with thirteen services:

- three MySQL 5.7 databases
- Elasticsearch 2.4
- RabbitMQ 3
- two Redis containers, both on `latest`
- MailHog to catch outgoing mail
- phpMyAdmin and Adminer, two web tools for looking at the databases
- two PHP-FPM containers built from my own image
- nginx

Every version in it is either written into the file or `latest`, which means "whatever was newest the day you pulled".

## Six years inside a store

In March 2020 I moved the file into the Scrubs & Beyond repository, with seven services. By the time it left, it was 363 lines. Nearly every piece had been swapped for its successor:

| 2019 | 2026 |
|---|---|
| MySQL 5.7 | MariaDB 11.4 |
| Elasticsearch 2.4, then 6.8 | OpenSearch 3 |
| two Redis on `latest` | two Valkey caches, pinned to 8.0 |
| PHP-FPM | PHP 8.4, with separate containers for cron and the admin |
| nothing in front | Varnish 7.5 |

The shape stayed the same. It was still one Compose file, and I could still read it top to bottom.

## Why it didn't become part of something bigger

I also run [Emporion](https://github.com/kingletas/emporion), which runs many Magento stores side by side on Kubernetes or Compose. Folding this file into it was the obvious option. I kept them apart, because a simple docker-compose file is simpler than a full system. Emporion's Compose setup alone is three files and over 700 lines, and it won't start without its own setup script. For one store on my own computer, that's the wrong trade.

So I gave the file its own project, and a name to match. A *kapelos* was the small shopkeeper of an ancient Greek town. An *emporion* was the harbour trading post.

## What it took to share it

A file that works on my computer and a project that works on someone else's are different things. Four changes did most of the work.

**I started it from a fresh repository.** The old history held override files, a committed shell history and names that only mean something to me. On a public repository, anything in the history is published with it. Deleting it in a later commit doesn't take it back. So none of the old commits came along.

**I stopped writing values into the file.** Every image version, port and password comes from a settings file now. Kapelos generates the passwords itself, and refuses to start without them.

**I tested it by running it, not by reading it.** Three problems looked fine on the page and only showed up when it ran:

- nginx looked up PHP's address once, when it started. Change a PHP setting, PHP gets a new address, and every page answers 502 until nginx restarts. Now the two share a socket file, so no address is involved.
- A folder path in the settings that didn't exist didn't fail. Docker quietly created an empty folder, owned by root, and mounted that. Varnish never started, and nothing said why. Now a missing path is an error that names the path.
- RabbitMQ had nowhere to store its data, so it kept nothing between runs. That was on purpose: on my own computer I never wanted it to. Sharing it changes the rule: someone else's queues shouldn't vanish when a container is replaced. So I gave it a volume, and they vanished anyway. RabbitMQ files its data under the container's hostname, and Compose handed it a new hostname every time. Giving it a fixed one fixed it.

**Kapelos is opinionated, and it likes to explain itself.** It runs one store at a time, and refuses to start a second while one is running, naming the one that's up. Its settings are mounted rather than baked in, so changing one needs a restart, not a rebuild. Around that there's a README written for someone who has never seen it, a guide from a bare machine to a working store, and a page of examples. The output in the guide is copied from a real run, not typed out by hand.

## What it is today

It's still a Compose stack for one store, with a command around it:

- **`kapelos demo`** downloads [Mage-OS](https://mage-os.org), which needs no Magento account, installs it and prints where everything is.
- **`kapelos adopt`** runs a store you already have, exactly as it is. Its code stays where it lives, and it gets a copy of its database.
- **Each project is a site.** `kapelos use` switches between them, and only one runs at a time.
- **Snapshots** save the database, search index and queue, and restore them.
- **Traefik sits in front, with a second PHP just for Xdebug.** Only requests that ask for the debugger reach it, so every other page stays fast.
- **`kapelos site audit`** checks a store's dependencies, code and settings before a release.
- **It runs under bash 3.2**, the version macOS ships, though I've only ever run it on Linux myself.

The stack underneath is PHP 8.4, nginx, Varnish, MariaDB 11.8, OpenSearch 3.6, RabbitMQ, two Valkey caches and Mailpit. Each version is one line in a settings file.

## What stayed the same

After eleven years, it still does the one job it started with: one store, on your own computer, from a Compose file you can read. If you need several stores at once, that's Emporion's job. If you need one running by lunchtime:

```bash
git clone https://github.com/kingletas/kapelos && cd kapelos
bin/kapelos demo
```
