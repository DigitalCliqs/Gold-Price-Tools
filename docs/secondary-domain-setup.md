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

Depending on where `goldgramcalculator.com` is hosted/managed, follow the appropriate method below.

### Method 1: Cloudflare Pages (Recommended)

Since the main site is hosted on Cloudflare Pages, the simplest method is to add `goldgramcalculator.com` as a Custom Domain to the existing Cloudflare Pages project.

1.  Log in to the **Cloudflare Dashboard**.
2.  Go to **Workers & Pages** -> select the `Gold-Price-Tools` project.
3.  Click the **Custom Domains** tab.
4.  Click **Set up a custom domain** and enter `goldgramcalculator.com`. Add it.
5.  Repeat for `www.goldgramcalculator.com`.
6.  Cloudflare will prompt you to update the DNS records for `goldgramcalculator.com` to point to the Pages project. Add the necessary CNAME records.
7.  The routing rules we added to the `_redirects` file in the repository will automatically handle the specific path mappings (e.g., `/14k` to `/14k-gold-price-per-gram`) because the rules are prefixed with the hostname.

### Method 2: Cloudflare Bulk Redirects (If using a separate Cloudflare zone)

If `goldgramcalculator.com` is managed in Cloudflare but not attached directly to the Pages project:

1.  Go to the Cloudflare dashboard for `goldgramcalculator.com`.
2.  Go to **Rules** -> **Redirect Rules** (or Bulk Redirects).
3.  Create a new Redirect Rule or Bulk Redirect List mapping the exact URLs above to their target destinations using `301 Permanent Redirect`.
4.  Ensure you have a proxy-enabled (orange cloud) DNS record for the root `@` and `www` to trigger the rules (a dummy A record to `192.0.2.1` works).

### Method 3: GitHub Pages

If you are hosting via GitHub Pages on the secondary domain:

1.  A `CNAME` file is typically used to configure a single custom domain per repository. GitHub Pages does not support multiple custom domains per repository natively.
2.  To use GitHub Pages for the redirect, you would need a *separate* repository containing just a `CNAME` file (set to `goldgramcalculator.com`) and an HTML-based redirect or a Jekyll redirect plugin, as GitHub Pages doesn't support an equivalent of Cloudflare's `_redirects` file directly.
3.  Because of this limitation, **Method 1 (Cloudflare Pages Custom Domain)** or using your domain registrar's redirect tool is highly recommended instead.

### DNS Settings Summary

If routing via Cloudflare Pages (Method 1), your DNS for `goldgramcalculator.com` should look like:

*   **Type:** CNAME
*   **Name:** `@` (or `goldgramcalculator.com`)
*   **Target:** `your-pages-project-name.pages.dev`
*   **Proxy status:** Proxied (Orange Cloud)

*   **Type:** CNAME
*   **Name:** `www`
*   **Target:** `your-pages-project-name.pages.dev`
*   **Proxy status:** Proxied (Orange Cloud)
