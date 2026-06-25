#!/usr/bin/env node
/**
 * Copy the Astro build output (news-app/dist) into the repo's /news/ folder,
 * which Cloudflare Pages serves statically (no Pages build). Run after
 * `astro build`. /news/ becomes fully owned by the Astro output.
 *
 * /assets/news/ (images) and /news-sitemap.xml live OUTSIDE /news/ and are
 * untouched by this sync.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'news-app', 'dist');
const dest = path.join(root, 'news');

if (!fs.existsSync(dist)) {
  console.error('✗ news-app/dist not found — run the Astro build first.');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(dist, dest, { recursive: true });
const count = fs.readdirSync(dest).length;
console.log(`✓ Synced news-app/dist → /news/ (${count} top-level entries)`);
