---
title: "The dry run that checked nothing"
date: 2026-09-24
description: "A script for keeping GitHub repositories on the same settings said everything was fine when it had checked nothing. It did it three different ways in four days, and one of those causes is still a best guess."
tags: ["bash", "testing", "tooling"]
---

On 7 September we wrote a script to bring every repository on our GitHub account to the same settings: branch protection, secret scanning, the files a public repository should have. It had a dry-run flag. Run with it, the script said:

```text
every repository in scope already conforms
```

It had checked none of them.

## getopts stops at the first word

The script took a subcommand and then flags: `apply -n`. It parsed the flags with `getopts`, bash's built-in option parser, which reads arguments from the front and stops at the first one that doesn't start with a dash. The first argument was `apply`. So `getopts` stopped there and never saw `-n`.

That left `-n` sitting in the list of repository names to filter on. No repository is called `-n`, so the filter selected nothing, the list of problems came back empty, and an empty list printed as a clean bill of health.

A cut-down version shows it in two runs:

```text
$ ./repo-settings -n apply
command=apply dry_run=1 filter=()
$ ./repo-settings apply -n
command=apply dry_run=0 filter=(-n)
```

The fix is to take the subcommand off the front before parsing flags, and to treat any leftover word starting with a dash as a mistake rather than a name:

```bash
command=${1:-}
if [ $# -gt 0 ]; then
    shift
fi

while getopts ny opt; do
    case "$opt" in
        n) dry_run=1 ;;
        y) assume_yes=1 ;;
        *) exit 2 ;;
    esac
done
shift $((OPTIND - 1))

for arg in "$@"; do
    case "$arg" in
        -*) echo "repo-settings: flags go before repository names: $arg" >&2; exit 2 ;;
    esac
done
```

That would have been a tidy little post on its own. It wasn't the end of the day.

## Three more the same day

**The prompt died without saying anything.** The script asks before it changes anything. Run with no terminal attached, `read -p` prints no prompt, hits the end of its input, returns 1, and `set -e` ends the script. It printed nothing and exited. It now checks `[ -t 0 ]` first, and says to pass `-y` if there's nobody to ask.

**The check timed out part way through, and the repositories it never reached came back clean.** It made eight separate calls per repository to see whether files existed, so a full run ran out of time. Everything after that point was never asked about, and it was reported exactly like everything that passed. It reads each repository's file tree once now.

**`-q` was accepted and ignored.** The slow half of the check ran in parallel jobs, and each job was a separate process parsing its own arguments. A flag set in the parent reached none of them.

That was the third time in one day a flag had been swallowed.

We fixed them. Three days later it did it again.

## 10 September

Eight public repositories needed a branch ruleset and secret scanning. A dry run with all eight names said they were fine. The same command with one, two or three of those names gave the right plan. It did this reproducibly, several minutes apart.

The obvious suspect was the number of names, and that turned out to be wrong. A test double with ten repositories that all needed settings planned all ten correctly. Working through the code, only one thing could print that message for repositories that had no ruleset: zero rows reaching the loop. A read that failed for one repository still printed a line, so it couldn't produce silence.

There were two ways to get zero rows. Listing the account happened inside a process substitution, and nothing checks a process substitution's exit status, so a failed listing looked like an empty account. And the names could have matched nothing.

Our best guess is the second, and the reason is the shell. Bash splits an unquoted variable into words. zsh doesn't:

```text
$ zsh -c 'names="shop blog site"; printf "[%s]\n" $names'
[shop blog site]
$ bash -c 'names="shop blog site"; printf "[%s]\n" $names'
[shop]
[blog]
[site]
```

Run from zsh as `apply -n $names`, the script receives one argument with spaces in it. No repository has that name, and back then a name that matched nothing still meant "all clear".

It's still a guess. Nobody saved the exact command that was run, so we can't prove it.

## Making "I couldn't tell" say so

The real change was to what the script is allowed to say. Every read from GitHub now goes through one helper that never hands back an empty answer on failure, because an empty answer is what every caller takes to mean "nothing wrong". A setting it couldn't read prints as unverified, and the run exits 1:

```text
pub03
  protect main: deletion non_fast_forward
  UNVERIFIED: cannot read the security settings (error connecting to api.github.com)
```

A name that doesn't exist, several names arriving as one word, and a failed listing all stop the run with exit status 2.

Putting that in turned up a few more of the same shape. A file tree that couldn't be read used to report every required file as missing, eleven wrong findings in one go. Now it's one finding that says the tree couldn't be read. And a filter meant to hide the tool's own framing lines was deleting every line containing "repositor", which quietly took out the one telling you a private repository needs a paid plan.

## The missing test case

Every one of these bugs had the same outline. The script could tell a good repository from a bad one perfectly well. What it couldn't tell apart was "I checked and found nothing" and "I checked nothing".

A test suite usually covers one of those. You write a check from a bad example and watch it fire, or you run it on something healthy and watch it stay green. The script would have passed both. What it needed was a third case: hand it a name that doesn't exist and expect a refusal. Run against the old code, that test fails.

We still don't know which of the two causes it was on 10 September. Both of them now stop the run with an error.
