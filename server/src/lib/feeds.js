// Feed URL configuration loader

const DEFAULT_FEEDS = [
  'https://feeds.reuters.com/reuters/topNews',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.npr.org/1001/rss.xml',
];

/**
 * Get list of RSS feed URLs from environment or defaults.
 * Reads FEEDS env var (comma-separated URLs).
 * Falls back to 3 default feeds if not set.
 * @returns {string[]} Array of feed URLs
 */
function getFeeds() {
  const feedsEnv = process.env.FEEDS;
  
  if (!feedsEnv || !feedsEnv.trim()) {
    console.log('FEEDS env var not set, using defaults:', DEFAULT_FEEDS.length, 'feeds');
    return DEFAULT_FEEDS;
  }

  const feeds = feedsEnv
    .split(',')
    .map(url => url.trim())
    .filter(url => url.startsWith('http://') || url.startsWith('https://'));

  console.log('Loaded', feeds.length, 'feed URLs from FEEDS env var');
  
  if (feeds.length === 0) {
    console.warn('No valid feeds in FEEDS env var, using defaults');
    return DEFAULT_FEEDS;
  }

  return feeds;
}

module.exports = { getFeeds, DEFAULT_FEEDS };
