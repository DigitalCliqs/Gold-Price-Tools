#!/usr/bin/env node
/**
 * Minifies the site's external CSS/JS assets AND cache-busts their HTML refs.
 *
 * Editable SOURCES live in assets/src/*.{css,js}. This script minifies each one
 * (via esbuild) and writes the result to assets/<name> — the path the HTML
 * already references — so the served files stay small.
 *
 * It then stamps a content hash onto every HTML reference of those assets, e.g.
 *   /assets/site.css  ->  /assets/site.css?v=1a2b3c4d
 * The filename stays stable, but the query changes whenever the file's bytes
 * change, so browsers/CDNs fetch the new version immediately on deploy instead
 * of serving a stale copy until the cache TTL expires. (This also makes it safe
 * to set a long `Cache-Control: max-age` on /assets/* at the CDN.)
 *
 * Workflow: edit assets/src/<file>, then run `npm run minify` and commit the
 * changed assets/<file> AND the re-stamped HTML.
 *
 * Run via: node scripts/minify-assets.js   (or: npm run minify)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'assets', 'src');
const OUT_DIR = path.join(ROOT, 'assets');

const srcFiles = fs.readdirSync(SRC_DIR).filter((f) => /\.(css|js)$/.test(f));
if (srcFiles.length === 0) {
  console.log('No assets/src/*.{css,js} sources found — nothing to minify.');
  process.exit(0);
}

// 1. Minify each source → assets/<name>, and record an 8-char content hash.
const hashes = {};
for (const file of srcFiles) {
  const loader = file.endsWith('.css') ? 'css' : 'js';
  const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
  const { code: min } = esbuild.transformSync(code, {
    loader,
    minify: true,
    legalComments: 'none',
  });
  fs.writeFileSync(path.join(OUT_DIR, file), min);
  hashes[file] = crypto.createHash('sha256').update(min).digest('hex').slice(0, 8);
  const before = Buffer.byteLength(code);
  const after = Buffer.byteLength(min);
  const pct = ((1 - after / before) * 100).toFixed(0);
  console.log(`✅ ${file}: ${before} → ${after} bytes (-${pct}%)  v=${hashes[file]}`);
}

// 2. Collect all HTML files (skip node_modules and dotfolders).
const htmlFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
})(ROOT);

// 3. Stamp ?v=<hash> on every reference to a versioned asset, replacing any
//    existing ?v=. Line endings are preserved (only the matched refs change).
let writes = 0;
for (const hp of htmlFiles) {
  const original = fs.readFileSync(hp, 'utf8');
  let updated = original;
  for (const [file, hash] of Object.entries(hashes)) {
    const escaped = file.replace(/[.]/g, '\\.');
    const re = new RegExp(`(/assets/${escaped})(\\?v=[a-f0-9]+)?`, 'g');
    updated = updated.replace(re, `$1?v=${hash}`);
  }
  if (updated !== original) {
    fs.writeFileSync(hp, updated);
    writes++;
  }
}
console.log(`🔖 Cache-bust stamps written to ${writes} HTML file(s).`);
