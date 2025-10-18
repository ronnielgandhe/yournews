// Query classification for panel-based search

/**
 * Classify a search query into one of four types:
 * - "person": 2-3 capitalized words (e.g., "Elon Musk", "Joe Biden")
 * - "market": Contains tickers or commodities (e.g., "AAPL", "bitcoin", "oil prices")
 * - "event": Contains event-related phrases (e.g., "what happened", "breaking", "summit")
 * - "topic": Default fallback for general topics
 * 
 * @param {string} query - The search query
 * @returns {string} One of: "person" | "market" | "event" | "topic"
 */
function classifyQuery(query) {
  if (!query || typeof query !== 'string') {
    return 'topic';
  }

  const q = query.trim().toLowerCase();

  // Market indicators
  const marketKeywords = [
    'stock', 'stocks', 'ticker', 'nasdaq', 'dow', 'sp500', 's&p',
    'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
    'gold', 'oil', 'commodity', 'commodities', 'forex', 'currency',
    'price', 'prices', 'trading', 'market', 'markets'
  ];
  
  // Check for ticker patterns (2-5 uppercase letters) or market keywords
  const tickerPattern = /\b[A-Z]{2,5}\b/;
  const hasMarketKeyword = marketKeywords.some(kw => q.includes(kw));
  
  if (tickerPattern.test(query) || hasMarketKeyword) {
    return 'market';
  }

  // Event indicators
  const eventPhrases = [
    'what happened', 'breaking', 'latest on', 'update on',
    'summit', 'conference', 'meeting', 'election', 'vote',
    'announcement', 'incident', 'crisis', 'disaster'
  ];
  
  const hasEventPhrase = eventPhrases.some(phrase => q.includes(phrase));
  
  if (hasEventPhrase) {
    return 'event';
  }

  // Person detection: 2-3 words with capitalization
  // Split by whitespace and count capitalized words
  const words = query.split(/\s+/).filter(w => w.length > 0);
  const capitalizedWords = words.filter(w => /^[A-Z][a-z]+/.test(w));
  
  // If we have 2-3 capitalized words and they make up most of the query
  if (capitalizedWords.length >= 2 && capitalizedWords.length <= 3 && 
      capitalizedWords.length >= words.length * 0.6) {
    return 'person';
  }

  // Default to topic
  return 'topic';
}

module.exports = { classifyQuery };
