# News article images

Drop hero/social images for `/news/` articles in this folder. They are served
from `https://assets.goldpricetools.com/news/<file>` and referenced by each
article's `NewsArticle.image`, `og:image`, and hero `<figure>`.

## Specs (for Google News / Top Stories eligibility)
- **Min width 1200px**, landscape **16:9** (e.g. 1200×675 or 1600×900).
- Format: JPG (photos) or PNG/WebP (charts/graphics). Keep < ~300 KB.
- File name = article slug, e.g. `gold-silver-outlook-2026-06-30.jpg`.
- Always set descriptive **alt text** and a **caption/credit** in the `<figure>`.

> **Optimize before committing.** Run `npm run optimize-images` from the repo
> root after adding any JPEG here. It caps the long edge at 1456px and re-encodes
> with mozjpeg (q82) **in place** — typically ~45% lighter with no visible loss.
> It's idempotent (skips already-optimized files), so it's safe to run anytime.

## Where to get images (free-license — no stock subscription needed)
- **Unsplash** (https://unsplash.com) — free licence, attribution appreciated.
- **Pexels** (https://pexels.com) — free licence.
- **Original charts** — export a gold/silver price chart from your own
  `chart-data/`; original graphics are best for E‑E‑A‑T and have no licence risk.

⚠️ Never use images pulled from Google Images or another site without a licence.

## Per-article checklist
1. Save the 1200px+ image here as `<slug>.jpg`.
2. Run `npm run optimize-images` to shrink it (see note above).
3. In the article: set the hero `<figure>` `src`, `alt`, caption/credit.
4. Set `NewsArticle.image` `url` (+ `width`/`height`) to match.
5. Set `og:image` / `twitter:image` to the same URL.
