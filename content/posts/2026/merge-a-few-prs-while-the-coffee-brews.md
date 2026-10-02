---
title: "Merge a few PRs while the coffee brews"
date: 2026-10-02
draft: false
description: "A Friday short: one zsh line that merges pull requests across several repositories, the trap waiting in bash, and the fix when you merge the wrong one."
tags: ["zsh", "git", "github", "snippets"]
---

Ever wanted to merge a few PRs in one go while getting your coffee? Three repositories, three approved pull requests, and nobody wants to click through three browser tabs on a Friday.

One line:

```zsh
for pr in "bluetir 6" "kapelos 1" "solander 4"; do gh pr merge "${pr#* }" -R "kingletas/${pr% *}" --merge --delete-branch || print "left: $pr"; done
```

Hit enter, go get the coffee. When you're back, either everything merged, or the loop tells you exactly what it left behind.

## What each piece does

- **`"bluetir 6"`** is one pair: a repository and a pull request number, separated by a space. One string per pull request, so the list reads like a to-do list.
- **`${pr#* }`** keeps what comes after the first space: `6`. The `#` trims from the front, shortest match.
- **`${pr% *}`** keeps what comes before the last space: `bluetir`. The `%` trims from the back.
- **`gh pr merge 6 -R kingletas/bluetir --merge --delete-branch`** is what the loop actually runs: merge pull request 6 in that repository with a merge commit, then delete its branch.
- **`|| print "left: $pr"`** only runs when the merge fails: a check still running, a conflict, a review missing. It names the pair and the loop keeps going, so one stuck PR doesn't hold the other two hostage.

## The trap

`print` is a zsh builtin. Paste the same line into bash and one of two things happens. On some systems it's `command not found`. On others, like the Ubuntu box we tried it on, bash finds a different program called `print`, from the mailcap package, which tries to print `left: bluetir 6` as if it were a file and fails with `no such file`. Either way the `left:` line never shows up, and that was the one line you wanted. Same line, different shell, very different joke.

In bash, use `echo` instead:

```bash
for pr in "bluetir 6" "kapelos 1" "solander 4"; do gh pr merge "${pr#* }" -R "kingletas/${pr% *}" --merge --delete-branch || echo "left: $pr"; done
```

The `${pr#* }` and `${pr% *}` parts work the same in both.

## If you broke it, here's the fix

Merged the wrong one? There's no un-merge, but there is a way back. Open the merged pull request and click **Revert** near the bottom: GitHub opens a new pull request that undoes it, and you merge that one. Rather stay in the terminal? On the base branch, find the merge commit and revert it, keeping the first parent as the mainline:

```zsh
git revert -m 1 <merge-commit>
```

Either way you get a new commit that undoes the merge. And since the loop deleted the branch too, the same pull request page has a **Restore branch** button.

## Same shape, other jobs

Once the loop is in your fingers, it fits a lot of Friday chores:

```zsh
# Pull every repository you're about to work in, and hear about the ones that can't fast-forward
for r in bluetir kapelos solander; do git -C "$r" pull --ff-only || print "left: $r"; done

# Reindex a couple of Magento indexers and keep going if one fails
for i in catalog_product_price catalogsearch_fulltext; do bin/magento indexer:reindex "$i" || print "left: $i"; done

# Check that a few hosts answer on their ports
for hp in "vanilla.test 443" "mail.vanilla.test 443"; do nc -z "${hp% *}" "${hp#* }" || print "down: $hp"; done
```

That's all of it... now go get that coffee.
