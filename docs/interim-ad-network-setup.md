# Interim Ad-Network Setup (Adsterra / Monetag)

Optional **interim / fallback** monetization for goldpricetools.com using only
**non-intrusive** ad formats. This is wired up but **disabled by default** — it
makes zero network requests until you configure it.

> The loader lives at [`assets/ads-interim.js`](../assets/ads-interim.js) and is
> already included site-wide (one `<script defer>` tag before `</body>` on every
> indexable page). Activation is therefore a **one-file edit** — you never need
> to touch the HTML pages again.

## When to use this

- **AdSense is the primary goal.** It pays far more for US/UK finance traffic.
- Use this **only** if: (a) you decide not to pursue AdSense, (b) AdSense
  approval is taking too long and you want interim revenue, or (c) later, as
  supplementary fill / ad-block recovery **after** AdSense is approved.

> ⚠️ **Do not enable interim ads during a fresh AdSense review.** Reviewers
> prefer a clean site, and any intrusive format will sink the application.
> Keep `network: ''` until your AdSense path is settled.

## Hard rules (baked into the loader)

- **No popunders, no OnClick, no classic browser-push.** These violate AdSense
  policy and damage SEO/UX. The loader does not support them.
- Adsterra → **Social Bar** only (the least-intrusive high-performer).
- Monetag → **Multitag** with **OnClick/Popunder turned OFF** in the dashboard.

## Activation — Adsterra (Social Bar)

1. Sign up at adsterra.com as a Publisher and add `goldpricetools.com`.
2. Create an ad unit of type **Social Bar** for the site.
3. Copy the unit's script **src** (e.g. `//pl########.somedomain.com/xx/yy/zz/abcdef.js`).
4. In [`assets/ads-interim.js`](../assets/ads-interim.js) set:
   ```js
   network: 'adsterra',
   adsterra: { socialBarSrc: '//pl########.somedomain.com/xx/yy/zz/abcdef.js' }
   ```
5. Add your Adsterra **ads.txt** line (from Adsterra → Profile → ads.txt) by
   uncommenting/replacing the placeholder in [`/ads.txt`](../ads.txt).

## Activation — Monetag (Multitag, popunder OFF)

1. Sign up at monetag.com and add `goldpricetools.com`.
2. Create a **Multitag** zone. In its settings, **disable OnClick / Popunder**
   (leave In-Page Push / Interstitial / Vignette / Native on, as you prefer).
3. Copy the Multitag **script src** and its **data-zone** id.
4. In [`assets/ads-interim.js`](../assets/ads-interim.js) set:
   ```js
   network: 'monetag',
   monetag: { tagSrc: 'https://<cdn>/88/tag.min.js', zoneId: '1234567' }
   ```
5. Add your Monetag **ads.txt** lines (from Monetag → Sites → ads.txt) by
   uncommenting/replacing the placeholder in [`/ads.txt`](../ads.txt).

## After enabling — verify

Per `DEVELOPMENT_RULES.md`, run the Playwright audit on a couple of pages and
confirm: no console errors, no layout shift / horizontal overflow, the unit is
non-intrusive (no popup/redirect), and Core Web Vitals are unaffected
(the tag is `async`/`defer`). Then re-check pages on mobile.

## To turn it back off

Set `network: ''` in `assets/ads-interim.js` and re-comment the network lines in
`ads.txt`. No other changes needed.
