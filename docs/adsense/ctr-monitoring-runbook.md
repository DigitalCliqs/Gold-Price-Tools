# CTR Monitoring Runbook

This runbook defines the process for weekly Click-Through Rate (CTR) monitoring for the first 3 months post-launch to detect and mitigate invalid traffic.

## Baseline Thresholds

Unusually high CTR can be an indicator of invalid traffic or bot activity. We monitor against the following thresholds:

* **Site-wide CTR Flag:** `> 10%`
* **Per-page CTR Flag:** `> 15%`

If these thresholds are breached, an investigation must be initiated.

## GA4 × AdSense Linked-Report Navigation

*Prerequisite Note: This assumes the GA4 and AdSense link (WP-14) is already in place.*

1. Log in to **Google Analytics 4 (GA4)**.
2. Navigate to **Reports** in the left sidebar.
3. Go to **Monetization** > **Publisher ads**.
4. In the main table, look for the **Ad clicks** and **Ad impressions** columns to calculate CTR (Clicks / Impressions * 100).
5. To view per-page CTR, change the primary dimension of the table to **Page path and screen class**.

## Weekly Review Checklist

**Schedule:** Every Monday morning.
**Duration:** First 3 months post-launch.

- [ ] Check overall site CTR in AdSense dashboard for the past 7 days.
- [ ] Check per-page CTR in GA4 (Publisher ads report) for the past 7 days.
- [ ] Review Cloudflare Web Analytics for any unusual spikes in traffic from specific countries or ASNs.
- [ ] Verify Cloudflare Bot Fight Mode remains enabled.
- [ ] Check the Invalid Activity Log for any reported accidental clicks in the past week.

## Escalation Triggers

If any of the following triggers are met during the weekly review, take immediate action:

* **Trigger:** Overall site CTR exceeds 10% for 2 consecutive days.
    * **Action:** Investigate traffic sources in GA4. If specific referrers or regions are suspicious, consider implementing Cloudflare firewall rules to challenge or block that traffic. Report suspicious activity to AdSense via the Invalid Clicks Contact Form.
* **Trigger:** Per-page CTR exceeds 15%.
    * **Action:** Review the specific page layout. Ensure ad placement complies with AdSense policies and isn't encouraging accidental clicks (e.g., too close to interactive elements). Report if necessary.
* **Trigger:** Significant spike in direct traffic with 0s engagement time combined with ad clicks.
    * **Action:** Likely bot traffic. Review Cloudflare security settings. Report to AdSense.
