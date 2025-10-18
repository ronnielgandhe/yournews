# Archive

This directory contains code and files that were removed during the production cleanup (cleanup-release branch).

## Removed Legacy Systems

### `/server-legacy` (formerly `/server`)
**Reason**: Old Express.js backend - replaced by Astro API routes

Contains:
- `index.js` - Express server
- `src/routes/` - Legacy API endpoints (feed.js, panels.js, search-panels.js, ingest.js, seed.js, track.js)
- `src/lib/` - Old utilities (buildSuggestions, classifyQuery, searchNews, summarizeText, getEntityImage, rankForQuery, ranking, keywords, feeds, db)
- `src/models/` - Mongoose models (Article.js, Click.js)
- `__tests__/` - Old test files

**Replacement**: All functionality now in `/astro-theme/src/pages/api/` and `/astro-theme/src/server/`

### `/web-legacy` (formerly `/web`)
**Reason**: Old Next.js frontend - replaced by Astro app

Contains:
- `pages/index.tsx` - Legacy React page
- `pages/api/` - Next.js API routes (search.js, search-all.js, search-panels.js, feed.js, track.js, digest-from-links.js, multi-digest.js, ai/*)

**Replacement**: Active app is `/astro-theme`

### `/lib-legacy` (formerly `/lib`)
**Reason**: Duplicate AI utilities - consolidated into astro-theme

Contains:
- `ai.ts` and `ai.js` - Old AI client code

**Replacement**: Integrated into `/astro-theme/src/server/digest.ts`

## Removed Test Files

- `test-browser.js` - Manual browser test script
- `test-frontend.js` - Frontend test script
- `test-hydration.html` - Hydration test page
- `test-search.html` - Search test page
- `test-api.html` - API test page

**Reason**: Manual test files not part of automated test suite

## Removed Documentation

### `/docs-old`
- `ARCHITECTURE.md` - Old architecture docs
- `CHECKLIST.md`, `CHECKLIST_PANELS.md` - Old feature checklists
- `DEPLOYMENT.md` - Old deployment guide
- `IMPLEMENTATION_COMPLETE.md` - Implementation notes
- `IMPLEMENTATION_SEARCH.md` - Search implementation notes
- `PANEL_SEARCH_IMPLEMENTATION.md` - Panel search notes
- `QUICK_START.md` - Old quick start (replaced by README.md)
- `SELF_REVIEW.md` - Self-review notes

**Reason**: Replaced by comprehensive README.md, RELEASE_REPORT.md, and CONTRIBUTING.md

### `/astro-unused`
- `LandingPage.astro` - Unused landing page component
- `MacTerminal.tsx` - Unused terminal component (replaced by YourNewsTerminal.tsx)
- `chat.ts` - Unused chat API endpoint

**Reason**: Components not referenced in active application

## Log Files

- `server.log` - Old server logs
- `web.log` - Old web logs
- `dev.log` - Development logs  
- `next.log` - Next.js logs

**Reason**: Temporary log files not needed in repository

## What Remains (Active Code)

**Everything in `/astro-theme`** is production code:
- `src/pages/` - Active pages and API routes
- `src/components/` - Active React components
- `src/server/` - Server utilities (rss.ts, rank.ts, digest.ts, time.ts)
- `src/lib/` - Client utilities (prefs.ts, env.ts, api.ts, layout.ts)
- `src/layouts/` - Page layouts
- `src/styles/` - Global CSS
- `public/` - Static assets

---

**Archive created**: 2025-01-XX during production cleanup
**Branch**: cleanup-release
