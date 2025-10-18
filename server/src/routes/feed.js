const express = require('express');
const Article = require('../models/Article');
const { keywordsForUser } = require('../lib/keywords');
const { rankArticles } = require('../lib/ranking');
const { generateSummary } = require('../lib/summarize');

const router = express.Router();

/**
 * GET /feed?userId=<id>
 * Returns personalized ranked feed for user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;

    // Fetch last ~400 articles sorted by publication date
    const articles = await Article.find({})
      .sort({ pubDate: -1 })
      .limit(400)
      .lean(); // Use lean() for better performance

    if (articles.length === 0) {
      return res.json({ 
        items: [],
        message: 'No articles found. Run /ingest to populate the feed.',
      });
    }

    // Get user keywords (empty if no userId or < 3 clicks)
    let keywords = [];
    if (userId) {
      keywords = await keywordsForUser(userId);
    }

    // Rank articles with BM25 + recency + keyword boost
    const rankedArticles = rankArticles(articles, { keywords });

    // Take top 50
    const top50 = rankedArticles.slice(0, 50);

    // Ensure top 30 have summaries
    const top30 = top50.slice(0, 30);
    for (const article of top30) {
      // Convert lean object back to Mongoose doc for generateSummary
      if (!article.summary) {
        const doc = await Article.findById(article._id);
        if (doc) {
          await generateSummary(doc);
          article.summary = doc.summary; // Update the lean object
        }
      }
    }

    // Format response
    const items = top50.map(article => ({
      _id: article._id,
      title: article.title,
      url: article.url,
      source: article.source,
      pubDate: article.pubDate,
      summary: article.summary || 'Summary pending...',
      score: article.score,
    }));

    res.json({ 
      items,
      count: items.length,
      keywords: keywords.length > 0 ? keywords : null,
    });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch feed',
      message: err.message,
    });
  }
});

module.exports = router;
