#!/usr/bin/env node
/**
 * Google OAuth 2.0 — One-time Authorization Script
 * 
 * Opens your browser to authenticate with Google, then saves
 * a refresh token locally for future API access.
 * 
 * Usage: node scripts/google-auth.js
 * 
 * Credentials stored at: C:\Users\Slav\.gemini\credentials\
 */

const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ─── Configuration ───────────────────────────────────────────
const CREDS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.gemini', 'credentials');
const CLIENT_FILE = path.join(CREDS_DIR, 'oauth-client.json');
const TOKEN_FILE = path.join(CREDS_DIR, 'google-tokens.json');
const PORT = 3000;

// Scopes for Search Console + Analytics (read-only)
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',     // Search Console
  'https://www.googleapis.com/auth/analytics.readonly',       // GA4 Data
  'https://www.googleapis.com/auth/adsense.readonly',         // AdSense (optional)
].join(' ');

// ─── Load Client Credentials ─────────────────────────────────
if (!fs.existsSync(CLIENT_FILE)) {
  console.error('❌ OAuth client file not found at:', CLIENT_FILE);
  process.exit(1);
}

const client = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf-8')).installed;
const CLIENT_ID = client.client_id;
const CLIENT_SECRET = client.client_secret;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// ─── Build Auth URL ──────────────────────────────────────────
const authParams = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPES,
  access_type: 'offline',
  prompt: 'consent',  // Force consent to always get refresh_token
});

const authUrl = `https://accounts.google.com/o/oauth2/auth?${authParams.toString()}`;

// ─── Start Local Server to Catch Callback ────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Authorization denied</h1><p>${error}</p>`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ No authorization code received</h1>');
      return;
    }

    // Exchange code for tokens
    try {
      const tokens = await exchangeCode(code);
      
      // Save tokens
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: system-ui; max-width: 600px; margin: 80px auto; text-align: center;">
          <h1>✅ Authorization Successful!</h1>
          <p>Tokens saved to:<br><code>${TOKEN_FILE}</code></p>
          <p style="color: #666;">You can close this tab now.</p>
        </body>
        </html>
      `);

      console.log('');
      console.log('✅ Authorization successful!');
      console.log(`   Tokens saved to: ${TOKEN_FILE}`);
      console.log('   Access token expires in:', tokens.expires_in, 'seconds');
      console.log('   Refresh token:', tokens.refresh_token ? 'Received ✅' : 'Missing ❌');
      console.log('');
      console.log('You can now use the Google APIs. Close this terminal.');

      setTimeout(() => { server.close(); process.exit(0); }, 1000);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Token exchange failed</h1><pre>${err.message}</pre>`);
      console.error('Token exchange error:', err);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('🔐 Google OAuth Authorization');
  console.log('─'.repeat(50));
  console.log('');
  console.log('Opening your browser to sign in with Google...');
  console.log('');
  console.log('Scopes requested:');
  console.log('  • Google Search Console (read-only)');
  console.log('  • Google Analytics 4 (read-only)');
  console.log('  • Google AdSense (read-only)');
  console.log('');
  console.log('If the browser doesn\'t open, visit:');
  console.log(authUrl);
  console.log('');
  console.log('Waiting for callback on http://localhost:' + PORT + '/callback ...');

  // Open browser
  const openCmd = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${openCmd} "${authUrl}"`);
});

// ─── Exchange Auth Code for Tokens ───────────────────────────
function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            reject(new Error(`${data.error}: ${data.error_description}`));
          } else {
            resolve(data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
