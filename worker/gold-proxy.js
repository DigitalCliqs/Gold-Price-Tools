/**
 * Cloudflare Worker — Gold/Silver price proxy
 * Keeps GOLDAPI_KEY secret server-side.
 * Deploy with: wrangler deploy
 *
 * Set secret:  wrangler secret put GOLDAPI_KEY
 * (paste your key when prompted — never commit it)
 *
 * Routes handled:
 *   GET /api/spot           → { gold, silver, goldChange, silverChange }
 *   GET /api/history?metal=XAU&days=30  → { labels[], data[] }
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = ['https://goldpricetools.com', 'https://www.goldpricetools.com'];

    // CORS — only allow our own domain (and localhost for dev)
    const corsOrigin = allowed.includes(origin) || origin.startsWith('http://localhost')
      ? origin
      : allowed[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const apiKey = env.GOLDAPI_KEY;
    const apiHeaders = { 'x-access-token': apiKey, 'Content-Type': 'application/json' };
    const BASE = 'https://www.goldapi.io/api';

    try {
      // ── /api/spot ────────────────────────────────────────────────────────────
      if (url.pathname === '/api/spot') {
        const [gRes, sRes] = await Promise.all([
          fetch(`${BASE}/XAU/USD`, { headers: apiHeaders }),
          fetch(`${BASE}/XAG/USD`, { headers: apiHeaders }),
        ]);
        if (!gRes.ok || !sRes.ok) throw new Error(`GoldAPI error ${gRes.status}`);
        const [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);

        const body = JSON.stringify({
          gold: gData.price,
          silver: sData.price,
          goldPrevClose: gData.prev_close_price,
          silverPrevClose: sData.prev_close_price,
          ts: Date.now(),
        });

        return new Response(body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=55', // cache just under 60s refresh
          },
        });
      }

      // ── /api/history ─────────────────────────────────────────────────────────
      if (url.pathname === '/api/history') {
        const metal = url.searchParams.get('metal') === 'XAG' ? 'XAG' : 'XAU';
        const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 3650);

        // Build list of dates (skip weekends — markets closed)
        const dates = [];
        const now = new Date();
        for (let i = days; i >= 0 && dates.length < days; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dow = d.getDay();
          if (dow !== 0 && dow !== 6) {
            dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
          }
        }

        // Fetch last-day and first-day to bracket the range (GoldAPI history)
        // For performance we sample at most 60 data points evenly
        const step = Math.max(1, Math.floor(dates.length / 60));
        const sampled = dates.filter((_, i) => i % step === 0);
        // Always include the most recent date
        if (sampled[sampled.length - 1] !== dates[dates.length - 1]) {
          sampled.push(dates[dates.length - 1]);
        }

        const fetches = sampled.map(d =>
          fetch(`${BASE}/${metal}/USD/${d}`, { headers: apiHeaders }).then(r => r.json())
        );
        const results = await Promise.all(fetches);

        const labels = [];
        const data = [];
        results.forEach((r, i) => {
          if (r && r.price) {
            const dateStr = sampled[i];
            const parsed = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
            labels.push(parsed);
            data.push(r.price);
          }
        });

        return new Response(JSON.stringify({ labels, data }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600', // history changes rarely
          },
        });
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
