#!/usr/bin/env node
/**
 * news-meta.mjs — route + tag + lint news articles from one taxonomy.
 *
 * The taxonomy (categories, curated tags, rules) lives in
 * news-app/src/lib/taxonomy.json — the single source of truth shared with the
 * Astro build (content.config.ts normalizes tags from the same file). Edit that
 * JSON to teach the system new tags or routing keywords; never hard-code them here.
 *
 * Designed for two publishing modes:
 *   • now  — Claude/you paste an article; run `suggest`/`emit` to get correct
 *            category + tags, then `check` to lint before committing.
 *   • later — n8n pipes title+body to `suggest --json` (or `emit`) to fill
 *            front-matter, writes the .md, then `check` gates the commit.
 *
 * Actions:
 *   suggest  Print the suggested category + tags for an article.
 *   emit     Print a ready-to-paste front-matter block (suggested cat+tags).
 *   check    Lint articles against the contract (default: all; or one --file).
 *
 * Input (suggest/emit):
 *   --file <path.md>           read title+body from a markdown file, OR
 *   --title "..." [--text "…"] pass content directly (text may also be piped
 *                              on stdin). --slug/--date seed the emit template.
 *   --json                     machine output for suggest (n8n).
 *
 * Examples:
 *   node scripts/news-meta.mjs suggest --file news-app/src/content/news/foo.md
 *   echo "<body>" | node scripts/news-meta.mjs suggest --title "Silver Surges" --json
 *   node scripts/news-meta.mjs emit --title "Gold Holds $4,500" --slug gold-holds-4500
 *   node scripts/news-meta.mjs check        # lint every article (CI/build gate)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TAXONOMY_PATH = path.join(ROOT, 'news-app', 'src', 'lib', 'taxonomy.json');
const CONTENT_DIR = path.join(ROOT, 'news-app', 'src', 'content', 'news');

const TAX = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
const CATEGORY_SLUGS = Object.keys(TAX.categories);
const RULES = TAX.rules ?? {};

// ── text helpers ──────────────────────────────────────────────────────────
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Count word-ish occurrences (lookarounds keep "uk" out of "ukraine").
function count(hay, needle) {
  const n = norm(needle).trim();
  if (!n) return 0;
  const m = hay.match(new RegExp(`(?<![a-z0-9])${esc(n)}(?![a-z0-9])`, 'g'));
  return m ? m.length : 0;
}
// Title matches weigh 3x body matches.
const scoreIn = (title, body, keys) =>
  keys.reduce((s, k) => s + 3 * count(title, k) + count(body, k), 0);
const scoreInTitle = (title, keys) => keys.reduce((s, k) => s + count(title, k), 0);

// ── tag normalization (mirrors content.config.ts) ───────────────────────────
export const slugify = (s) =>
  norm(s).trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

const SYNONYM_TO_CANON = (() => {
  const map = {};
  for (const [canon, def] of Object.entries(TAX.tags)) {
    map[canon] = canon;
    for (const syn of def.synonyms ?? []) map[slugify(syn)] = canon;
  }
  return map;
})();

export const normalizeTag = (t) => {
  const k = slugify(t);
  return SYNONYM_TO_CANON[k] ?? k;
};
const isKnownTag = (canon) => Object.prototype.hasOwnProperty.call(TAX.tags, canon);

// ── classifier ──────────────────────────────────────────────────────────────
// Priority mirrors how the existing articles are filed:
//   1. a market/weekly signal in the TITLE  -> market-updates (catch-all)
//   2. an analysis signal (ratio/forecast/"why"/"vs"…) -> analysis (type overlay)
//   3. otherwise the dominant metal (gold vs silver) by keyword score
//   4. nothing matched -> market-updates (fallback)
export function classifyCategory(title, body) {
  const t = norm(title);
  const b = norm(body);
  const C = TAX.categories;

  if (scoreInTitle(t, C['market-updates'].match) > 0) return 'market-updates';

  // A title signal is decisive; a body-only signal must be strong (>=4) so a
  // passing mention of "forecast"/"outlook" in a price story doesn't reroute it.
  const analysisInTitle = scoreInTitle(t, C.analysis.match);
  const analysisScore = scoreIn(t, b, C.analysis.match);
  if (analysisInTitle > 0 || analysisScore >= 4) return 'analysis';

  const g = scoreIn(t, b, C.gold.match);
  const s = scoreIn(t, b, C.silver.match);
  if (g === 0 && s === 0) return 'market-updates';
  if (g === s) return scoreInTitle(t, C.gold.match) >= scoreInTitle(t, C.silver.match) ? 'gold' : 'silver';
  return g > s ? 'gold' : 'silver';
}

export function suggestTags(title, body) {
  const t = norm(title);
  const b = norm(body);
  const scored = [];
  for (const [canon, def] of Object.entries(TAX.tags)) {
    const keys = [canon.replace(/-/g, ' '), def.label, ...(def.synonyms ?? []), ...(def.keywords ?? [])];
    const sc = scoreIn(t, b, keys);
    if (sc > 0) scored.push([canon, sc]);
  }
  scored.sort((a, b2) => b2[1] - a[1]);
  return scored.slice(0, RULES.tagMax ?? 5).map(([c]) => c);
}

// ── front-matter (minimal reader; articles use inline scalars + arrays) ──────
function splitFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: raw };
}
function fmScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return undefined;
  return m[1].trim().replace(/^["']|["']$/g, '');
}
function fmTags(fm) {
  const m = fm.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function readArticle(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { fm, body } = splitFrontMatter(raw);
  const title = fmScalar(fm, 'title') || (body.match(/^#\s+(.+)$/m)?.[1] ?? '');
  return {
    file,
    title,
    body,
    category: fmScalar(fm, 'category'),
    description: fmScalar(fm, 'description') || '',
    image: fmScalar(fm, 'image'),
    draft: fmScalar(fm, 'draft') === 'true',
    tags: fmTags(fm),
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : (process.argv.includes(`--${name}`) ? true : def);
}
async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function getInput() {
  const file = arg('file');
  if (typeof file === 'string') {
    const a = readArticle(path.resolve(file));
    return { title: a.title, body: a.body };
  }
  const title = typeof arg('title') === 'string' ? arg('title') : '';
  let text = typeof arg('text') === 'string' ? arg('text') : '';
  if (!text) text = await readStdin();
  return { title, body: text };
}

function lintArticle(a) {
  const errors = [];
  const warns = [];
  if (!a.title) errors.push('missing title');
  if (!a.description) errors.push('missing description');
  if (!a.category) errors.push('missing category');
  else if (!CATEGORY_SLUGS.includes(a.category)) errors.push(`invalid category "${a.category}" (use: ${CATEGORY_SLUGS.join(', ')})`);
  if (!a.draft && RULES.requireImageWhenPublished && !a.image) errors.push('published article has no image');

  const dlen = a.description.length;
  if (dlen && (dlen < (RULES.descriptionMin ?? 0) || dlen > (RULES.descriptionMax ?? 1e9)))
    warns.push(`description is ${dlen} chars (aim ${RULES.descriptionMin}-${RULES.descriptionMax})`);
  if (a.tags.length < (RULES.tagMin ?? 0)) warns.push(`only ${a.tags.length} tag(s) (aim >= ${RULES.tagMin})`);
  if (a.tags.length > (RULES.tagMax ?? 99)) warns.push(`${a.tags.length} tags (aim <= ${RULES.tagMax})`);
  for (const t of a.tags) {
    const c = normalizeTag(t);
    if (c !== t) warns.push(`tag "${t}" normalizes to "${c}"`);
    else if (!isKnownTag(c)) warns.push(`tag "${t}" not in vocabulary (fine, but check for a synonym)`);
  }
  if (a.category && CATEGORY_SLUGS.includes(a.category)) {
    const guess = classifyCategory(a.title, a.body);
    if (guess !== a.category) warns.push(`category "${a.category}" but classifier suggests "${guess}" — confirm placement`);
  }
  return { errors, warns };
}

async function main() {
  const action = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'suggest';

  if (action === 'check') {
    const file = arg('file');
    const files = typeof file === 'string'
      ? [path.resolve(file)]
      : fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).map((f) => path.join(CONTENT_DIR, f));
    let hardErrors = 0;
    let warnCount = 0;
    for (const f of files) {
      const a = readArticle(f);
      const { errors, warns } = lintArticle(a);
      if (errors.length || warns.length) {
        console.log(`\n${path.basename(f)}`);
        for (const e of errors) { console.log(`  ✗ ${e}`); hardErrors++; }
        for (const w of warns) { console.log(`  ⚠ ${w}`); warnCount++; }
      }
    }
    console.log(`\nchecked ${files.length} article(s): ${hardErrors} error(s), ${warnCount} warning(s)`);
    process.exit(hardErrors > 0 ? 1 : 0);
  }

  const { title, body } = await getInput();
  if (!title && !body) {
    console.error('Provide --file <path.md>, or --title "…" (with --text "…" or piped stdin).');
    process.exit(2);
  }
  const category = classifyCategory(title, body);
  const tags = suggestTags(title, body);

  if (action === 'suggest') {
    if (arg('json') === true) {
      process.stdout.write(JSON.stringify({ category, tags }) + '\n');
    } else {
      console.log(`category: ${category}`);
      console.log(`tags:     [${tags.map((t) => `"${t}"`).join(', ')}]`);
    }
    return;
  }

  if (action === 'emit') {
    const slug = typeof arg('slug') === 'string' ? arg('slug') : 'article-slug';
    const date = typeof arg('date') === 'string' ? arg('date') : new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const block = [
      '---',
      `title: "${title || 'TODO title'}"`,
      'description: "TODO: 60-165 char summary for SEO + social"',
      `category: "${category}"`,
      `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
      `pubDate: ${date}`,
      `image: "/assets/news/${slug}.jpg"`,
      'imageAlt: "TODO descriptive alt text"',
      'imageCredit: "Photographer / Pexels"',
      'imageCreditUrl: "https://www.pexels.com/@photographer"',
      'author: "GoldPriceTools Editorial Team"',
      'featured: false',
      'draft: false',
      '---',
    ].join('\n');
    console.log(block);
    return;
  }

  console.error(`Unknown action "${action}". Use: suggest | emit | check`);
  process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
