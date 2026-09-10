---
title: "Projects"
ShowReadingTime: false
ShowPostNavLinks: false
hideMeta: true
---

Everything here is open source and on [GitHub](https://github.com/kingletas).

## Magento tooling

- **[bluetir](https://github.com/kingletas/bluetir)** drives a real browser through a storefront, adds to cart and places an order. Luma, Hyvä and ScandiPWA are each one YAML profile, so a new store means a new profile rather than new code.
- **[manipulus](https://github.com/kingletas/manipulus)** works out which RequireJS modules each Magento 2 page type loads, straight from the codebase, and bundles them. No browser, no Node, no running store. Its walkthrough takes a real store from 226 JavaScript requests to 15.
- **[drexbot](https://github.com/kingletas/drexbot)** runs regression, acceptance, behaviour and performance tests against a Magento storefront.
- **[harness-kernel](https://github.com/kingletas/harness-kernel)** is the test kernel drexbot is built on. It knows nothing about Magento: it owns the run, the verdicts and the reports, so it can back a harness for anything.

## Platform and DevOps tools

- **[credential-guard](https://github.com/kingletas/credential-guard)** keeps credentials out of git. It scans the working tree and every blob in the history, and installs itself as a pre-commit hook.
- **[dev-snapshot](https://github.com/kingletas/dev-snapshot)** makes one encrypted, verified archive of a source tree, leaving out everything a package manager can rebuild.
- **[tooling-sync](https://github.com/kingletas/tooling-sync)** tells an installed command apart from the repository it came from, and shows which one changed.

## Obsidian plugins

- **[periodic-journal](https://github.com/kingletas/obsidian-periodic-journal)** handles every recurring note from one list of note types, instead of five fixed ones. A second daily note is just another entry.
- **[stickies](https://github.com/kingletas/obsidian-stickies)** puts movable sticky notes on a passage. They follow the text as it's edited and never touch the Markdown.
- **[world-engine](https://github.com/kingletas/obsidian-world-engine)** validates a structured vault against YAML schemas and checks it for continuity, with the notes staying the source of truth.
- **[engineering-toolkit](https://github.com/kingletas/obsidian-engineering-toolkit)** adds light structure to the engineering docs a vault already holds: ADRs, incidents, infrastructure notes and a decision log.
- **[jira-autolink](https://github.com/kingletas/obsidian-jira-autolink)** turns `PROJ-123` into a link to your Jira, with an optional hover preview of the issue.

## Reading tools

- **[solander](https://github.com/kingletas/solander)** opens an Obsidian vault on Ubuntu and never writes into it. Wikilinks, callouts, canvases and Dataview render as themselves, with no plugins, no scripts and no network.
- **[ariadne](https://github.com/kingletas/ariadne)** builds a book's cast as you read and never shows you anyone past your bookmark. It works offline on epubs you own. It's early, and it needs readers.
