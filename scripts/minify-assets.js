#!/usr/bin/env node
/**
 * Minifies the site's external CSS/JS assets.
 *
 * Editable SOURCES live in assets/src/*.{css,js}. This script minifies each one
 * (via esbuild) and writes the result to assets/<name> — the path the HTML
 * already references — so pages need no changes and the served files stay small.
 *
 * Workflow: edit assets/src/<file>, then run `npm run minify` and commit both.
 *
 * Run via: node scripts/minify-assets.js   (or: npm run minify)
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const SRC_DIR = path.join(__dirname, '..', 'assets', 'src');
const OUT_DIR = path.join(__dirname, '..', 'assets');

const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(css|js)$/.test(f));
if (files.length === 0) {
  console.log('No assets/src/*.{css,js} sources found — nothing to minify.');
  process.exit(0);
}

for (const file of files) {
  const loader = file.endsWith('.css') ? 'css' : 'js';
  const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
  const { code: min } = esbuild.transformSync(code, {
    loader,
    minify: true,
    legalComments: 'none',
  });
  const outPath = path.join(OUT_DIR, file);
  const before = Buffer.byteLength(code);
  const after = Buffer.byteLength(min);
  fs.writeFileSync(outPath, min);
  const pct = ((1 - after / before) * 100).toFixed(0);
  console.log(`✅ ${file}: ${before} → ${after} bytes (-${pct}%)`);
}
