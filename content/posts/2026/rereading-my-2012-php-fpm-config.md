---
title: "How many PHP workers? Rereading my 2012 PHP-FPM config"
date: 2026-09-24
description: "My 2012 post shipped a PHP-FPM pool with max_children = 50 and no reason for 50. Here's how to size a pool from measurements instead, so it uses the machine without taking it down, and two things the 2012 config quietly got wrong."
tags: ["php", "php-fpm", "nginx", "performance"]
series: ["Rereading 2012"]
---

Nine days after the [Varnish post](/posts/2026/rereading-my-2012-varnish-post/), in July 2012, I wrote [PHP Offloading... Nginx helps so much!](/2012/07/php-offloading-nginx-helps-so-much.html). It explains why nginx beats Apache for Magento ("we are all about performance aren't we?"), then hands over an nginx server block and a PHP-FPM pool with "of course suggestions are welcome".

Fourteen years on, here are mine. The pool starts like this:

```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 50
pm.max_requests = 500
```

Fifty. The post never says where 50 came from, and that one number decides whether the box runs flat out or falls over. So this is mostly about how to pick it, with two things the rest of that config got quietly wrong along the way.

## What max_children actually caps

Each PHP-FPM worker handles one request at a time, and `pm.max_children` is the most workers the pool will ever run. That makes it a memory limit wearing a concurrency costume. Too high, and a burst of heavy requests allocates more memory than the machine has, the box swaps, and then the kernel starts killing things. Too low, and requests queue behind busy workers while RAM sits there doing nothing.

## Measure a worker, don't guess one

The number people reach for is `memory_limit` from `php.ini`. That's the ceiling for one request, not what a worker actually holds. Measure the live processes instead. This reads the resident memory of every FPM child, in megabytes:

```bash
ps -o rss= -C php-fpm8.4 | awk '{s+=$1; n++} END {printf "avg %.0f MB over %d children\n", s/n/1024, n}'
ps -o rss= -C php-fpm8.4 | sort -rn | head -1 | awk '{printf "peak %.0f MB\n", $1/1024}'
```

The process name depends on how PHP was installed: `php-fpm8.4` on Debian and Ubuntu packages, plain `php-fpm` in the official Docker image.

In a scratch pool, an idle worker sat at about 5 MB. Holding a 96 MB string, the same worker rose to about 104 MB. RSS overcounts, sometimes by a lot. Memory the workers share, like OPcache, shows up in every worker's figure once that worker has touched it. That errs on the safe side, which is the side you want to err on here.

Size on the **peak** a worker reaches under real traffic. Not the idle figure, and not the average. A pool sized on the average is fine right up until every worker gets a heavy request at the same moment, which is exactly when you need it to be fine.

## The arithmetic

Start from the memory the pool is allowed to use, not the machine's total. Take off the operating system, a database on the same box, Redis, and whatever else lives there. Divide what's left by a worker's peak:

```text
usable_ram      = total_ram - (OS + database + Redis + everything else)
pm.max_children = usable_ram / peak_rss_per_worker
```

With made-up numbers: a 16 GB box, 6 GB set aside for the OS and a Redis on the same machine, and a measured peak of 128 MB per worker.

```text
usable_ram      = 16384 MB - 6144 MB = 10240 MB
pm.max_children = 10240 MB / 128 MB   = 80 workers
```

That's the ceiling that uses the machine without burning it down. Re-measure the peak whenever you change the PHP version, the extensions or the application, because all three move it.

## static, dynamic or ondemand

`pm` decides when workers get created. Five slow requests at once against a pool capped at 3 showed the difference:

```text
dynamic  (start_servers 1):   at rest 1   during burst 2   after 1
ondemand (idle_timeout 3s):   at rest 0   during burst 3   after 1
```

- **static** keeps exactly `max_children` workers alive. Nothing forks during a request, and the memory is committed whether traffic comes or not. Right for a box that serves one busy application.
- **dynamic**, which is what 2012 used, keeps a few idle workers and forks more up to the ceiling as load rises. Set the start and spare counts around your normal load so a burst isn't waiting on forks. The 2012 pool's `max_spare_servers = 50` was the same as its ceiling, so once a burst had forked workers, the pool never shrank back down.
- **ondemand** starts with none and forks per request, retiring workers after `pm.process_idle_timeout`. Good for a box running lots of quiet sites, at the cost of a fork after every idle spell.

In every mode `max_children` is the hard ceiling, and the arithmetic sets it.

## What 2012 got right

The same pool had the three settings a production pool still wants:

```ini
pm.max_requests = 500
pm.status_path = /phpfpm-status
request_slowlog_timeout = 2m
slowlog = /var/log/php-fpm/www-slow.log
```

**`pm.max_requests`** retires a worker after that many requests and starts a fresh one, so a small leak in an extension can't grow until the box swaps. Set to 3 in a test pool, the worker PID changed every third request, which is how you know it's working.

**The status page** tells you whether the pool is the bottleneck. Five slow requests at once against a two-worker pool, in each mode, then the counters once it settled:

```text
static     max listen queue 3   max children reached 0
dynamic    max listen queue 4   max children reached 1
ondemand   max listen queue 3   max children reached 1
```

Every pool was too small, and the listen queue said so in every mode: requests sat waiting for a free worker. `max children reached` only counts the times FPM wanted to start another worker and wasn't allowed to, and a static pool never wants to, so there it stays at 0 however bad things get. Watch the listen queue first. Give the page an nginx location only you can reach, and know that a worker answers it, so on a pool that's fully busy the status page waits in the queue too.

**The slow log** writes a PHP stack trace for any request that runs past the threshold, so you find out what was running when the time went, not just that it went.

## What 2012 got wrong: the timeouts

Two different things can end a long request, and the order matters. PHP's own `max_execution_time` stops the script and logs a fatal error with the file and line. FPM's `request_terminate_timeout` kills the whole worker with a signal, so PHP never gets to say why.

The 2012 config sets them like this. In the nginx block:

```nginx
fastcgi_param  PHP_VALUE "max_execution_time = 18000";
```

and in the pool:

```ini
request_terminate_timeout = 5m
```

PHP was allowed five hours. FPM pulled the plug at five minutes. So every request that ran long died the uninformative way. Scaled down to a 2 second FPM limit and a script that burns 4 seconds of CPU, this is all you get:

```text
HTTP 502
WARNING: [pool www] child 7, script '/www/burn.php' (request: "GET /burn.php") execution timed out (2.022937 sec), terminating
WARNING: [pool www] child 7 exited on signal 15 (SIGTERM) after 4.001874 seconds from start
```

A 502 for the customer, and a log line saying which script, but not where in it. Keep `request_terminate_timeout` well above `max_execution_time`, so PHP's error fires first and tells you something useful. Keep the FPM timeout anyway as a backstop. On Linux `max_execution_time` counts CPU time, so a script waiting on the database or `sleep()` can run straight past it.

## And the memory limit that never applied

Right above that timeout line, the 2012 block also does this:

```nginx
fastcgi_param  PHP_VALUE "memory_limit = 341M";
fastcgi_param  PHP_VALUE "max_execution_time = 18000";
```

Two `PHP_VALUE` params with the same name, and the second one wins. Running exactly those two lines against PHP-FPM 8.4, a page printing both settings said:

```text
memory_limit=128M max_execution_time=18000
```

The 341M never arrived. PHP ran on whatever `php.ini` said, 128M in this test, and nothing warned anybody. If you need several settings through nginx, send them in one param, separated by a newline. The same test with this printed `memory_limit=341M max_execution_time=300`:

```nginx
fastcgi_param  PHP_VALUE "memory_limit=341M
max_execution_time=300";
```

Or better, put them in the pool config with `php_value[memory_limit] = 341M`, where you can see them next to the pool they belong to. The 2012 pool already does this for `error_log`.

The post doesn't say where 341 came from either.

## The pool, fourteen years later

Fourteen years later, the same pool looks like this. It's a whole pool file, with Debian's package names and paths:

```ini
[www]
user         = www-data
group        = www-data
listen       = /run/php/php8.4-fpm.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic
pm.max_children      = 80          ; from the arithmetic, re-measured per release
pm.start_servers     = 16
pm.min_spare_servers = 8
pm.max_spare_servers = 24
pm.max_requests      = 500         ; recycle to bound leaks
pm.status_path       = /fpm-status
slowlog                   = /var/log/php8.4-fpm.slow.log
request_slowlog_timeout   = 5s
request_terminate_timeout = 600s   ; above max_execution_time, so PHP's error fires first
```

The 80 is the made-up box from above. Yours comes from `ps`.

The same 2012 server block has one more thing I'd change, and it's not about performance: its PHP location will run any `.php` file it can find, including one somebody uploaded. That's the next post.
