---
title: "The maintenance window was the bigger outage"
date: 2026-09-30
description: "Our Magento deploy playbook takes a maintenance window whenever a release has database work to do. We ran a three-node lab to test whether the window is the smaller outage for a release that breaks the schema. It wasn't: 1,266 requests refused in 318 seconds behind maintenance mode, 16 in 6 seconds rolled out."
tags: ["magento", "deployment", "reliability", "testing"]
---

We wanted to know what a maintenance window really costs a Magento store, against the alternative. Our deploy playbook takes one whenever a release has database work to do: every web server switches to the new code at once, the store shows its maintenance page while `setup:upgrade` runs, and then it comes back.

The alternative is harder than it sounds. A rolling release, a canary or a zero-downtime deploy all need two versions of the code serving from one database at the same time, and Magento pushes back on that in three layers. It refuses pages when a module's version doesn't match the database. It refuses requests when the deployed configuration doesn't match the imported one. And nothing at all protects a query that meets a schema it doesn't match. A flag, `deployment/blue_green/enabled`, switches off the first two. Nothing switches off the third.

## A run only counts if there's something to reconcile

The issue that set up these runs quotes me: "ZDTD works when there's [nothing] to reconcile." A zero-downtime deploy of a release that changes no schema passes by construction, so it tells you nothing about the releases that matter.

So before anything ran, we fixed what a run needed to count. It had to have at least two databases, replicating the whole time, and three or more web servers sharing one cache. And every run claiming zero downtime had to cross a release that changes the schema. A release that only adds a column shows what normal looks like, but it proves nothing. The one that matters renames a column the old code still reads.

We wrote five claims down beforehand too, each one a statement the runs could prove false. One of them is the case for the window itself: **maintenance mode is the smaller outage for a release that breaks the schema.**

## The lab

One host running containers: three web nodes behind HAProxy, one shared Valkey, a MariaDB 11.4 primary with one replica following it, and Magento Open Source 2.4.8-p2 on PHP 8.4. One node always carries the new release, and the others stay on the old code. Five runs, all from one commit of the runner, `bin/zdt-arm` in the playbook's repository.

## Maintenance mode lost

For the breaking release, we ran it twice from the same database snapshot: once rolled out with the old code still serving, and once behind maintenance mode.

Rolled out, 16 requests failed, over 6 seconds. Pages, categories, products and the cart failed while the old servers met the renamed column. REST and GraphQL never failed.

Behind maintenance mode, 1,266 requests failed, over 318 seconds. That's 83% of everything sent during that run, every kind of request, which is exactly what a maintenance page is for.

The claim was false. For this release, on this lab, the window was the bigger outage by a long way.

The rollout's number is small for a reason, though. This lab's breaking release reads the renamed column from one route. A release whose changed column sits behind more routes breaks more of them.

## Where the refusals came from

With the flag on, the old servers served the additive release without complaint, and across the breaking one, the first failure an old server showed named exactly what had changed:

```text
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'lab_zdt_probe.probe_value' in 'SELECT'
```

Across the releases that only added to the schema, the old servers refused nothing. Every refusal came from the node carrying the new code. Between the moment it started serving the new release and the moment `setup:upgrade` finished, it answered *Please upgrade your database*. Through the load balancer, that reached customers: 13 of 172 requests and 13 of 136 in the two runs whose release added a table, and 12 of 179 in the one whose release added a column.

So we ran the additive release once more, with that node taken out of the load balancer before its release landed, and put back once it answered 200 again. Of the 310 requests that went through the load balancer in that run, none was refused. That run isn't one of the ones the issue asked for, and the results say so.

## What it couldn't tell us

- **Mage-OS and Adobe Commerce weren't run.** The lab is Open Source only, and we hold no Commerce licence, so nothing read the replica the way Commerce can.
- **Replication survived every migration, but the table the runs checksummed wasn't the one the releases changed.** The replica reported no errors. A checksum of the changed table would have been stronger, and we don't have it.
- **The lab is one host.** The node running `setup:upgrade` hit its memory limit 46,683 times during these runs, against about 7,300 for each of the others. A host with more room may stall less.
- **The health check never noticed.** By the standard fixed beforehand, it answered 200 on every server that was refusing pages. HAProxy still took the migrating node out of rotation for up to 20 seconds in three runs, because its checks were slow while the node migrated. The results report both readings.

## Where it stands

The playbook still takes the window. It doesn't roll out behind a serving old release, and it doesn't take a node out of the load balancer: every host flips at once. Its README now says what that costs, measured, and that the usual answer to a rename, not measured here, is two steps: add the new column, then drop the old one a release later.

The full results are in the [playbook's repository](https://github.com/kingletas/magento-deploy-playbook/blob/main/docs/results/2026-09-30-open-source.md). The raw output of all five runs is here, unedited: [zdt-fleet-2026-09-30-open-source.tar.gz](/files/zdt-fleet-2026-09-30-open-source.tar.gz), 58 KB. Its SHA-256 is:

```text
07061f5b4254e090e6da3af3ff5d25cdd4aea7ed73567897f1cc10502bb55421
```

Check it with `sha256sum` before you read it.
