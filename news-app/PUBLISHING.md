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

### Two classifiers: smart (Claude) and lexical

`suggest`/`emit` route an article two ways, both constrained to the **same
taxonomy**:

- **Smart (Claude)** — reads the article and routes it by its **overall concept**
  (handles paraphrase and novelty, not just keywords). Used **automatically when
  `ANTHROPIC_API_KEY` is set** (in `.env.local`). The category is locked to the
  four slugs and tags to the vocabulary via a JSON schema, so it **cannot return
  an invalid category or tag**; it may also propose new tags (surfaced separately,
  never auto-applied). This is the path to use for n8n.
- **Lexical** — offline keyword matching. Zero-config fallback; runs when no key
  is set, or when forced with `--lexical`.

Flags: `--ai` (force Claude), `--lexical` (force offline), `--explain` (show the
model's one-line reasoning), `--print-request` (dump the Claude request without
sending — key redacted, handy for debugging).

**Enabling the smart classifier:** add to `.env.local` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
# optional — defaults to claude-opus-4-8; haiku is ~5x cheaper and plenty for classification:
ANTHROPIC_MODEL=claude-haiku-4-5
```
Cost is a fraction of a cent per article (classification is one short call).

## n8n integration (later)

The pieces are deliberately CLI- and JSON-shaped so an automated pipeline can use
them headlessly. With `ANTHROPIC_API_KEY` set in the environment, steps 1–2 use
the **smart (Claude) classifier** automatically:

1. **Classify**: `node scripts/news-meta.mjs suggest --title "$T" --text "$BODY" --json`
   → `{ "engine": "claude:…", "category": "...", "tags": [...], "new_tags": [...], "reasoning": "..." }`.
   (Add `--ai` to make a missing key a hard failure instead of a silent lexical fallback.)
2. **Assemble**: `node scripts/news-meta.mjs emit --title "$T" --slug "$SLUG" --text "$BODY"`
   → front-matter block; prepend it to the body and write
   `news-app/src/content/news/$SLUG.md`.
3. **Image**: `node scripts/fetch-news-image.js --query "…" --slug $SLUG --provider pexels`
   then `npm run optimize-images`.
4. **Gate**: `npm run validate-news` (non-zero exit = stop the pipeline).
5. **Publish**: `npm run build-news` then commit the markdown **and** the
   regenerated `/news/` output.

The classifier **suggests**; the JSON schema + the build-time contract **enforce**.
The category is constrained to the four valid slugs and tags to the vocabulary, so
a wrong answer can't produce an invalid placement — but for full safety a reviewer
(or an n8n approval step) can still confirm the `category` before publish.
