#!/usr/bin/env bash
# Renders scripts/share-card.html to static/share.png (1200x630), the default share image for every page.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
browser="$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)"
[[ -n "$browser" ]] || { echo "a Chromium or Chrome browser is needed to render the share image"; exit 1; }

"$browser" --headless --disable-gpu --hide-scrollbars --window-size=1200,630 \
    --screenshot="$ROOT/static/share.png" "file://$ROOT/scripts/share-card.html"
