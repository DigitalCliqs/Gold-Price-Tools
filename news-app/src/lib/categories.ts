// News taxonomy — 4 top categories (nav-level). Tags are freeform (per article).
export const CATEGORIES = {
  'market-updates': {
    title: 'Market Updates',
    blurb: 'Timely gold and silver market commentary and price moves.',
  },
  gold: {
    title: 'Gold',
    blurb: 'Gold prices, demand, central-bank buying and bullion news.',
  },
  silver: {
    title: 'Silver',
    blurb: 'Silver prices, industrial demand, coins and the gold-silver ratio.',
  },
  analysis: {
    title: 'Analysis',
    blurb: 'Deeper data-driven analysis of the precious-metals market.',
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as CategorySlug[];

export const categoryTitle = (slug: string): string =>
  (CATEGORIES as Record<string, { title: string }>)[slug]?.title ?? slug;

export const categoryBlurb = (slug: string): string =>
  (CATEGORIES as Record<string, { blurb: string }>)[slug]?.blurb ?? '';

export const SITE = 'https://goldpricetools.com';
export const AUTHOR_URL = `${SITE}/authors/goldpricetools-editorial-team/`;
