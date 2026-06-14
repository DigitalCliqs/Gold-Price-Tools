#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# setup-playwright.sh — make Playwright usable in Claude Code on the web.
#
# Why this exists
#   The web sandbox network policy blocks Playwright's browser CDN
#   (cdn.playwright.dev) and dl.google.com, so `playwright install chromium`
#   fails with a download error. The exact build Playwright needs is Google's
#   "Chrome for Testing", which is ALSO published on
#   storage.googleapis.com/chrome-for-testing-public/ — and that host IS
#   reachable from the sandbox. This script asks Playwright which build and
#   paths it wants (so it stays correct across Playwright upgrades) and fetches
#   them from the GCS mirror into Playwright's expected browsers directory.
#
# Idempotent: re-running is a fast no-op once the browsers are present.
# Used by: .claude/hooks/session-start.sh (async) and tools/playwright_audit.py
#          (self-heal). Safe to run manually:  bash tools/setup-playwright.sh
# ------------------------------------------------------------------------------
set -uo pipefail
log() { printf '[setup-playwright] %s\n' "$*"; }

# 1) Python packages — PyPI is reachable in the sandbox.
if ! python3 -c 'import playwright, PIL' >/dev/null 2>&1; then
  log "installing python deps (playwright, Pillow)…"
  pip install --quiet playwright Pillow >/dev/null 2>&1 || log "pip install reported an error (continuing)"
fi

# 2) Fetch the browser(s) Playwright wants, from the reachable GCS mirror.
python3 - <<'PY'
import os, re, sys, zipfile, shutil, stat, subprocess, tempfile

def log(m): print("[setup-playwright] " + m, flush=True)

CDN = "https://cdn.playwright.dev/builds/cft/"
GCS = "https://storage.googleapis.com/chrome-for-testing-public/"

try:
    dry = subprocess.run([sys.executable, "-m", "playwright", "install", "--dry-run", "chromium"],
                         capture_output=True, text=True, timeout=90).stdout
except Exception as e:
    log("could not run `playwright install --dry-run`: %r" % e); sys.exit(0)

# Each "Install location" line is immediately followed by its "Download url" line.
locs = re.findall(r'Install location:\s*(\S+)', dry)
urls = re.findall(r'Download url:\s*(\S+)', dry)

def install(dest_dir, url):
    # Only the Chrome-for-Testing chromium + headless-shell builds live on the
    # GCS mirror; skip anything else (e.g. ffmpeg, which we don't need).
    if "/builds/cft/" not in url:
        return
    gcs = url.replace(CDN, GCS)
    folder = os.path.basename(url)[:-4]                      # e.g. chrome-linux64
    binname = "chrome-headless-shell" if "headless-shell" in folder else "chrome"
    target_bin = os.path.join(dest_dir, folder, binname)
    if os.path.exists(target_bin):
        log("already present: %s" % target_bin)
    else:
        os.makedirs(dest_dir, exist_ok=True)
        log("downloading %s" % gcs)
        with tempfile.TemporaryDirectory() as td:
            zp = os.path.join(td, "b.zip")
            rc = subprocess.run(["curl", "-sL", "--retry", "4", "--max-time", "600",
                                 "-o", zp, gcs]).returncode
            if rc != 0 or not os.path.exists(zp):
                log("download failed (curl rc=%s)" % rc); return
            with zipfile.ZipFile(zp) as z:
                z.extractall(td)
            dst = os.path.join(dest_dir, folder)
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.move(os.path.join(td, folder), dst)
        # Python's zipfile drops the unix exec bit — restore it on the binaries.
        for f in os.listdir(os.path.join(dest_dir, folder)):
            if f.startswith("chrome") and "." not in f:
                p = os.path.join(dest_dir, folder, f)
                if os.path.isfile(p):
                    os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        open(os.path.join(dest_dir, "INSTALLATION_COMPLETE"), "w").close()
        log("installed: %s" % target_bin)

    # Maintain a stable, version-independent symlink for the full browser so
    # other tools (e.g. the Playwright MCP --executable-path) need no edits when
    # Playwright bumps the Chromium revision.
    if binname == "chrome":
        link = os.path.join(os.path.dirname(dest_dir), "chrome-latest")
        try:
            if os.path.islink(link) or os.path.exists(link):
                os.remove(link)
            os.symlink(target_bin, link)
        except OSError:
            pass

for dest, url in zip(locs, urls):
    if "chromium" in dest or "headless_shell" in dest:
        install(dest, url)
log("done")
PY
