import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import taxonomy from './lib/taxonomy.json';

// ── Tag normalization ───────────────────────────────────────────────────────
// Tags are freeform, but we fold them onto a canonical form so the taxonomy
// never fragments (e.g. "Central Bank", "central_bank", "central-banks" all
// become "central-banks"). Synonyms come from the shared taxonomy.json — the
// same file scripts/news-meta.mjs uses to suggest + lint. This runs at build
// time, so a mistyped tag is fixed before it ships, whether the article was
// written by hand or by n8n.
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

const TAG_CANON: Record<string, string> = {};
for (const [canon, def] of Object.entries(taxonomy.tags as Record<string, { synonyms?: string[] }>)) {
  TAG_CANON[canon] = canon;
  for (const syn of def.synonyms ?? []) TAG_CANON[slugify(syn)] = canon;
}
const normalizeTag = (t: string): string => TAG_CANON[slugify(t)] ?? slugify(t);

// News articles. This schema is the validated, automation-friendly (n8n) surface:
// write a markdown file with this front-matter, run the build, commit the output.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // The ONE placement key: it decides which homepage section + category
    // archive an article appears in. A silver article can never render in the
    // gold section. Keep these four in sync with taxonomy.json + lib/categories.ts.
    category: z.enum(['market-updates', 'gold', 'silver', 'analysis']),
    // Freeform, but normalized + deduped onto canonical slugs (see above).
    tags: z.array(z.string()).default([]).transform((arr) => [...new Set(arr.map(normalizeTag).filter(Boolean))]),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // image: a root-relative self-hosted path ("/assets/news/foo.jpg", Pexels)
    // OR a full https URL (Unsplash hotlink — required by their API terms).
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    imageCredit: z.string().optional(),
    imageCreditUrl: z.string().optional(),
    author: z.string().default('GoldPriceTools Editorial Team'),
    // Pin to the homepage hero. Among featured articles the newest wins the
    // hero slot; with none set, the newest article overall is used (= old
    // behavior, so this is a no-op until you opt in).
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
