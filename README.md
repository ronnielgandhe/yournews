# YourNews# YourNews



**Search anything — get YOUR news in ranked, AI-summarized panels.**A personalized news feed that learns from your reading habits.



A modern news aggregation app that transforms any search query into intelligently ranked, AI-summarized news panels. Features profile-based focus filtering (Technology, AI, Finance, Sports, World) and customizable ranking preferences.## Overview



## ✨ FeaturesYourNews is an intelligent news aggregator that:

- Ingests articles from multiple RSS feeds

- **Intelligent Search** - Enter any topic, get relevant news articles from Google News RSS- Ranks content by relevance and recency

- **Profile Focus** - Filter results by domain expertise (Technology, AI, Finance, Sports, World, Default)- Adapts to your interests based on what you read

- **Smart Ranking** - BM25 text matching + recency decay + source priors + profile focus boost- Generates AI-powered summaries (with graceful fallbacks)

- **AI Summaries** - GPT-4 powered key insights and takeaways (with fallback when API unavailable)

- **Customizable Settings** - Summary level, time window, per-domain cap, recency weight, AI toggle, default profile## Architecture

- **Glass UI** - macOS-inspired interface with draggable windows

- **Persistent Preferences** - Settings saved to localStorage- **Server** (`/server`): Express.js backend with MongoDB persistence

- **Web** (`/web`): Next.js frontend with personalized feed UI

## 🚀 Quick Start- **AI Layer** (`/lib`): OpenAI integration with safe fallbacks



### Prerequisites## Features

- Node.js 18+

- npm or pnpm### 🔍 Panel-Based Search (NEW!)

- **Central search interface**: Type anything and get ranked results

### Setup- **Smart classification**: Automatically detects person/event/topic/market queries

- **Hybrid search**: MongoDB-first with Google RSS fallback

1. Clone and navigate:- **BM25 + recency ranking**: Uses query tokens for relevance scoring

   ```bash- **AI summaries**: Top 6 results get OpenAI summaries (or bullet fallbacks)

   git clone https://github.com/ronnielgandhe/yournews.git- **Entity images**: Wikipedia thumbnails or article og:images

   cd yournews/astro-theme- **Smart suggestions**: 2-4 related topics extracted from results

   ```- **Infinite exploration**: Click suggestions to spawn new panels below



2. Install dependencies:### MVP Feed System

   ```bash- **Multi-feed ingestion**: Fetches from Reuters, BBC, NPR, and custom RSS sources

   npm install- **Smart ranking**: BM25-based relevance + recency boost + personalization

   ```- **Click tracking**: Learns your interests after 3+ clicks

- **AI summaries**: 3-sentence summaries cached in MongoDB

3. Configure environment (optional):- **Graceful degradation**: Works without OpenAI API key

   ```bash

   cp .env.example .env### Legacy Search & Digest

   # Add your OpenAI API key to .env (app works without it)- Real-time search via Google News RSS

   ```- Multi-query AI digest generation

- Timeline and entity extraction (feature flags)

4. Start development:

   ```bash## Getting Started

   npm run dev

   ```### Prerequisites



5. Open browser at `http://localhost:4321`- Node.js v18+ 

- MongoDB Atlas account (free tier) or local MongoDB

## 📦 Production Build- OpenAI API key (optional, for summaries)



```bash### Quickstart

npm run build

npm run preview1. **Clone and install dependencies**

```   ```bash

   git clone <repository-url>

## 📡 API   cd yournews

   

### POST `/api/search-panels`   cd server && npm install && cd ..

   cd web && npm install && cd ..

**Request:**   ```

```typescript

{2. **Configure environment**

  query: string;   ```bash

  profile?: 'default' | 'technology' | 'ai' | 'finance' | 'sports' | 'world';   cp .env.example .env.local

  preferences?: {   # Edit .env.local and add:

    summaryLevel?: 'short' | 'medium' | 'long';   # - MONGODB_URI (required - get from MongoDB Atlas)

    windowHours?: number;   # - OPENAI_API_KEY (optional - for AI summaries)

    perDomainCap?: number;   # - FEEDS (optional - defaults to Reuters, BBC, NPR)

    recencyAlpha?: number;   ```

    openai?: boolean;

    defaultProfile?: string;3. **Start the server** (terminal 1)

  };   ```bash

}   cd server

```   npm run dev

   ```

**Response:** Array of panels with summaries, insights, takeaways, and ranked articles.   Server runs on `http://localhost:8000`



### GET `/api/ai/status`4. **Seed the database** (terminal 2, one-time)

   ```bash

Returns: `{ openai: boolean }`   curl http://localhost:8000/seed

   # Or: cd server && npm run seed

## 🏗️ Architecture   ```

   This ingests ~100 articles and generates summaries for the top 30.

```

Search → RSS candidates → Profile focus filter → Ranking → AI digest → Panel UI5. **Start the web app** (terminal 3)

```   ```bash

   cd web

**Key Files:**   npm run dev

- `src/pages/api/search-panels.ts` - Main search endpoint   ```

- `src/server/rank.ts` - Ranking + profile focus   Web runs on `http://localhost:3000`

- `src/server/digest.ts` - AI summarization

- `src/server/rss.ts` - Google News fetcher6. **Open your browser**

- `src/lib/prefs.ts` - Preferences management   Navigate to `http://localhost:3000` → see your personalized feed!



## 🔧 Configuration### Demo Flow



### Environment Variables#### Panel Search (New!)

1. Click **"Search"** tab at the top

| Variable | Required | Description |2. Type any query: `"artificial intelligence"`, `"Elon Musk"`, `"AAPL stock"`, etc.

|----------|----------|-------------|3. See **ranked panel** with:

| `OPENAI_API_KEY` | No | OpenAI API key for AI summaries (graceful fallback) |   - Query classification badge (person/event/topic/market)

| `PUBLIC_API_BASE` | No | API base URL |   - Entity image (if available)

   - Summary of top result

## 🧪 Development   - 5-7 ranked article links with time-ago

   - Suggestion chips at bottom

```bash4. **Click a suggestion** → new panel appears below

npm run dev       # Dev server5. **Explore topics** by chaining suggestions

npm run build     # Production build

npm run lint      # ESLint#### Personalized Feed

npm run format    # Prettier1. **Initial load**: Feed shows ~50 recent articles ranked by recency + relevance

npm run typecheck # TypeScript check2. **Click "Read" on 3+ articles**: Feed adapts to your interests

npm run check     # Full validation3. **Keywords appear**: See extracted topics from your reading history

```4. **Re-rank happens**: Articles matching your keywords get boosted

5. **Test personalization**: Click more AI articles → see more AI content surface

## 🚧 Limitations

## API Endpoints

- No persistence (ephemeral results)

- RSS-dependent### Panel Search (NEW!)

- No rate limiting- `POST /search/panels` - Get ranked panel for any query

- Single source (Google News only)  - Body: `{ query: string, userId?: string }`

  - Returns: `{ panel: { query, type, imageUrl, items[] }, suggestions: [] }`

## 📄 License

### MVP Feed & Tracking

MIT License- `GET /feed?userId=<id>` - Personalized ranked feed (top 50 articles)

- `POST /track` - Track article click: `{ userId, articleId }`

---- `GET /ingest` - Fetch all RSS feeds and upsert to DB

- `GET /seed` - One-time bootstrap: ingest + summarize top 30

**Made for staying informed 🗞️**

### Legacy Search & AI
- `GET /search/all?q=<query>` - Google News RSS search
- `POST /ai/extract` - Extract terms from free text
- `POST /ai/digest-from-links` - Build markdown digest from URLs
- `POST /ai/multi-digest` - Multi-query AI digest (requires feature flag)
- `GET /ai/status` - Check API key availability

## Tech Stack

- **Backend**: Express.js 5, Mongoose, rss-parser, OpenAI SDK
- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: MongoDB (via Mongoose)
- **AI**: OpenAI GPT-4o-mini (with safe fallbacks)
- **Data Sources**: Reuters, BBC, NPR + custom RSS feeds

## Architecture Details

### Panel Search Algorithm
1. **Query Classification**: Detect person (2-3 caps words), market (tickers/financial), event (phrases), or topic (default)
2. **Hybrid Search**: Try MongoDB first (regex on title/content), fallback to Google RSS if <10 results
3. **BM25 Ranking**: Calculate scores using query tokens, apply recency boost (1.2× <24h, 1.1× <48h)
4. **Smart Summaries**: Top 6 get OpenAI summaries (or bullet fallbacks), cached in DB
5. **Entity Images**: Try Wikipedia REST API, then first article og:image
6. **Suggestions**: Extract frequent bigrams/keywords from titles, filter stopwords
7. **Return Panel**: Query + type + image + items[] + suggestions[]

### Feed Ranking Algorithm
1. **BM25 scoring**: Term frequency-inverse document frequency on title + content
2. **Recency boost**: Articles < 24h old get 1.15× multiplier
3. **Keyword nudge**: Title matches user keywords get 1.3× multiplier
4. **Top 50**: Only return highest-scoring articles

### Personalization
- After 3+ clicks, extract keywords from clicked article titles
- Remove stopwords, count frequency, take top 5 keywords
- Keywords passed to ranking algorithm for next feed load

### Summarization
- Check if `article.summary` exists in DB
- If missing: call OpenAI with 3-sentence prompt (temp 0.2, 150 tokens)
- Cache result in DB to avoid duplicate API calls
- Fallback: "Summary unavailable" if no API key

## Deployment

### Vercel (Web)
```bash
cd web
vercel --prod
# Set env vars in Vercel dashboard: NEXT_PUBLIC_*
```

### Railway/Render (Server)
```bash
cd server
# Deploy via Git push or CLI
# Set env vars: MONGODB_URI, OPENAI_API_KEY, FEEDS
```

### MongoDB Atlas
1. Create free cluster at mongodb.com/cloud/atlas
2. Get connection string
3. Add to `MONGODB_URI` in server .env

## What's NOT Included (Yet)

- Redis caching layer
- Vector embeddings for semantic search
- User authentication / multi-user
- Admin dashboard for content moderation
- Email digests / push notifications
- A/B testing framework
- Advanced analytics / click heatmaps
