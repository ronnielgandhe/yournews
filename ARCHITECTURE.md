# Panel Search Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                     (web/pages/index.tsx)                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  🔍 Search Tab                                            │ │
│  │                                                           │ │
│  │  [ Search anything...            ] [Search]              │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ Results for "artificial intelligence"     [topic]   │ │ │
│  │  ├─────────────────────────────────────────────────────┤ │ │
│  │  │  ┌───────┐  AI systems are revolutionizing...      │ │ │
│  │  │  │ IMAGE │  Researchers at MIT have developed...    │ │ │
│  │  │  └───────┘  Companies worldwide are adopting...     │ │ │
│  │  │                                                      │ │ │
│  │  │  📰 AI Breakthrough... | Reuters • 2h ago           │ │ │
│  │  │  📰 New Neural Network... | BBC • 5h ago            │ │ │
│  │  │  📰 Tech Giants Invest... | NPR • 1d ago            │ │ │
│  │  │                                                      │ │ │
│  │  │  Related: [machine learning] [neural nets] [ethics] │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ Results for "machine learning"            [topic]   │ │ │
│  │  │ ... (next panel from suggestion click)              │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ POST /api/search-panels
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND API PROXY                           │
│              (web/pages/api/search-panels.js)                   │
│                                                                 │
│  - Validates request                                            │
│  - Forwards to backend                                          │
│  - Returns JSON response                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ POST /search/panels
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND ROUTE                              │
│               (server/src/routes/panels.js)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. CLASSIFY QUERY                                        │  │
│  │    (classifyQuery.js)                                    │  │
│  │    • "Elon Musk" → person                                │  │
│  │    • "AAPL stock" → market                               │  │
│  │    • "what happened" → event                             │  │
│  │    • "climate change" → topic                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. SEARCH NEWS                                           │  │
│  │    (searchNews.js)                                       │  │
│  │    ┌──────────────┐    Yes    ┌─────────────────────┐   │  │
│  │    │ MongoDB has  │ ────────→ │ Return DB articles  │   │  │
│  │    │ ≥10 results? │           └─────────────────────┘   │  │
│  │    └──────────────┘                                      │  │
│  │           │ No                                           │  │
│  │           ↓                                               │  │
│  │    ┌──────────────────────┐                              │  │
│  │    │ Fetch Google News RSS│                              │  │
│  │    │ (30 articles max)    │                              │  │
│  │    └──────────────────────┘                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. RANK WITH BM25                                        │  │
│  │    (rankForQuery.js)                                     │  │
│  │    • Tokenize query: ["artificial", "intelligence"]     │  │
│  │    • Calculate BM25 scores per article                   │  │
│  │    • Apply recency boost: ×1.2 (<24h), ×1.1 (<48h)      │  │
│  │    • Sort by score descending                            │  │
│  │    • Take top 12                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. GENERATE SUMMARIES (top 6 only)                      │  │
│  │    (summarizeText.js)                                    │  │
│  │    ┌──────────────┐   Yes   ┌────────────────────────┐  │  │
│  │    │ DB summary   │ ──────→ │ Return cached summary  │  │  │
│  │    │ exists?      │         └────────────────────────┘  │  │
│  │    └──────────────┘                                      │  │
│  │           │ No                                           │  │
│  │           ↓                                               │  │
│  │    ┌──────────────┐   Yes   ┌────────────────────────┐  │  │
│  │    │ OPENAI_API   │ ──────→ │ Call GPT-4o-mini       │  │  │
│  │    │ KEY set?     │         │ Save to DB             │  │  │
│  │    └──────────────┘         └────────────────────────┘  │  │
│  │           │ No                                           │  │
│  │           ↓                                               │  │
│  │    ┌────────────────────────┐                            │  │
│  │    │ Extract bullet points  │                            │  │
│  │    │ from first sentences   │                            │  │
│  │    └────────────────────────┘                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. FETCH IMAGE                                           │  │
│  │    (getEntityImage.js)                                   │  │
│  │    ┌──────────────────┐   Yes   ┌──────────────────┐    │  │
│  │    │ Wikipedia API    │ ──────→ │ Return thumbnail │    │  │
│  │    │ has image?       │         └──────────────────┘    │  │
│  │    └──────────────────┘                                  │  │
│  │           │ No                                           │  │
│  │           ↓                                               │  │
│  │    ┌──────────────────┐   Yes   ┌──────────────────┐    │  │
│  │    │ First article    │ ──────→ │ Return og:image  │    │  │
│  │    │ has og:image?    │         └──────────────────┘    │  │
│  │    └──────────────────┘                                  │  │
│  │           │ No                                           │  │
│  │           ↓                                               │  │
│  │    ┌─────────────┐                                       │  │
│  │    │ Return null │                                       │  │
│  │    └─────────────┘                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. BUILD SUGGESTIONS                                     │  │
│  │    (buildSuggestions.js)                                 │  │
│  │    • Extract bigrams from titles (≥2 occurrences)        │  │
│  │    • Extract keywords (≥3 occurrences)                   │  │
│  │    • Filter stopwords + original query terms             │  │
│  │    • Return top 4 unique suggestions                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RETURN RESPONSE                                          │  │
│  │  {                                                       │  │
│  │    panel: { query, type, imageUrl, items[] },           │  │
│  │    suggestions: ["term1", "term2", ...]                 │  │
│  │  }                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA SOURCES                              │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │    MongoDB      │  │  Google News    │  │   Wikipedia   │  │
│  │   (Articles)    │  │   RSS Feed      │  │   REST API    │  │
│  │                 │  │                 │  │               │  │
│  │  • Fast         │  │  • Fallback     │  │  • Images     │  │
│  │  • Cached       │  │  • No DB needed │  │  • Entity info│  │
│  │  • Summaries    │  │  • Always works │  │  • Optional   │  │
│  └─────────────────┘  └─────────────────┘  └───────────────┘  │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  OpenAI API     │                                           │
│  │  (GPT-4o-mini)  │                                           │
│  │                 │                                           │
│  │  • Summaries    │                                           │
│  │  • Optional     │                                           │
│  │  • Fallback     │                                           │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘

## Data Flow Example

Query: "artificial intelligence"

1. Classification: "topic"
2. Search: MongoDB timeout → Google RSS → 30 articles
3. Ranking: BM25 scores + recency → Top 12
4. Summaries: Top 6 → OpenAI → cached
5. Image: Wikipedia "Artificial intelligence" → thumbnail
6. Suggestions: ["machine learning", "neural networks", "ai ethics", "deep learning"]

Response Time: 5-15 seconds (first request, Google RSS)
              1-3 seconds (subsequent, MongoDB cached)

## Error Handling Flow

```
Any step fails
      ↓
Catch exception
      ↓
Log error
      ↓
Apply fallback
      ↓
Continue pipeline
      ↓
Always return valid response
```

## Key Features

✅ **Hybrid Search**: MongoDB-first, RSS fallback
✅ **Smart Ranking**: BM25 + recency using query tokens
✅ **Graceful Degradation**: Works with/without APIs
✅ **Intelligent Classification**: Auto-detect query intent
✅ **Progressive Enhancement**: Images and summaries optional
✅ **Infinite Exploration**: Suggestion chips → more panels
