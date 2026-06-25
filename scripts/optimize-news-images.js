#!/usr/bin/env node
/**
 * optimize-news-images.js — shrink self-hosted news photos in place.
 *
 * WHY: fetch-news-image.js self-hosts full-resolution Pexels downloads into
 * assets/news/. Those land at ~1880px wide and 100-965 KB each, but the news
 * pages only ever render them at <=1148 CSS px (the article hero; everything
 * else is a card/thumbnail). This re-encodes each JPEG to a sensible cap so the
 * page weight drops ~45% with no visible quality loss on the hero (1456px is
 * still 1.27x the hero's render width — crisp on retina).
 *
 * These files are referenced by literal /assets/news/<name>.jpg string paths and
 * are NOT astro:assets, so optimizing them needs no Astro rebuild — Cloudflare
 * serves them straight from the repo. Just run this, then commit the changed
 * JPEGs. Unsplash images are hotlinked (never self-hosted), so they're untouched.
 *
 * IDEMPOTENT: a file is only rewritten when re-encoding actually saves >=3%, so
 * re-running (or running after adding one new image) won't degrade already-
 * optimized photos through generational re-compression.
 *
 * Usage:
 *   node scripts/optimize-news-images.js            # optimize assets/news/*.jpg
 *   node scripts/optimize-news-images.js --dry      # report only, write nothing
 */
'use strict';
const fs = require('fs');
const path = require('path');

// sharp ships with news-app (mozjpeg encoder). Reuse it rather than installing
// a second copy at the repo root.
let sharp;
try {
  sharp = require(path.join(__dirname, '..', 'news-app', 'node_modules', 'sharp'));
} catch (e) {
  console.error('sharp not found. Run: npm --prefix news-app install');
  process.exit(1);
}

const MAX_WIDTH = 1456;   // >= the article hero's ~1148 CSS px render (1.27x retina)
const QUALITY = 82;       // mozjpeg quality; visually lossless for photographs
const MIN_SAVING = 0.03;  // only rewrite when it shaves at least 3% (idempotency guard)

const DRY = process.argv.includes('--dry');
const DIR = path.join(__dirname, '..', 'assets', 'news');

async function run() {
  const files = fs.readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  let origTot = 0, newTot = 0, changed = 0;

  for (const name of files) {
    const file = path.join(DIR, name);
    // Read into a buffer so sharp holds no handle on the file we write back to
    // (Windows refuses an in-place write while the input is still open).
    const input = fs.readFileSync(file);
    const orig = input.length;
    origTot += orig;

    // .rotate() bakes in any EXIF orientation; sharp strips metadata by default.
    const buf = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
      .toBuffer();

    const saved = 1 - buf.length / orig;
    const kept = saved < MIN_SAVING;
    newTot += kept ? orig : buf.length;

    if (!kept && !DRY) {
      fs.writeFileSync(file, buf);
      changed++;
    } else if (!kept) {
      changed++;
    }

    const tag = kept ? 'skip (optimized)' : `${(saved * 100).toFixed(0)}%`;
    console.log(
      `${name.padEnd(10)} ${(orig / 1024).toFixed(0).padStart(5)}KB -> ` +
      `${((kept ? orig : buf.length) / 1024).toFixed(0).padStart(4)}KB  ${tag}`,
    );
  }

  console.log(
    `\n${DRY ? '[dry] ' : ''}${changed}/${files.length} rewritten  ` +
    `${(origTot / 1024).toFixed(0)}KB -> ${(newTot / 1024).toFixed(0)}KB ` +
    `(saved ${((origTot - newTot) / 1024).toFixed(0)}KB, -${(100 - (newTot / origTot) * 100).toFixed(0)}%)`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
