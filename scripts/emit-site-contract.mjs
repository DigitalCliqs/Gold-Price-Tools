#!/usr/bin/env node
// In-site Site Contract emitter — the native "installed plugin" (ManageWP-style).
//
// At build time this generates `site-contract.json` at the repo/deploy root from
// THIS site's own files, conforming to RatedStack's Site Contract schema. It ships
// with the template, so every clone self-describes at https://<domain>/site-contract.json
// — the highest-fidelity adapter (the site describing itself), with the factory's
// external adapters (repo-introspect / generic-crawler) as fallbacks.
//
// Dependency-free on purpose (runs in any site's build). Per-site overrides that
// aren't derivable from files live in site-contract.config.json (name, site_id, …).

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADAPTER = "in-site-emitter";
const ADAPTER_VERSION = "0.1.0";

const NEWS_DIR = "news-app/src/content/news";
const TAXONOMY_PATH = "news-app/src/lib/taxonomy.json";
const NEWS_PKG = "news-app/package.json";

const read = (p) => {
  try {
    return readFileSync(resolve(ROOT, p), "utf8");
  } catch {
    return null;
  }
};
const list = (d) => {
  try {
    return readdirSync(resolve(ROOT, d));
  } catch {
    return [];
  }
};
const exists = (p) => existsSync(resolve(ROOT, p));
const slugify = (s) => s.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
const titleCase = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const stripHtml = (p) => p.replace(/\.html$/i, "");
const round2 = (n) => Math.round(n * 100) / 100;

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (km) data[km[1]] = parseValue(km[2]);
  }
  return { data, body: m[2] ?? "" };
}
function parseValue(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v.startsWith("[")) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

const cfg = (() => {
  try {
    return JSON.parse(read("site-contract.config.json") ?? "{}");
  } catch {
    return {};
  }
})();

// ── identity ──
const cname = (read("CNAME") ?? "").trim();
if (!cname) {
  console.error("emit-site-contract: no CNAME — cannot establish identity.domain");
  process.exit(1);
}
const domain = cname.toLowerCase();
const canonicalBase = `https://${domain}`;
const siteId = cfg.site_id ?? domain.split(".")[0];
const tenantId = cfg.tenant_id ?? "ratedstack";
const name = cfg.name ?? titleCase(domain.split(".")[0]);

// ── taxonomy ──
let taxonomy;
const taxRaw = read(TAXONOMY_PATH);
if (taxRaw) {
  try {
    const tax = JSON.parse(taxRaw);
    const categories = Object.entries(tax.categories ?? {}).map(([id, def]) => ({
      id,
      label: def.title ?? titleCase(id),
      ...(def.desc ? { description: def.desc } : {}),
    }));
    const tags = Object.keys(tax.tags ?? {});
    if (categories.length || tags.length) {
      taxonomy = { ...(categories.length ? { categories } : {}), ...(tags.length ? { tags } : {}) };
    }
  } catch {
    /* leave undefined */
  }
}

// ── content inventory (skip drafts) ──
let content_inventory;
const mdFiles = list(NEWS_DIR).filter((f) => f.endsWith(".md")).sort();
if (mdFiles.length) {
  const items = [];
  for (const f of mdFiles) {
    const raw = read(`${NEWS_DIR}/${f}`);
    if (!raw) continue;
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) continue;
    const slug = f.replace(/\.md$/, "");
    const item = { slug, title: String(data.title ?? slug) };
    if (data.category) item.category = String(data.category);
    if (Array.isArray(data.tags)) item.tags = data.tags.map(String);
    if (data.author) item.author = String(data.author);
    if (data.pubDate) {
      const d = new Date(String(data.pubDate));
      if (!Number.isNaN(d.getTime())) item.pub_date = d.toISOString();
    }
    item.url = `${canonicalBase}/news/${slug}`;
    item.word_count = body.trim() ? body.trim().split(/\s+/).length : 0;
    items.push(item);
  }
  content_inventory = { total: items.length, items };
}

// ── authors ──
let authors;
const authorDirs = new Set(list("authors").filter((e) => !e.includes(".")));
const authorNames = new Set();
for (const it of content_inventory?.items ?? []) if (it.author) authorNames.add(it.author);
if (authorNames.size) {
  authors = [...authorNames].map((n) => {
    const s = slugify(n);
    return authorDirs.has(s) ? { name: n, url: `${canonicalBase}/authors/${s}/` } : { name: n };
  });
} else if (authorDirs.size) {
  authors = [...authorDirs].map((s) => ({ name: titleCase(s), url: `${canonicalBase}/authors/${s}/` }));
}

// ── pages ──
const pages = [{ type: "home", url: `${canonicalBase}/` }];
for (const [file, type] of [
  ["about.html", "about"],
  ["contact.html", "contact"],
  ["privacy-policy.html", "privacy"],
  ["privacy.html", "privacy"],
  ["terms.html", "terms"],
  ["terms-of-service.html", "terms"],
]) {
  if (exists(file)) pages.push({ type, url: `${canonicalBase}/${stripHtml(file)}` });
}

// ── tools (calculators) ──
let tools;
const toolFiles = list("").filter((e) => /\.html$/i.test(e) && /calculator/i.test(e)).sort();
if (toolFiles.length) {
  tools = toolFiles.map((f) => ({
    id: slugify(stripHtml(f)),
    label: titleCase(stripHtml(f)),
    url: `${canonicalBase}/${stripHtml(f)}`,
    kind: "calculator",
  }));
}

// ── seo ──
const seo = { canonical_base: canonicalBase };
if (exists("sitemap.xml")) seo.sitemap_url = `${canonicalBase}/sitemap.xml`;

// ── template ──
let template;
const pkgRaw = read(NEWS_PKG);
if (pkgRaw) {
  try {
    const pkg = JSON.parse(pkgRaw);
    const astro = pkg.dependencies?.astro ?? pkg.devDependencies?.astro;
    if (astro) template = { framework: "astro", generator: `astro@${String(astro).replace(/^[\^~]/, "")}` };
  } catch {
    /* ignore */
  }
}

// ── capabilities ──
const acceptsDispatch = exists(".github/workflows/publish-news.yml") || exists("AUTOMATION.md");
const provides = [];
if (taxonomy) provides.push("taxonomy");
if (content_inventory) provides.push("content_inventory");
if (pages.length) provides.push("pages");
if (tools) provides.push("tools");
if (authors) provides.push("authors");
if (seo) provides.push("seo");
if (template) provides.push("template");

const contract = {
  contract_version: "1.0",
  tenant_id: tenantId,
  site_id: siteId,
  generated_at: new Date().toISOString(),
  source: {
    adapter: ADAPTER,
    adapter_version: ADAPTER_VERSION,
    method: "native",
    coverage: round2(provides.length / 7),
    confidence: 0.95,
  },
  identity: { name, domain },
  capabilities: {
    provides,
    accepts_dispatch: acceptsDispatch,
    ...(acceptsDispatch ? { dispatch_event_types: ["publish-news"] } : {}),
    writable: true,
  },
};
if (taxonomy) contract.taxonomy = taxonomy;
if (content_inventory) contract.content_inventory = content_inventory;
if (pages.length) contract.pages = pages;
if (tools) contract.tools = tools;
if (authors) contract.authors = authors;
contract.seo = seo;
if (template) contract.template = template;
contract.extensions = { emitter: `${ADAPTER}@${ADAPTER_VERSION}` };

// ── dependency-free self-check (fail the build on a malformed Contract) ──
const errors = [];
for (const k of ["contract_version", "tenant_id", "site_id", "generated_at", "source", "identity", "capabilities"]) {
  if (contract[k] === undefined) errors.push(`missing required: ${k}`);
}
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(contract.identity.domain)) errors.push("identity.domain not a bare host");
if (content_inventory && content_inventory.total !== content_inventory.items.length) errors.push("content_inventory.total != items.length");
const DECLARABLE = ["taxonomy", "content_inventory", "pages", "tools", "authors", "seo", "template"];
for (const s of provides) if (contract[s] === undefined) errors.push(`provides lists "${s}" but it is absent`);
for (const s of DECLARABLE) if (contract[s] !== undefined && !provides.includes(s)) errors.push(`"${s}" present but not declared in provides`);
if (errors.length) {
  console.error("emit-site-contract: self-check FAILED:\n  " + errors.join("\n  "));
  process.exit(1);
}

writeFileSync(resolve(ROOT, "site-contract.json"), JSON.stringify(contract, null, 2) + "\n");
console.log(`emit-site-contract: wrote site-contract.json (site_id=${siteId}, coverage=${contract.source.coverage}, ${content_inventory?.total ?? 0} articles)`);
