# GoldPriceTools — Cloudflare Worker

This worker runs on the Cloudflare edge at `goldpricetools.com/api/*`.
It proxies two free, keyless data sources server-side so the browser avoids CORS restrictions.

## Routes

| Route | Description |
|---|---|
| `GET /api/chart?metal=XAU&range=1M` | Yahoo Finance historical chart data |
| `GET /api/spot` | gold-api.com live spot prices |

## Range values

| range | Yahoo range | Interval |
|---|---|---|
| `1M` | `1mo` | daily |
| `3M` | `3mo` | daily |
| `1Y` | `1y` | weekly |
| `5Y` | `5y` | weekly |
| `10Y` | `10y` | monthly |

## No API keys required

- **Charts**: Yahoo Finance public API (`query1.finance.yahoo.com/v8/finance/chart`) — free, no auth
- **Spot prices**: gold-api.com (`api.gold-api.com/price/XAU`) — free, no auth

## Deploy

```bash
cd worker
npm install -g wrangler   # if not installed
wrangler login
wrangler deploy
```

## Caching

- Chart data cached 1 hour at Cloudflare edge
- Spot prices cached 55 seconds

## CORS

Only allows requests from `https://goldpricetools.com`.
