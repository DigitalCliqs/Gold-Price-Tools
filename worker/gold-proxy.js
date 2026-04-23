/**
 * GoldPriceTools — Cloudflare Worker Proxy
 * Routes: GET /api/spot  |  GET /api/history?metal=XAU&days=30
 *
 * Required Cloudflare Worker Secret (set via wrangler or CF dashboard):
 *   GOLDAPI_KEY  — your key from https://www.goldapi.io/
 *
 * Deploy:
 *   cd worker
 *   wrangler deploy
 *
 * wrangler.toml (place in /worker/):
 *   name = "gold-price-proxy"
 *   main = "gold-proxy.js"
 *   compatibility_date = "2025-01-01"
 *   [vars]
 *   # GOLDAPI_KEY is set as a secret, not a var
 *   [[routes]]
 *   pattern = "goldpricetools.com/api/*"
 *   zone_name = "goldpricetools.com"
 */

const GOLDAPI_BASE  = 'https://www.goldapi.io/api';
const CACHE_TTL_SPOT = 55;        // seconds — just under 60s refresh
const CACHE_TTL_HIST = 3600;      // 1 hour for historical data

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://goldpricetools.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;   // e.g. /api/spot  or  /api/history

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return jsonError(405, 'Method not allowed');
    }

    const apiKey = env.GOLDAPI_KEY;
    if (!apiKey) return jsonError(500, 'GOLDAPI_KEY secret not configured');

    // ---------- /api/spot ----------
    if (path === '/api/spot' || path === '/api/spot/') {
      const cacheKey = new Request('https://cache.goldpricetools.com/spot', request);
      const cache    = caches.default;

      let cachedRes  = await cache.match(cacheKey);
      if (cachedRes) return addCors(cachedRes);

      const [goldRes, silverRes] = await Promise.all([
        fetchMetal('XAU', apiKey),
        fetchMetal('XAG', apiKey),
      ]);

      if (!goldRes.ok)   return jsonError(502, 'GoldAPI XAU error: ' + goldRes.status);
      if (!silverRes.ok) return jsonError(502, 'GoldAPI XAG error: ' + silverRes.status);

      const [g, s] = await Promise.all([goldRes.json(), silverRes.json()]);

      const payload = JSON.stringify({
        gold:             g.price,
        goldPrevClose:    g.prev_close_price,
        silver:           s.price,
        silverPrevClose:  s.prev_close_price,
        ts:               Date.now(),
      });

      const freshRes = new Response(payload, {
        status: 200,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SPOT}, s-maxage=${CACHE_TTL_SPOT}`,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, freshRes.clone()));
      return addCors(freshRes);
    }

    // ---------- /api/history ----------
    if (path === '/api/history' || path === '/api/history/') {
      const metal = (url.searchParams.get('metal') || 'XAU').toUpperCase();
      const days  = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30'), 1), 3650);

      if (!['XAU', 'XAG'].includes(metal)) return jsonError(400, 'metal must be XAU or XAG');

      const cacheKey = new Request(
        `https://cache.goldpricetools.com/history/${metal}/${days}`,
        request
      );
      const cache = caches.default;
      let cachedRes = await cache.match(cacheKey);
      if (cachedRes) return addCors(cachedRes);

      const labels = [], data = [];
      const today  = new Date();

      // GoldAPI historical endpoint: GET /XAU/USD/YYYYMMDD
      // We batch up to 30 individual dates or use the date-range sweep
      // For larger ranges, reduce data density (weekly/monthly sampling)
      const step = days <= 90 ? 1 : days <= 365 ? 7 : days <= 1825 ? 30 : 90;
      const fetchPromises = [];

      for (let i = days; i >= 0; i -= step) {
        const d    = new Date(today);
        d.setDate(d.getDate() - i);
        // Skip weekends (markets closed)
        if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
        const isoDate = d.toISOString().slice(0, 10);
        fetchPromises.push({ isoDate, promise: fetchMetalDate(metal, dateStr, apiKey) });
      }

      // Fetch all in parallel (Cloudflare allows high concurrency)
      const results = await Promise.all(
        fetchPromises.map(({ isoDate, promise }) =>
          promise
            .then(r => r.ok ? r.json() : null)
            .then(j => ({ isoDate, price: j?.price || null }))
            .catch(() => ({ isoDate, price: null }))
        )
      );

      results.forEach(({ isoDate, price }) => {
        if (price !== null) { labels.push(isoDate); data.push(price); }
      });

      const payload = JSON.stringify({ metal, days, labels, data });

      const freshRes = new Response(payload, {
        status: 200,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_HIST}, s-maxage=${CACHE_TTL_HIST}`,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, freshRes.clone()));
      return addCors(freshRes);
    }

    return jsonError(404, 'Not found — valid routes: /api/spot  /api/history?metal=XAU&days=30');
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function fetchMetal(metal, apiKey) {
  return fetch(`${GOLDAPI_BASE}/${metal}/USD`, {
    headers: {
      'x-access-token': apiKey,
      'Content-Type':   'application/json',
    },
  });
}

function fetchMetalDate(metal, dateStr, apiKey) {
  return fetch(`${GOLDAPI_BASE}/${metal}/USD/${dateStr}`, {
    headers: {
      'x-access-token': apiKey,
      'Content-Type':   'application/json',
    },
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function addCors(response) {
  const r = new Response(response.body, response);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}
