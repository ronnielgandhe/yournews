# YourNews - Release Report

## What It Does

YourNews transforms any search query into ranked, AI-summarized news panels with intelligent profile-based filtering.

## Key Features Shipped

- **Smart Search**: Query Google News RSS, rank by relevance + recency
- **Profile Focus**: 6 profiles (Technology, AI, Finance, Sports, World, Default) with keyword/domain filtering
  - Hard filter (≥3 matches) or soft boost (<3 matches) for graceful fallback
  - Query enhancement: "trump" + Sports profile → "trump (sports OR game)"
- **AI Summaries**: GPT-4 structured digests (Key Insights, Takeaways, Actions, Watch)
  - Graceful fallback to template-based summaries when API unavailable
- **User Preferences**: 6 customizable controls (summary level, time window, per-domain cap, recency weight, AI on/off, default profile)
  - localStorage persistence
  - Hover-based settings popover with smooth UX
- **Glass UI**: macOS-inspired draggable windows with live status indicator

## Profile Behavior

When a profile is active:
1. Search query automatically enhanced with profile keywords
2. Results hard-filtered if ≥3 keyword/domain matches found
3. Otherwise soft-boosted (score bonus) with fallback indicator
4. Profile chip shown in panel header

## Reliability

- **Error Boundary**: Graceful error handling throughout
- **AI Fallback**: App fully functional without OpenAI API key
- **Status Indicator**: Live API health check (green dot)
- **Type Safety**: Zod env validation + TypeScript strict mode

## How to Run

1. `npm install` in `/astro-theme`
2. (Optional) Add `OPENAI_API_KEY` to `.env`
3. `npm run dev` → `http://localhost:4321`

## Out of Scope (MVP)

- No persistence (results are ephemeral)
- No user accounts
- Single source (Google News RSS only)
- No caching or rate limiting
- No offline evaluation metrics

---

**v1.0.0** - Production-ready release with full feature set
