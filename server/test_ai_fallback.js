const path = require('path');
process.env.NODE_ENV = 'test';
// Ensure we can import the ai helper
const ai = require(path.join(__dirname, '..', 'lib', 'ai.js'));

(async () => {
  try {
    const q = await ai.aiSuggestQueries('what is Trump doing with tariffs and what\'s going on in the NBA');
    console.log('aiSuggestQueries:', q);
    const md = await ai.aiBuildDigest({ query: 'test', articles: [{id:'1',title:'A',url:'https://a',source:{name:'src',domain:'a.com'},publishedAt:new Date().toISOString(),summary:'s'}] });
    console.log('aiBuildDigest (len):', md.length);
    console.log('OK');
    process.exit(0);
  } catch (e) {
    console.error('TEST FAIL', e);
    process.exit(2);
  }
})();
