#!/usr/bin/env bash
# Shows a draft kept outside this repository on the local site, and leaves nothing git would commit.
#
#   scripts/preview.sh <draft.md>                 serve it at http://localhost:1313, drafts and future dates included
#   scripts/preview.sh <draft.md> --build <dir>   build the site with it into <dir> instead
#
# The draft, and the images/ folder beside it if there is one, are copied into
# local.d/preview/, which git ignores. Hugo reads that folder as extra content and
# assets, and it is removed when this exits, however it exits.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$ROOT/local.d/preview"

draft="${1:?usage: preview.sh <draft.md> [--build <dir>]}"
[[ -f "$draft" && "$draft" == *.md ]] || { echo "not a markdown file: $draft" >&2; exit 2; }
case "$(cd "$(dirname "$draft")" && pwd)/" in
    "$ROOT"/*) echo "the draft is inside this repository; drafts are previewed from outside it" >&2; exit 2 ;;
esac

rm -rf "$STAGE"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/content/posts/preview" "$STAGE/assets"
cp "$draft" "$STAGE/content/posts/preview/"
if [[ -d "$(dirname "$draft")/images" ]]; then
    cp -R "$(dirname "$draft")/images" "$STAGE/assets/images"
fi

# Declaring mounts replaces Hugo's defaults, so the site's own folders are listed too.
{
    echo "[module]"
    for dir in content assets layouts static data i18n archetypes; do
        [[ -d "$ROOT/$dir" ]] && printf '[[module.mounts]]\nsource = "%s"\ntarget = "%s"\n' "$dir" "$dir"
    done
    printf '[[module.mounts]]\nsource = "local.d/preview/content"\ntarget = "content"\n'
    printf '[[module.mounts]]\nsource = "local.d/preview/assets"\ntarget = "assets"\n'
} > "$STAGE/mounts.toml"

config="$ROOT/hugo.toml,$STAGE/mounts.toml"
if [[ "${2:-}" == "--build" ]]; then
    hugo --source "$ROOT" --config "$config" --buildDrafts --buildFuture --quiet --destination "${3:?--build needs a folder}"
else
    hugo server --source "$ROOT" --config "$config" --buildDrafts --buildFuture
fi
