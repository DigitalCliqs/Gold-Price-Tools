# Monthly SEO Audit Runbook

This runbook outlines the repeatable monthly SEO audit routine for Gold Price Tools. It covers checks across Google Search Console and Bing Webmaster Tools to ensure optimal search visibility and performance.

## 1. Google Search Console (GSC) Checks

Log in to Google Search Console and perform the following checks:

### Performance
*   **Performance Trends:** Review clicks, impressions, CTR, and average position over the last 28 days compared to the previous period. Note any significant drops or spikes.
*   **Top Queries:** Analyze the top-performing queries and pages to identify optimization opportunities.

### Indexing
*   **Coverage / Pages Errors:** Check the "Pages" report for indexing issues (e.g., 404s, Server errors, excluded pages). Investigate and fix any anomalies.
*   **Sitemaps Status:** Verify that `sitemap.xml` and `image-sitemap.xml` have been successfully read and processed without errors.

### Experience
*   **Core Web Vitals:** Review both Mobile and Desktop reports. Ensure Performance scores are optimal (aiming for LCP ≤ 2.5s, TBT ≤ 200ms, CLS ≤ 0.05).
*   **Mobile Usability:** Ensure there are no mobile-friendly errors (e.g., text too small, clickable elements too close).

### Enhancements (Structured Data)
*   **Structured Data Validity:** Check the Enhancements reports for:
    *   Breadcrumbs
    *   FAQ
    *   Dataset
    Ensure there are no errors or invalid items. Fix any warnings if possible.

### Security & Manual Actions
*   **Manual Actions:** Confirm there are no manual penalties applied to the site.
*   **Security Issues:** Ensure no security issues have been detected.

---

## 2. Bing Webmaster Tools Checks

Log in to Bing Webmaster Tools and perform the following checks:

### Sitemaps & Submissions
*   **Sitemap Submission:** Verify that the sitemaps (`sitemap.xml` and `image-sitemap.xml`) are successfully submitted and processed.
*   **URL Submissions:** Check if URL submissions are working correctly and not hitting any quota limits.

### SEO Reports
*   **SEO Reports:** Review the SEO Reports section for any identified issues or recommendations, such as missing alt text or meta descriptions.

---

## 3. Monthly Audit Checklist

Use this checklist to track completion each month.

- [ ] **GSC:** Review Performance trends (Clicks, Impressions, CTR, Position).
- [ ] **GSC:** Analyze top queries and top pages.
- [ ] **GSC:** Check Coverage/Pages report for indexing errors or excluded pages.
- [ ] **GSC:** Verify Sitemaps (`sitemap.xml`, `image-sitemap.xml`) are read successfully.
- [ ] **GSC:** Check Core Web Vitals (Mobile & Desktop) are in "Good" status.
- [ ] **GSC:** Confirm no Mobile Usability errors.
- [ ] **GSC:** Verify Structured Data (Breadcrumbs, FAQ, Dataset) is valid with no errors.
- [ ] **GSC:** Confirm no Manual Actions or Security Issues.
- [ ] **Bing:** Verify sitemaps are processed successfully.
- [ ] **Bing:** Check URL submission status.
- [ ] **Bing:** Review SEO Reports for actionable recommendations.
