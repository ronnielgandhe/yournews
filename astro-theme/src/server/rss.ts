/**
 * RSS feed fetcher for Google News
 */

export interface PanelItem {
  title: string;
  url: string;
  source?: string;
  pubDate?: string;
}

export async function fetchGoogleNews(
  query: string,
  max: number = 30,
  region: string = 'US:en'
): Promise<PanelItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=${region}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YourNewsBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Google News RSS returned ${response.status}`);
    }

    const xml = await response.text();
    
    // Simple regex-based XML parsing (fast and reliable for RSS)
    const items: PanelItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    // Updated regex to handle both CDATA and plain text titles
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>(.*?)<\/source>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < max) {
      const itemXml = match[1];
      
      const titleMatch = titleRegex.exec(itemXml);
      const linkMatch = linkRegex.exec(itemXml);
      const pubDateMatch = pubDateRegex.exec(itemXml);
      const sourceMatch = sourceRegex.exec(itemXml);

      if (titleMatch && linkMatch) {
        // Google News titles are plain, no " - Source" suffix in RSS
        const title = titleMatch[1].trim();
        const source = sourceMatch ? sourceMatch[1].trim() : undefined;

        items.push({
          title,
          url: linkMatch[1].trim(),
          source,
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : undefined,
        });
      }
    }

    console.info('[YN rss]', query, items.length);
    return items;
  } catch (error) {
    console.error('[YN rss] error:', query, error);
    return [];
  }
}
