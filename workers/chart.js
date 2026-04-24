/**
 * Cloudflare Worker — /api/chart
 * Proxies Yahoo Finance historical OHLCV data for gold (GC=F) and silver (SI=F).
 * Deploy to: goldpricetools.com/api/chart
 *
 * Query params:
 *   metal = XAU | XAG
 *   range = 1M | 3M | 1Y | 5Y | 10Y
 *
 * Returns JSON: { labels: string[], data: number[] }
 */

const TICKERS = { XAU: 'GC=F', XAG: 'SI=F' };
const RANGE_MAP = {
  '1M':  { range: '1mo',  interval: '1d'  },
  '3M':  { range: '3mo',  interval: '1d'  },
  '1Y':  { range: '1y',   interval: '1wk' },
  '5Y':  { range: '5y',   interval: '1wk' },
  '10Y': { range: '10y',  interval: '1mo' },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, max-age=3600',
  'Content-Type':                 'application/json',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url    = new URL(request.url);
    const metal  = (url.searchParams.get('metal') || 'XAU').toUpperCase();
    const range  = (url.searchParams.get('range') || '1M').toUpperCase();
    const ticker = TICKERS[metal];
    const cfg    = RANGE_MAP[range];

    if (!ticker || !cfg) {
      return new Response(JSON.stringify({ error: 'Invalid metal or range' }), {
        status: 400, headers: CORS_HEADERS,
      });
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${cfg.interval}&range=${cfg.range}`;

    try {
      const res = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceTools/1.0)' },
        cf: { cacheTtl: 3600, cacheEverything: true },
      });

      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

      const json   = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('No chart result from Yahoo Finance');

      const timestamps = result.timestamp || [];
      const closes     = result.indicators?.quote?.[0]?.close || [];

      const labels = [], data = [];
      timestamps.forEach((ts, i) => {
        const price = closes[i];
        if (price == null) return;
        labels.push(new Date(ts * 1000).toISOString().split('T')[0]);
        data.push(parseFloat(price.toFixed(2)));
      });

      return new Response(JSON.stringify({ metal, range, labels, data }), {
        status: 200, headers: CORS_HEADERS,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502, headers: CORS_HEADERS,
      });
    }
  },
};
