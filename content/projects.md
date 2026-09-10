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

## Reading tools

- **[solander](https://github.com/kingletas/solander)** opens an Obsidian vault on Ubuntu and never writes into it. Wikilinks, callouts, canvases and Dataview render as themselves, with no plugins, no scripts and no network.
- **[ariadne](https://github.com/kingletas/ariadne)** builds a book's cast as you read and never shows you anyone past your bookmark. It works offline on epubs you own. It's early, and it needs readers.
