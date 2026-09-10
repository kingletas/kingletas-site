#!/usr/bin/env bash
# Builds the site with warnings as errors, then checks the old blog addresses and the theme overrides.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="$ROOT/themes/PaperMod/layouts"
OVERRIDES=(baseof.html rss.xml _partials/templates/opengraph.html)

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
fail=0

[[ -d "$THEME" ]] || { echo "the theme is missing; run make setup"; exit 1; }

hugo --source "$ROOT" --gc --minify --panicOnWarning --quiet --destination "$out"

# Every address the Blogger site served for a kept post must still be a page.
while IFS= read -r path; do
    [[ -z "$path" || "$path" == \#* ]] && continue
    if [[ ! -f "$out$path" ]]; then
        echo "an old address no longer resolves: $path"
        fail=1
    fi
done < "$ROOT/legacy-urls.txt"

# Each override is the theme's file with only the deprecated Language calls renamed.
for file in "${OVERRIDES[@]}"; do
    if ! grep -qE 'Language\.Language(Direction|Code)' "$THEME/$file"; then
        echo "the theme no longer uses the deprecated calls in $file; delete layouts/$file"
        fail=1
    elif ! sed -e 's/\.Language\.LanguageDirection/.Language.Direction/g' \
               -e 's/Language\.LanguageCode/Language.Locale/g' "$THEME/$file" \
            | diff -q - "$ROOT/layouts/$file" >/dev/null; then
        echo "layouts/$file has drifted from the theme; regenerate it from themes/PaperMod/layouts/$file"
        fail=1
    fi
done

exit "$fail"
