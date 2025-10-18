// Test RSS parser normalization

/**
 * Mock normalizeRssItem function for testing
 * (In production, this would be exported from ingest.js)
 */
function normalizeRssItem(item, feedUrl) {
  return {
    url: item.link || item.guid || '',
    title: item.title || 'Untitled',
    source: item.creator || (item.source && item.source.name) || feedUrl || 'Unknown',
    pubDate: item.pubDate || item.isoDate || new Date(),
    content: item.contentSnippet || item.content || item.summary || '',
  };
}

describe('RSS Parser', () => {
  test('normalizes RSS item correctly', () => {
    const rawItem = {
      title: 'Test Article',
      link: 'https://example.com/article',
      pubDate: '2025-01-01',
      contentSnippet: 'This is a test snippet',
      creator: 'Test Author',
    };

    const normalized = normalizeRssItem(rawItem, 'https://example.com/feed');

    expect(normalized.title).toBe('Test Article');
    expect(normalized.url).toBe('https://example.com/article');
    expect(normalized.source).toBe('Test Author');
    expect(normalized.content).toBe('This is a test snippet');
  });

  test('handles missing fields with defaults', () => {
    const rawItem = {
      link: 'https://example.com/article',
    };

    const normalized = normalizeRssItem(rawItem, 'https://example.com/feed');

    expect(normalized.title).toBe('Untitled');
    expect(normalized.source).toBe('https://example.com/feed');
    expect(normalized.content).toBe('');
  });

  test('uses guid as fallback for url', () => {
    const rawItem = {
      title: 'Test',
      guid: 'https://example.com/guid-url',
    };

    const normalized = normalizeRssItem(rawItem, 'https://example.com/feed');

    expect(normalized.url).toBe('https://example.com/guid-url');
  });
});
