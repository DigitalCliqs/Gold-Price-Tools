#!/usr/bin/env node
/**
 * WP-61: JSON-LD Validator + Rich Results property checks
 *
 * Pass 1 — JSON validity: every <script type="application/ld+json"> block
 *           must parse cleanly and have @context + @type.
 *
 * Pass 2 — Rich Results eligibility: type-specific required-field checks
 *           that mirror Google's Rich Results Test criteria. Google's API
 *           requires a key and is not suitable for open CI; these checks
 *           replicate the documented required/recommended properties for
 *           each eligible type (Article, FAQPage, BreadcrumbList, HowTo,
 *           Product, WebSite, WebPage, Organization, Person,
 *           SoftwareApplication, Dataset, WebApplication).
 *
 * Run via: node scripts/validate-jsonld.js
 */
const fs = require('fs');
const path = require('path');

const KNOWN_TYPES = new Set([
  'Article', 'BreadcrumbList', 'HowTo', 'FAQPage', 'WebSite', 'WebPage',
  'Organization', 'SoftwareApplication', 'Dataset', 'ItemList',
  'NewsArticle', 'BlogPosting', 'Product', 'Event', 'Person', 'WebApplication',
]);

// Shared checker for Article / NewsArticle / BlogPosting
function checkArticle(obj) {
  const errs = [];
  const t = [].concat(obj['@type'])[0] || 'Article';
  if (!obj.headline)       errs.push(`${t}: missing headline`);
  if (!obj.author)         errs.push(`${t}: missing author (required for Article rich result)`);
  if (!obj.datePublished)  errs.push(`${t}: missing datePublished`);
  if (!obj.image)          errs.push(`${t}: missing image (required for Article rich result)`);
  return errs;
}

// Rich Results required-field checks per type.
// Returns an array of error strings; empty = pass.
const RICH_RESULTS_CHECKS = {
  Article:     checkArticle,
  NewsArticle: checkArticle,
  BlogPosting: checkArticle,

  HowTo(obj) {
    const errs = [];
    if (!obj.name) errs.push('HowTo: missing name');
    if (!obj.step) {
      errs.push('HowTo: missing step (array of HowToStep required for rich result)');
    } else {
      const steps = Array.isArray(obj.step) ? obj.step : [obj.step];
      if (steps.length === 0) errs.push('HowTo: step array is empty');
      steps.forEach((s, i) => {
        if (!s.name) errs.push(`HowTo.step[${i}]: missing name`);
        if (!s.text) errs.push(`HowTo.step[${i}]: missing text`);
      });
    }
    return errs;
  },

  FAQPage(obj) {
    const errs = [];
    if (!obj.mainEntity) return ['FAQPage: missing mainEntity (required for FAQ rich result)'];
    const items = Array.isArray(obj.mainEntity) ? obj.mainEntity : [obj.mainEntity];
    items.forEach((q, i) => {
      if (!q.name) errs.push(`FAQPage.mainEntity[${i}]: missing name (question text)`);
      if (!q.acceptedAnswer) errs.push(`FAQPage.mainEntity[${i}]: missing acceptedAnswer`);
      else if (!q.acceptedAnswer.text) errs.push(`FAQPage.mainEntity[${i}].acceptedAnswer: missing text`);
    });
    return errs;
  },

  BreadcrumbList(obj) {
    const errs = [];
    if (!obj.itemListElement) return ['BreadcrumbList: missing itemListElement'];
    const items = Array.isArray(obj.itemListElement) ? obj.itemListElement : [obj.itemListElement];
    if (items.length < 2) errs.push('BreadcrumbList: needs ≥2 items for rich result eligibility');
    items.forEach((item, i) => {
      if (!item.name)             errs.push(`BreadcrumbList.itemListElement[${i}]: missing name`);
      if (item.position == null)  errs.push(`BreadcrumbList.itemListElement[${i}]: missing position`);
    });
    return errs;
  },

  Product(obj) {
    const errs = [];
    if (!obj.name) errs.push('Product: missing name');
    if (!obj.review && !obj.aggregateRating && !obj.offers) {
      errs.push('Product: must have at least one of review, aggregateRating, or offers for rich result');
    }
    return errs;
  },

  Person(obj) {
    const errs = [];
    if (!obj.name) errs.push('Person: missing name');
    return errs;
  },

  WebSite(obj) {
    const errs = [];
    if (!obj.name) errs.push('WebSite: missing name');
    if (!obj.url)  errs.push('WebSite: missing url');
    return errs;
  },

  Organization(obj) {
    const errs = [];
    if (!obj.name) errs.push('Organization: missing name');
    if (!obj.url)  errs.push('Organization: missing url');
    return errs;
  },

  WebApplication(obj) {
    const errs = [];
    if (!obj.name)                errs.push('WebApplication: missing name');
    if (!obj.applicationCategory) errs.push('WebApplication: missing applicationCategory');
    if (!obj.offers)              errs.push('WebApplication: missing offers (required for SoftwareApp rich result)');
    return errs;
  },

  SoftwareApplication(obj) {
    const errs = [];
    if (!obj.name)                errs.push('SoftwareApplication: missing name');
    if (!obj.applicationCategory) errs.push('SoftwareApplication: missing applicationCategory');
    if (!obj.offers)              errs.push('SoftwareApplication: missing offers (required for rich result)');
    return errs;
  },

  Dataset(obj) {
    const errs = [];
    if (!obj.name)        errs.push('Dataset: missing name');
    if (!obj.description) errs.push('Dataset: missing description');
    if (!obj.url)         errs.push('Dataset: missing url');
    return errs;
  },

  WebPage(obj) {
    const errs = [];
    if (!obj.name) errs.push('WebPage: missing name');
    if (!obj.url)  errs.push('WebPage: missing url');
    return errs;
  },
};

function findHtmlFiles(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return files;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function validateBlock(parsed, filePath, blockIndex) {
  const errors = [];

  // Handle @graph pattern
  if (Array.isArray(parsed['@graph'])) {
    parsed['@graph'].forEach((item, i) => {
      if (!item['@type']) {
        errors.push(`${filePath} [block ${blockIndex}, @graph[${i}]]: missing @type`);
      }
    });
    return errors;
  }

  const types = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']];

  if (!parsed['@context']) {
    errors.push(`${filePath} [block ${blockIndex}]: missing @context`);
  }
  if (!parsed['@type']) {
    errors.push(`${filePath} [block ${blockIndex}]: missing @type`);
  }

  types.forEach(t => {
    if (t && !KNOWN_TYPES.has(t)) {
      console.warn(`  WARN: ${filePath} [block ${blockIndex}]: unknown @type "${t}" (may be valid)`);
    }
  });

  // Rich Results property checks
  types.forEach(t => {
    const checker = RICH_RESULTS_CHECKS[t];
    if (checker) {
      const richErrs = checker(parsed);
      richErrs.forEach(e => errors.push(`${filePath} [block ${blockIndex}] [rich-results]: ${e}`));
    }
  });

  return errors;
}

const htmlFiles = findHtmlFiles(process.cwd());
const errors = [];
let validated = 0;
let skipped = 0;

htmlFiles.forEach(file => {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.warn(`  WARN: Could not read ${file}: ${e.message}`);
    skipped++;
    return;
  }

  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gsi;
  let match;
  let blockIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    blockIndex++;
    validated++;
    const raw = match[1].trim();

    if (!raw) {
      errors.push(`${file} [block ${blockIndex}]: empty JSON-LD block`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const snippet = raw.substring(0, 120).replace(/\n/g, ' ');
      errors.push(`${file} [block ${blockIndex}]: Invalid JSON — ${e.message}\n    Near: ${snippet}...`);
      continue;
    }

    const blockErrors = validateBlock(parsed, file, blockIndex);
    errors.push(...blockErrors);
  }
});

console.log('');
if (errors.length > 0) {
  console.error('❌ JSON-LD + Rich Results Validation FAILED:\n');
  errors.forEach(e => console.error('  • ' + e));
  console.error(`\n${errors.length} error(s) found across ${validated} JSON-LD block(s) in ${htmlFiles.length} HTML file(s).`);
  if (skipped > 0) console.warn(`  (${skipped} file(s) skipped due to read errors)`);
  process.exit(1);
} else {
  console.log('✅ JSON-LD + Rich Results Validation PASSED');
  console.log(`   Checked ${validated} JSON-LD block(s) across ${htmlFiles.length} HTML file(s).`);
  console.log(`   All blocks valid. All eligible types pass rich results property checks.`);
  if (skipped > 0) console.warn(`   (${skipped} file(s) skipped due to read errors)`);
  console.log('');
  process.exit(0);
}
