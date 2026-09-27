#!/usr/bin/env bash
# Prints every post under a content folder whose front matter marks it a draft, one path per line.
# Only the front matter counts, so a post that mentions `draft: true` in its body is not a draft.
set -euo pipefail

content="${1:?usage: find-drafts.sh <content folder>}"

find "$content" -name '*.md' -type f -print0 | sort -z | while IFS= read -r -d '' post; do
    if awk '
        NR == 1 { if ($0 == "---") { fence = "---" } else if ($0 == "+++") { fence = "+++" } else { exit } ; next }
        $0 == fence { exit }
        { line = tolower($0) }
        line ~ /^draft[ \t]*[:=][ \t]*true[ \t]*$/ { found = 1; exit }
        END { exit !found }
    ' "$post"; then
        echo "$post"
    fi
done
