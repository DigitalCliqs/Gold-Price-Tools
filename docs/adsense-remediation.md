# AdSense "Low Value Content" — Remediation Plan & Log

**Site:** goldpricetools.com
**Rejection:** Google AdSense — *"Low value content … Your site doesn't yet meet
the criteria of use in the Google publisher network."* (Verify site ownership
passed; the only blocker was the content policy.)

This document records *why* the site was flagged, *what has been fixed*, and
*what remains* before requesting an AdSense review.

---

## Diagnosis (evidence from the repo, not guesswork)

The site is **not** failing on raw quantity (≈76 HTML pages, ~75k+ visible words,
with genuinely strong pillar content — Gold IRA, where-to-sell, coins-vs-bars,
purity grades — that is bylined, dated and sourced). The drivers were:

1. **A cluster of thin, near-duplicate, templated "doorway" price pages.**
   Pages differing only by a karat number or currency, whose unique prose was
   ~300 words wrapped in ~600 words of repeated nav/footer chrome:
   - `gold-price-today-10k` / `-14k` / `-18k`  (~900 words each)
   - `14k-gold-price-in-usd`, `18k-gold-price-in-gbp`  (currency-variant doorways)
   - `gold-per-gram-today`
   Each duplicated the intent of a richer canonical page that already existed
   (`{10k,14k,18k}-gold-price-per-gram`, `gold-price-per-gram`). This is the
   pattern Google's *thin content / scaled content / doorway pages* policies
   target, and the most likely trigger for the rejection.

2. **(Secondary) Live prices render client-side only.** Price table cells are
   `data-nosnippet` em-dashes filled by JS from gold-api.com. This is partly by
   design, and the richer pages carry worked numeric examples in prose, so it is
   a minor factor compared with (1).

---

## Phase 1 — DONE (this change set)

**Consolidated the 6 thin doorway pages into their richer canonical twins** via
permanent redirects, removing the duplicate/doorway pattern:

| Removed (301 →)            | Canonical target            |
|----------------------------|-----------------------------|
| `gold-price-today-10k`     | `/10k-gold-price-per-gram`  |
| `gold-price-today-14k`     | `/14k-gold-price-per-gram`  |
| `gold-price-today-18k`     | `/18k-gold-price-per-gram`  |
| `14k-gold-price-in-usd`    | `/14k-gold-price-per-gram`  |
| `18k-gold-price-in-gbp`    | `/18k-gold-price-per-gram`  |
| `gold-per-gram-today`      | `/gold-price-per-gram`      |

Mechanics:
- `_redirects`: each slug's `301 (.html) + 200 (clean)` pair replaced with a
  single **301 → canonical**.
- Deleted the 6 HTML files.
- Repointed **every** internal link (homepage footer, the per-gram pages'
  related-cards, two blog posts, where-to-sell) and removed redundant nav entries.
- `llms.txt` entries removed.
- Regenerated `sitemap.xml` (71 URLs) and `image-sitemap.xml` (67 URLs) via
  `node scripts/generate-sitemap.js` — deleted pages confirmed gone.
- `node scripts/validate-jsonld.js` → **PASS** (217 blocks / 76 files).

---

## Phase 2 — DONE (second change set)

Content + E-E-A-T improvements on the **7 gold price-per-gram pages** (9K–24K +
the `gold-price-per-gram` hub):

- [x] **Foreground E-E-A-T on the gold price pages (YMYL).** Added a consistent
      *"Sources, methodology & review"* section to every one — organisational
      byline (linked author page), human review date, and authoritative outbound
      citations (LBMA, World Gold Council, gold-api.com) + a link to Editorial
      Standards. Styles centralised once in `assets/site.css` (`.gpt-sources` /
      `.gpt-byline`).
- [x] **Thickened the thinnest survivor** (`gold-price-per-gram`, ~1.1k → ~1.85k
      words): added a top byline and three original sections (units: gram vs troy
      oz vs pennyweight; what moves the per-gram price; spot vs real buy/sell
      price) plus three unique FAQs.
- [x] **Fixed a correctness bug** — `gold-price-per-gram` share buttons pointed at
      `/18k-gold-price-per-gram`; now canonical.
- [x] **Verified** JSON-LD validates (217 blocks / 76 files) and `<section>` tags
      balanced on all edited pages.

## Phase 2 — STILL REMAINING before requesting review

- [ ] **Extend the same "Sources, methodology & review" section** to the other
      price/calculator pages (silver per-gram/kilo, gold-silver-ratio,
      gold-bar-value, 24-hour-prices, scrap/coins calculators).
- [ ] **Optionally deepen the karat pages** (already ~2.2k–3.9k words) with more
      page-specific analysis so they read less formulaically vs each other.
- [ ] **Raise the content-to-chrome ratio.** The mega-menu renders twice in the
      static HTML; ensure primary content visibly dominates navigation.
- [ ] **Confirm no remaining near-duplicate clusters** across silver per-gram pages.
- [ ] **Re-run the Playwright audit** (`tools/playwright_audit.py`) on changed
      pages per `DEVELOPMENT_RULES.md` (not runnable in the web sandbox).
- [ ] **Then** tick *"I confirm I have fixed the issues"* in AdSense → Request
      review. Expect days–weeks; do not enable interim ad networks during review.

---

## Interim monetization (optional, set up but disabled)

Non-intrusive interim/fallback ads (Adsterra Social Bar / Monetag Multitag,
popunders disabled) are wired up but **off by default**. See
[`interim-ad-network-setup.md`](./interim-ad-network-setup.md). Do not enable
during a fresh AdSense review.

> Note: AdSense (and, as traffic grows, a premium manager such as
> Ezoic → Mediavine/Raptive) is the higher-value path for US/UK finance traffic.
> The popunder/push networks are a fallback, never the goal — and popunders
> would re-break both AdSense eligibility and SEO.
