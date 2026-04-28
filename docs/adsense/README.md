# AdSense Documentation

This directory contains policies and runbooks related to Google AdSense integration, with a focus on compliance and preventing invalid traffic.

## Documents

* [Invalid Traffic Prevention Policy](./invalid-traffic-policy.md) - Outlines the prohibition on publisher own-clicks and the required browser setup for developers.
* [Invalid Activity Reporting Runbook](./invalid-activity-reporting.md) - Step-by-step procedure for reporting accidental clicks or suspected invalid traffic to Google.
* [CTR Monitoring Runbook](./ctr-monitoring-runbook.md) - Process for weekly CTR monitoring to detect anomalies post-launch.

## WP-37 Acceptance Criteria Checklist

- [x] Create `invalid-traffic-policy.md` covering own-click prohibition, risk profile, sign-offs, dev browser setup with ad blocker, and Cloudflare bot fight mode.
- [x] Create `invalid-activity-reporting.md` with step-by-step AdSense contact form instructions, email template, SLAs, and a log table.
- [x] Create `ctr-monitoring-runbook.md` defining baseline thresholds (>10% site, >15% page), GA4 navigation, and a weekly checklist.
- [x] Create an index `README.md` linking the docs and containing this checklist.
