// Build suggestion chips from article titles

const { tokenize } = require('./ranking');

/**
 * Extract keywords and bigrams from titles for suggestion chips
 * @param {Array} articles - Array of articles with titles
 * @param {string} originalQuery - Original search query to exclude
 * @param {number} limit - Max number of suggestions
 * @returns {Array<string>} Array of suggestion strings
 */
function buildSuggestions(articles, originalQuery = '', limit = 4) {
  if (!articles || articles.length === 0) {
    return [];
  }

  // Tokenize original query to exclude those terms
  const originalTokens = new Set(tokenize(originalQuery));

  // Collect all tokens from titles
  const allTokens = [];
  const bigramCounts = new Map();
  
  for (const article of articles.slice(0, 12)) { // Use top 12 articles
    if (!article.title) continue;
    
    const tokens = tokenize(article.title);
    allTokens.push(...tokens);
    
    // Extract bigrams (consecutive word pairs)
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      // Skip if either word was in original query
      if (originalTokens.has(tokens[i]) || originalTokens.has(tokens[i + 1])) {
        continue;
      }
      bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
    }
  }

  // Count single token frequencies (excluding original query tokens)
  const tokenCounts = new Map();
  for (const token of allTokens) {
    if (originalTokens.has(token)) continue;
    if (token.length < 3) continue; // Skip very short tokens
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  // Combine bigrams and single tokens
  const candidates = [];
  
  // Add frequent bigrams (appear at least 2 times)
  for (const [bigram, count] of bigramCounts.entries()) {
    if (count >= 2) {
      candidates.push({ text: bigram, score: count * 2 }); // Bigrams get 2x weight
    }
  }

  // Add frequent single tokens (appear at least 3 times)
  for (const [token, count] of tokenCounts.entries()) {
    if (count >= 3) {
      candidates.push({ text: token, score: count });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Take top N unique suggestions
  const suggestions = [];
  const seen = new Set();
  
  for (const candidate of candidates) {
    const text = candidate.text.toLowerCase();
    if (seen.has(text)) continue;
    seen.add(text);
    suggestions.push(candidate.text);
    if (suggestions.length >= limit) break;
  }

  // If we don't have enough suggestions, add some single high-frequency terms
  if (suggestions.length < limit) {
    const sortedTokens = Array.from(tokenCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([token]) => token);
    
    for (const token of sortedTokens) {
      if (suggestions.length >= limit) break;
      if (!seen.has(token.toLowerCase())) {
        suggestions.push(token);
        seen.add(token.toLowerCase());
      }
    }
  }

  return suggestions.slice(0, limit);
}

module.exports = { buildSuggestions };
