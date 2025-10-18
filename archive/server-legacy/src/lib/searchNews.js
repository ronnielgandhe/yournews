// News search wrapper - searches MongoDB first, falls back to Google RSS

const Article = require('../models/Article');
const RSSParser = require('rss-parser');
const parser = new RSSParser();

// Use global fetch (Node 18+) when available, otherwise lazily load node-fetch
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

/**
 * Normalize RSS item to common format
 */
function normalizeRssItem(it) {
  return {
    title: it.title || '',
    url: it.link || it.enclosure || '',
    source: (it.creator || (it.source && it.source.name)) || 'Google News',
    pubDate: it.pubDate || it.isoDate || new Date().toISOString(),
    content: it.contentSnippet || it.content || it.summary || '',
    summary: null
  };
}

/**
 * Fetch news from Google RSS for a query
 */
async function fetchGoogleForQuery(q, pageSize = 30) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const feed = await parser.parseURL(url);
    const items = (feed && feed.items) ? feed.items.map(normalizeRssItem).slice(0, pageSize) : [];
    return items;
  } catch (err) {
    console.error('Google RSS fetch error:', err.message);
    return [];
  }
}

/**
 * Search for news articles - MongoDB first, then Google RSS fallback
 * @param {string} query - Search query
 * @param {number} limit - Max number of results
 * @returns {Promise<Array>} Array of articles
 */
async function searchNews(query, limit = 30) {
  try {
    // First try MongoDB - check if we have recent articles
    const mongoArticles = await Article.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { topics: { $in: [query] } }
      ]
    })
      .sort({ pubDate: -1 })
      .limit(limit)
      .lean();

    if (mongoArticles && mongoArticles.length >= 10) {
      console.log(`searchNews: found ${mongoArticles.length} articles in MongoDB for query="${query}"`);
      return mongoArticles.map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        pubDate: a.pubDate,
        content: a.content || '',
        summary: a.summary || null,
        _id: a._id
      }));
    }

    // Fallback to Google RSS if MongoDB has insufficient results
    console.log(`searchNews: falling back to Google RSS for query="${query}"`);
    const googleResults = await fetchGoogleForQuery(query, limit);
    return googleResults;
  } catch (err) {
    console.error('searchNews error:', err.message);
    // On error, try Google RSS as final fallback
    try {
      return await fetchGoogleForQuery(query, limit);
    } catch (fallbackErr) {
      console.error('Google RSS fallback also failed:', fallbackErr.message);
      return [];
    }
  }
}

module.exports = { searchNews, fetchGoogleForQuery };
