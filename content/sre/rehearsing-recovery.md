---
title: "Rehearsing recovery on a laptop"
description: "Five disaster-recovery rehearsals for a store's database, run on a laptop against invented orders: what each one breaks, what it proves, and how it fails when the recovery is wrong."
ShowReadingTime: false
ShowPostNavLinks: false
hideMeta: true
ShowToc: true
TocOpen: false
---

These five rehearsals recover an online store's database from five kinds of trouble: bad data, a lost region, a failing database or cache, a break-in, and a team under pressure. Each one runs on a laptop, against a local emulator of AWS, and every one that needs a store gives it invented orders and customers.

A recovery procedure nobody has run is a guess, and the outage is the worst time to find out. So each rehearsal breaks something on purpose, follows the recovery steps, and then checks the data itself. **If the recovery went wrong, the rehearsal fails and says why.**

You don't need to know any SRE to follow along. Each section says what breaks, the steps, what a pass proves and what it can't, and what the rehearsal caught. Open **What you'd see** under each one for what a passing and a failing run report.

## Four rules every rehearsal follows

1. **Check the data, not the status.** The emulator reported a stopped database as "available", and after an unplanned failover its API changed while the databases underneath didn't. Every check asks the database, or the program using it, what it actually sees.
2. **Run it both ways.** Each rehearsal is run once done right, where every check must pass, and once with a deliberate mistake, where the checks must fail. A check that can't fail proves nothing.
3. **Say what it can't prove.** The emulator runs real database software, so every SQL step is real, but it doesn't run all of the cloud's managed features, and its timings say nothing about a real system. Each section lists what only a real account can show.
4. **Leave nothing behind.** Each rehearsal deletes what it built, including when it's stopped halfway.

## 1. Restoring after bad data

**What breaks:** a mistaken update rewrites every order it touches. The database stays up and nothing alarms. The data is simply wrong.

**The steps:**

1. Create a set of invented orders.
2. Take a logical backup.
3. Run the damaging update.
4. Restore the backup into a **second** database, never over the live one.
5. Replay the database's change log from the backup up to the moment before the damage.
6. List the orders the restore would lose: the ones placed after the damage.
7. Copy the repaired rows back to the live database.

**What a pass proves:** the order of the steps, the replay, and that you can find the orders a restore loses. **What it can't:** anything about the cloud's own point-in-time restore or restore from a snapshot, which the emulator doesn't implement, or how long a real restore takes.

**What it caught:**

| Trap | Why it matters on a real restore |
|---|---|
| The tool that replays the change log reads its stop time in the time zone of the machine running it | The first run replayed straight past the damage and restored it. Nothing looked wrong until the checks compared the data |
| A personal database settings file can change which user you log in as | The rehearsal reads only its own settings file |
| On a managed database, the change log can only be read over the network | The rehearsal reads it the same way, so the step it practises is the one you'd run |

{{< seen >}}
These are examples, described rather than copied from a terminal.

- **A pass:** every check passes, the restored data is what it was before the damage, and the run exits 0.
- **A fail:** the same run with the replay stopped at the wrong time. Every check fails, because the restore brought the damage back, and the run exits 1.
{{< /seen >}}

## 2. Moving the database to another region

**What breaks:** the region the store runs in, or a planned move out of it.

**The steps:**

1. Build a database that replicates to a second region, with a real MySQL server in each.
2. Build the pilot light the recovery plan assumes in the second region: the database password copied there, an encryption key that works in both regions, and a private DNS name for the writer that points at the primary.
3. Switch the writer to the second region.
4. Check the databases themselves: which one accepts writes, which one is read-only, and that replication now runs the other way.
5. Switch back, and check again.

**What a pass proves:** a planned switchover moves the writer, the read-only flags and the replication, in both directions, and the pilot light is in place. **What it can't:** search, message queues, shared file systems, auto scaling and load balancers accept the calls on the emulator and start nothing. Copying server images and the cloud's recovery controller aren't implemented, and the DNS records are stored but were never tested resolving.

**What it caught:** an unplanned failover, the kind you'd run when the first region is simply gone, changed the emulator's API and nothing else, even half a minute later. That's the emulator, not the procedure. It's also why every check asks each database whether it's read-only instead of trusting the API, and it's worth checking on a real account too.

{{< seen >}}
These are examples, described rather than copied from a terminal.

- **A pass:** every check passes on the planned switchover, there and back.
- **A fail:** the unplanned failover fails, because the databases don't follow the API on the emulator. The rehearsal reports that instead of passing on the API's word.
- **Stopped partway:** everything it built is deleted.
{{< /seen >}}

## 3. Breaking things on purpose, with a stop button

**What breaks:** the database, and then the cache, are taken away while a program is using them. This is a fault-injection experiment: you cause a failure under watch, to learn whether anyone notices and whether the system recovers.

**The setup:** a probe talks to a real MySQL database and a real Valkey cache once a second. Its error count feeds an alarm, and that alarm is the experiment's stop condition. When it fires, the experiment ends early.

| Experiment | What must happen |
|---|---|
| Pre-check | The stop condition sees an alarm forced on, and the alarm clears once data arrives |
| The database writer fails over | The stop condition **stays quiet** and the experiment runs its full length |
| The database is lost | The probe sees it, the alarm **fires**, the experiment ends early, recovery holds for three seconds, and the alarm clears |
| The cache is lost | The same, for the cache |

**Why four experiments:** the failover tests the quiet path and the two losses test the loud one, so a stop condition that always fires, or never fires, fails the rehearsal.

**What a pass proves:** the stop condition watches the right thing and ends the experiment when it should, and recovery holds. **What it can't:** the emulator has no fault-injection service, so stopping a container stands in for the experiment's action.

**What it caught:**

- **The emulator's API reported the stopped database and the stopped cache as "available".** A stop condition has to watch what the application sees, never the control plane. That's why the alarm is fed by the probe.
- **A real writer failover means errors for a while.** Here both database instances share one container, so the failover is quiet. On AWS, reads and writes to the instance being failed over fail until it's done (other readers keep serving), and [AWS's documentation on Aurora high availability](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html) says service is "typically restored in less than 60 seconds, and often less than 30 seconds". The alarm's threshold has to allow for up to about a minute of errors.

{{< seen >}}
These are examples, described rather than copied from a terminal.

- **A pass:** every check passes. The quiet experiment runs its full length and the two outages each end early and recover.
- **A fail:** the same run with a stop condition that can't fire. Both outage experiments fail, and the run exits 1.
{{< /seen >}}

## 4. Recovering from a break-in

**What breaks:** someone gets into the store. The recovery rests on two things: a backup the attacker can't reach, and a rebuild from before the break-in.

**The setup:** three separate accounts. One for production, one for backups that production can't see, and a clean one to rebuild into.

| Step | What must happen |
|---|---|
| Before | Production can't see the backup account, and the detection queries find nothing on a clean store |
| The break-in | An admin user is added, a script goes into the site's footer, a payment method is switched on, and a new cloud user appears. The backup survives a delete from production, a delete with the backup account's own credentials, and an overwrite |
| Detect and contain | The queries find the admin user and both changed settings, the account listing finds the attacker's user, and its key is switched off |
| Evidence | The broken-into database is copied into a locked evidence store, with the attacker's user in it |
| Rebuild | The backup taken **before** the earliest sign of the break-in is restored into the clean account: no attacker, no changed settings, no script, and every order |
| Rotate | The rebuilt database refuses the old password, and the new one reaches the second region with the old one kept as the previous version |

**What a pass proves:** the backup survives the attacker, the detection queries find what was changed, and the rebuild comes back clean. **What it can't:**

- **Containment.** The emulator accepts any credentials, so a switched-off key keeps working. Only a real account proves the attacker is locked out.
- **An audit trail.** Nothing records the attacker's calls here, so the only evidence is the database copy.
- **The cloud's own backup lock and cross-account copies.** A storage bucket with a compliance-mode lock stands in, and like the real thing its retention can't be shortened.
- **Account separation.** Here it's the emulator keeping accounts apart, not an organisation-wide policy.

**What it caught:** a compliance lock can't be shortened, so keep it short. A one-day default on the whole bucket would leave behind, on every run, a bucket nobody can delete for a day, so the rehearsal locks each backup for minutes and waits them out.

{{< seen >}}
These are examples, described rather than copied from a terminal.

- **A pass:** every check passes, from the backup surviving to the old password being refused.
- **A fail:** the rebuild changed to restore the broken-into copy instead of the backup. It fails on the attacker's admin user, the changed settings and the script.
{{< /seen >}}

## 5. A game day: testing the people

The other four rehearse a procedure. A game day tests people, and a script that played the responders would only be testing itself. So the tool runs the exercise, and judges only what it can judge honestly: the state of the database at the end.

**Two ways to run one:**

- **Around a table.** No environment at all. Prepared messages arrive on a schedule, each at a set minute and from a named role, and the scribe keeps a log. Nothing is graded, because the outcome of a conversation isn't something a tool can check.
- **Live.** A store database with invented orders, a nightly backup, and customers who keep placing orders throughout. The facilitator reads out a brief, then a "clean-up job" cancels every order and the clock starts. The responders don't know what happened.

| Check | Fails when |
|---|---|
| No order from before the damage is still canceled | The repair missed rows, or never happened |
| No order placed during the game day is missing | **They restored last night's backup over the store.** That clears the cancellations and loses every order since, which is the mistake this scenario exists to catch |
| The responders declared an incident | Nobody did |
| It was repaired within the recovery-time target | It took longer |

**What it can't do:** time to detect is whatever the facilitator records, so it's as accurate as the person keeping it. And only this one scenario runs live; the others need a real store, a staging copy or a recovery account.

{{< seen >}}
These are examples, described rather than copied from a terminal.

- **A pass:** a correct repair passes every check.
- **A fail:** restoring the backup over the store fails, with the orders placed during the game day missing.
- **Stopped partway:** the run still writes its record, and deletes the store.
{{< /seen >}}

## Running your own

1. **Start with the restore.** It needs only a database, and it answers the question every backup raises: does the data come back right?
2. **Write down what your emulator can't do** before you trust a pass.
3. **Run every rehearsal both ways.** Make it fail on purpose at least once.
4. **Make it clean up after itself**, even when it's stopped halfway.
5. **Then rehearse on a real account.** An emulator is where you learn the steps. A real account is where you learn the timings.

For what to do in the first minutes of a real incident, see [the first fifteen minutes](../first-fifteen-minutes/).
