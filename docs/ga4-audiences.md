# GA4 Remarketing Audiences

This document outlines the GA4 remarketing audiences configured for GoldPriceTools, aimed at retargeting high-intent users via Google Ads.

| Audience Name | Trigger Event | Suggested Membership Duration | Intended Ad Targeting |
| ------------- | ------------- | ----------------------------- | --------------------- |
| **High-Intent Calculator Users** | `calculator_engaged` | 30 Days | Users who interacted with any of the calculators (entered weight, karat, etc.). Target with general gold buying/selling services and investment opportunities. |
| **Scrap Gold Sellers** | `scrap_seller_intent` | 14 Days | Users showing high intent to sell scrap gold (clicked scrap CTA or filled 3+ scrap inputs). Target with "Cash for Gold" and scrap refining services. |
| **Deep Readers (Educational)** | `guide_deep_read` | 60 Days | Users who scrolled >75% on guide/educational pages. Target with educational content, newsletters, or long-term investment guides. |

## Event Definitions

- `calculator_engaged`: Fired once per page load when a user inputs data into any calculator field.
- `scrap_seller_intent`: Fired once per page load when a user either clicks a scrap calculator call-to-action or completes 3 or more inputs in the scrap gold calculator.
- `guide_deep_read`: Fired once per page load when a user scrolls past 75% of the page height on guides and info pages. Event listener is set as passive to avoid CWV/INP regressions.

## Consent Mode V2

All events are pushed to the `dataLayer` via the `gtag()` command. With Google Consent Mode V2 active, events are either dropped or queued. If a user grants consent (`analytics_storage: 'granted'`) mid-session, the Google tag automatically flushes the queue and sends the events to GA4.
