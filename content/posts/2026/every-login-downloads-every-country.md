---
title: "Every Magento login downloads every country on earth"
date: 2026-09-24
description: "On a stock Magento 2.4.8 store, logging in refetches 61 KB of private data, and 59 KB of it is the country list, which is the same for everyone. The obvious fix changes the config and nothing else, and the right fix looked broken three times before it worked."
tags: ["magento", "performance", "caching"]
---

On 7 September we went looking at `customer/section/load` on a stock Magento 2.4.8 store with the sample data. It's the request that fills in everything a cached page can't know about you: your name, your cart count, your messages. It can never be cached, so every call boots the whole application.

One response was 61,194 bytes. About 59 KB of that was `directory-data`: every country and every region the store knows. The same list for every visitor on the planet, travelling through the one channel in Magento that exists because responses can't be shared.

And it comes back every time somebody logs in.

## Why a login refetches the world

The browser decides when that data is stale. Every page carries a map, merged from each module's `etc/frontend/sections.xml`, of which actions make which sections stale. When a form or AJAX call posts to one of those URLs, `Magento_Customer/js/customer-data` marks the sections stale and asks for them again.

Some actions don't list sections. They say `*`, which means all of them. On the stock store, seven actions did that:

- `customer/account/loginPost`
- `customer/account/logout`
- `customer/account/createPost`
- `customer/account/editPost`
- `stores/store/switch`
- `stores/store/switchrequest`
- `directory/currency/switch`

To be fair to core, every one of those is a moment when something about the customer really did change. Logging in changes the cart, the customer and the messages. It doesn't change the list of countries in the world. The `*` refetches them anyway.

## How much of that request is Magento just starting up

Before fixing anything we wanted to know where the time went, and there's a cheap trick for it: ask for a section that doesn't exist. Magento boots, finds nothing, and answers. Whatever that costs is the floor, the price of the request before any section does any work.

```bash
curl -s -b jar.txt -o /dev/null -w '%{http_code} %{time_total}s\n' \
    'https://shop.test/customer/section/load/?sections=no-such-section'
```

The machine was busy with other work during the runs, so the milliseconds are inflated and not worth quoting. The ratio held across a quiet run and a loaded one: about two thirds of a full request was the floor. All nineteen real sections together cost less than the boot in front of them.

That changes what's worth doing. Making a section faster attacks the smaller third. Not asking for sections you didn't need skips the request entirely.

## The fix that changes the config and nothing else

The obvious move is to declare `customer/account/loginPost` in your own module's `sections.xml` with a proper list, expecting it to replace core's `*`.

It doesn't. Config merging only adds. With a module listing five sections for login, the merged entry came out as:

```text
["*","cart","customer","messages","wishlist","last-ordered-items"]
```

The `*` is still first, the browser still reloads everything, and every check you'd naturally make says your edit landed. The config visibly changed and the store behaves exactly as before.

## The fix that worked, and looked broken three times

The map the browser gets is printed by `Magento\Customer\Block\SectionConfig::getSections()`, so an `after` plugin on that method can rewrite it. The safe way to do it is subtraction: expand `*` into the full list of registered sections, then remove only the ones you've decided an action doesn't touch. Replacing `*` with a fixed list is the unsafe way. A section some extension adds next year would never refresh, and a signed-in shopper would see someone's stale data. Well, their own stale data, but still.

The plugin was right the first time. It didn't look it. After a `cache:flush` it did nothing. After `setup:upgrade`, still nothing. After restarting PHP-FPM, nothing. Three separate checks agreed the fix didn't work, which is exactly the point where you go and rewrite correct code.

What it needed was `generated/` cleared, so Magento rebuilt its interceptors with the plugin in them. If a Magento plugin seems to have no effect, prove the generated code is gone before you believe the result.

There was a second trap, and it took longer to pin down. Declared in `etc/frontend/di.xml`, the plugin did nothing. The identical plugin in `etc/di.xml` worked straight away. That isn't a Magento rule. It was a race. In developer mode, the first process to rebuild the interception data decides it for everyone, and this store ran two cron containers and six queue consumers, all booting Magento in the global area all the time. A storefront-only plugin doesn't exist in the global area, so whenever one of them rebuilt first, the cached answer for everybody was "nothing to intercept here". Stopping cron and the consumers made the frontend version work on every request, which turned the guess into a mechanism.

None of that reaches production, where `setup:di:compile` works out every area up front. It's a developer-mode thing on a busy machine. It's also exactly the kind of thing that makes a correct change look broken on the day you're testing it.

## What it bought

With login narrowed to five sections, the request after a login went from 61,194 bytes to 611, and its median time from 251 ms to 184 ms. A hundred times fewer bytes, and about a quarter less time, because the startup floor is still there.

## It's a module now

The same day, the plugin turned into a module that does both halves properly: [section-policy](https://github.com/kingletas/magento2-module-section-policy). It reports first. One command lists every action that invalidates everything and what each section costs to produce on your store:

```bash
bin/magento kingletas:section-policy:report --measure
```

Then it narrows only the actions you name, by subtraction, so a section it has never heard of still refreshes. It refuses to drop `customer`, `cart` or `messages`, because which sections a login really changes is a product decision, and getting it wrong shows a signed-in shopper old data. Installed and left alone, it changes nothing.

The startup floor, the biggest number in all of this, is still untouched. Nothing here makes Magento boot faster.
