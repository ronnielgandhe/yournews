const express = require('express');
const RSSParser = require('rss-parser');
const { getFeeds } = require('../lib/feeds');
const Article = require('../models/Article');

const router = express.Router();
const parser = new RSSParser();

/**
 * Helper: normalize RSS item to our Article schema format
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

/**
 * Helper: fetch and parse single feed with retry logic
 */
async function fetchFeedWithRetry(feedUrl, maxRetries = 3) {
  const delays = [2000, 4000, 8000]; // exponential backoff
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const feed = await parser.parseURL(feedUrl);
      return { success: true, items: feed.items || [] };
    } catch (err) {
      console.error(`Fetch feed ${feedUrl} attempt ${attempt + 1} failed:`, err.message);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * GET /ingest
 * Fetches all RSS feeds and upserts articles to DB
 */
router.get('/', async (req, res) => {
  try {
    const feeds = getFeeds();
    const stats = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Fetch all feeds in parallel with timeout
    const feedPromises = feeds.map(async (feedUrl) => {
      try {
        const result = await Promise.race([
          fetchFeedWithRetry(feedUrl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          ),
        ]);

        if (!result.success) {
          stats.errors.push({ feed: feedUrl, error: result.error });
          return;
        }

        // Upsert each item
        for (const item of result.items) {
          const normalized = normalizeRssItem(item, feedUrl);
          
          if (!normalized.url) {
            stats.skipped++;
            continue;
          }

          try {
            const existing = await Article.findOne({ url: normalized.url });
            
            if (existing) {
              // Update existing article (refresh metadata)
              existing.title = normalized.title;
              existing.pubDate = normalized.pubDate;
              existing.content = normalized.content;
              await existing.save();
              stats.updated++;
            } else {
              // Create new article
              await Article.create(normalized);
              stats.added++;
            }
          } catch (err) {
            // Duplicate key or validation error
            if (err.code === 11000) {
              stats.skipped++;
            } else {
              console.error('Error upserting article:', err.message);
              stats.errors.push({ feed: feedUrl, error: err.message });
            }
          }
        }
      } catch (err) {
        stats.errors.push({ feed: feedUrl, error: err.message });
      }
    });

    await Promise.all(feedPromises);

    console.log('Ingestion complete:', stats);
    res.json(stats);
  } catch (err) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: 'Ingestion failed', message: err.message });
  }
});

module.exports = router;
