const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Loaded .env from', path.join(__dirname, '.env'));
console.log({
  OPENAI_API_KEY_present: !!process.env.OPENAI_API_KEY,
  OPENAI_API_KEY_snippet: process.env.OPENAI_API_KEY ? '[REDACTED]' : null,
  NEWSAPI_KEY_present: !!process.env.NEWSAPI_KEY,
  NEWSAPI_KEY_snippet: process.env.NEWSAPI_KEY ? '[REDACTED]' : null
});
