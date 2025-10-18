# Quick Start Guide - Panel Search

## 1. Start the Backend Server

```bash
cd /Users/ronniel/yournews/server
node index.js
```

Expected output:
```
✓ MongoDB connected
Server listening on port 8000
OPENAI_API_KEY present= true
```

## 2. Start the Frontend

```bash
cd /Users/ronniel/yournews/web
npm run dev
```

Expected output:
```
ready - started server on 0.0.0.0:3000
```

## 3. Open the App

Navigate to: **http://localhost:3000**

## 4. Try the Panel Search

1. Click the **"Search"** tab (first button at top)
2. Type a query in the big search box:
   - **"artificial intelligence"** - topic search
   - **"Elon Musk"** - person search
   - **"AAPL stock"** - market search
   - **"what happened in Ukraine"** - event search

3. Click **"Search"** button

4. Observe the panel:
   - Query title with type badge (person/event/topic/market)
   - Image (if available from Wikipedia or article)
   - Summary (OpenAI-generated or bullet points)
   - 5-7 ranked article links with source and time
   - Suggestion chips at bottom

5. Click a suggestion chip → new panel appears below

6. Click multiple suggestions to build a stack of panels

## Example Queries to Try

### General Topics
- "climate change"
- "artificial intelligence"
- "renewable energy"

### People
- "Joe Biden"
- "Taylor Swift"
- "Elon Musk"

### Markets
- "AAPL stock"
- "bitcoin price"
- "oil prices"
- "nasdaq"

### Events
- "what happened at COP28"
- "latest election results"
- "breaking news"

## Test API Directly (Optional)

```bash
# Test the backend endpoint
curl -X POST http://localhost:8000/search/panels \
  -H 'Content-Type: application/json' \
  -d '{"query": "climate change"}' | jq '.'
```

Expected response:
```json
{
  "panel": {
    "query": "climate change",
    "type": "topic",
    "imageUrl": "https://...",
    "items": [...]
  },
  "suggestions": ["policy", "emissions", "renewable", "summit"]
}
```

## Troubleshooting

### Server won't start
- Check if MongoDB is accessible (in .env file)
- Server will work without MongoDB (uses Google RSS instead)

### No summaries appearing
- Check if OPENAI_API_KEY is set in `/server/.env`
- Without OpenAI, you'll see bullet-point summaries

### Slow responses
- First request may take 10-20 seconds (fetching from Google News RSS)
- Subsequent requests for same query will be faster if MongoDB is available

### No images
- Some queries won't have Wikipedia images
- Falls back to article og:image (also may not exist)
- Normal behavior - not an error

## Architecture Flow

```
User types query → Frontend (index.tsx)
                ↓
        POST /api/search-panels (Next.js proxy)
                ↓
        POST /search/panels (Express server)
                ↓
        1. Classify query type
        2. Search MongoDB or Google RSS
        3. Rank with BM25 + recency
        4. Generate summaries (OpenAI or bullets)
        5. Fetch image (Wikipedia or og:image)
        6. Extract suggestions from titles
                ↓
        Return panel + suggestions
                ↓
        Frontend renders panel
                ↓
        User clicks suggestion → repeat
```

## Features

✅ Works with or without MongoDB  
✅ Works with or without OpenAI API key  
✅ Intelligent query classification  
✅ BM25 + recency ranking  
✅ Smart suggestions  
✅ Multiple panels stack vertically  
✅ No breaking changes to existing features  
