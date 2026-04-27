# API Health Monitor Runbook

This document describes the automated API health monitoring for the primary data provider (`gold-api.com`) and outlines the fallback procedures.

## Detection Criteria

A GitHub Actions cron workflow (`.github/workflows/api-health.yml`) runs every 15 minutes to check the health of the primary `gold-api.com` endpoint. An incident is detected and an issue is automatically opened if any of the following conditions are met:

1.  **HTTP Failure**: The API returns a non-200 HTTP status code, or the `curl` request fails entirely (e.g., DNS resolution failure, connection timeout).
2.  **Missing Timestamp**: The JSON response does not contain the `updatedAt` field.
3.  **Stale Data**: The `updatedAt` timestamp is older than 30 minutes from the current time.

## Auto-Issue Contents

When a failure is detected, the workflow opens a new issue in the repository with the label `api-health`. The issue contains:

*   A descriptive title indicating the specific failure (e.g., HTTP error, missing timestamp, or stale data).
*   The exact HTTP status code and `curl` exit code (if applicable).
*   The age of the data (if applicable).
*   The raw JSON response body (or error output) to assist with debugging.

## Manual Fallback Steps

If an `api-health` issue is opened, follow these steps to verify the issue and decide if a provider switch is necessary:

1.  **Verify the Issue**:
    *   Manually test the endpoint in your browser or using `curl`:
        ```bash
        curl -s https://api.gold-api.com/price/XAU | jq .
        ```
    *   Check if the issue is a transient network error or a sustained outage.
2.  **Check Provider Status**:
    *   Visit the provider's website or status page (if available) to see if they have acknowledged an outage.
3.  **Evaluate Impact**:
    *   If the data is only slightly stale and the market is closed (e.g., weekend), no action may be needed.
    *   If the API is completely down during active trading hours, proceed to the provider switch procedure.

## Secondary Provider Switch Procedure (GoldAPI.io)

If the primary provider (`gold-api.com`) is confirmed to be unreliable or down, switch the frontend and worker to the secondary provider (`GoldAPI.io`).

*(Note: The exact implementation of this switch is currently out of scope for the API health PR and will be defined in a future PR. Generally, it involves updating the fetch URLs in the `*.html` files and `worker/gold-proxy.js`, and ensuring any required API keys are configured.)*
