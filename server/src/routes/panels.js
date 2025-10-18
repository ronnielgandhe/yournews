// Panel-based search route
const express = require('express');
const router = express.Router();

const { classifyQuery } = require('../lib/classifyQuery');
const { searchNews } = require('../lib/searchNews');
const { rankForQuery } = require('../lib/rankForQuery');
const { ensureSummary } = require('../lib/summarizeText');
const { getEntityImage } = require('../lib/getEntityImage');
const { buildSuggestions } = require('../lib/buildSuggestions');

/**
 * POST /search/panels
 * 
 * Body: { query: string, userId?: string }
 * 
 * Returns:
 * {
 *   panel: {
 *     query: string,
 *     type: "person" | "event" | "topic" | "market",
 *     imageUrl: string | null,
 *     items: [{ title, url, source, pubDate, summary? }]
 *   },
 *   suggestions: string[]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { query, userId = 'demo' } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const queryStr = String(query).trim();
    console.log(`/search/panels: query="${queryStr}" userId=${userId}`);

    // 1) Classify query
    const type = classifyQuery(queryStr);
    console.log(`/search/panels: classified as type="${type}"`);

    // 2) Get candidates (MongoDB or Google RSS)
    const candidates = await searchNews(queryStr, 30);
    console.log(`/search/panels: found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return res.json({
        panel: {
          query: queryStr,
          type,
          imageUrl: null,
          items: []
        },
        suggestions: []
      });
    }

    // 3) Rank using BM25 + recency with query tokens
    const ranked = rankForQuery(candidates, queryStr);
    console.log(`/search/panels: ranked ${ranked.length} articles`);

    // 4) Take top 12
    const top12 = ranked.slice(0, 12);

    // 5) Ensure summaries for top 6
    const itemsWithSummaries = await Promise.all(
      top12.map(async (article, idx) => {
        let summary = null;
        if (idx < 6) {
          // Generate summary for top 6
          summary = await ensureSummary(article);
        }
        
        return {
          title: article.title,
          url: article.url,
          source: article.source,
          pubDate: article.pubDate,
          summary: summary
        };
      })
    );

    // 6) Get image (Wikipedia or first article og:image)
    let imageUrl = null;
    try {
      imageUrl = await getEntityImage(queryStr, top12);
    } catch (err) {
      console.warn('Failed to fetch entity image:', err.message);
    }

    // 7) Build suggestions (2-4 keywords/bigrams from titles)
    const suggestions = buildSuggestions(top12, queryStr, 4);
    console.log(`/search/panels: generated ${suggestions.length} suggestions`);

    // Return panel + suggestions
    res.json({
      panel: {
        query: queryStr,
        type,
        imageUrl,
        items: itemsWithSummaries
      },
      suggestions
    });

  } catch (err) {
    console.error('Error in /search/panels:', err);
    res.status(500).json({ 
      error: 'Failed to generate panel',
      message: err.message 
    });
  }
});

module.exports = router;
