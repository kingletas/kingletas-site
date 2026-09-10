# www.kingletas.com. Every verb is a make target, and `make help` lists them all.
#
# The Makefile holds no logic: each recipe delegates to hugo or to a script in scripts/.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- working on the site ---

.PHONY: setup
setup: ## Fetch the pinned theme
	git submodule update --init --recursive

.PHONY: serve
serve: ## Preview at http://localhost:1313, rebuilding on every save
	hugo server --buildDrafts

.PHONY: post
post: ## Start a draft post: make post name=my-first-post
	@if [[ -z "$(name)" ]]; then \
		echo "usage: make post name=<slug>"; \
		echo "  make post name=varnish-in-2026"; \
		exit 2; \
	fi
	hugo new content "posts/$$(date +%Y)/$(name).md"

# --- checks and output ---

.PHONY: check
check: ## Everything a commit has to pass
	scripts/check.sh

.PHONY: build
build: ## Build the site into public/
	hugo --gc --minify --panicOnWarning

.PHONY: clean
clean: ## Remove the built site
	rm -rf public resources/_gen .hugo_build.lock
