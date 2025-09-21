const path = require('path');

describe('ai fallback', () => {
  test('suggest queries and build digest without OPENAI_API_KEY', async () => {
    const ai = require(path.join(__dirname, '..', '..', 'lib', 'ai.js'));
    const out = await ai.aiSuggestQueries("what is Trump doing with tariffs and what's going on in the NBA");
    expect(out).toBeDefined();
    expect(Array.isArray(out.queries)).toBe(true);
    const md = await ai.aiBuildDigest({ query: 'test', articles: [{ id: '1', title: 'A', url: 'https://a', source: { name: 'src', domain: 'a.com' }, publishedAt: new Date().toISOString(), summary: 's' }] });
    expect(typeof md).toBe('string');
  });
});
