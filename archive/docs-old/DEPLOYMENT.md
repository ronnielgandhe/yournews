# YourNews MVP - Quick Reference

## 🚀 How to Run Locally

### Prerequisites
```bash
# Install Node.js 18+
node --version  # Should be v18 or higher

# Install dependencies
cd server && npm install && cd ..
cd web && npm install && cd ..
```

### Environment Setup
```bash
# 1. Copy example env file
cp .env.example .env.local

# 2. Edit .env.local with your values:
# Required:
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/yournews

# Optional (for AI summaries):
OPENAI_API_KEY=sk-...

# Optional (custom feeds):
FEEDS=https://feeds.reuters.com/reuters/topNews,https://feeds.bbci.co.uk/news/rss.xml
```

### Start Services

**Terminal 1 - Server:**
```bash
cd server
npm run dev
# ✅ Wait for: "Server listening on port 8000" + "MongoDB connected"
```

**Terminal 2 - Seed Database (one-time):**
```bash
curl http://localhost:8000/seed
# ✅ Wait for: {"ingested":{"added":100,...},"summarized":30}
# This takes ~2-3 minutes with OpenAI key, instant without
```

**Terminal 3 - Web:**
```bash
cd web
npm run dev
# ✅ Wait for: "ready - started server on 0.0.0.0:3000"
```

**Browser:**
```
Open http://localhost:3000
✅ Should see: Feed with 50 articles
```

---

## 🧪 Testing the MVP

### 1. View Feed (No Personalization Yet)
- Open http://localhost:3000
- See ~50 articles ranked by recency + BM25 relevance
- No keyword chips visible (need 3+ clicks)

### 2. Click Your First Article
- Click "Read →" on any article
- Article opens in new tab
- Click is tracked in database

### 3. Click 2 More Articles on Same Topic
- Example: Click 3 AI-related articles
- After 3rd click, refresh page
- ✅ See: Keyword chips appear (e.g., "ai", "artificial", "intelligence")

### 4. Observe Re-Ranking
- Articles matching your keywords now appear higher
- Note the change in article order vs. step 1

### 5. Click Articles on Different Topic
- Example: Click 3 sports articles
- Keywords update to sports-related terms
- Feed re-ranks to show more sports content

---

## 📊 How to Verify It's Working

### Check MongoDB
```bash
# List collections
mongosh "<your-MONGODB_URI>"
> show collections
# ✅ Should see: articles, clicks

> db.articles.countDocuments()
# ✅ Should show: ~100-150 articles

> db.clicks.countDocuments()
# ✅ Increases with each "Read" click
```

### Check API Responses
```bash
# 1. Feed endpoint (no personalization)
curl "http://localhost:8000/feed?userId=test1" | jq

# 2. Track a click (replace <article_id> with real ID from feed)
curl -X POST http://localhost:8000/feed \
  -H "Content-Type: application/json" \
  -d '{"userId":"test1","articleId":"<article_id>"}'

# 3. Feed endpoint (with personalization after 3+ clicks)
curl "http://localhost:8000/feed?userId=test1" | jq '.keywords'
# ✅ Should show: ["keyword1", "keyword2", ...]
```

### Run Tests
```bash
cd server
npm test
# ✅ All tests pass:
#   - RSS parser normalization
#   - Ranking algorithm (recency, keywords, combined)
#   - Tokenizer stopword removal
```

---

## 🌐 How to Deploy

### MongoDB Atlas (Database)
1. Go to https://mongodb.com/cloud/atlas
2. Create free M0 cluster (512 MB, free tier)
3. Create database user + password
4. Whitelist IP: 0.0.0.0/0 (allow from anywhere)
5. Get connection string: `mongodb+srv://...`
6. Add to server env: `MONGODB_URI=<connection_string>`

### Vercel (Web Frontend)
```bash
cd web
npm install -g vercel
vercel --prod

# In Vercel dashboard, set env vars:
# NEXT_PUBLIC_APP_NAME=YourNews
# NEXT_PUBLIC_AI_PERSONAL_FEED_ENABLED=true
```

### Railway (Server Backend)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and init
railway login
railway init

# 3. Deploy
cd server
railway up

# 4. Set env vars in Railway dashboard:
MONGODB_URI=<your-atlas-uri>
OPENAI_API_KEY=<your-key>
FEEDS=<comma-separated-urls>
PORT=8000

# 5. Get public URL (e.g., https://yourapp.railway.app)
# Update web/pages/api/*.js proxies to use this URL instead of localhost:8000
```

**Alternative: Render.com**
- Create Web Service from GitHub repo
- Set build command: `cd server && npm install`
- Set start command: `cd server && npm start`
- Add env vars (same as Railway)

### Post-Deployment
1. Run seed: `curl https://your-server-url.com/seed`
2. Update web proxies to point to deployed server URL
3. Test feed: `curl https://your-server-url.com/feed?userId=demo`

---

## 🔧 Troubleshooting

### "MongoServerError: bad auth"
- Check MONGODB_URI has correct username/password
- Verify IP whitelist includes your deployment IP

### "OPENAI_API_KEY missing" warnings
- Expected if you don't have a key
- App works without it (summaries say "Summary unavailable")

### Feed shows 0 articles
- Run seed: `curl http://localhost:8000/seed`
- Check ingest errors: `curl http://localhost:8000/ingest`

### Keywords not appearing after 3 clicks
- Check clicks in DB: `db.clicks.find({userId: "demo"})`
- Ensure you clicked same userId (frontend uses "demo")
- Check console logs for keyword extraction

### Tests fail: "Cannot find module"
- Run `npm install` in server directory
- Ensure jest is in devDependencies

### Web build fails
- Check TypeScript errors: `cd web && npx tsc --noEmit`
- Ensure all imports are valid
- Check index.tsx closing tags match

---

## 🚫 What's Intentionally NOT Included

These features were scoped out to keep MVP focused:

### Infrastructure
- ❌ Redis caching (all caching is in-memory or MongoDB)
- ❌ Queue system (no background jobs, no retries beyond simple backoff)
- ❌ CDN for assets (relies on Vercel/Railway defaults)

### AI/ML
- ❌ Vector embeddings (no semantic search via FAISS/Pinecone)
- ❌ Fine-tuned models (uses gpt-4o-mini as-is)
- ❌ Sentiment analysis
- ❌ Topic modeling (LDA/LSA)

### User Management
- ❌ Authentication (everyone is "demo" user)
- ❌ Multi-user support
- ❌ User profiles / settings
- ❌ Password reset / OAuth

### Features
- ❌ Email digests
- ❌ Push notifications
- ❌ Bookmarks / favorites
- ❌ Article full-text extraction (only RSS content)
- ❌ Comments / social features
- ❌ Admin dashboard
- ❌ A/B testing framework

### Analytics
- ❌ Advanced click tracking (no heatmaps, no session replay)
- ❌ Conversion funnels
- ❌ Retention cohorts
- ❌ Revenue tracking

### DevOps
- ❌ CI/CD pipelines (no GitHub Actions)
- ❌ Monitoring (no Datadog/Sentry)
- ❌ Load balancing
- ❌ Auto-scaling
- ❌ Blue-green deployments

---

## 📈 Next Steps (Post-MVP)

If you want to extend this MVP:

1. **Week 1: Auth**
   - Add NextAuth.js for user login
   - Replace "demo" userId with real user IDs
   - Add user settings page

2. **Week 2: Advanced Personalization**
   - Add vector embeddings (OpenAI embeddings API)
   - Store article embeddings in MongoDB
   - Implement cosine similarity ranking

3. **Week 3: Email Digests**
   - Add SendGrid integration
   - Cron job to send daily/weekly digests
   - User preference: frequency, topics

4. **Week 4: Admin Dashboard**
   - Add `/admin` route in web
   - View ingestion stats, errors
   - Manually trigger re-ingestion
   - Ban sources, moderate content

5. **Week 5: Analytics**
   - Add Mixpanel/Amplitude
   - Track: feed_viewed, article_clicked, keyword_extracted
   - Build retention dashboard

---

## 📞 Support

If you encounter issues:

1. Check logs: `server/server.log`, `web/web.log`
2. Review SELF_REVIEW.md for acceptance criteria
3. Run tests: `cd server && npm test`
4. Check MongoDB: `db.articles.find().limit(5)`
5. Verify env vars: `echo $MONGODB_URI` (don't commit!)

---

## 🎉 Success Criteria

You know the MVP works when:

✅ Server starts and connects to MongoDB  
✅ `/seed` populates ~100 articles  
✅ `/feed` returns 50 ranked articles  
✅ Web UI loads feed on page load  
✅ Clicking "Read" tracks click in DB  
✅ After 3 clicks, keywords appear in UI  
✅ Feed re-ranks based on keywords  
✅ Tests pass: `npm test`  

**Congratulations!** You now have a working personalized news feed MVP. 🚀
