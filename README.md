# GoldPriceTools — goldpricetools.com

Free real-time gold and silver precious metals calculator.

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com/)

## Features
- Live gold & silver spot prices (auto-refreshed every 60s)
- Gold calculator: 8K–24K, all currencies (USD/GBP/EUR/CAD/AUD/INR)
- Silver calculator: .999 / 925 sterling / .900 coin / .800
- Scrap gold calculator (multi-karat, multi-item)
- Gold bar value calculator (400oz Good Delivery → 1g)
- 10-year price charts (Chart.js)
- Weight converter (troy oz ↔ grams ↔ kg ↔ pennyweight ↔ grains)
- Fully SEO-optimised per Google Search Central guidelines
- JSON-LD schemas: WebApplication (⭐ aggregateRating), WebSite+SearchAction, FAQPage (9 Q&As), BreadcrumbList, Organization
- `data-nosnippet` on all live price elements
- Image sitemap with `image:image` extension
- PWA manifest.json
- WCAG 2.1 accessible, mobile-first responsive
- Dark/light mode with toggle
- AdSense ready (4 placement slots)

## Deployment

### Cloudflare Pages (Recommended — free HTTPS + CDN + custom domain)
1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect this GitHub repo: `DigitalCliqs/Gold-Price-Tools`
3. Build command: *(leave empty — static site)*
4. Output directory: `/` (root)
5. Add custom domain: `goldpricetools.com`
6. Point your domain DNS to Cloudflare (CNAME record)

### Netlify
1. Go to [app.netlify.com](https://app.netlify.com) → New site from Git
2. Connect `DigitalCliqs/Gold-Price-Tools`
3. Set custom domain: `goldpricetools.com`

### GitHub Pages
1. Repo Settings → Pages → Deploy from branch `main`, folder `/`
2. Add custom domain: `goldpricetools.com`

## File Structure
```
/
├── index.html          ← Main site (served as root /)
├── sitemap.xml         ← Submit to Google Search Console
├── robots.txt          ← Googlebot directives  
├── manifest.json       ← PWA manifest
├── assets/             ← Add og-image.jpg (1200×630) and logo.svg here
└── README.md
```

## Post-Deployment Checklist
- [ ] Add Google AdSense `ca-pub-XXXXXXXX` to the 4 ad slots in `index.html`
- [ ] Create `assets/og-image.jpg` (1200×630px) for social sharing
- [ ] Create `assets/logo.svg` for Organization schema
- [ ] Submit `sitemap.xml` to [Google Search Console](https://search.google.com/search-console)
- [ ] Request indexing via URL Inspection tool
- [ ] Verify site in Google Search Console
- [ ] Set up Cloudflare Analytics (free)

## Secondary Domain
- `goldgramcalculator.com` → redirect to `https://goldpricetools.com/`

## Keywords Targeted
14K gold price per gram, 10K gold price per gram, 18K gold price per gram, scrap gold calculator,
gold price today, gold price per gram, silver price today, 925 sterling silver price,
kilo silver price, gold bar worth, troy ounce grams, gold and silver price today

## SEO Schemas
- WebApplication with aggregateRating (star rating in SERP)
- WebSite + SearchAction (Google Sitelinks Search Box)
- WebPage + BreadcrumbList (breadcrumbs in SERP)
- FAQPage × 9 Q&As (FAQ rich results eligible)
- Organization

## Deployment History
- 2026-04-23 17:32 BST — Redeployment triggered after GitHub Pages 502 server error (Request ID 9421:30D54C:32C8023:CA08BCE:69EA4592)
- 2026-04-23 17:48 BST — Whitespace commit to trigger Pages deployment

## License
MIT — free to use and modify.
