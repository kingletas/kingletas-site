#!/usr/bin/env bash
# Renders scripts/share-card.html to static/share.png (1200x630), the default share image for every page.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
browser="$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)"
[[ -n "$browser" ]] || { echo "a Chromium or Chrome browser is needed to render the share image" >&2; exit 1; }

# A browser can exit 0 without writing, so the render goes to a scratch file and replaces the image only once it exists.
# The scratch file sits in local.d because a sandboxed browser cannot write to the system's temporary folder.
mkdir -p "$ROOT/local.d"
out="$(mktemp "$ROOT/local.d/share.XXXXXX.png")"
trap 'rm -f "$out"' EXIT
"$browser" --headless --disable-gpu --hide-scrollbars --window-size=1200,630 \
    --screenshot="$out" "file://$ROOT/scripts/share-card.html"
[[ -s "$out" ]] || { echo "the browser wrote no image; static/share.png is unchanged" >&2; exit 1; }
install -m 0644 "$out" "$ROOT/static/share.png"
