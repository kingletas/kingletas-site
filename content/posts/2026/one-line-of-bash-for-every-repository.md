---
title: "One line of bash for every repository"
date: 2026-10-02
draft: false
description: "A short: install a git hook in every repository on a list with one bash loop, why the escaped $HOME is the fun part, and the pipe that quietly counts nothing in bash."
tags: ["bash", "zsh", "git", "snippets"]
---

We keep one plain text file that lists every repository we gate, one path per line. Then we needed a new hook in all of them. You don't need a full programming language, or to do it by hand. Plain ol' bash does it in one line:

```bash
while read -r r; do install-hooks "$r"; done < <(grep -vE '^[[:space:]]*(#|$)' repos.txt | sed "s|\$HOME|$HOME|; s|^~|$HOME|")
```

`install-hooks` stands in for whatever installs your hook. Ours is our commit gate's own install command.

## What each piece does

- **`grep -vE '^[[:space:]]*(#|$)'`** drops comments and blank lines, even comments with spaces in front of them. The file can explain itself and the loop never sees it.
- **`sed "s|\$HOME|$HOME|; s|^~|$HOME|"`** is the fun part. The list says `$HOME/code/shop` or `~/code/blog`, and a text file is just text: nothing expands those. So the first `\$HOME` is escaped, and sed gets the literal word `$HOME` to look for. The second `$HOME` isn't, so the shell swaps in your real home folder before sed even starts. Same word, twice, two different meanings.
- **`while read -r r`** reads one line at a time. The `-r` keeps backslashes as they are instead of eating them.
- **`< <( ... )`** is process substitution: the loop reads from a command without a pipe in front of it. Hold that thought.
- **`"$r"`** keeps its quotes. One of our test paths had a space in it, `shop api`, and without the quotes bash hands the install two arguments, `shop` and `api`.

## The trap

Why `< <( )` and not `grep ... | while read`? Because in bash every part of a pipe runs in a subshell, the loop included, and anything the loop sets dies with it. We counted our test list both ways:

```bash
n=0; grep -vE '^[[:space:]]*(#|$)' repos.txt | while read -r r; do n=$((n+1)); done; echo "$n"
n=0; while read -r r; do n=$((n+1)); done < <(grep -vE '^[[:space:]]*(#|$)' repos.txt); echo "$n"
```

Bash printed 0 for the pipe and 3 for the process substitution. zsh runs the last part of a pipe in the current shell, so it printed 3 both times... which is exactly why it gets you. It works in your zsh and quietly counts nothing in your teammate's bash.

Here the loop doesn't set anything, so the pipe would have worked today. Add a counter and it wouldn't.

## If you broke it, here's the fix

Want to know which repositories actually got the hook? Same shape, different job:

```bash
while read -r r; do [ -x "$r/.git/hooks/commit-msg" ] || echo "missing: $r"; done < <(grep -vE '^[[:space:]]*(#|$)' repos.txt | sed "s|\$HOME|$HOME|; s|^~|$HOME|")
```

And if it landed somewhere it shouldn't have, a hook is just a file. Delete it from that repository's `.git/hooks/` and it's gone.

One list, one line, and every repository on it has its hook.
