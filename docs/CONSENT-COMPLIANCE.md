# Consent Compliance Checklist

Tracks TCF v2.3 and Consent Mode v2 compliance for GoldPriceTools.

---

## WP-10 — TCF v2.3

**Mandatory since: 1 March 2026**

### CMP
- [x] CMP in use: **Google's built-in AdSense GDPR Messaging** (Privacy & messaging → European regulations)
- [x] Google's built-in CMP auto-updates to TCF v2.3 — no manual version bump needed
- [ ] **ACTION REQUIRED**: Verify live TC string is v2.3 compliant

### How to verify the TC string
1. Open Chrome DevTools → Application → Cookies → `eupubconsent-v2`
2. Copy the cookie value
3. Paste into https://iabgdpr.com/tcf-string-decoder/
4. Confirm:
   - `version` = **3** (TCF v2.3 sets this to 3)
   - `disclosedVendors` segment is present
   - Google (vendor ID **755**) is included in `disclosedVendors`

### How to check AdSense TCF error report
1. AdSense → Reports → Advanced reports
2. Add dimension: **TCF error code**
3. Filter for error **1.4** — flags missing/malformed `disclosedVendors`
4. Target: **zero occurrences** of error 1.4

### ATP (Authorised Technology Partners) list
- Experiment started: 20 April 2026
- Permanent update: on or after **5 June 2026**
- Setting: AdSense → Privacy & messaging → European regulations → Ad technology partners
- Recommended: **"Automatically include commonly used ad partners"**
- [ ] **ACTION (post 5 June 2026)**: Review ATP list after permanent update is applied

### References
- TCF requirement: https://support.google.com/adsense/announcements/9189068
- Certified CMP list: https://support.google.com/adsense/answer/13554116
- Publisher TCF integration: https://support.google.com/adsense/answer/9804260
- TC string decoder: https://iabgdpr.com/tcf-string-decoder/
- ATP experiment: https://support.google.com/adsense/answer/16982531

---

## WP-11 — Consent Mode v2

**Mandatory for personalised ads to EEA/UK users.**

### What's already in the codebase (`index.html` + all pages)

```html
<!-- Consent Mode v2 defaults — fires BEFORE AdSense and GA4 -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'ad_storage':          'denied',
    'ad_user_data':        'denied',
    'ad_personalization':  'denied',
    'analytics_storage':   'denied',
    'wait_for_update':     500
  });
</script>
```

✅ All four required v2 signals are present: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`
✅ `wait_for_update: 500` gives the CMP 500ms to update consent before tags fire
✅ Block fires **before** the GA4 and AdSense `<script>` tags

### What the CMP must do on consent grant

When a user accepts in the GDPR banner, Google's built-in CMP automatically fires:

```javascript
gtag('consent', 'update', {
  'ad_storage':         'granted',
  'ad_user_data':       'granted',
  'ad_personalization': 'granted',
  'analytics_storage':  'granted'
});
```

- [ ] **ACTION**: Verify in DevTools → Network → filter `gtag` — after accepting the banner, confirm an `update` event fires with `granted` values
- [ ] **ACTION**: Verify in GA4 → Admin → Consent settings — confirm "Consent Mode" shows as active

### Pages covered
All HTML pages have the Consent Mode v2 default block in `<head>`:
- [x] index.html
- [x] 14k-gold-price-per-gram.html
- [x] 18k-gold-price-per-gram.html
- [x] 10k-gold-price-per-gram.html
- [x] scrap-gold-calculator.html
- [x] silver-price-per-kilo.html
- [x] how-many-grams-in-troy-ounce.html
- [x] about.html
- [x] privacy-policy.html
- [x] terms.html
- [x] contact.html

### References
- Consent Mode v2 overview: https://support.google.com/google-ads/answer/10000067
- Consent Mode developer guide: https://developers.google.com/tag-platform/security/guides/consent?hl=en
- AdSense Consent Mode: https://support.google.com/adsense/answer/13554116
