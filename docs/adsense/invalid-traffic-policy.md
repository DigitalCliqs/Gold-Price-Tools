# Invalid Traffic Prevention Policy

This policy outlines the steps GoldPriceTools takes to prevent invalid traffic, specifically focusing on publisher own-clicks.

## Publisher Own-Click Prohibition Policy

> "Publishers may not click their own ads or use any means to inflate impressions and/or clicks artificially, including manual methods. Testing your own ads by clicking on them is not permitted."
> — Google AdSense Program Policies

## Risk Profile for GoldPriceTools

As the owner of GoldPriceTools is also a frequent user of the application to check real-time spot prices and perform conversions, there is an elevated risk of accidental own-clicks. It is critical that strict measures are followed to ensure compliance with AdSense policies.

## Mandatory Acknowledgement

All developers, testers, and content editors must acknowledge and adhere to this policy.

| Name | Role | Date | Signature |
|---|---|---|---|
| | | | |
| | | | |

## Required "Development" Browser Profile Setup Steps

To mitigate the risk of accidental clicks, a dedicated "Development" browser profile MUST be used when accessing GoldPriceTools.

1. **Create Profile:** Open your web browser (Chrome, Firefox, Edge, etc.) and create a new user profile named "GPT Dev".
2. **Install Ad Blocker:** Immediately install an ad blocker extension in this profile. **uBlock Origin** is strongly recommended.
3. **Verify Blocking:** Navigate to the live GoldPriceTools site and ensure no AdSense ads are visible.
4. **Exclusive Use:** Always use this "GPT Dev" profile when developing, testing, or casually using the site. Never use your primary, unblocked browsing profile for GoldPriceTools access.

## Cloudflare Bot Fight Mode Verification Steps

*(Screenshots section placeholder)*

1. Log in to the Cloudflare dashboard.
2. Select the `goldpricetools.com` domain.
3. Navigate to **Security** > **Bots**.
4. Verify that **Bot Fight Mode** is toggled to the **ON** position.
