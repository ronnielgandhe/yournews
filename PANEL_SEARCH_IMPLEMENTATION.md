# Panel-Based Search Implementation - Complete

## ✅ COMPLETED FEATURES

### Backend (Express Server)

#### New Utilities (`/server/src/lib/`)
1. **classifyQuery.js** - Classifies queries into 4 types:
   - `person`: 2-3 capitalized words (e.g., "Elon Musk")
   - `market`: Tickers or financial keywords (e.g., "AAPL", "bitcoin")
   - `event`: Event phrases (e.g., "what happened", "summit")
   - `topic`: Default fallback

2. **searchNews.js** - Hybrid search strategy:
   - First tries MongoDB with regex search
   - Falls back to Google News RSS if <10 results
   - Returns up to 30 candidates

3. **rankForQuery.js** - BM25 + recency ranking:
   - Tokenizes query and documents
   - Calculates BM25 scores using query tokens
   - Applies recency boost (1.2x for <24h, 1.1x for <48h)

4. **summarizeText.js** - Smart summarization:
   - Uses OpenAI API if `OPENAI_API_KEY` is set
   - Falls back to bullet-point extraction from content
   - Caches summaries in MongoDB

5. **getEntityImage.js** - Image fetching:
   - Tries Wikipedia REST API first
   - Falls back to first article's og:image
   - Returns null if neither available

6. **buildSuggestions.js** - Suggestion generation:
   - Extracts frequent bigrams and keywords from titles
   - Filters out original query terms and stopwords
   - Returns 2-4 unique suggestions

#### New Route (`/server/src/routes/panels.js`)
**POST /search/panels**
- Body: `{ query: string, userId?: string }`
- Process:
  1. Classify query type
  2. Fetch 30 candidates (MongoDB → Google RSS)
  3. Rank using BM25 + recency with query tokens
  4. Take top 12 results
  5. Ensure summaries for top 6 (OpenAI or bullets)
  6. Fetch entity image (Wikipedia or og:image)
  7. Build 2-4 suggestion chips
- Response:
  ```json
  {
    "panel": {
      "query": "string",
      "type": "person|event|topic|market",
      "imageUrl": "string|null",
      "items": [
        {
          "title": "string",
          "url": "string",
          "source": "string",
          "pubDate": "string",
          "summary": "string|null"
        }
      ]
    },
    "suggestions": ["string", ...]
  }
  ```

#### Server Integration
- Route mounted in `/server/index.js` at line 88
- Works with or without `OPENAI_API_KEY`
- Works with or without MongoDB (falls back to Google RSS)
- No breaking changes to existing routes

### Frontend (Next.js)

#### New API Proxy (`/web/pages/api/search-panels.js`)
- Proxies POST requests to `http://localhost:8000/search/panels`
- Handles errors gracefully
- Returns JSON responses

#### Updated UI (`/web/pages/index.tsx`)
**New "Search" Tab:**
- Large centered search bar
- Real-time panel rendering
- Each panel includes:
  - Header with query and type badge
  - Entity image (left) + summary (right) when available
  - 5-7 ranked article links with source & time-ago
  - Suggestion chips at bottom
- Clicking suggestions appends new panels below
- Responsive hover effects on chips

**Tab Structure:**
1. **Search** (NEW) - Panel-based search interface
2. **Feed** - Existing personalized feed
3. **Legacy Digest** - Existing digest builder

## 🔍 TESTING RESULTS

### Utility Tests (all passing)
```
✓ Classification: person, market, event, topic detection
✓ Search: MongoDB → Google RSS fallback
✓ Ranking: BM25 + recency scoring
✓ Suggestions: Keyword/bigram extraction
```

### API Compatibility
- ✅ Works with `OPENAI_API_KEY` set (uses GPT-4o-mini)
- ✅ Works without `OPENAI_API_KEY` (bullet fallback)
- ✅ Works with MongoDB connected
- ✅ Works without MongoDB (Google RSS fallback)
- ✅ All existing routes unchanged: `/feed`, `/track`, `/seed`, `/ingest`

## 🚀 USAGE

### Start Backend
```bash
cd server
node index.js
```

### Start Frontend
```bash
cd web
npm run dev
```

### Test API Directly
```bash
curl -X POST http://localhost:8000/search/panels \
  -H 'Content-Type: application/json' \
  -d '{"query": "climate change"}'
```

### Use in Browser
1. Open http://localhost:3000
2. Click "Search" tab
3. Type any query (e.g., "artificial intelligence", "Tesla stock", "Joe Biden")
4. View ranked results with summaries
5. Click suggestion chips to explore related topics

## 📊 ACCEPTANCE CRITERIA

| Requirement | Status | Notes |
|-------------|--------|-------|
| POST /search/panels returns ranked panel | ✅ | Uses BM25 + recency |
| Works with MongoDB | ✅ | Searches articles in DB |
| Falls back to Google RSS | ✅ | When DB unavailable or <10 results |
| Top items show summaries | ✅ | OpenAI or bullet fallback |
| 2-4 suggestion chips | ✅ | Extracted from titles |
| Works with/without OPENAI_API_KEY | ✅ | Graceful degradation |
| Works with/without MongoDB | ✅ | Google RSS fallback |
| No regressions to existing endpoints | ✅ | All routes preserved |
| UI renders panels | ✅ | With image, summary, links |
| Clicking chips spawns new panels | ✅ | Appends below |

## 🔧 TECHNICAL DETAILS

### Dependencies (no new ones required)
- Express, Mongoose, RSS-Parser, OpenAI (all existing)

### Performance
- Image fetching is async, doesn't block response
- Summaries cached in MongoDB when possible
- Google RSS limited to 30 results to control latency

### Error Handling
- All utilities catch errors and provide fallbacks
- API returns 400 for missing query, 500 for server errors
- Frontend shows error messages in red banner

## 🎯 NEXT STEPS (Optional Enhancements)

1. **Caching**: Add Redis/memory cache for frequent queries
2. **Pagination**: Support "load more" for panels with >12 results
3. **History**: Track user queries and show recent searches
4. **Advanced Ranking**: Include user keywords in BM25 scoring
5. **Better Images**: Try multiple Wikipedia searches, use article images
6. **Streaming**: Stream summaries as they're generated

## 📝 FILES CHANGED

### Created
- `/server/src/lib/classifyQuery.js`
- `/server/src/lib/searchNews.js`
- `/server/src/lib/rankForQuery.js`
- `/server/src/lib/summarizeText.js`
- `/server/src/lib/getEntityImage.js`
- `/server/src/lib/buildSuggestions.js`
- `/server/src/routes/panels.js`
- `/server/test_panels.js` (test script)
- `/web/pages/api/search-panels.js`

### Modified
- `/server/index.js` - Added panels route mounting (line 88)
- `/web/pages/index.tsx` - Added Search tab with panel UI

### No Changes Required
- All existing routes, models, and utilities preserved
- Database schemas unchanged
- Environment variables: same as before (MONGODB_URI, OPENAI_API_KEY optional)
