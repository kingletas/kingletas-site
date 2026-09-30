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

Drafts live outside this repository until they're ready to publish. A draft committed here would be public in the repository even though the site never builds it.

```bash
make post name=varnish-in-2026 DRAFTS=~/drafts
make preview DRAFT=~/drafts/varnish-in-2026.md
```

The first starts a draft in the folder you name, from the site's archetype. The second shows it on the local site at http://localhost:1313, with any images from an `images/` folder beside it, and removes everything it copied when you stop it. When the post is ready, set `draft: false`, move it into `content/posts/<year>/`, then commit and push.

## Checks

`make check` runs on every commit and in CI. It fails when:

- Hugo prints any warning, deprecations included.
- An address the old Blogger site served stops resolving. The list is in `legacy-urls.txt`.
- A post under `content/` says `draft: true`. It names the file.
- One of the three templates in `layouts/` no longer matches the theme. Those files are PaperMod's own, with only two renamed Hugo calls that PaperMod hasn't caught up with yet ([PaperMod #1856](https://github.com/adityatelange/hugo-PaperMod/issues/1856)). When the theme changes one of them, the check tells you whether to regenerate the override or delete it.

## Layout

| Path | What it holds |
|---|---|
| `content/posts/` | Posts, one folder per year |
| `content/projects.md` | The projects page |
| `hugo.toml` | Site settings, the home page intro and the menu |
| `layouts/` | The three template overrides described above |
| `static/files/` | Downloads a post links to, served unchanged at `/files/`; the post gives each file's SHA-256 |
| `themes/PaperMod` | The theme, a submodule pinned to one commit |
| `legacy-urls.txt` | Old addresses that must keep working |

## Licence

The posts and images are © Luis Tineo, all rights reserved: read them, link to them, quote a little with credit, but don't republish them. Everything else (config, templates, scripts, workflows) is MIT. [LICENSE](LICENSE) has both.
