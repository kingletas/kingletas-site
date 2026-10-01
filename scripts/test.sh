#!/usr/bin/env bash
# The draft gate and the preview, on invented posts, and the calculator's math. Run by check.sh.
# shellcheck disable=SC2329  # the helpers below are run through ok_if, which shellcheck cannot follow
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
fail=0
# ok_if <what> <command...>: the command's success is the test.
ok_if() { local what="$1"; shift; if "$@"; then echo "ok    $what"; else echo "FAIL  $what"; fail=1; fi; }
quiet() { "$@" >/dev/null 2>&1; }
refuses() { ! "$@" >/dev/null 2>&1; }

# --- find-drafts: only front matter counts -----------------------------------
c="$work/content/posts"
mkdir -p "$c"
printf -- '---\ntitle: "A"\ndraft: true\n---\nbody\n' > "$c/yaml-draft.md"
printf -- '---\ntitle: "B"\nDraft: True\n---\nbody\n' > "$c/any-case.md"
printf -- '+++\ntitle = "C"\ndraft = true\n+++\nbody\n' > "$c/toml-draft.md"
printf -- '---\ntitle: "D"\ndraft: false\n---\nbody\n' > "$c/published.md"
printf -- '---\ntitle: "E"\n---\nA post can say draft: true in its body.\n' > "$c/mentions-it.md"
printf -- 'draft: true\nno front matter at all\n' > "$c/no-front-matter.md"
found="$("$ROOT/scripts/find-drafts.sh" "$work/content" | sed "s|$c/||" | tr '\n' ' ')"
ok_if "a draft is found in YAML, in any case, and in TOML, and nothing else is" \
      test "$found" = "any-case.md toml-draft.md yaml-draft.md "

# --- preview: builds a draft from outside, leaves nothing behind -------------
d="$work/drafts"
mkdir -p "$d/images/2031"
printf -- '---\ntitle: "An invented draft"\ndate: 2031-01-01\ndraft: true\n---\n\n![a test image](images/2031/pixel.png)\n' > "$d/an-invented-draft.md"
printf '\x89PNG\r\n\x1a\n' > "$d/images/2031/pixel.png"
before="$(git -C "$ROOT" status --porcelain)"
ok_if "preview builds, with a future-dated draft" quiet "$ROOT/scripts/preview.sh" "$d/an-invented-draft.md" --build "$work/site"
ok_if "the draft from outside is a page" test -f "$work/site/posts/preview/an-invented-draft/index.html"
ok_if "the image beside the draft is published with it" test -n "$(find "$work/site" -name 'pixel*.png' | head -1)"
left_clean() { [[ "$(git -C "$ROOT" status --porcelain)" == "$before" && ! -e "$ROOT/local.d/preview" ]]; }
ok_if "preview leaves nothing git would list, and removes its stage" left_clean
ok_if "preview refuses a draft inside the repository" refuses "$ROOT/scripts/preview.sh" "$ROOT/README.md" --build "$work/x"

# --- new-draft: never inside the repository ----------------------------------
ok_if "make post refuses a folder inside the repository" refuses "$ROOT/scripts/new-draft.sh" invented "$ROOT/content"
n="$work/new"
mkdir -p "$n"
new_draft_ok() {
    "$ROOT/scripts/new-draft.sh" an-invented-post "$n" >/dev/null \
        && [[ "$("$ROOT/scripts/find-drafts.sh" "$n")" == "$n/an-invented-post.md" ]] \
        && grep -q '^title: "An Invented Post"$' "$n/an-invented-post.md"
}
ok_if "make post starts a draft outside, from the archetype" new_draft_ok

# --- the reliability calculator's math ----------------------------------------
if command -v node >/dev/null 2>&1; then
    ok_if "the reliability calculator matches its worked cases" quiet node "$ROOT/scripts/test-calculator.js"
else
    echo "FAIL  the reliability calculator's test needs node, and there is none on PATH"
    fail=1
fi

exit "$fail"
