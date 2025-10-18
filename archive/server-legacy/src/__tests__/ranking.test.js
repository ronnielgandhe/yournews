// Test ranking algorithm

// Mock tokenizer (simplified version from ranking.js)
const STOPWORDS = new Set(['the', 'is', 'are', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'in', 'to']);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

// Simplified ranking function for testing
function simpleRank(articles, keywords = []) {
  return articles.map(article => {
    let score = 1.0;

    // Recency boost: < 24h gets 1.15x
    const ageMs = Date.now() - new Date(article.pubDate).getTime();
    const hoursSincePublished = ageMs / (1000 * 60 * 60);
    if (hoursSincePublished < 24) {
      score *= 1.15;
    }

    // Keyword boost: if keyword in title, 1.3x
    if (keywords.length > 0) {
      const titleLower = (article.title || '').toLowerCase();
      const hasKeyword = keywords.some(kw => titleLower.includes(kw));
      if (hasKeyword) {
        score *= 1.3;
      }
    }

    return { ...article, score };
  }).sort((a, b) => b.score - a.score);
}

describe('Ranking', () => {
  test('ranks recent articles higher', () => {
    const articles = [
      { 
        title: 'Old news', 
        pubDate: new Date('2020-01-01'), 
        content: 'old article' 
      },
      { 
        title: 'Breaking news', 
        pubDate: new Date(), 
        content: 'breaking story' 
      },
    ];

    const ranked = simpleRank(articles);

    expect(ranked[0].title).toBe('Breaking news');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  test('boosts keyword matches', () => {
    const now = new Date();
    const articles = [
      { 
        title: 'Generic article', 
        pubDate: now, 
        content: 'generic content' 
      },
      { 
        title: 'AI breakthrough today', 
        pubDate: now, 
        content: 'ai news' 
      },
    ];

    const ranked = simpleRank(articles, ['ai']);

    expect(ranked[0].title).toBe('AI breakthrough today');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  test('combines recency and keyword boosts', () => {
    const articles = [
      { 
        title: 'Old AI news', 
        pubDate: new Date('2020-01-01'), 
        content: 'old ai' 
      },
      { 
        title: 'Recent generic news', 
        pubDate: new Date(), 
        content: 'generic' 
      },
      { 
        title: 'Recent AI breakthrough', 
        pubDate: new Date(), 
        content: 'ai breakthrough' 
      },
    ];

    const ranked = simpleRank(articles, ['ai']);

    // Recent + keyword match should win
    expect(ranked[0].title).toBe('Recent AI breakthrough');
    
    // Recent without keyword should be second
    expect(ranked[1].title).toBe('Recent generic news');
    
    // Old with keyword should be last
    expect(ranked[2].title).toBe('Old AI news');
  });

  test('tokenizer removes stopwords', () => {
    const tokens = tokenize('The quick brown fox jumps over the lazy dog');
    
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('over');
    expect(tokens).toContain('quick');
    expect(tokens).toContain('brown');
    expect(tokens).toContain('fox');
  });
});
