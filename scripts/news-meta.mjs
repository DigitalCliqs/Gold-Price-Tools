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
 * Two classifiers share the taxonomy:
 *   • SMART (Claude) — reads the article and routes it by overall concept;
 *     constrained to the taxonomy via a json_schema so it can't invent a bad
 *     category/tag. Used automatically when ANTHROPIC_API_KEY is set (in
 *     .env.local). This is the recommended path for n8n. Override the model with
 *     ANTHROPIC_MODEL (default claude-opus-4-8; claude-haiku-4-5 is ~5x cheaper).
 *   • LEXICAL — offline keyword matching; the zero-config fallback (and --lexical).
 *
 * Actions:
 *   suggest  Print the suggested category + tags for an article.
 *   emit     Print a ready-to-paste front-matter block (suggested cat+tags).
 *   check    Lint articles against the contract (default: all; or one --file).
 *
 * Engine flags (suggest/emit): --ai (force Claude), --lexical (force offline),
 *   --explain (show the model's reasoning), --print-request (dump the Claude
 *   request without sending — key redacted).
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
const KNOWN_TAG_SLUGS = Object.keys(TAX.tags);
const RULES = TAX.rules ?? {};

// Load .env.local / .env (KEY=VALUE; same shape as scripts/fetch-news-image.js)
// so ANTHROPIC_API_KEY / ANTHROPIC_MODEL are available for the smart classifier.
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

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

// ── Smart classifier (Claude) ───────────────────────────────────────────────
// The lexical functions above match words; this reads the article and routes it
// by overall concept. It's the recommended path for n8n. Constrained to the same
// taxonomy via a json_schema (category is one of the 4 enum slugs; tags must come
// from the vocabulary), so a wrong free-text answer is impossible. Raw fetch to
// the Messages API — matches scripts/fetch-news-image.js's zero-dependency style
// and avoids touching the repo's tracked (scope-guard-protected) package-lock.
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-opus-4-8'; // override with ANTHROPIC_MODEL (e.g. claude-haiku-4-5 for cheaper)

function buildClaudeRequest(title, body) {
  const cats = Object.entries(TAX.categories)
    .map(([slug, d]) => `- ${slug} — ${d.desc ?? d.title}`)
    .join('\n');
  const tags = Object.entries(TAX.tags)
    .map(([slug, d]) => `${slug} (${d.label})`)
    .join(', ');

  const system =
    'You are a precise news-desk editor for GoldPriceTools, a gold & silver price/news site. ' +
    'Classify an article into the site taxonomy by its OVERALL CONCEPT and primary purpose — not by isolated keywords.\n\n' +
    `Categories (choose EXACTLY ONE — the single best home):\n${cats}\n\n` +
    `Tags: choose the ${RULES.tagMin ?? 2}-${RULES.tagMax ?? 5} most relevant from this controlled vocabulary, using the exact slug:\n${tags}\n\n` +
    'Only if a clearly central topic has no matching tag, propose up to 2 new lowercase-hyphenated tags in new_tag_suggestions; otherwise return []. ' +
    'Give a one-sentence reasoning for the category.';

  const text = `${title ? `TITLE: ${title}\n\n` : ''}ARTICLE:\n${(body || '').slice(0, 8000)}`;

  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
    },
    body: {
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: text }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              category: { type: 'string', enum: CATEGORY_SLUGS },
              tags: { type: 'array', items: { type: 'string', enum: KNOWN_TAG_SLUGS } },
              new_tag_suggestions: { type: 'array', items: { type: 'string' } },
              reasoning: { type: 'string' },
            },
            required: ['category', 'tags', 'new_tag_suggestions', 'reasoning'],
          },
        },
      },
    },
  };
}

export async function classifyWithClaude(title, body) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set (add it to .env.local)');
  const req = buildClaudeRequest(title, body);

  let res;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
    if (res.ok) break;
    if ([429, 500, 529].includes(res.status) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      continue;
    }
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('model declined to classify this article');
  const block = (data.content || []).find((b) => b.type === 'text');
  if (!block) throw new Error('no text content in response');
  const out = JSON.parse(block.text);

  // Defensively re-validate against the taxonomy (the schema already constrains it).
  const category = CATEGORY_SLUGS.includes(out.category) ? out.category : classifyCategory(title, body);
  const tags = [...new Set((out.tags || []).map(normalizeTag).filter(isKnownTag))].slice(0, RULES.tagMax ?? 5);
  const newTags = [...new Set((out.new_tag_suggestions || []).map(slugify).filter((t) => t && !isKnownTag(t)))].slice(0, 2);

  return { engine: `claude:${req.body.model}`, category, tags, newTags, reasoning: out.reasoning || '' };
}

// Resolve metadata via the chosen engine. 'auto' uses Claude when a key is
// present and falls back to lexical on any failure; 'ai' forces Claude (and
// errors if unavailable); 'lexical' forces the offline keyword classifier.
async function resolveMeta(title, body, engine) {
  if (engine !== 'lexical') {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    if (engine === 'ai' && !hasKey) {
      console.error('--ai requires ANTHROPIC_API_KEY (add it to .env.local). Or omit --ai to use the lexical fallback.');
      process.exit(2);
    }
    if (hasKey) {
      try {
        return await classifyWithClaude(title, body);
      } catch (e) {
        if (engine === 'ai') { console.error(`Claude classify failed: ${e.message}`); process.exit(1); }
        console.error(`! Claude unavailable (${e.message}); using lexical fallback.`);
      }
    }
  }
  return { engine: 'lexical', category: classifyCategory(title, body), tags: suggestTags(title, body), newTags: [], reasoning: '' };
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

  // Engine: --lexical forces offline keyword matching; --ai forces Claude;
  // default ('auto') uses Claude when ANTHROPIC_API_KEY is set, else lexical.
  const engine = arg('lexical') === true ? 'lexical' : (arg('ai') === true ? 'ai' : 'auto');

  // Inspect the exact Claude request without sending it (key redacted).
  if (arg('print-request') === true) {
    const req = buildClaudeRequest(title, body);
    req.headers['x-api-key'] = req.headers['x-api-key'] ? '***redacted***' : '(unset)';
    console.log(JSON.stringify(req, null, 2));
    return;
  }

  const meta = await resolveMeta(title, body, engine);

  if (action === 'suggest') {
    if (arg('json') === true) {
      process.stdout.write(JSON.stringify({
        engine: meta.engine, category: meta.category, tags: meta.tags,
        new_tags: meta.newTags, reasoning: meta.reasoning,
      }) + '\n');
    } else {
      console.log(`engine:   ${meta.engine}`);
      console.log(`category: ${meta.category}`);
      console.log(`tags:     [${meta.tags.map((t) => `"${t}"`).join(', ')}]`);
      if (meta.newTags.length) console.log(`new tags: ${meta.newTags.join(', ')}  (not in vocabulary — add to taxonomy.json if useful)`);
      if (meta.reasoning && (arg('explain') === true || meta.engine.startsWith('claude'))) console.log(`why:      ${meta.reasoning}`);
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
      `category: "${meta.category}"`,
      `tags: [${meta.tags.map((t) => `"${t}"`).join(', ')}]`,
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
    if (meta.newTags.length) console.error(`# note: suggested new tags not in vocabulary: ${meta.newTags.join(', ')}`);
    return;
  }

  console.error(`Unknown action "${action}". Use: suggest | emit | check`);
  process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
