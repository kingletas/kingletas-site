# www.kingletas.com

The source for [www.kingletas.com](https://www.kingletas.com): a home page, the projects, and a blog. It's built with [Hugo](https://gohugo.io) and the [PaperMod](https://github.com/adityatelange/hugo-PaperMod) theme, and GitHub Pages publishes it on every push to `main`.

## Running it locally

You need Hugo 0.166.0 and git.

```bash
git clone --recurse-submodules https://github.com/kingletas/kingletas-site
cd kingletas-site
make serve
```

Then open http://localhost:1313. The page rebuilds every time you save a file.

If you cloned without `--recurse-submodules`, the theme folder is empty and the build fails. `make setup` fetches it.

## Writing a post

```bash
make post name=varnish-in-2026
```

That creates a draft at `content/posts/<year>/varnish-in-2026.md`. It shows up in `make serve` but not on the live site. Remove `draft: true` from its front matter when it's ready, then commit and push.

## Checks

`make check` runs on every commit and in CI. It fails when:

- Hugo prints any warning, deprecations included.
- An address the old Blogger site served stops resolving. The list is in `legacy-urls.txt`.
- One of the three templates in `layouts/` no longer matches the theme. Those files are PaperMod's own, with only two renamed Hugo calls that PaperMod hasn't caught up with yet ([PaperMod #1856](https://github.com/adityatelange/hugo-PaperMod/issues/1856)). When the theme changes one of them, the check tells you whether to regenerate the override or delete it.

## Layout

| Path | What it holds |
|---|---|
| `content/posts/` | Posts, one folder per year |
| `content/projects.md` | The projects page |
| `hugo.toml` | Site settings, the home page intro and the menu |
| `layouts/` | The three template overrides described above |
| `themes/PaperMod` | The theme, a submodule pinned to one commit |
| `legacy-urls.txt` | Old addresses that must keep working |

## Licence

The posts and images are © Luis Tineo, all rights reserved: read them, link to them, quote a little with credit, but don't republish them. Everything else (config, templates, scripts, workflows) is MIT. [LICENSE](LICENSE) has both.
