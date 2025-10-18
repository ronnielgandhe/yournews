// Quick test script for panels endpoint
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test() {
  // Test utilities
  const { classifyQuery } = require('./src/lib/classifyQuery');
  const { searchNews } = require('./src/lib/searchNews');
  const { rankForQuery } = require('./src/lib/rankForQuery');
  const { buildSuggestions } = require('./src/lib/buildSuggestions');

  console.log('\n=== Testing Panel Search Utilities ===\n');

  // Test 1: Classification
  console.log('1. Query Classification:');
  console.log('  "climate change" ->', classifyQuery('climate change'));
  console.log('  "Elon Musk" ->', classifyQuery('Elon Musk'));
  console.log('  "AAPL stock" ->', classifyQuery('AAPL stock'));
  console.log('  "what happened in Gaza" ->', classifyQuery('what happened in Gaza'));

  // Test 2: Search (Google RSS only since no DB)
  console.log('\n2. News Search (Google RSS):');
  const articles = await searchNews('technology', 10);
  console.log(`  Found ${articles.length} articles`);
  if (articles.length > 0) {
    console.log(`  First: "${articles[0].title.slice(0, 60)}..."`);
  }

  // Test 3: Ranking
  console.log('\n3. Ranking:');
  const ranked = rankForQuery(articles, 'artificial intelligence');
  console.log(`  Ranked ${ranked.length} articles`);
  if (ranked.length > 0) {
    console.log(`  Top score: ${ranked[0].score.toFixed(2)}`);
  }

  // Test 4: Suggestions
  console.log('\n4. Suggestions:');
  const suggestions = buildSuggestions(ranked, 'technology', 4);
  console.log(`  Generated ${suggestions.length} suggestions:`, suggestions);

  console.log('\n=== All Tests Complete ===\n');
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
