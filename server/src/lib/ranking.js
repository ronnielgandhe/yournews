// BM25-inspired ranking with recency boost and keyword nudging

const STOPWORDS = new Set([
  'the', 'is', 'are', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'in', 'to', 
  'for', 'on', 'with', 'as', 'by', 'from', 'that', 'this', 'it', 'be', 'was', 
  'were', 'will', 'would', 'should', 'can', 'could', 'have', 'has', 'had', 'at',
  'what', 'which', 'when', 'where', 'how', 'why', 'not', 'no',
]);

/**
 * Tokenize text: split on non-word chars, lowercase, remove stopwords
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

/**
 * Calculate BM25-like score for document
 * @param {string[]} docTokens - Tokens in document
 * @param {Map} termFreqs - Term frequencies across all docs
 * @param {number} numDocs - Total number of documents
 * @param {number} avgDocLength - Average document length
 * @returns {number} BM25 score
 */
function calculateBM25(docTokens, termFreqs, numDocs, avgDocLength, k1 = 1.2, b = 0.75) {
  const docLength = docTokens.length;
  const termCounts = {};
  
  // Count term frequencies in this document
  for (const token of docTokens) {
    termCounts[token] = (termCounts[token] || 0) + 1;
  }

  let score = 0;
  
  for (const [term, tf] of Object.entries(termCounts)) {
    const docFreq = termFreqs.get(term) || 1;
    const idf = Math.log((numDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);
    
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    
    score += idf * (numerator / denominator);
  }
  
  return score;
}

/**
 * Rank articles by BM25 + recency + keyword boost
 * @param {Array} articles - Array of article objects
 * @param {Object} options - { keywords: string[] }
 * @returns {Array} Sorted articles with score field
 */
function rankArticles(articles, options = {}) {
  const keywords = (options.keywords || []).map(k => k.toLowerCase());
  
  if (articles.length === 0) {
    return [];
  }

  // Tokenize all documents
  const docTokens = articles.map(article => {
    const text = `${article.title} ${article.content || ''}`;
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
    
    // Base BM25 score
    let score = calculateBM25(tokens, termFreqs, articles.length, avgDocLength);

    // Recency boost: articles < 24h old get 1.15x multiplier
    const ageMs = Date.now() - new Date(article.pubDate).getTime();
    const hoursSincePublished = ageMs / (1000 * 60 * 60);
    if (hoursSincePublished < 24) {
      score *= 1.15;
    }

    // Keyword boost: if any keyword appears in title, 1.3x multiplier
    if (keywords.length > 0) {
      const titleLower = (article.title || '').toLowerCase();
      const hasKeyword = keywords.some(kw => titleLower.includes(kw));
      if (hasKeyword) {
        score *= 1.3;
      }
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

module.exports = { rankArticles, tokenize };
