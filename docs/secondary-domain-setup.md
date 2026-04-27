# Secondary Domain Setup (goldgramcalculator.com)

This guide outlines how to configure the secondary domain `goldgramcalculator.com` to properly redirect to the primary domain `goldpricetools.com`. The goal is to consolidate SEO value and avoid duplicate content by mapping old URLs to their new canonical equivalents.

## Redirect Mapping

We need to implement the following 301 (Permanent) Redirects:

*   `http(s)://(www.)goldgramcalculator.com/` → `https://goldpricetools.com/`
*   `http(s)://(www.)goldgramcalculator.com/index` → `https://goldpricetools.com/`
*   `http(s)://(www.)goldgramcalculator.com/9k` → `https://goldpricetools.com/9k-gold-price-per-gram`
*   `http(s)://(www.)goldgramcalculator.com/10k` → `https://goldpricetools.com/10k-gold-price-per-gram`
*   `http(s)://(www.)goldgramcalculator.com/14k` → `https://goldpricetools.com/14k-gold-price-per-gram`
*   `http(s)://(www.)goldgramcalculator.com/18k` → `https://goldpricetools.com/18k-gold-price-per-gram`
*   `http(s)://(www.)goldgramcalculator.com/22k` → `https://goldpricetools.com/22k-gold-price-per-gram`
*   `http(s)://(www.)goldgramcalculator.com/24k` → `https://goldpricetools.com/24k-gold-price-per-gram`
*   *Catch-all fallback:* `http(s)://(www.)goldgramcalculator.com/*` → `https://goldpricetools.com/*`

## Implementation Methods

Because cross-domain redirects using absolute URLs are invalid in Cloudflare Pages `_redirects` file when added to the destination site, the redirects must be configured on the secondary domain's own deployment or zone.

### Method 1: Cloudflare Bulk Redirects or Page Rules (Recommended & Simplest)

If `goldgramcalculator.com` is managed in a Cloudflare zone, the easiest way to handle this without deploying any code is to use Cloudflare's dashboard rules.

**Option A: Page Rules (Catch-all)**
1. Go to the Cloudflare dashboard for `goldgramcalculator.com`.
2. Navigate to **Rules** -> **Page Rules**.
3. Create a new Page Rule for the URL: `*goldgramcalculator.com/*`
4. Set the setting to **Forwarding URL**, Status Code `301 - Permanent Redirect`.
5. Destination URL: `https://goldpricetools.com/$2` (the `$2` carries over the path, matching the second wildcard `*`).

**Option B: Bulk Redirect List (Exact Mapping)**
For fine-grained control mapping exact karat paths as specified above:
1. Navigate to **Rules** -> **Redirect Rules** (or Bulk Redirects).
2. Create a list that maps each exact path (`/9k`, `/10k`, etc.) to its corresponding destination (`https://goldpricetools.com/9k-gold-price-per-gram`, etc.).

Ensure you have a proxy-enabled (orange cloud) DNS record for the root `@` and `www` to trigger the rules (a dummy A record to `192.0.2.1` works).

### Method 2: Separate Cloudflare Pages Project

If you prefer to maintain the redirects in code, you must create a **separate** Cloudflare Pages project specifically for `goldgramcalculator.com`.

1. Create a new repository (e.g., `goldgramcalculator-redirects`).
2. Add a `_redirects` file to the root of that repository.
3. Use **PATH-ONLY** sources in this file. The content should be:

```text
/9k https://goldpricetools.com/9k-gold-price-per-gram 301
/10k https://goldpricetools.com/10k-gold-price-per-gram 301
/14k https://goldpricetools.com/14k-gold-price-per-gram 301
/18k https://goldpricetools.com/18k-gold-price-per-gram 301
/22k https://goldpricetools.com/22k-gold-price-per-gram 301
/24k https://goldpricetools.com/24k-gold-price-per-gram 301
/index https://goldpricetools.com/ 301
/ https://goldpricetools.com/ 301
/* https://goldpricetools.com/:splat 301
```

4. Deploy this repository to Cloudflare Pages.
5. In the Cloudflare Pages dashboard for this new project, go to **Custom Domains** and add `goldgramcalculator.com` and `www.goldgramcalculator.com`.

### Method 3: GitHub Pages

If you are hosting via GitHub Pages on the secondary domain:
GitHub Pages does not support a `_redirects` file natively. To perform redirects, you'd need a separate repository with a `CNAME` file pointing to `goldgramcalculator.com` and HTML files containing meta refresh tags or a Jekyll redirect plugin. Given this complexity, Cloudflare (Method 1 or 2) is heavily preferred.
