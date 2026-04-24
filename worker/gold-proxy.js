/**
 * GoldPriceTools — Cloudflare Worker
 * Routes:
 *   GET /api/chart?metal=XAU&range=1M   → Yahoo Finance chart history (no API key)
 *   GET /api/spot                        → gold-api.com live spot prices (no API key)
 *
 * Deploy:
 *   cd worker
 *   wrangler deploy
 *
 * No secrets required — Yahoo Finance and gold-api.com are both free & keyless.
 *
 * Range map:
 *   1M  → 1mo  / 1d  (daily)
 *   3M  → 3mo  / 1d
 *   1Y  → 1y   / 1wk (weekly)
 *   5Y  → 5y   / 1wk
 *   10Y → 10y  / 1mo (monthly)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://goldpricetools.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Yahoo Finance tickers
const TICKERS = { XAU: 'GC=F', XAG: 'SI=F' };

// Range → [yahooRange, interval] map
const RANGE_MAP = {
  '1M':  ['1mo',  '1d'],
  '3M':  ['3mo',  '1d'],
  '1Y':  ['1y',   '1wk'],
  '5Y':  ['5y',   '1wk'],
  '10Y': ['10y',  '1mo'],
};

const CACHE_TTL_CHART = 3600;  // 1 hour for historical
const CACHE_TTL_SPOT  = 55;    // 55s for spot prices

export default {
  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return jsonError(405, 'Method not allowed');
    }

    // ── /api/chart ──────────────────────────────────────────────────────────
    if (path === '/api/chart') {
      const metal = (url.searchParams.get('metal') || 'XAU').toUpperCase();
      const range = (url.searchParams.get('range') || '1M').toUpperCase();

      if (!TICKERS[metal])   return jsonError(400, `metal must be XAU or XAG`);
      if (!RANGE_MAP[range]) return jsonError(400, `range must be 1M, 3M, 1Y, 5Y, or 10Y`);

      const cacheKey = new Request(`https://cache.goldpricetools.com/chart/${metal}/${range}`, request);
      const cache    = caches.default;
      const cached   = await cache.match(cacheKey);
      if (cached) return addCors(cached);

      const [yahooRange, interval] = RANGE_MAP[range];
      const ticker   = TICKERS[metal];
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${yahooRange}`;

      let yahooRes;
      try {
        yahooRes = await fetch(yahooUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceTools/1.0)',
            'Accept':     'application/json',
          },
        });
      } catch (e) {
        return jsonError(502, `Yahoo Finance fetch error: ${e.message}`);
      }

      if (!yahooRes.ok) {
        return jsonError(502, `Yahoo Finance HTTP ${yahooRes.status} for ${metal} ${range}`);
      }

      let json;
      try {
        json = await yahooRes.json();
      } catch (e) {
        return jsonError(502, `Yahoo Finance JSON parse error: ${e.message}`);
      }

      const result = json?.chart?.result?.[0];
      if (!result) return jsonError(502, 'No chart result from Yahoo Finance');

      const timestamps = result.timestamp || [];
      const closes     = result.indicators?.quote?.[0]?.close || [];

      const labels = [], data = [];
      timestamps.forEach((ts, i) => {
        const price = closes[i];
        if (price == null) return;
        labels.push(new Date(ts * 1000).toISOString().split('T')[0]);
        data.push(parseFloat(price.toFixed(2)));
      });

      const payload = JSON.stringify({ metal, range, labels, data });
      const fresh   = new Response(payload, {
        status: 200,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_CHART}, s-maxage=${CACHE_TTL_CHART}`,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, fresh.clone()));
      return addCors(fresh);
    }

    // ── /api/spot ────────────────────────────────────────────────────────────
    if (path === '/api/spot') {
      const cacheKey = new Request('https://cache.goldpricetools.com/spot', request);
      const cache    = caches.default;
      const cached   = await cache.match(cacheKey);
      if (cached) return addCors(cached);

      let gData, sData;
      try {
        const [gRes, sRes] = await Promise.all([
          fetch('https://api.gold-api.com/price/XAU'),
          fetch('https://api.gold-api.com/price/XAG'),
        ]);
        if (!gRes.ok || !sRes.ok) throw new Error(`gold-api HTTP ${gRes.status}/${sRes.status}`);
        [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);
      } catch (e) {
        return jsonError(502, `gold-api.com fetch error: ${e.message}`);
      }

      const payload = JSON.stringify({
        gold:            gData.price,
        goldPrevClose:   gData.prev_close_price,
        silver:          sData.price,
        silverPrevClose: sData.prev_close_price,
        ts:              Date.now(),
      });

      const fresh = new Response(payload, {
        status: 200,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SPOT}, s-maxage=${CACHE_TTL_SPOT}`,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, fresh.clone()));
      return addCors(fresh);
    }

    return jsonError(404, 'Valid routes: /api/chart?metal=XAU&range=1M  |  /api/spot');
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

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
