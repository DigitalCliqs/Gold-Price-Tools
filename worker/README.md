# GoldPriceTools — Cloudflare Worker Proxy

This Worker sits between `index.html` and the [GoldAPI.io](https://www.goldapi.io/) API so that your **API key is never exposed in the browser**.

## Routes

| Route | Description |
|---|---|
| `GET /api/spot` | Live gold + silver spot prices, prev_close, timestamp |
| `GET /api/history?metal=XAU&days=30` | Historical price array (labels + data) |

Both responses are cached at Cloudflare's edge: 55 s for spot, 1 h for history.

## Setup

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Get a GoldAPI key
Sign up free at https://www.goldapi.io/ — the free tier gives 100 requests/month, paid plans start at $10/mo for unlimited.

### 3. Set the secret
```bash
cd worker
wrangler secret put GOLDAPI_KEY
# Paste your key when prompted
```

### 4. Deploy
```bash
wrangler deploy
```

The Worker will be live at `https://goldpricetools.com/api/spot` (routed via Cloudflare — your domain must be on Cloudflare).

### 5. Verify
```bash
curl https://goldpricetools.com/api/spot
# {"gold":3320.50,"goldPrevClose":3310.00,"silver":32.45,"silverPrevClose":32.10,"ts":1745449200000}
```

## Local dev
```bash
wrangler dev --local
# Worker runs at http://localhost:8787
# Update PROXY_BASE in index.html to http://localhost:8787 for local testing
```

## Environment Variables

| Variable | Type | Description |
|---|---|---|
| `GOLDAPI_KEY` | Secret | Your GoldAPI.io access token |
