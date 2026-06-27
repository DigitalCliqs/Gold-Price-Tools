# Automation contract — publishing into the n8n ecosystem

This repo is a **site node** in a multi-site marketing system. The orchestration
(n8n, self-hosted) never builds anything itself — it hands a finished article to
this repo's CI, which classifies, builds, and ships it. This file is the contract
between the two. It travels with the site template, so **every new site exposes
the same interface** and slots into n8n with zero per-site glue.

```
 n8n (control plane)                 this repo's CI (build hands)         Cloudflare
 ───────────────────                 ────────────────────────────        ──────────
 draft title+body ──repository_dispatch──▶  classify (Claude, taxonomy-
                     {publish-news}          constrained) → fetch+optimize
                                             image → npm run build-news →
                                             open PR ──(checks)──▶ merge ──▶ deploy ▶ live
```

## Trigger

Fire a GitHub **`repository_dispatch`** (n8n: HTTP Request node):

```
POST https://api.github.com/repos/{owner}/{repo}/dispatches
Authorization: Bearer <GH_PAT or GitHub App token>
Accept: application/vnd.github+json

{
  "event_type": "publish-news",
  "client_payload": {
    "title":          "Gold Holds Above $4,500 as the Fed Signals a Pause",
    "body":           "Full article body in **markdown**…",
    "slug":           "gold-holds-4500-fed-pause",
    "description":    "60–165 char SEO/social summary.",
    "image_query":    "gold bullion bars",
    "image_provider": "pexels",
    "image_alt":      "Stacked gold bullion bars",
    "pub_date":       "2026-06-26T09:00:00Z",
    "featured":       false,
    "auto_merge":     false
  }
}
```

### Payload fields

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | Headline. |
| `body` | ✅ | Article body, markdown (no front-matter — CI generates it). |
| `slug` | ✅ | URL slug = filename. Lowercase-hyphenated, unique. |
| `description` | – | SEO/social meta (aim 60–165 chars). Falls back to a TODO placeholder. |
| `image_query` | – | Stock-photo search; defaults to `title`. |
| `image_provider` | – | `pexels` (self-hosted, default) or `unsplash` (hotlink). |
| `image_alt` | – | Defaults to `title`. |
| `pub_date` | – | ISO datetime; defaults to now. Drives ordering. |
| `featured` | – | `true` pins the homepage hero. Default `false`. |
| `auto_merge` | – | `true` auto-merges once checks pass; else the PR waits for review. |

**`category` and `tags` are intentionally NOT in the payload** — CI derives them
from the body with the Claude classifier, constrained to this site's
`taxonomy.json`, so the orchestrator can't misfile an article and doesn't need to
know the site's taxonomy.

## What CI does (`.github/workflows/publish-news.yml`)

1. **Classify + assemble** — `news-meta.mjs emit --ai` → category + tags (locked to
   the taxonomy) + front-matter, prepended to the body → `news-app/src/content/news/<slug>.md`.
2. **Image** — `fetch-news-image.js` (self-hosts a Pexels photo) → `optimize-images`.
3. **Build** — `npm run build-news` (lint **gate** → Astro build → sync `/news/` → sitemaps).
4. **Ship** — commit the article + built `/news/` + sitemaps to `news-bot/<slug>`,
   open a PR (auto-merge optional).

Required checks (Cloudflare Pages preview, Scope guard, Validate JSON-LD, and the
`validate-news` lint inside the build) run on the PR. Merge → Cloudflare deploys.

## Repo configuration (per site)

**Secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|---|---|
| `GH_PAT` | Opens the PR **as a user**, so the required `pull_request` checks actually run (a PR opened by the default `GITHUB_TOKEN` does **not** trigger them). A GitHub App installation token works too and is the better choice at ecosystem scale. |
| `ANTHROPIC_API_KEY` | The classifier. |
| `PEXELS_API_KEY` | Self-hosted images. (`UNSPLASH_ACCESS_KEY` optional.) |

**Variable** (optional): `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-6`
(9/9 on the seed set; `claude-haiku-4-5` is ~3× cheaper if you accept the rare
borderline call).

## Testing without n8n

Use the Actions tab → **Publish News (automation)** → *Run workflow* (the
`workflow_dispatch` form takes the same fields), or fire the dispatch with `gh`:

```bash
gh api repos/:owner/:repo/dispatches -f event_type=publish-news \
  -F 'client_payload[title]=Test headline' \
  -F 'client_payload[slug]=test-headline' \
  -F 'client_payload[body]=A short **markdown** body about gold prices.' \
  -F 'client_payload[image_query]=gold bars'
```

## How this scales to many sites

- Clone the template → a new site **inherits this contract unchanged**; only
  `taxonomy.json`, branding, and the repo secrets differ.
- n8n keeps **one** publishing workflow, parameterized by a site registry
  (`{ site, repo, image_provider, autonomy: review|auto, … }`); "add a site" =
  clone the repo + add a registry row.
- Start each site in **review** mode (`auto_merge:false`); flip to `auto_merge:true`
  per site once you trust it. The schema-constrained classifier + the
  `validate-news` gate + the PR checks are the safety net at every stage.

## Site self-description — `/site-contract.json`

This repo also **describes itself** to the factory. `scripts/emit-site-contract.mjs` runs as part of
`build-news` and writes `site-contract.json` (served at `https://<domain>/site-contract.json`) — the
site's [Site Contract](https://github.com/DigitalCliqs/RatedStack/blob/main/docs/SITE-CONTRACT.md):
its taxonomy, content inventory, pages, tools, authors, SEO, and template. It's the **native
"installed plugin"** — the highest-fidelity adapter (the site describing itself), with the factory's
external adapters (`repo-introspect`, `generic-crawler`) as fallbacks. Per-site values that aren't
derivable from files live in `site-contract.config.json` (`name`, `site_id`). The emitter is
dependency-free and self-checks the output, so a malformed Contract fails the build.
