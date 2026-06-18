# GSC "Why pages aren't indexed" — Audit & Resolution

**Audit date:** 2026-06-18
**Source:** Google Search Console → Indexing → Pages → "Why pages aren't indexed"

This note records a full audit of the indexing-exclusion reasons reported in
GSC, what each one means for `goldpricetools.com`, and the action taken (or
why no action is needed). The headline finding: **the site's technical SEO is
clean** — most reported reasons are Google's normal bookkeeping for URLs that
are already handled correctly (redirects, canonicalised alternates, intentional
`noindex`). The one genuine gap was the absence of a custom 404 page.

## Reported reasons (from GSC)

| Reason | Source | Pages | Verdict |
|---|---|---|---|
| Page with redirect | Website | 4 | Working as intended |
| Not found (404) | Website | 23 | Mostly correct; added recovery 404 page |
| Alternative page with proper canonical tag | Website | 14 | Working as intended |
| Excluded by 'noindex' tag | Website | 5 | Intentional |
| Duplicate without user-selected canonical | Website | 1 | Needs the specific URL from GSC |
| Crawled - currently not indexed | Google systems | 7 | Google quality/discretion call |
| Duplicate, Google chose different canonical than user | Google systems | 1 | Needs the specific URL from GSC |
| Discovered – currently not indexed | Google systems | 0 | Passed — nothing to do |

## Findings & actions

### Page with redirect (4) — working as intended
These are legacy/`.html`/consolidated URLs that **correctly 301-redirect** to
their live equivalents. A redirecting URL is *meant* to be excluded — Google
indexes the destination instead. The "Failed" validation status only means a
prior "Validate Fix" was requested while the URLs still (correctly) redirect, so
validation can never "pass". No change needed. Verified:
- No redirect chains and no broken redirect targets in `_redirects`.
- None of these URLs appear in `sitemap.xml` or in any internal link.

### Not found / 404 (23) — mostly correct; recovery page added
These are URLs from old backlinks or the pre-consolidation site that no longer
exist. For genuinely dead URLs, returning 404 is **correct** and they age out of
the index. Verified: **zero broken internal links** site-wide, and the 6
recently-removed "doorway" price pages all already have 301 redirects.

**Action:** added a custom **`404.html`** (the site previously had none, so
Cloudflare Pages served a bare default). Cloudflare serves `/404.html` with an
HTTP 404 status for any unmatched route. It is `noindex`, reuses the site's nav,
footer and design system, and offers search plus links to the most popular
tools so visitors/bots that hit a dead URL can recover.

**To remove specific entries:** export the URL list (GSC → Pages → *Not found
(404)* → Export). Any URL with traffic/backlinks can then be 301-redirected to
its best live equivalent in `_redirects`.

### Alternative page with proper canonical tag (14) — working as intended
Alternate URLs (the `.html` form, and `?q=`/parameter variants) that correctly
declare a canonical pointing at the clean URL. Google is consolidating them onto
the canonical exactly as designed. Verified every page self-canonicalises to its
clean URL. No action needed.

### Excluded by 'noindex' (5) — intentional
Exactly five pages carry `noindex`, and all five should:
- `/offline.html` — PWA offline fallback
- `/data/` — internal data view
- `/authors/james-smith`, `/guides/how-to-calculate-scrap-gold/`,
  `/guides/scrap-gold-guide/` — legacy pages that are also 301-redirected to
  their replacements

None are in the sitemap. No action needed.

### Duplicate without user-selected canonical (1) & Duplicate, Google chose different canonical (1)
Every live page has a self-referencing canonical and no two live pages share a
canonical, so these are most likely parameter/variant URLs (e.g. `/?q=…`) that
Google is grouping. **To pinpoint:** open each issue row in GSC — it lists the
example URL(s). Share them and the canonical/parameter handling can be tuned.

### Crawled - currently not indexed (7) — quality/discretion
Google crawled these but chose not to index them (typically thin or overlapping
content, or low search demand). This is not a technical bug; the fix is
content-side — strengthen the pages, add internal links, ensure each is
genuinely distinct. **To target:** export the 7 URLs from GSC.

## What's needed to action the rest
For the URL-specific reasons (404s, the two duplicates, crawled-not-indexed),
GSC's category counts aren't enough — the **exact URLs** are required. Export
them from each issue row (or provide `gsc_token.json` so the GSC API scripts in
`scripts/` can pull them) and they can be fixed surgically.
