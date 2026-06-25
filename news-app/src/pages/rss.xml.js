import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const all = (await getCollection('news'))
    .filter((a) => !a.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'GoldPriceTools — Gold & Silver Market News',
    description: 'Live gold and silver market news, price moves and analysis from the GoldPriceTools editorial team.',
    site: context.site,
    items: all.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.pubDate,
      link: `/news/${a.id}/`,
      categories: [a.data.category, ...a.data.tags],
    })),
    customData: '<language>en-gb</language>',
  });
}
