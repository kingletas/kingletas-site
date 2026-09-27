#!/usr/bin/env bash
# Starts a draft post in a folder outside this repository, from the site's own archetype.
# Drafts live outside the repository until they are cleared to publish, because a draft
# committed here is public in the repository even though the site never builds it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
name="${1:-}"
drafts="${2:-}"
if [[ -z "$name" || -z "$drafts" ]]; then
    echo "usage: make post name=<slug> DRAFTS=<folder outside this repository>"
    echo "  make post name=varnish-in-2026 DRAFTS=~/drafts"
    exit 2
fi
[[ -d "$drafts" ]] || { echo "no such folder: $drafts" >&2; exit 2; }
case "$(cd "$drafts" && pwd)/" in
    "$ROOT"/*) echo "DRAFTS is inside this repository; drafts live outside it" >&2; exit 2 ;;
esac

post="$drafts/$name.md"
[[ -e "$post" ]] && { echo "already exists: $post" >&2; exit 2; }
title="$(echo "$name" | tr '-' ' ' | awk '{ for (i = 1; i <= NF; i++) $i = toupper(substr($i, 1, 1)) substr($i, 2); print }')"
# The archetype's own front matter, with its two template lines filled in here.
awk -v title="$title" -v date="$(date +%Y-%m-%dT%H:%M:%S%:z)" '
    /^title:/ { print "title: \"" title "\""; next }
    /^date:/  { print "date: " date; next }
    { print }
' "$ROOT/archetypes/default.md" > "$post"
echo "$post"
echo "Preview it with: make preview DRAFT=$post"
