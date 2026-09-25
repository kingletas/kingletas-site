---
title: "Rereading my 2012 Varnish post"
date: 2026-09-24
description: "In July 2012 I wrote up how I put Varnish in front of Magento. Some of it held up. One line in it lets anyone who can reach Varnish empty the cache."
tags: ["varnish", "magento", "caching"]
series: ["Rereading 2012"]
---

In July 2012 I wrote a post called [Varnish implementation hints and good to know](/2012/07/varnish-implementation-hints-and-good.html). It opens with "Sharing knowledge is always a good idea," and then shares, in order: a set of bash aliases that switch Varnish on and off with iptables, a header that tells PHP whether Varnish is in front, a cookie-stripping regex, a one-line purge, and what it calls "a favorite of mine", a function that walks every URL in the sitemap so you can clear them all.

That post is still up at its old address. Reading it now, the instincts mostly hold. The mechanics mostly don't. And one line is a problem.

## The line

Here's how the post clears a page:

```
curl -X PURGE URL_TO_CLEAN
```

That works. It works for anybody. `PURGE` isn't a standard HTTP method, it's a name the VCL agrees to handle, and nothing in HTTP says who's allowed to send it. The post never mentions checking. Without a check, anyone who can reach Varnish can throw away your cached pages one URL at a time, and every visitor after that is a miss that lands on PHP.

It takes one small VCL to see it. With a `PURGE` handler and no check, from outside:

```text
X-Cache: MISS
X-Cache: HIT
200
X-Cache: MISS
```

The page was cached, an outside request purged it, and the next visitor paid for a fresh render. Loop that over a sitemap and you've emptied the cache.

The fix is an ACL, a named list of addresses, and a check on `client.ip`:

```vcl
acl purge {
    "localhost";
    "127.0.0.1";
}

sub vcl_recv {
    if (req.method == "PURGE") {
        if (client.ip !~ purge) {
            return (synth(405, "Method not allowed"));
        }
        return (purge);
    }
}
```

Same requests again:

```text
X-Cache: MISS
X-Cache: HIT
405
X-Cache: HIT
```

Two things go wrong with this in practice. The list has to hold whatever actually sends purges, which for Magento is the application servers. Put the load balancer on it and you've let everyone in, because behind a load balancer `client.ip` is the load balancer for every visitor. And don't check `X-Forwarded-For` instead, because the client writes that header. With the ACL checked against it, a plain `PURGE` got a 405 and the same request with `-H 'X-Forwarded-For: 127.0.0.1'` got a 200.

## The favourite aged worst

The trick the old post liked best was clearing everything: collect every category, product and CMS URL from Magento's sitemap collections, add the popular searches and the home page, and purge each one. It even cached the list of URLs.

Magento 2 made all of that bookkeeping unnecessary. Every page it renders carries an `X-Magento-Tags` header naming what's on it, like `cat_p_1` for product 1 and `cat_c_10` for category 10. Save product 1 and Magento sends one `PURGE` with a tag pattern, and its VCL turns that into a ban on every cached object carrying the tag. The pages that show product 1 go. Nothing else does, and nobody has to know which URLs those were.

There's one catch worth knowing. The VCL Magento 2.4 generates for Varnish 7 answers `200 Purged` even when the ban pattern is broken and nothing was banned. The only trace is a `VCL_Error` line in `varnishlog`. So check a purge by requesting the page and reading the cache header, not by trusting the reply.

## The cookie regex was guarding something real

The old post strips every cookie except Magento's `frontend` one, with four `regsuball` lines, then hands the survivor to PHP in a custom header. Get that slightly wrong and you either cache nothing or serve one visitor's page to another.

Magento 2 turns the whole thing into one input. The application sets an `X-Magento-Vary` cookie holding what legitimately changes a shared page, like store and customer group, and `vcl_hash` adds only that to the cache key. Anything truly per visitor, like the cart and checkout, is passed straight to the backend and never cached. The rule the regex was reaching for is the same one: everything that changes the page goes in the key, and nothing else does.

## What held up

The iptables aliases look clumsy now, but the reason for them was right. "If something were to go wrong I can immediately turn varnish off and test the web server alone." Keeping a way around the cache, for debugging and for measuring the backend cold, still matters.

The `X-Varnish-On` header was a hand-built version of something Magento now does itself: a block with a TTL becomes an `<esi:include>`, and Varnish fetches the fragment on its own schedule.

## What it didn't have

The 2012 setup had no grace: nothing kept an expired page around. With grace set, Varnish serves the stale copy while it fetches a fresh one, or while the backend is down, so an outage turns into slightly old pages rather than error pages. Magento's generated VCL sets it.

Next in this series is the post I wrote nine days after this one, about nginx and PHP-FPM. It has a `pm.max_children = 50` in it, and the post never says where 50 came from.
