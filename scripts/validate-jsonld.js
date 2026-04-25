#!/usr/bin/env node
/**
 * WP-61: JSON-LD Validator
 * Validates all JSON-LD blocks in HTML files to catch malformed structured data
 * before deployment.
 *
 * Handles:
 *  - Multiple <script type="application/ld+json"> blocks per page
 *  - @graph arrays (Google's recommended multi-type pattern)
 *  - Graceful reporting: lists ALL errors before exiting, not just first
 *
 * Run via: node scripts/validate-jsonld.js
 */
const fs = require('fs');
const path = require('path');

const KNOWN_TYPES = new Set([
  'Article', 'BreadcrumbList', 'HowTo', 'FAQPage', 'WebSite', 'WebPage',
  'Organization', 'SoftwareApplication', 'Dataset', 'ItemList',
  'NewsArticle', 'BlogPosting', 'Product', 'Event', 'Person'
]);

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

  // Handle array of types (e.g. ["Article", "NewsArticle"])
  const types = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']];

  if (!parsed['@context']) {
    errors.push(`${filePath} [block ${blockIndex}]: missing @context`);
  }
  if (!parsed['@type']) {
    errors.push(`${filePath} [block ${blockIndex}]: missing @type`);
  }

  // Warn about unknown types (non-fatal)
  types.forEach(t => {
    if (t && !KNOWN_TYPES.has(t)) {
      console.warn(`  WARN: ${filePath} [block ${blockIndex}]: unknown @type "${t}" (may be valid)`);
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
      // Try to show a useful snippet of where the JSON broke
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
  console.error('❌ JSON-LD Validation FAILED:\n');
  errors.forEach(e => console.error('  • ' + e));
  console.error(`\n${errors.length} error(s) found across ${validated} JSON-LD block(s) in ${htmlFiles.length} HTML file(s).`);
  if (skipped > 0) console.warn(`  (${skipped} file(s) skipped due to read errors)`);
  process.exit(1);
} else {
  console.log('✅ JSON-LD Validation PASSED');
  console.log(`   Checked ${validated} JSON-LD block(s) across ${htmlFiles.length} HTML file(s). No errors.`);
  if (skipped > 0) console.warn(`   (${skipped} file(s) skipped due to read errors)`);
  console.log('');
  process.exit(0);
}
