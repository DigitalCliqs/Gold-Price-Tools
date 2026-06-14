#!/usr/bin/env bash
# SessionStart hook for Claude Code on the web: prepare the Stitch MCP server.
#
# Security model (unchanged): this hook NEVER authenticates and stores NO
# credentials. It only installs gcloud, generates the proxy/helper, writes the
# gitignored .mcp.json, and reports auth status. Each fresh web session still
# requires an interactive browser consent when not already logged in.
set -uo pipefail

# Only run in the remote (web) environment; no-op locally.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

# Async: let the session start immediately while gcloud installs in the
# background. This affects startup latency only — it does not change the
# per-session consent requirement or store any credentials.
echo '{"async": true, "asyncTimeout": 300000}'

bash "${CLAUDE_PROJECT_DIR:-.}/scripts/stitch-web-setup.sh"

# Make Playwright usable for tools/playwright_audit.py. The web sandbox blocks
# Playwright's browser CDN, so this fetches the matching Chrome for Testing build
# from the reachable storage.googleapis.com mirror into Playwright's browsers
# dir. Runs in the background (async hook above) and is idempotent — a fast
# no-op once the browser is present.
bash "${CLAUDE_PROJECT_DIR:-.}/tools/setup-playwright.sh" || true
