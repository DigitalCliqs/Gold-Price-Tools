"""
GoldPriceTools — Playwright Full Audit Script
Run this after EVERY change before marking anything as done.
Usage: python3 playwright_audit.py <url>
"""
from playwright.sync_api import sync_playwright, expect
from PIL import Image
import sys, time, json, random, os

def full_audit(url, label="page"):
    print(f"\n{'═'*70}")
    print(f"PLAYWRIGHT FULL AUDIT: {url}")
    print(f"{'═'*70}")

    with sync_playwright() as p:
        # ── DESKTOP AUDIT ─────────────────────────────────────────────────
        browser = p.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage'])

        # Capture console errors + network failures
        ctx = browser.new_context()
        page = ctx.new_page()
        console_msgs, net_failures, bad_responses = [], [], []
        page.on('console',       lambda m: console_msgs.append({'t': m.type, 'msg': m.text}))
        page.on('requestfailed', lambda r: net_failures.append(r.url))
        page.on('response',      lambda r: bad_responses.append(r.url) if r.status >= 400 else None)

        page.set_viewport_size({'width': 1440, 'height': 900})
        bust = random.randint(1, 9999999)
        full_url = f"{url}?_audit={bust}"
        page.goto(full_url, wait_until='networkidle', timeout=30000)
        time.sleep(4)

        # ── ARIA SNAPSHOT (AI-native structure read) ───────────────────────
        try:
            aria = page.locator('body').aria_snapshot()
            print(f"\n[ARIA SNAPSHOT] (first 800 chars):\n{aria[:800]}")
        except Exception as e:
            print(f"[ARIA] Error: {e}")

        # ── CONSOLE ERRORS ─────────────────────────────────────────────────
        errors = [m for m in console_msgs if m['t'] in ('error','warning')]
        print(f"\n[CONSOLE] {len(errors)} errors/warnings:")
        for m in errors: print(f"  [{m['t'].upper()}] {m['msg'][:120]}")

        # ── NETWORK FAILURES ───────────────────────────────────────────────
        print(f"\n[NETWORK FAILURES] {len(net_failures)}:")
        for u in net_failures: print(f"  ❌ {u[:100]}")
        print(f"\n[HTTP 4xx/5xx] {len(bad_responses)}:")
        for u in bad_responses: print(f"  ❌ {u[:100]}")

        # ── DOM ASSERTIONS via getByRole (not CSS anti-pattern) ────────────
        print(f"\n[LOCATOR ASSERTIONS]:")
        checks = [
            ('navigation',  page.get_by_role('navigation').first, 'nav'),
            ('heading h1',  page.get_by_role('heading', level=1).first, 'h1'),
            ('footer',      page.locator('footer').first, 'footer'),
            ('main',        page.locator('main').first, 'main'),
        ]
        for name, loc, _ in checks:
            try:
                expect(loc).to_be_visible(timeout=3000)
                r = loc.bounding_box()
                print(f"  ✅ {name}: visible, h={int(r['height'])}px, w={int(r['width'])}px")
            except Exception as e:
                print(f"  ❌ {name}: {str(e)[:80]}")

        # ── CSS PROPERTY CHECKS ────────────────────────────────────────────
        print(f"\n[CSS CHECKS]:")
        css_checks = [
            ('footer-inner grid', 'footer .footer-inner', 'display', 'grid'),
            ('nav sticky',        '.site-nav',            'position', 'sticky'),
        ]
        for name, sel, prop, expected in css_checks:
            try:
                loc = page.locator(sel).first
                actual = loc.evaluate(f"el => getComputedStyle(el).{prop.replace('-','')}")
                ok = expected in actual
                print(f"  {'✅' if ok else '❌'} {name}: {prop}={actual}")
            except Exception as e:
                print(f"  ⚠️  {name}: {e}")

        # ── STRAY TEXT NODES ───────────────────────────────────────────────
        stray = page.evaluate("""
          () => {
            const bad = [];
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let n;
            while(n = w.nextNode()){
              const t = n.textContent.trim();
              if(t === '>' || t === '<' || t === '>>' ) bad.push({text:t, parent:n.parentElement?.tagName});
            }
            return bad;
          }
        """)
        print(f"\n[STRAY TEXT NODES] {len(stray)}:")
        for s in stray: print(f"  ⚠️  '{s['text']}' in <{s['parent']}>")
        if not stray: print("  ✅ None")

        # ── BROKEN IMAGES ──────────────────────────────────────────────────
        broken_imgs = page.evaluate("""
          () => [...document.querySelectorAll('img')]
            .filter(i => !i.complete || i.naturalWidth === 0)
            .map(i => i.src)
        """)
        print(f"\n[BROKEN IMAGES] {len(broken_imgs)}:")
        for i in broken_imgs: print(f"  ❌ {i}")
        if not broken_imgs: print("  ✅ None")

        # ── HORIZONTAL OVERFLOW CHECK ──────────────────────────────────────
        overflow = page.evaluate("""
          () => ({
            overflow: document.body.scrollWidth > window.innerWidth + 5,
            scrollW: document.body.scrollWidth, vpW: window.innerWidth
          })
        """)
        print(f"\n[HORIZ OVERFLOW] {'❌ YES' if overflow['overflow'] else '✅ None'} (scroll={overflow['scrollW']} vp={overflow['vpW']})")

        # ── INTERNAL LINKS (collect for HTTP check) ────────────────────────
        internal_links = page.evaluate("""
          () => [...new Set([...document.querySelectorAll('a[href^="/"]')]
            .map(a => a.href))].slice(0, 15)
        """)
        print(f"\n[INTERNAL LINKS] Sampled {len(internal_links)}:")
        for l in internal_links[:5]: print(f"  {l}")

        # ── FULL-PAGE SCREENSHOT in 400px STRIPS ──────────────────────────
        out_dir = f"/tmp/audit_{label}"
        os.makedirs(out_dir, exist_ok=True)
        page.screenshot(path=f"{out_dir}/desktop_full.png", full_page=True)
        img = Image.open(f"{out_dir}/desktop_full.png")
        w, th = img.size
        strips = []
        for i in range(0, th, 400):
            strip = img.crop((0, i, w, min(th, i+400)))
            strip.save(f"{out_dir}/strip_{i:05d}.png")
            strips.append(i)
        print(f"\n[SCREENSHOTS] Desktop full page: {w}x{th}px → {len(strips)} strips saved to {out_dir}/")

        ctx.close()

        # ── MOBILE AUDIT (real device profile) ────────────────────────────
        mobile_ctx = browser.new_context(**p.devices["iPhone 14 Pro"])
        mpage = mobile_ctx.new_page()
        mpage.goto(full_url, wait_until='networkidle', timeout=30000)
        time.sleep(3)
        mob_overflow = mpage.evaluate("() => document.body.scrollWidth > window.innerWidth + 5")
        mob_nav      = mpage.locator('.site-nav').first.bounding_box()
        mob_h1       = mpage.get_by_role('heading', level=1).first.bounding_box()
        mpage.screenshot(path=f"{out_dir}/mobile_full.png", full_page=True)
        print(f"\n[MOBILE iPhone 14 Pro]:")
        print(f"  Horiz overflow: {'❌' if mob_overflow else '✅'}")
        print(f"  Nav: {mob_nav}")
        print(f"  H1:  {mob_h1}")
        mobile_ctx.close()

        browser.close()

    print(f"\n{'═'*70}")
    print("AUDIT COMPLETE — review all strips in: " + out_dir)
    print(f"{'═'*70}\n")

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://goldpricetools.com'
    label = url.replace('https://','').replace('/','_').replace('.','_')
    full_audit(url, label)
