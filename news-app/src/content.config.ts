import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// News articles. This schema is the validated, automation-friendly (n8n) surface:
// write a markdown file with this front-matter, run the build, commit the output.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['market-updates', 'gold', 'silver', 'analysis']),
    tags: z.array(z.string()).default([]),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // image: a root-relative self-hosted path ("/assets/news/foo.jpg", Pexels)
    // OR a full https URL (Unsplash hotlink — required by their API terms).
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    imageCredit: z.string().optional(),
    imageCreditUrl: z.string().optional(),
    author: z.string().default('GoldPriceTools Editorial Team'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
