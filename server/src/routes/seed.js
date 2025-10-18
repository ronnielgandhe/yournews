const express = require('express');
const RSSParser = require('rss-parser');
const { getFeeds } = require('../lib/feeds');
const { summarizeTopN } = require('../lib/summarize');
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
 * GET /seed
 * One-time bootstrap: ingest feeds + summarize top 30 articles
 */
router.get('/', async (req, res) => {
  try {
    console.log('Seed: starting ingestion...');
    
    const feeds = getFeeds();
    const ingestStats = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Fetch and ingest all feeds
    for (const feedUrl of feeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        
        for (const item of feed.items || []) {
          const normalized = normalizeRssItem(item, feedUrl);
          
          if (!normalized.url) {
            ingestStats.skipped++;
            continue;
          }

          try {
            const existing = await Article.findOne({ url: normalized.url });
            
            if (existing) {
              existing.title = normalized.title;
              existing.pubDate = normalized.pubDate;
              existing.content = normalized.content;
              await existing.save();
              ingestStats.updated++;
            } else {
              await Article.create(normalized);
              ingestStats.added++;
            }
          } catch (err) {
            if (err.code === 11000) {
              ingestStats.skipped++;
            } else {
              console.error('Error upserting article:', err.message);
              ingestStats.errors.push({ feed: feedUrl, error: err.message });
            }
          }
        }
      } catch (err) {
        console.error('Error parsing feed:', feedUrl, err.message);
        ingestStats.errors.push({ feed: feedUrl, error: err.message });
      }
    }

    console.log('Seed: ingestion complete, starting summarization...');
    
    // Summarize top 30 recent articles
    const summarized = await summarizeTopN(30);

    console.log('Seed: complete');
    
    res.json({
      ingested: ingestStats,
      summarized,
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ 
      error: 'Seed failed',
      message: err.message,
    });
  }
});

module.exports = router;
