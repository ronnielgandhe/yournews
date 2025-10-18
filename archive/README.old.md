# YourNews

A personalized news feed that learns from your reading habits.

## Overview

YourNews is an intelligent news aggregator that:
- Ingests articles from multiple RSS feeds
- Ranks content by relevance and recency
- Adapts to your interests based on what you read
- Generates AI-powered summaries (with graceful fallbacks)

## Architecture

- **Server** (`/server`): Express.js backend with MongoDB persistence
- **Web** (`/web`): Next.js frontend with personalized feed UI
- **AI Layer** (`/lib`): OpenAI integration with safe fallbacks

## Features

### 🔍 Panel-Based Search (NEW!)
- **Central search interface**: Type anything and get ranked results
- **Smart classification**: Automatically detects person/event/topic/market queries
- **Hybrid search**: MongoDB-first with Google RSS fallback
- **BM25 + recency ranking**: Uses query tokens for relevance scoring
- **AI summaries**: Top 6 results get OpenAI summaries (or bullet fallbacks)
- **Entity images**: Wikipedia thumbnails or article og:images
- **Smart suggestions**: 2-4 related topics extracted from results
- **Infinite exploration**: Click suggestions to spawn new panels below

### MVP Feed System
- **Multi-feed ingestion**: Fetches from Reuters, BBC, NPR, and custom RSS sources
- **Smart ranking**: BM25-based relevance + recency boost + personalization
- **Click tracking**: Learns your interests after 3+ clicks
- **AI summaries**: 3-sentence summaries cached in MongoDB
- **Graceful degradation**: Works without OpenAI API key

### Legacy Search & Digest
- Real-time search via Google News RSS
- Multi-query AI digest generation
- Timeline and entity extraction (feature flags)

## Getting Started

### Prerequisites

- Node.js v18+ 
- MongoDB Atlas account (free tier) or local MongoDB
- OpenAI API key (optional, for summaries)

### Quickstart

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd yournews
   
   cd server && npm install && cd ..
   cd web && npm install && cd ..
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add:
   # - MONGODB_URI (required - get from MongoDB Atlas)
   # - OPENAI_API_KEY (optional - for AI summaries)
   # - FEEDS (optional - defaults to Reuters, BBC, NPR)
   ```

3. **Start the server** (terminal 1)
   ```bash
   cd server
   npm run dev
   ```
   Server runs on `http://localhost:8000`

4. **Seed the database** (terminal 2, one-time)
   ```bash
   curl http://localhost:8000/seed
   # Or: cd server && npm run seed
   ```
   This ingests ~100 articles and generates summaries for the top 30.

5. **Start the web app** (terminal 3)
   ```bash
   cd web
   npm run dev
   ```
   Web runs on `http://localhost:3000`

6. **Open your browser**
   Navigate to `http://localhost:3000` → see your personalized feed!

### Demo Flow

#### Panel Search (New!)
1. Click **"Search"** tab at the top
2. Type any query: `"artificial intelligence"`, `"Elon Musk"`, `"AAPL stock"`, etc.
3. See **ranked panel** with:
   - Query classification badge (person/event/topic/market)
   - Entity image (if available)
   - Summary of top result
   - 5-7 ranked article links with time-ago
   - Suggestion chips at bottom
4. **Click a suggestion** → new panel appears below
5. **Explore topics** by chaining suggestions

#### Personalized Feed
1. **Initial load**: Feed shows ~50 recent articles ranked by recency + relevance
2. **Click "Read" on 3+ articles**: Feed adapts to your interests
3. **Keywords appear**: See extracted topics from your reading history
4. **Re-rank happens**: Articles matching your keywords get boosted
5. **Test personalization**: Click more AI articles → see more AI content surface

## API Endpoints

### Panel Search (NEW!)
- `POST /search/panels` - Get ranked panel for any query
  - Body: `{ query: string, userId?: string }`
  - Returns: `{ panel: { query, type, imageUrl, items[] }, suggestions: [] }`

### MVP Feed & Tracking
- `GET /feed?userId=<id>` - Personalized ranked feed (top 50 articles)
- `POST /track` - Track article click: `{ userId, articleId }`
- `GET /ingest` - Fetch all RSS feeds and upsert to DB
- `GET /seed` - One-time bootstrap: ingest + summarize top 30

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
