// @ts-check
import { defineConfig } from 'astro/config';

// News system builds static HTML into the repo's /news/ folder so Cloudflare
// keeps serving static (no Pages build). base='/news' makes Astro's asset URLs
// (_astro/*) resolve correctly under the subpath.
export default defineConfig({
  site: 'https://goldpricetools.com',
  base: '/news',
  // Build to local dist/ (gitignored); a copy step syncs public output into /news/.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // We ship our own JSON-LD + sitemaps; keep Astro's footprint minimal.
  devToolbar: { enabled: false },
});
