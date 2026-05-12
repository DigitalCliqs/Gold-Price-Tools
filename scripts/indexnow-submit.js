#!/usr/bin/env node
/**
 * IndexNow URL Submission Script
 * 
 * Submits URLs to search engines via the IndexNow protocol.
 * Supported engines: Bing, Yandex, Seznam, Naver (via api.indexnow.org)
 * 
 * Usage:
 *   node scripts/indexnow-submit.js                    # Submit all URLs from sitemap
 *   node scripts/indexnow-submit.js url1 url2 url3     # Submit specific URLs
 *   node scripts/indexnow-submit.js --changed           # Submit URLs changed in last git commit
 * 
 * Environment:
 *   INDEXNOW_KEY  — Override the API key (default: read from key file)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Configuration ───────────────────────────────────────────
const HOST = 'goldpricetools.com';
const API_KEY = process.env.INDEXNOW_KEY || '04019625ad6945b08e6de8a91a6b18eb';
const KEY_LOCATION = `https://${HOST}/${API_KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_BATCH = 10000; // IndexNow limit

// ─── URL Extraction ──────────────────────────────────────────

function getUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('❌ sitemap.xml not found at', SITEMAP_PATH);
    process.exit(1);
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const urls = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const url = match[1];
    // Only include URLs from our host
    if (url.includes(HOST)) {
      urls.push(url);
    }
  }
  return [...new Set(urls)]; // deduplicate
}

function getChangedUrls() {
  try {
    // Get HTML files changed in the last commit
    const diff = execSync('git diff --name-only HEAD~1 HEAD -- "*.html"', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8'
    }).trim();

    if (!diff) {
      console.log('ℹ️  No HTML files changed in last commit');
      return [];
    }

    return diff.split('\n').map(file => {
      // Convert file path to URL
      let urlPath = file
        .replace(/\\/g, '/')
        .replace(/index\.html$/, '')
        .replace(/\.html$/, '');
      
      if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
      // Trailing slash for directory index pages
      if (urlPath.endsWith('/') && urlPath !== '/') {
        return `https://${HOST}${urlPath}`;
      }
      return `https://${HOST}${urlPath}`;
    });
  } catch (err) {
    console.error('⚠️  Could not get git diff:', err.message);
    return [];
  }
}

// ─── IndexNow Submission ─────────────────────────────────────

function submitUrls(urls) {
  return new Promise((resolve, reject) => {
    if (urls.length === 0) {
      console.log('ℹ️  No URLs to submit');
      resolve({ status: 200, message: 'No URLs to submit' });
      return;
    }

    // Batch if needed
    const batch = urls.slice(0, MAX_URLS_PER_BATCH);
    
    const payload = JSON.stringify({
      host: HOST,
      key: API_KEY,
      keyLocation: KEY_LOCATION,
      urlList: batch
    });

    console.log(`📡 Submitting ${batch.length} URLs to IndexNow...`);
    console.log(`   Endpoint: ${INDEXNOW_ENDPOINT}`);
    console.log(`   Key: ${API_KEY.substring(0, 8)}...`);

    const url = new URL(INDEXNOW_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        const statusMessages = {
          200: '✅ URLs submitted successfully',
          202: '✅ URLs accepted for processing',
          400: '❌ Bad request — invalid format',
          403: '❌ Forbidden — key not valid for this host',
          422: '❌ Unprocessable — URLs don\'t match host',
          429: '⚠️  Rate limited — too many requests'
        };

        const message = statusMessages[status] || `Response: ${status}`;
        console.log(`   ${message}`);
        
        if (body) {
          console.log(`   Response body: ${body.substring(0, 200)}`);
        }

        if (status === 200 || status === 202) {
          resolve({ status, message, urls: batch.length });
        } else {
          reject(new Error(`IndexNow returned ${status}: ${message}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Network error:', err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let urls;

  if (args.includes('--changed')) {
    console.log('🔍 Mode: changed files (last git commit)');
    urls = getChangedUrls();
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    console.log('🔍 Mode: specific URLs');
    urls = args.map(u => u.startsWith('http') ? u : `https://${HOST}${u}`);
  } else {
    console.log('🔍 Mode: full sitemap');
    urls = getUrlsFromSitemap();
  }

  console.log(`   Found ${urls.length} URLs`);
  
  if (urls.length > 0) {
    // Log first 5 URLs as preview
    urls.slice(0, 5).forEach(u => console.log(`   • ${u}`));
    if (urls.length > 5) console.log(`   ... and ${urls.length - 5} more`);
    console.log('');
    
    try {
      const result = await submitUrls(urls);
      console.log(`\n🎉 Done! ${result.urls || 0} URLs submitted to IndexNow`);
      console.log('   Search engines notified: Bing, Yandex, Seznam, Naver');
    } catch (err) {
      console.error(`\n❌ Submission failed: ${err.message}`);
      process.exit(1);
    }
  }
}

main();
