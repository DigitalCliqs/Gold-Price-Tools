#!/usr/bin/env node
/**
 * Sitemap generator — scans all HTML pages, extracts canonical URLs + hreflang
 * alternates, derives lastmod from git history, and writes sitemap.xml.
 *
 * Priority / changefreq table mirrors the hand-maintained sitemap:
 *   /                                   → 1.0  hourly
 *   /10k|14k|18k-gold-price-per-gram    → 0.95 hourly
 *   /scrap-gold-calculator              → 0.9  hourly
 *   /silver-price-per-kilo              → 0.9  hourly
 *   /gold-and-silver-price-today/       → 0.9  always
 *   /guides/what-is-14k-gold            → 0.8  monthly
 *   /guides/how-to-calculate-scrap-gold → 0.8  monthly
 *   /guides/*                           → 0.75 monthly
 *   /how-many-grams-in-troy-ounce       → 0.75 monthly
 *   /about | /contact                   → 0.4  yearly
 *   /privacy-policy | /terms            → 0.3  yearly
 *
 * Run via: node scripts/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const DEFAULT_IMAGE = 'https://assets.goldpricetools.com/og-image.jpg';

// ── helpers ───────────────────────────────────────────────────────────────────

function findHtmlFiles(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function extractAttr(html, tagPattern, attrName) {
  const re = new RegExp(`<${tagPattern}([^>]+)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return null;
  const attrMatch = tagMatch[1].match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return attrMatch ? attrMatch[1] : null;
}

function extractCanonical(content) {
  const m = content.match(/<link([^>]+)>/gi);
  if (!m) return null;
  for (const tag of m) {
    if (/rel=["']canonical["']/i.test(tag)) {
      const h = tag.match(/href=["']([^"']+)["']/i);
      if (h) return h[1];
    }
  }
  return null;
}

function extractHreflang(content) {
  const links = [];
  const re = /<link([^>]+)>/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const attrs = m[1];
    if (!/rel=["']alternate["']/i.test(attrs)) continue;
    const hreflangM = attrs.match(/hreflang=["']([^"']+)["']/i);
    const hrefM = attrs.match(/href=["']([^"']+)["']/i);
    if (hreflangM && hrefM) links.push({ hreflang: hreflangM[1], href: hrefM[1] });
  }
  return links;
}

function extractOg(content, property) {
  // Try double-quoted then single-quoted content attribute, in both attribute orders.
  // Kept separate so apostrophes in content values aren't mis-treated as delimiters.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content="([^"]+)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content='([^']+)'`, 'i'),
    new RegExp(`<meta[^>]+content='([^']+)'[^>]+property=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return m[1];
  }
  return null;
}

function getLastmod(filePath) {
  try {
    const rel = path.relative(ROOT, filePath);
    const date = execSync(`git log -1 --format=%cs -- "${rel}"`, { cwd: ROOT }).toString().trim();
    return date || todayIso();
  } catch {
    return todayIso();
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getSchedule(url) {
  const p = url.replace('https://goldpricetools.com', '') || '/';
  if (p === '/') return { priority: '1.0', changefreq: 'hourly' };
  if (/^\/(10|14|18)k-gold-price-per-gram$/.test(p)) return { priority: '0.95', changefreq: 'hourly' };
  if (/^\/(scrap-gold-calculator|silver-price-per-kilo)$/.test(p)) return { priority: '0.9', changefreq: 'hourly' };
  if (p === '/gold-and-silver-price-today/') return { priority: '0.9', changefreq: 'always' };
  if (/^\/guides\/(what-is-14k-gold|how-to-calculate-scrap-gold)$/.test(p)) return { priority: '0.8', changefreq: 'monthly' };
  if (p.startsWith('/guides/')) return { priority: '0.75', changefreq: 'monthly' };
  if (/^\/(about|contact)$/.test(p)) return { priority: '0.4', changefreq: 'yearly' };
  if (/^\/(privacy-policy|terms)$/.test(p)) return { priority: '0.3', changefreq: 'yearly' };
  return { priority: '0.75', changefreq: 'monthly' };
}

function wantsImage(url) {
  const p = url.replace('https://goldpricetools.com', '') || '/';
  return !/^\/(about|contact|privacy-policy|terms)$/.test(p);
}

function xmlEsc(str) {
  // HTML already uses &amp; for &, which is valid XML — only escape bare & and < >
  return str
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── scan ──────────────────────────────────────────────────────────────────────

const htmlFiles = findHtmlFiles(ROOT);
const seen = new Set();
const pages = [];

for (const file of htmlFiles) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  // Skip redirect stubs (meta refresh)
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(content)) continue;

  const canonical = extractCanonical(content);
  if (!canonical) continue;
  if (seen.has(canonical)) continue;
  seen.add(canonical);

  const lastmod = getLastmod(file);
  const schedule = getSchedule(canonical);
  const hreflang = extractHreflang(content);
  const imgUrl = extractOg(content, 'og:image') || DEFAULT_IMAGE;
  const imgTitle = extractOg(content, 'og:title') || '';
  const imgDesc = extractOg(content, 'og:description') || '';
  const isHomepage = canonical === 'https://goldpricetools.com/';

  pages.push({ canonical, lastmod, schedule, hreflang, imgUrl, imgTitle, imgDesc, isHomepage });
}

// Sort: priority descending, URL ascending within same priority
pages.sort((a, b) => {
  const pd = parseFloat(b.schedule.priority) - parseFloat(a.schedule.priority);
  return pd !== 0 ? pd : a.canonical.localeCompare(b.canonical);
});

// ── render ────────────────────────────────────────────────────────────────────

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  '',
];

for (const { canonical, lastmod, schedule, hreflang, imgUrl, imgTitle, imgDesc, isHomepage } of pages) {
  lines.push('  <url>');
  lines.push(`    <loc>${canonical}</loc>`);
  lines.push(`    <lastmod>${lastmod}</lastmod>`);
  lines.push(`    <changefreq>${schedule.changefreq}</changefreq>`);
  lines.push(`    <priority>${schedule.priority}</priority>`);
  for (const { hreflang: lang, href } of hreflang) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`);
  }
  if (wantsImage(canonical)) {
    lines.push('    <image:image>');
    lines.push(`      <image:loc>${imgUrl}</image:loc>`);
    if (imgTitle) lines.push(`      <image:title>${xmlEsc(imgTitle)}</image:title>`);
    if (imgDesc)  lines.push(`      <image:caption>${xmlEsc(imgDesc)}</image:caption>`);
    if (isHomepage) lines.push('      <image:geo_location>United Kingdom</image:geo_location>');
    lines.push('    </image:image>');
  }
  lines.push('  </url>');
  lines.push('');
}

lines.push('</urlset>');
lines.push('');

fs.writeFileSync(SITEMAP_PATH, lines.join('\n'), 'utf8');
console.log(`✅ sitemap.xml written — ${pages.length} URL(s)`);
