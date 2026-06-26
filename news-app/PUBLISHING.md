# Publishing a news article

This is the contract for getting an article onto `/news/` correctly — where it's
filed, how it's tagged, and where it shows up. It's written so the **same rules**
work whether a human (or Claude) writes the article today or an **n8n** workflow
writes it later.

## TL;DR

```bash
# 1. (optional) get the right category + tags for your draft
npm run news:emit -- --title "Gold Holds $4,500 as the Fed Pauses" --slug gold-holds-4500 --file draft.md
#    → prints a complete front-matter block; paste it atop your markdown

# 2. save the file as news-app/src/content/news/<slug>.md
# 3. add + optimize the hero image
node scripts/fetch-news-image.js --query "gold bullion" --slug gold-holds-4500 --provider pexels
npm run optimize-images

# 4. validate, build, commit
npm run build-news        # runs validate-news → astro build → sync → sitemaps
```

## The front-matter contract

Every article is a markdown file in `news-app/src/content/news/<slug>.md`. The
**filename is the URL slug** (`gold-holds-4500.md` → `/news/gold-holds-4500/`).
The schema in [`src/content.config.ts`](src/content.config.ts) validates this at
build time — a malformed article **fails the build** rather than shipping broken.

| Field | Req? | Notes |
|---|---|---|
| `title` | ✅ | Headline. |
| `description` | ✅ | 60–165 chars (SEO + social). |
| `category` | ✅ | **Exactly one** of `market-updates` \| `gold` \| `silver` \| `analysis`. This is the single placement key (see below). |
| `tags` | – | Array; freeform but auto-normalized onto canonical slugs. Aim for 2–5. |
| `pubDate` | ✅ | ISO datetime. **Drives ordering everywhere** (newest first). |
| `updatedDate` | – | ISO datetime; shown as "updated". |
| `image` | ✅* | `/assets/news/<slug>.jpg` (self-hosted) **or** a full Unsplash hotlink URL. *Required for published (non-draft) articles. |
| `imageAlt` | – | Describe the image. |
| `imageCredit` / `imageCreditUrl` | – | Photographer attribution. |
| `author` | – | Defaults to "GoldPriceTools Editorial Team". |
| `featured` | – | `true` pins it to the homepage hero (see below). Default `false`. |
| `draft` | – | `true` hides it from the whole site + sitemaps. |

## How placement works (where it shows, where it doesn't)

There are **two independent taxonomies**, both set in front-matter:

1. **`category` — the primary, closed taxonomy.** One per article. It decides:
   - which **homepage section** it can appear in — `gold`, `silver`, and
     `analysis` each have a dedicated band; `market-updates` is the catch-all
     (no own band, but feeds the recency blocks);
   - which **category archive** lists it (`/news/category/<category>/`).
   Because it's a validated enum, **a `silver` article can never render in the
   gold section** — cross-contamination is structurally impossible.

2. **`tags` — the secondary, open taxonomy.** Zero or more per article. Each
   distinct tag auto-builds an archive at `/news/tag/<tag>/`. Tags are
   **normalized** (lowercased, hyphenated, synonyms folded) so the taxonomy
   never fragments — `Central Bank`, `central_bank`, and `central-banks` all
   collapse to `central-banks`.

Two more levers:
- **`pubDate`** orders everything newest-first (it's also how you control most of
  the homepage, which is recency-driven).
- **`featured: true`** pins the homepage **hero**. Among featured articles the
  newest wins; with none set, the newest article overall is used.

## Auto-routing tools

The taxonomy lives in **one file**:
[`src/lib/taxonomy.json`](src/lib/taxonomy.json) — categories (with routing
keywords), the curated tag vocabulary (labels, synonyms, keywords), and the
contract rules. Edit it to teach the system new tags or routing keywords; both
the build and the tools below read from it.

`scripts/news-meta.mjs` (run from the repo root) turns an article's text into the
right metadata:

| Command | What it does |
|---|---|
| `npm run news:suggest -- --file draft.md` | Print the suggested `category` + `tags`. Add `--json` for machine output. |
| `npm run news:emit -- --title "…" --slug foo --file draft.md` | Print a ready-to-paste front-matter block. |
| `npm run validate-news` | Lint **all** articles against the contract (errors block; warnings advise). Runs automatically inside `npm run build-news`. |

You can also feed text directly instead of a file:
`npm run news:suggest -- --title "Silver Surges" --text "…body…" --json`, or pipe
the body on stdin.

## n8n integration (later)

The pieces are deliberately CLI- and JSON-shaped so an automated pipeline can use
them headlessly:

1. **Classify**: `node scripts/news-meta.mjs suggest --title "$T" --text "$BODY" --json`
   → `{ "category": "...", "tags": [...] }`.
2. **Assemble**: `node scripts/news-meta.mjs emit --title "$T" --slug "$SLUG" --text "$BODY"`
   → front-matter block; prepend it to the body and write
   `news-app/src/content/news/$SLUG.md`.
3. **Image**: `node scripts/fetch-news-image.js --query "…" --slug $SLUG --provider pexels`
   then `npm run optimize-images`.
4. **Gate**: `npm run validate-news` (non-zero exit = stop the pipeline).
5. **Publish**: `npm run build-news` then commit the markdown **and** the
   regenerated `/news/` output.

The classifier is **advisory** — it suggests, the schema + linter enforce. n8n (or
a reviewer) always sets the final `category`; that keeps a wrong guess from
silently misfiling an article.
