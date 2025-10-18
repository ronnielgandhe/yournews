// Rank articles using BM25 + recency with query tokens

const { tokenize } = require('./ranking');

/**
 * Calculate BM25-like score for document given query tokens
 */
function calculateBM25(docTokens, queryTokens, termFreqs, numDocs, avgDocLength, k1 = 1.2, b = 0.75) {
  const docLength = docTokens.length;
  const termCounts = {};
  
  // Count term frequencies in this document
  for (const token of docTokens) {
    termCounts[token] = (termCounts[token] || 0) + 1;
  }

  let score = 0;
  
  // Only score terms that appear in the query
  for (const queryTerm of queryTokens) {
    const tf = termCounts[queryTerm] || 0;
    if (tf === 0) continue;
    
    const docFreq = termFreqs.get(queryTerm) || 1;
    const idf = Math.log((numDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);
    
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    
    score += idf * (numerator / denominator);
  }
  
  return score;
}

/**
 * Rank articles using BM25 based on query tokens + recency boost
 * @param {Array} articles - Array of articles
 * @param {string} query - Search query
 * @returns {Array} Sorted articles with scores
 */
function rankForQuery(articles, query) {
  if (!articles || articles.length === 0) {
    return [];
  }

  if (!query || typeof query !== 'string') {
    // If no query, just sort by recency
    return articles.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0);
      const dateB = new Date(b.pubDate || 0);
      return dateB - dateA;
    });
  }

  // Tokenize query
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) {
    // No valid query tokens, sort by recency
    return articles.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0);
      const dateB = new Date(b.pubDate || 0);
      return dateB - dateA;
    });
  }

  // Tokenize all documents
  const docTokens = articles.map(article => {
    const text = `${article.title || ''} ${article.content || ''}`;
    return tokenize(text);
  });

  // Calculate term document frequencies
  const termFreqs = new Map();
  for (const tokens of docTokens) {
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      termFreqs.set(term, (termFreqs.get(term) || 0) + 1);
    }
  }

  // Calculate average document length
  const avgDocLength = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / docTokens.length;

  // Score each article
  const scoredArticles = articles.map((article, idx) => {
    const tokens = docTokens[idx];
    
    // Base BM25 score using query tokens
    let score = calculateBM25(tokens, queryTokens, termFreqs, articles.length, avgDocLength);

    // Recency boost: articles < 24h old get 1.2x multiplier
    const ageMs = Date.now() - new Date(article.pubDate || 0).getTime();
    const hoursSincePublished = ageMs / (1000 * 60 * 60);
    if (hoursSincePublished < 24) {
      score *= 1.2;
    } else if (hoursSincePublished < 48) {
      score *= 1.1;
    }

    return {
      ...article,
      score,
    };
  });

  // Sort by score descending
  scoredArticles.sort((a, b) => b.score - a.score);

  return scoredArticles;
}

module.exports = { rankForQuery };
