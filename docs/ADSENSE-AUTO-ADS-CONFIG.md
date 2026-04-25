# AdSense Auto Ads — Advanced Settings Configuration

Configuration reference for GoldPriceTools.com Auto Ads settings post the 16 April 2026 mandatory migration.

---

## Background

On **16 April 2026**, Google permanently removed the Auto Ads ad load slider and replaced it with three discrete **Advanced Settings for banner ads**. Existing settings were auto-migrated by approximation — these need to be manually verified and set correctly.

---

## Recommended Configuration

### AdSense → Ads → Sites → GoldPriceTools.com → Banner ads → Advanced settings

| Setting | Recommended Value | Reason |
|---|---|---|
| **Maximum number of ads** | `3` | Site has 4 manual ad slots already. Auto Ads should supplement, not double the density. |
| **Minimum distance between ads** | `250px` | Prevents accidental clicks near calculator inputs and form elements. |
| **Find more placements on article pages** | `ON` | Long-form `/guides/` content benefits from mid-article placements. Keep OFF effect on tool pages is automatic. |

### How to apply
1. AdSense → **Ads** → Sites → Edit GoldPriceTools.com
2. Click **Banner ads** → **Advanced settings**
3. Set values as above
4. Save

---

## Vignette Additional Triggers

**Status: ON (default since 9 March 2026)**

Three additional triggers auto-activated on 9 March 2026:
- End of article → user scrolls back up (5s mobile / 10s desktop)
- User inactive 30s → resumes interaction
- Browser back button (Chrome, Edge, Opera)

### How to check / configure
1. AdSense → Ads → Edit site → **Overlay formats** → **Advanced settings**
2. Toggle "Allow additional triggers for vignette ads"

### Decision: **Keep ON**
Guide articles `/guides/*` have long session durations where these triggers are well-timed. Monitor bounce rate for 2 weeks.

**If bounce rate increases >10% vs baseline on guide pages → turn OFF.**

---

## Anchor Ads Position

**Setting: Bottom only**

1. AdSense → Ads → Edit site → **Overlay formats** → **Anchor ads**
2. Set position to **Bottom only**

Reason: Prevents anchor from covering the sticky navigation bar and calculator tabs on mobile.

---

## Manual Ad Slot IDs

The site uses 4 manual ad slots. These must be updated from `YOUR_SLOT_N` to real slot IDs once AdSense approves the site and generates slot IDs:

| Location | Slot variable | Page(s) |
|---|---|---|
| Below hero (leaderboard) | `YOUR_SLOT_1` | All pages |
| Mid-content | `YOUR_SLOT_2` | index.html |
| Sidebar | `YOUR_SLOT_3` | index.html |
| Above footer | `YOUR_SLOT_4` | index.html |

**Action required**: Once AdSense account is approved and slot IDs are issued, do a find/replace across all HTML files:
```bash
grep -rn "YOUR_SLOT" . --include="*.html"
```
Replace each `YOUR_SLOT_N` with the real `data-ad-slot` ID from AdSense → Ads → By ad unit.

---

## Monitoring Checklist (2 weeks post-configuration)

- [ ] RPM stable or improved vs pre-migration baseline
- [ ] Bounce rate on `/guides/*` not elevated vs pre-vignette-trigger baseline
- [ ] No CLS (Cumulative Layout Shift) caused by auto-inserted ad slots (check Core Web Vitals in Search Console)
- [ ] Mobile anchor ad not covering calculator tabs or form inputs (test on iPhone SE viewport 375px)

---

## References
- Advanced settings for banner ads: https://support.google.com/adsense/answer/16683740
- Vignette triggers announcement: https://support.google.com/adsense/announcements/9189068
