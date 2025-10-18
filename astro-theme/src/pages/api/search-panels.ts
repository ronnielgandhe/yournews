/**
 * API Route: POST /api/search-panels
 * Main search endpoint - fetches news, ranks, and builds digests for each topic
 */

import type { APIRoute } from 'astro';
import { fetchGoogleNews } from '../../server/rss';
import { rankItems, getRankProfile, getRankFocus, filterByFocus, softBoostByFocus, type RankProfileName } from '../../server/rank';
import { buildDigestStructured } from '../../server/digest';
import { isRecent, timeAgo } from '../../server/time';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Bad request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.info('[YN api] req', { q: body.query, profile: body.profile, hasPrefs: !!body.preferences, defaultProfile: body.preferences?.defaultProfile });

    const prefs = body.preferences || null;
    const profileName = (body.profile as RankProfileName) || prefs?.defaultProfile || 'default';
    const raw = body.query.trim();
    const topics = raw
      .split(/,| and /gi)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    const panels: any[] = [];
    
    for (const topic of topics) {
      try {
        // 1) Get ranking profile and merge with preferences
        let rankProfile = getRankProfile(profileName);
        
        // Apply preference overrides
        if (prefs) {
          if (prefs.perDomainCap) rankProfile.perDomainCap = prefs.perDomainCap;
          if (typeof prefs.recencyAlpha === 'number') rankProfile.recencyAlpha = prefs.recencyAlpha;
          if (prefs.windowHours) rankProfile.windowHours = prefs.windowHours;
        }
        
        const hours = rankProfile.windowHours || 72;
        
        // 2) Get focus configuration for this profile
        const focus = getRankFocus(profileName);
        
        // 2.5) Modify search query with profile context if profile is active and not default
        let searchQuery = topic;
        if (profileName !== 'default' && focus.keywords.length > 0) {
          // Add top profile keywords to search query to guide Google News
          const contextKeywords = focus.keywords.slice(0, 2).join(' OR ');
          searchQuery = `${topic} (${contextKeywords})`;
          console.info('[YN api] Enhanced query', { original: topic, enhanced: searchQuery, profile: profileName });
        }
        
        // 3) Retrieve from Google News
        const maxLinks = 20;
        const items = await fetchGoogleNews(searchQuery, maxLinks);
        console.info('[YN api] Fetched', { topic, count: items.length });

        if (items.length === 0) {
          panels.push({
            title: topic,
            type: 'topic',
            summaryMd: `No recent news found for "${topic}".`,
            insights: [],
            takeaways: [],
            actions: [],
            watch: [],
            tags: [],
            items: [],
            meta: { usedOpenAI: false, recentWindowHours: hours, profile: profileName, profileFallback: false }
          });
          continue;
        }

        // 4) Filter recency
        const now = Date.now();
        const recent = items.filter(i => {
          const t = i?.pubDate ? Date.parse(i.pubDate) : NaN;
          return Number.isFinite(t) ? (now - t) <= hours * 3600 * 1000 : true;
        });
        let pool = (recent.length >= 6 ? recent : items).slice(0, maxLinks);

        console.info('[YN api] Filtered', { topic, pool: pool.length, recent: recent.length });

        // 5) Apply profile focus: hard filter first, fallback to soft boost if too few results
        let focused = filterByFocus(pool, focus);
        let profileFallback = false;
        
        // Debug: Log sample titles and focus keywords
        console.info('[YN api] focus', {
          topic,
          profile: profileName,
          total: pool.length,
          hardHits: focused.length,
          focusKeywords: focus.keywords.slice(0, 5),
          focusDomains: focus.allowDomains.slice(0, 3),
          sampleTitles: pool.slice(0, 3).map(i => i.title),
        });
        
        if (focused.length >= 3) {
          // Enough results with hard filter (lowered threshold from 10 to 3)
          pool = focused;
          console.info('[YN api] Using hard filter', { topic, profile: profileName, count: focused.length });
        } else if (focused.length > 0 && focused.length < 3) {
          // Some results but not enough - use soft boost instead
          pool = softBoostByFocus(pool, focus);
          profileFallback = true;
          console.info('[YN api] Using soft boost (not enough hard hits)', { topic, profile: profileName, hardHits: focused.length, usedFallback: true });
        } else {
          // No focused results or default profile - use soft boost if profile is set
          if (profileName !== 'default') {
            pool = softBoostByFocus(pool, focus);
            profileFallback = true;
            console.info('[YN api] Using soft boost (no hard hits)', { topic, profile: profileName, usedFallback: true });
          } else {
            console.info('[YN api] No profile focus applied', { topic, profile: profileName });
          }
        }

        // 6) Rank with profile
        const ranked = rankItems(pool, topic, rankProfile);

        console.info('[YN api] ranked', { 
          topic, 
          profile: profileName,
          profileFallback,
          pool: pool.length, 
          top: ranked.length 
        });

        // 4) Build digest with structured output
        const urls = ranked.slice(0, 12).map((i: any) => i.url).filter(Boolean);
        const titles = ranked.slice(0, 12).map((i: any) => ({ title: i.title, source: i.source }));
        
        // Use preferences for summaryLevel and openai toggle
        const summaryLevel = prefs?.summaryLevel || 'short';
        const useOpenAI = prefs?.openai !== false;
        
        const digest = await buildDigestStructured(urls, titles, summaryLevel, useOpenAI, hours);

        console.info('[YN api] panel', { 
          topic, 
          insights: digest.insights?.length,
          takeaways: digest.takeaways?.length,
          actions: digest.actions?.length,
          watch: digest.watch?.length,
          tags: digest.tags?.length, 
          items: ranked.length,
          usedOpenAI: digest.usedOpenAI 
        });

        // 5) Panel response with structured fields
        const showN = 7;
        panels.push({
          title: topic,
          type: 'topic',
          summaryMd: digest.summaryMd,
          insights: digest.insights || [],
          takeaways: digest.takeaways || [],
          actions: digest.actions || [],
          watch: digest.watch || [],
          tags: digest.tags || [],
          items: ranked.slice(0, showN).map((item: any) => ({
            ...item,
            timeAgo: timeAgo(item.pubDate),
          })),
          meta: { 
            usedOpenAI: digest.usedOpenAI, 
            recentWindowHours: hours, 
            profile: profileName,
            profileFallback
          }
        });
      } catch (err: any) {
        console.error('[YN api] panel error', topic, err?.message || err);
        panels.push({
          title: topic,
          type: 'topic',
          summaryMd: `Error: ${err?.message || 'Failed to fetch'}`,
          insights: [],
          takeaways: [],
          actions: [],
          watch: [],
          tags: [],
          items: [],
          meta: { usedOpenAI: false, recentWindowHours: 72, profile: profileName, profileFallback: false }
        });
      }
    }

    return new Response(
      JSON.stringify({ panels }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[YN api] fatal', e?.message || e);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
