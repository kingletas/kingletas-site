---
title: "Two loops waiting for themselves"
date: 2026-09-24
description: "Two background waits ran for 94 minutes on an install that had finished at roughly minute four. Each one was waiting for its own exit, the command used to look for them hid them, and the first fix hung the same way."
tags: ["bash", "linux", "tooling"]
---

"are these tasks still running?"

I asked that on 2 September, about two background jobs Claude had started, which had been sitting at "Running" for 94 minutes. They were waiting for a Flatpak SDK to finish installing. It had finished at about the four-minute mark. Nothing had failed.

## They were waiting for themselves

Both loops tested for the install with `pgrep -f "flatpak install"`, and were written to stop once nothing matched. `pgrep -f` searches the whole command line of every process. It leaves itself out of the results, but not the shell that called it, and that shell's command line held the entire loop. So each loop found itself, and each found the other. They were waiting for their own exit.

It takes a few lines to see. Nothing called `backup-job` is running here, and `timeout` is the only reason this ends:

```text
$ timeout 5 bash -c 'until ! pgrep -f "backup-job" >/dev/null; do sleep 1; done; echo "backup finished"'
$ echo $?
124
```

This happens whenever a loop runs as a string handed to a shell: `bash -c`, a command over `ssh`, a cron entry, a `make` recipe.

Claude's first explanation was wrong. It blamed the second loop's other condition as well, a `flatpak list --user` that it thought was looking in the wrong place. The SDK was in user scope, so that condition had been met all along. The self-match was the whole story.

## The search for them hid them

The first check for the stuck processes went through the usual idiom, `ps | grep` with `grep -v grep` to drop the search itself from its own results.

`grep -v grep` removes every line containing the text "grep". Both loops were running `pgrep`. So the filter deleted exactly the two processes it was looking for, and the empty result read as "nothing is running":

```text
$ ps -eo pid,args | grep backup-job | grep -v grep
$ echo "found: $?"
found: 1
```

The loop was running the whole time.

## The first fix hung too

The obvious fix is to leave out yourself and your ancestors. Recent `pgrep` has `-A` for exactly that, and it does fix the loop:

```text
$ timeout 5 bash -c 'until ! pgrep -A -f "backup-job" >/dev/null; do sleep 1; done; echo "backup finished"'
backup finished
```

Our first fix left out itself and its ancestors, and it still hung. A script forks copies of itself for subshells, piping into a `while` loop for one, and each copy keeps the script's command line. A copy is a child, not an ancestor, so leaving out ancestors never removes it:

```text
$ ./watch-backup-job
match: 1214714 bash ./watch-backup-job
```

Nothing called `backup-job` is running, and the script found one anyway: its own subshell. It showed up only when we ran the quiet case, with nothing to find.

What works is deciding by process ID instead of text. If you started the process, keep `$!` and `wait` on it. If you didn't, run `pgrep -A` on its own into a variable, and loop over the saved result rather than a pipe, so no forked copy is alive while it looks.

## Every wait gets a deadline

The self-match was the cause. What made it cost 94 minutes instead of ten was that the loops had no way to fail. A wait with no deadline only ends when its condition comes true. If the condition is wrong, whether that's a typo, the wrong process or a filter that finds itself, it waits forever and looks busy doing it.

So now a wait has a deadline, ten minutes unless you say otherwise. Waiting forever has to be asked for out loud. And there's a way to check the condition once, without waiting, before anything goes into the background. Both waits would have shown their problem in a second that way: the condition they were waiting for was already true.

The shell version is short:

```bash
# Runs a command until it succeeds, giving up after a total deadline in seconds.
# Each attempt is capped at 5 seconds, so one hung attempt cannot outlive the deadline.
wait_for() {
    local deadline=$1
    shift
    local end=$((SECONDS + deadline))
    until timeout 5 "$@"; do
        if [ "$SECONDS" -ge "$end" ]; then
            echo "wait_for: gave up after ${deadline}s waiting for: $*" >&2
            return 1
        fi
        sleep 1
    done
}
```

The limit on each attempt matters as much as the deadline. The deadline is only checked between attempts, so one `curl` to a server that never answers would otherwise never get back round to the check.

## What it doesn't fix

There's a lint rule now that refuses `pgrep` in a wait loop, and another that refuses `grep -v grep`, in the tool scripts we commit. Neither would have caught this one. The two loops were typed on the spot and put in the background, and no gate sees a command that was never saved anywhere.
