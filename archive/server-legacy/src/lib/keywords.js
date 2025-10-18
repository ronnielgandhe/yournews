// User keyword extraction from click history

const Click = require('../models/Click');
const { tokenize } = require('./ranking'); // reuse tokenizer

/**
 * Extract top keywords from user's click history
 * @param {string} userId - User identifier
 * @returns {Promise<string[]>} Top 5 keywords
 */
async function keywordsForUser(userId) {
  try {
    // Get last 10 clicks
    const clicks = await Click.find({ userId })
      .sort({ ts: -1 })
      .limit(10)
      .populate('articleId', 'title');

    // Need at least 3 clicks for meaningful personalization
    if (clicks.length < 3) {
      return [];
    }

    // Tokenize all titles
    const allTokens = [];
    for (const click of clicks) {
      if (click.articleId && click.articleId.title) {
        const tokens = tokenize(click.articleId.title);
        allTokens.push(...tokens);
      }
    }

    // Count term frequencies
    const termCounts = {};
    for (const token of allTokens) {
      termCounts[token] = (termCounts[token] || 0) + 1;
    }

    // Sort by frequency and take top 5
    const sortedTerms = Object.entries(termCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);

    console.log(`Extracted ${sortedTerms.length} keywords for user ${userId}:`, sortedTerms);
    return sortedTerms;
  } catch (err) {
    console.error('Error extracting keywords for user:', err);
    return [];
  }
}

module.exports = { keywordsForUser };
