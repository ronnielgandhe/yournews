// POST /search/panels - Multi-panel search reusing legacy digest pipeline
const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const parser = new RSSParser();

// Use global fetch (Node 18+)
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

// Reuse normalizeRssItem from server/index.js
function normalizeRssItem(it) {
  return {
    title: it.title || '',
    url: it.link || it.enclosure || '',
    source: (it.creator || (it.source && it.source.name)) || 'Google News',
    publishedAt: it.pubDate || it.isoDate || null,
    description: it.contentSnippet || it.content || it.summary || ''
  };
}

// Fetch Google News RSS with recency filter
async function fetchGoogleForQuery(q, pageSize = 30) {
  // Add "when:7d" to enforce recency in Google News query
  const queryWithRecency = `${q} when:7d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(queryWithRecency)}&hl=en-US&gl=US&ceid=US:en`;
  const feed = await parser.parseURL(url);
  const items = (feed && feed.items) ? feed.items.map(normalizeRssItem).slice(0, pageSize) : [];
  return items;
}

// Filter items to last 72 hours, with backfill
function filterRecent(items, windowHours = 72) {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  
  const recent = [];
  const older = [];
  
  for (const item of items) {
    const pubDate = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
    if (pubDate && (now - pubDate) <= windowMs) {
      recent.push(item);
    } else {
      older.push(item);
    }
  }
  
  // If < 6 recent items, backfill from older (newest first)
  if (recent.length < 6 && older.length > 0) {
    const needed = 6 - recent.length;
    recent.push(...older.slice(0, needed));
  }
  
  return recent;
}

// Deduplicate by URL (host + path)
function deduplicateByUrl(items) {
  const seen = new Set();
  const dedupedItems = [];
  
  for (const item of items) {
    try {
      const urlObj = new URL(item.url);
      const key = urlObj.host + urlObj.pathname;
      if (!seen.has(key)) {
        seen.add(key);
        dedupedItems.push(item);
      }
    } catch (e) {
      // Invalid URL, skip
      continue;
    }
  }
  
  return dedupedItems;
}

// Apply domain diversity based on source field (not URL which is Google redirect)
function applyDomainDiversity(items, maxPerDomain = 4) {
  const sourceCounts = new Map();
  const diverseItems = [];
  
  for (const item of items) {
    // Use source field (e.g., "BBC News") as the diversity key
    // This works better than URL since Google News RSS uses redirects
    const source = (item.source || 'Unknown').toLowerCase();
    const count = sourceCounts.get(source) || 0;
    
    if (count < maxPerDomain) {
      diverseItems.push(item);
      sourceCounts.set(source, count + 1);
    }
  }
  
  return diverseItems;
}

// Helper: time ago formatter
function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Build summary by calling the EXISTING /ai/digest-from-links endpoint
// This reuses all the legacy digest logic including OpenAI + fallback
async function buildSummaryForQuery(query, links, maxLinks = 12) {
  if (!links || links.length === 0) {
    return {
      summaryMd: 'No articles found for this query.',
      usedOpenAI: false
    };
  }

  try {
    // Send the full article objects (title, url, content) instead of just URLs
    const articles = links.slice(0, maxLinks).map(l => ({
      title: l.title || 'Untitled',
      url: l.url,
      content: l.contentSnippet || l.content || '',
      source: l.source || ''
    })).filter(a => a.url);
    
    if (articles.length === 0) {
      throw new Error('No valid articles extracted from links');
    }

    console.log(`buildSummaryForQuery("${query}"): calling digest with ${articles.length} articles`);

    // Call the EXISTING digest endpoint (reuses all legacy logic)
    const response = await fetch('http://localhost:8000/ai/digest-from-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: query,
        articles: articles, // Send full article data, not just URLs
        style: 'short'
      }),
      signal: AbortSignal.timeout(15000) // 15s timeout (increased for processing)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`buildSummaryForQuery("${query}"): digest success, generator=${data.generator}, length=${data.summary_md?.length || 0}`);
      return {
        summaryMd: data.summary_md || 'No summary available.',
        usedOpenAI: data.generator === 'ai'
      };
    } else {
      const errorText = await response.text().catch(() => '');
      console.warn(`buildSummaryForQuery("${query}"): digest returned ${response.status}: ${errorText.slice(0, 100)}`);
    }
  } catch (err) {
    console.warn(`buildSummaryForQuery("${query}"): error calling digest endpoint:`, err.message);
  }

  // Fallback: bullet list if digest endpoint fails
  const fallbackMd = links.slice(0, 7).map(link => 
    `• **${link.title || 'Article'}** (${link.source || 'Source'})`
  ).join('\n\n');
  
  console.log(`buildSummaryForQuery("${query}"): using fallback bullets`);
  
  return {
    summaryMd: fallbackMd,
    usedOpenAI: false
  };
}

/**
 * POST /search/panels
 * Body: { query: string, userId?: string, maxLinks?: number }
 * 
 * Splits query by comma/" and ", fetches RSS for each sub-query,
 * calls existing /ai/digest-from-links for summaries,
 * returns structured panel data.
 */
router.post('/', async (req, res) => {
  try {
    const { query, userId = 'demo', maxLinks = 12 } = req.body || {};
    
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    console.log('/search/panels: query=', query, 'userId=', userId, 'maxLinks=', maxLinks);

    // Split query by comma or " and " (case-insensitive)
    const rawQueries = query.split(/,|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
    
    // Dedupe case-insensitively
    const uniqueQueries = [];
    const seen = new Set();
    for (const q of rawQueries) {
      const lower = q.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueQueries.push(q);
      }
    }

    if (uniqueQueries.length === 0) {
      return res.status(400).json({ error: 'No valid queries found' });
    }

    console.log('/search/panels: processing', uniqueQueries.length, 'unique queries:', uniqueQueries);

    // Process each sub-query in parallel with timeout protection
    const panels = [];
    await Promise.all(
      uniqueQueries.map(async (subQuery) => {
        const startTime = Date.now();
        
        try {
          // Step 1: Fetch Google News RSS with recency filter (when:7d)
          console.log(`/search/panels: fetching RSS for "${subQuery}"`);
          const allItems = await Promise.race([
            fetchGoogleForQuery(subQuery, 30),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 10000))
          ]);
          
          const fetchCount = allItems.length;
          console.log(`/search/panels: fetched ${fetchCount} items for "${subQuery}"`);
          
          if (fetchCount === 0) {
            console.warn(`/search/panels: no RSS items for "${subQuery}"`);
            panels.push({
              title: subQuery,
              type: 'topic',
              summaryMd: `No recent articles found for "${subQuery}".`,
              items: [],
              meta: {
                linkCount: 0,
                usedOpenAI: false,
                recentWindowHours: 72
              }
            });
            return;
          }

          // Step 2: Filter to last 72 hours (with backfill if < 6)
          const recentItems = filterRecent(allItems, 72);
          const recentCount = recentItems.length;
          console.log(`/search/panels: ${recentCount} recent items (72h window) for "${subQuery}"`);
          
          // Step 3: Deduplicate by URL
          const dedupedItems = deduplicateByUrl(recentItems);
          console.log(`/search/panels: ${dedupedItems.length} items after dedup for "${subQuery}"`);
          
          // Step 4: Take top 12 items (no source diversity needed - variety comes from Google News itself)
          const topItems = dedupedItems.slice(0, 12);
          const urlsUsed = topItems.length;
          console.log(`/search/panels: using ${urlsUsed} items for "${subQuery}"`);
          
          if (topItems.length === 0) {
            panels.push({
              title: subQuery,
              type: 'topic',
              summaryMd: `No valid articles found for "${subQuery}" after filtering.`,
              items: [],
              meta: {
                linkCount: 0,
                usedOpenAI: false,
                recentWindowHours: 72
              }
            });
            return;
          }

          // Step 5: Build summary using EXISTING digest pipeline (from URLs, not query)
          // Use up to 10 URLs for better context
          const { summaryMd, usedOpenAI } = await buildSummaryForQuery(subQuery, topItems, 10);

          // Step 6: Format top 5-7 items with timeAgo
          const formattedItems = topItems.slice(0, 7).map(item => ({
            title: item.title,
            url: item.url,
            source: item.source,
            pubDate: item.publishedAt,
            timeAgo: timeAgo(item.publishedAt)
          }));

          // Step 7: Build panel structure
          const panel = {
            title: subQuery,
            type: 'topic',
            summaryMd,
            items: formattedItems,
            meta: {
              linkCount: formattedItems.length,
              usedOpenAI,
              recentWindowHours: 72
            }
          };

          panels.push(panel);
          
          const elapsed = Date.now() - startTime;
          console.log(`/search/panels: panel created for "${subQuery}"`, {
            subQuery,
            fetched: fetchCount,
            recentCount,
            urlsUsed,
            usedOpenAI,
            items: formattedItems.length,
            elapsedMs: elapsed
          });

        } catch (err) {
          console.error(`/search/panels: error for "${subQuery}":`, err.message);
          
          // Add failed panel with error message
          panels.push({
            title: subQuery,
            type: 'topic',
            summaryMd: `Could not fetch news for "${subQuery}". Please try again.`,
            items: [],
            meta: {
              linkCount: 0,
              usedOpenAI: false,
              recentWindowHours: 72,
              error: err.message
            }
          });
        }
      })
    );

    // Return panels in original query order
    const orderedPanels = uniqueQueries.map(q => 
      panels.find(p => p.title === q)
    ).filter(Boolean);

    console.log('/search/panels: returning', orderedPanels.length, 'panels');
    res.json({ panels: orderedPanels });

  } catch (err) {
    console.error('Error in /search/panels:', err);
    res.status(500).json({ 
      error: 'Failed to generate panels',
      message: err.message 
    });
  }
});

module.exports = router;
