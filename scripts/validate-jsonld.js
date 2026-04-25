#!/usr/bin/env node
/**
 * WP-61: JSON-LD Validator
 * Validates all JSON-LD blocks in HTML files to catch malformed structured data
 * before deployment. Run via: node scripts/validate-jsonld.js
 */
const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const htmlFiles = findHtmlFiles(process.cwd());
let errors = [];
let validated = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  let match;
  while ((match = regex.exec(content)) !== null) {
    validated++;
    try {
      const parsed = JSON.parse(match[1]);
      // Basic type check
      if (!parsed['@context'] || !parsed['@type']) {
        errors.push(`${file}: JSON-LD missing @context or @type`);
      }
    } catch (e) {
      errors.push(`${file}: Invalid JSON — ${e.message}`);
    }
  }
});

if (errors.length > 0) {
  console.error('\n❌ JSON-LD Validation FAILED:\n');
  errors.forEach(e => console.error('  • ' + e));
  console.error(`\n${errors.length} error(s) found in ${validated} JSON-LD blocks across ${htmlFiles.length} HTML files.`);
  process.exit(1);
} else {
  console.log(`\n✅ JSON-LD Validation PASSED`);
  console.log(`   Checked ${validated} JSON-LD block(s) across ${htmlFiles.length} HTML file(s). No errors.\n`);
  process.exit(0);
}
