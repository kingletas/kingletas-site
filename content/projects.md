---
title: "Projects"
ShowReadingTime: false
ShowPostNavLinks: false
hideMeta: true
---

Everything here is open source and on [GitHub](https://github.com/kingletas).

## Magento performance

- **[manipulus](https://github.com/kingletas/manipulus)** works out which RequireJS modules each Magento 2 page type loads, straight from the codebase, and bundles them. No browser, no Node, no running store. Its walkthrough takes a real store from 226 JavaScript requests to 15.
- **[section-policy](https://github.com/kingletas/magento2-module-section-policy)** decides what a private-content invalidation actually invalidates, and reports what each action costs. On a stock store, logging in refetches every customer section, including a 59 KB country list that's identical for every visitor.
- **[cache-vary](https://github.com/kingletas/magento2-module-cache-vary)** decides what goes into the full-page-cache key, and reports how many copies of each page it allows. It keeps customer segments out of the Varnish hash when nothing cached depends on them, since each active segment can double the copies of every page.
- **[process-guard](https://github.com/kingletas/magento2-module-process-guard)** times every observer on the hot paths — order placement, totals, catalogue saves, queue consumers — and sheds the ones declared advisory when a path goes over its budget.
- **[catalog-access](https://github.com/kingletas/magento2-module-catalog-access)** does the catalogue reads every module ends up writing — load a product, turn category ids into names, work in the right store — in batches, with the usual mistakes designed out, like one product loaded per loop.
- **[promotion-access](https://github.com/kingletas/magento2-module-promotion-access)** answers the cart price rule questions every module ends up asking, like a rule's action or the rule behind a coupon, in batches and without loading a rule for each one.
- **[foundation](https://github.com/kingletas/magento2-module-foundation)** and **[logger](https://github.com/kingletas/magento2-module-logger)** are the shared pieces the modules above are built on.
- Every module above installs from one Composer repository, **[packages](https://github.com/kingletas/packages)**, and brings the modules it needs along with it.

## Magento testing and runtime

- **[bluetir](https://github.com/kingletas/bluetir)** drives a real browser through a storefront, adds to cart and places an order. Luma, Hyvä and ScandiPWA are each one YAML profile, so a new store means a new profile rather than new code.
- **[drexbot](https://github.com/kingletas/drexbot)** runs regression, acceptance, behaviour and performance tests against a Magento storefront.
- **[harness-kernel](https://github.com/kingletas/harness-kernel)** is the test kernel drexbot is built on. It knows nothing about Magento: it owns the run, the verdicts and the reports, so it can back a harness for anything.
- **[emporion](https://github.com/kingletas/emporion)** runs a Magento 2 store on your machine as a Docker Compose stack or a kind cluster, from one image. A second store, with its own database, cache, search index and queue, is one command.
- **[kapelos](https://github.com/kingletas/kapelos)** is emporion's smaller sibling: one Magento 2 store on your computer with Docker Compose, started from nothing or from a store you already have. Your code stays where it is, so an edit is live in the store straight away.

## Platform and DevOps tools

- **[healthbot](https://github.com/kingletas/healthbot)** checks whether customers can actually buy. Every five minutes it drives a real browser through search, cart and checkout, folds in New Relic, Google Analytics and CloudWatch, and decides whether anyone needs waking up. It ships its own Terraform, Packer and Ansible, and a local stack that runs the production code path with no credentials.
- **[credential-guard](https://github.com/kingletas/credential-guard)** keeps credentials out of git. It scans the working tree and every blob in the history, and installs itself as a pre-commit hook.
- **[dep-intel](https://github.com/kingletas/dep-intel)** tells you which of your dependencies are vulnerable without telling anyone what you run. It matches OSV and CISA's list of exploited vulnerabilities offline, across nine ecosystems.
- **[ansible-role-devops](https://github.com/kingletas/ansible-role-devops)** sets up a DevOps workstation, or creates and hardens an automation account on a server, on Ubuntu, Debian, Fedora and RHEL 9.
- **[dev-snapshot](https://github.com/kingletas/dev-snapshot)** makes one encrypted, verified archive of a source tree, leaving out everything a package manager can rebuild.
- **[tooling-sync](https://github.com/kingletas/tooling-sync)** tells an installed command apart from the repository it came from, and shows which one changed.
- **[magento-deploy-playbook](https://github.com/kingletas/magento-deploy-playbook)** builds a Magento 2 release on a builder host, pushes it to a fleet, switches over and prunes what it replaced. A build lock stops two people cutting the same environment, and a throwaway Docker fleet lets you watch a whole deploy without owning a server.
- **[terraform-aws-modules](https://github.com/kingletas/terraform-aws-modules)** is 59 Terraform modules for AWS, from multi-account setup and networking to data, edge and identity, with eleven examples that put them together. Its guide takes you from a clone to a planned stack without an AWS account.

## Obsidian plugins

- **[periodic-journal](https://github.com/kingletas/obsidian-periodic-journal)** handles every recurring note from one list of note types, instead of five fixed ones. A second daily note is just another entry.
- **[stickies](https://github.com/kingletas/obsidian-stickies)** puts movable sticky notes on a passage. They follow the text as it's edited and never touch the Markdown.
- **[world-engine](https://github.com/kingletas/obsidian-world-engine)** validates a structured vault against YAML schemas and checks it for continuity, with the notes staying the source of truth.
- **[engineering-toolkit](https://github.com/kingletas/obsidian-engineering-toolkit)** adds light structure to the engineering docs a vault already holds: ADRs, incidents, infrastructure notes and a decision log.
- **[jira-autolink](https://github.com/kingletas/obsidian-jira-autolink)** turns `PROJ-123` into a link to your Jira, with an optional hover preview of the issue.

## Desktop apps

- **[ordane](https://github.com/kingletas/ordane)** is a desktop console for an Ansible control plane, with or without a Makefile. It shows the exact command before it runs, streams the output and keeps a record of every run, with no server and no database.
- **[backsight](https://github.com/kingletas/backsight)** is a Terraform workbench that shows what a change will do while you write it. It's early and not released yet.
- **[solander](https://github.com/kingletas/solander)** opens an Obsidian vault on Ubuntu and never writes into it. Wikilinks, callouts, canvases and Dataview render as themselves, with no plugins, no scripts and no network.
- **[ariadne](https://github.com/kingletas/ariadne)** builds a book's cast as you read and never shows you anyone past your bookmark. It works offline on epubs you own. It's early, and it needs readers.
- **[cairn](https://github.com/kingletas/cairn)** keeps every job application you're chasing in one list and screens the job feeds you turn on against what you want. Everything stays in one encrypted file on your machine: no account, no server, no sync.
