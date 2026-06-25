#!/usr/bin/env node
/**
 * fetch-news-image.js — get a free-licence photo for a news article.
 *
 * COMPLIANCE BY DESIGN (per each provider's API guidelines):
 *   • Pexels   → DOWNLOAD + self-host into assets/news/<slug>.jpg.
 *                Pexels permits self-hosting; this is our primary source.
 *   • Unsplash → HOTLINK ONLY. Unsplash API terms REQUIRE using the
 *                images.unsplash.com URL directly (no self-hosting). The
 *                script returns the hotlink URL and fires the required
 *                download-tracking ping; it never saves the file.
 *   • auto (default) → try Pexels first (self-host), fall back to Unsplash.
 *
 * Attribution is printed for every image. A site-level "Photos provided by
 * Pexels / Unsplash" credit also lives on the /news/ page (prominent-link rule).
 *
 * Keys (free) in .env.local — auto-loaded, never committed:
 *   PEXELS_API_KEY        https://www.pexels.com/api/
 *   UNSPLASH_ACCESS_KEY   https://unsplash.com/developers  (Access Key only)
 *
 * Usage:
 *   node scripts/fetch-news-image.js --query "gold bullion bars" --slug gold-weekly-2026-06-23
 *   node scripts/fetch-news-image.js --query "silver coins" --slug silver-demand --provider unsplash
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Auto-load .env.local / .env (simple KEY=VALUE parser, no dependency).
function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^["']|["']$/g, '');
      if (val && !process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}
loadEnv();

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const query = arg('query');
const slug = arg('slug');
const provider = arg('provider', 'auto');
if (!query || !slug) {
  console.error('Usage: node scripts/fetch-news-image.js --query "<search>" --slug <article-slug> [--provider pexels|unsplash|auto]');
  process.exit(1);
}

const OUT_FILE = path.join(process.cwd(), 'assets', 'news', `${slug}.jpg`);
const PUBLIC_URL = `https://goldpricetools.com/assets/news/${slug}.jpg`;

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// PRIMARY: Pexels → self-host (download allowed by Pexels).
async function fromPexels() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`;
  const res = await fetch(u, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = await res.json();
  const p = (data.photos || [])[0];
  if (!p) return null;
  return {
    mode: 'download',
    imgUrl: p.src.large2x || p.src.landscape || p.src.large,
    credit: `${p.photographer} / Pexels`,
    creditUrl: p.photographer_url,
    alt: p.alt || query,
  };
}

// SECONDARY: Unsplash → HOTLINK ONLY (self-hosting forbidden by Unsplash terms).
async function fromUnsplash() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5&content_filter=high`;
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = await res.json();
  const p = (data.results || []).find((r) => r.width >= 1200) || data.results?.[0];
  if (!p) return null;
  // Required by Unsplash: fire the download-tracking endpoint when a photo is used.
  if (p.links?.download_location) {
    fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  }
  return {
    mode: 'hotlink',
    imgUrl: `${p.urls.raw}&w=1600&h=900&fit=crop&q=80&fm=jpg`, // images.unsplash.com CDN
    width: 1600,
    height: 900,
    credit: `${p.user.name} / Unsplash`,
    creditUrl: `${p.user.links.html}?utm_source=goldpricetools&utm_medium=referral`,
    alt: p.alt_description || query,
  };
}

(async () => {
  const order =
    provider === 'pexels' ? [fromPexels] :
    provider === 'unsplash' ? [fromUnsplash] :
    [fromPexels, fromUnsplash]; // auto: Pexels first (self-host), then Unsplash (hotlink)

  let pick = null;
  for (const fn of order) {
    try { pick = await fn(); } catch (e) { console.error(`  ! ${e.message}`); }
    if (pick) break;
  }
  if (!pick) {
    console.error('No image found. Check PEXELS_API_KEY / UNSPLASH_ACCESS_KEY in .env.local and that the query returns results.');
    process.exit(2);
  }

  let finalUrl, w, h;
  if (pick.mode === 'download') {
    const bytes = await download(pick.imgUrl, OUT_FILE);
    finalUrl = PUBLIC_URL; w = 1200; h = 675;
    console.log(`\n✅ Saved ${path.relative(process.cwd(), OUT_FILE)} (${Math.round(bytes / 1024)} KB)  — self-hosted [Pexels]`);
  } else {
    finalUrl = pick.imgUrl; w = pick.width; h = pick.height;
    console.log(`\n↪ Unsplash HOTLINK (not downloaded — required by Unsplash API terms)`);
  }
  console.log(`   Credit: ${pick.credit}`);
  console.log(`\n— Paste into the article <figure>:`);
  console.log(`  <img src="${finalUrl}" width="${w}" height="${h}" alt="${(pick.alt || '').replace(/"/g, '')}" loading="eager" decoding="async">`);
  console.log(`  <figcaption>Photo: <a href="${pick.creditUrl}" rel="nofollow">${pick.credit}</a></figcaption>`);
  console.log(`\n— NewsArticle.image / og:image URL:\n  ${finalUrl}`);
})();
