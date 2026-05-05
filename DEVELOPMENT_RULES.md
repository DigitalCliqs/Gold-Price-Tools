# GoldPriceTools Development Rules

Mandatory for every AI session, every change, no exceptions.

## Rule 1 - Read This File First
Before writing a single line of code, read this file completely.

## Rule 2 - Run Playwright Audit BEFORE Making Any Changes
python3 tools/playwright_audit.py https://goldpricetools.com/<page>
This gives you the baseline state before touching anything.

## Rule 3 - Run Playwright Audit AFTER Every Single Change
After every push and deploy, run the full audit again.
Do not declare anything done until the audit passes clean.

## Rule 4 - Playwright Audit Covers
- ARIA snapshot via page.locator('body').aria_snapshot()
- Console errors and warnings via page.on('console')
- Network failures via page.on('requestfailed')
- HTTP 4xx/5xx via page.on('response')
- Locator assertions via get_by_role() not raw CSS selectors
- CSS property checks via expect(locator).to_have_css()
- Stray text nodes in body
- Broken images
- Horizontal overflow
- Full-page screenshot in 400px strips, every strip reviewed
- Mobile via p.devices["iPhone 14 Pro"] real device profile

## Rule 5 - Review ALL Screenshot Strips
Every 400px strip from y=0 to y=pageHeight must be visually inspected.
Not just the top. Not just the bottom. Every single strip.

## Rule 6 - Use Role Locators Not Raw CSS
Wrong: page.evaluate("document.querySelector('.footer')")
Right: page.get_by_role('contentinfo') or page.locator('footer').first
Playwright best practices explicitly flag CSS class selectors as the anti-pattern.

## Rule 7 - Cross-Browser on Visual Changes
CSS/layout changes must be tested in:
- Chromium desktop 1440px
- iPhone 14 Pro via p.devices["iPhone 14 Pro"]

## Rule 8 - Fix First, Explain Second
When a bug is found: fix it, run the audit, show the passing result.

## Rule 9 - Playwright Reference Links
https://playwright.dev/docs/intro
https://playwright.dev/mcp/introduction
https://playwright.dev/agent-cli/introduction
https://playwright.dev/docs/api/class-playwright
https://playwright.dev/docs/best-practices

Key capabilities:
- aria_snapshot() - semantic tree, AI-native, no screenshot needed
- page.route() - mock API for stable calculator tests
- playwright.request - pure HTTP testing without browser
- expect(locator).to_have_css() - computed style assertions
- expect(locator).to_have_screenshot() - visual regression baseline
- tracing.start/stop() - time-travel debug trace

## Rule 10 - Audit Script Location
tools/playwright_audit.py is always up to date in this repo.
Run it. Read all output. Fix everything. Run it again.
