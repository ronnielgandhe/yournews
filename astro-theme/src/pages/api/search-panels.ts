/**
 * API Route: POST /api/search-panels
 * Main search endpoint - fetches news, ranks, and builds digests for each topic
 */

import type { APIRoute } from 'astro';
import { fetchGoogleNews } from '../../server/rss';
import { scoreItems } from '../../server/rank';
import { buildDigest } from '../../server/digest';
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

    const prefs = body.preferences || {};
    const raw = body.query.trim();
    const topics = raw
      .split(/,| and /gi)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    const panels: any[] = [];
    
    for (const topic of topics) {
      try {
        // 1) Retrieve from Google News
        const maxLinks = prefs?.search?.maxLinks ?? 20;
        const items = await fetchGoogleNews(topic, maxLinks);
        console.info('[YN api] Fetched', { topic, count: items.length });

        if (items.length === 0) {
          panels.push({
            title: topic,
            type: 'topic',
            summaryMd: `No recent news found for "${topic}".`,
            items: [],
            meta: { usedOpenAI: false, recentWindowHours: 72 }
          });
          continue;
        }

        // 2) Filter recency
        const hours = prefs?.search?.timeWindowHours ?? 72;
        const now = Date.now();
        const recent = items.filter(i => {
          const t = i?.pubDate ? Date.parse(i.pubDate) : NaN;
          return Number.isFinite(t) ? (now - t) <= hours * 3600 * 1000 : true;
        });
        const pool = (recent.length >= 6 ? recent : items).slice(0, maxLinks);

        console.info('[YN api] Filtered', { topic, pool: pool.length, recent: recent.length });

        // 3) Rank
        const ranked = scoreItems(pool, topic, {
          search: { timeWindowHours: hours },
          ranking: {
            bm25Weight: prefs?.ranking?.bm25Weight ?? 1,
            recencyAlpha: prefs?.ranking?.recencyAlpha ?? 0.2,
            perDomainCap: prefs?.ranking?.perDomainCap ?? 2,
            profileAlpha: 0,
            dedupeNearDupes: prefs?.ranking?.dedupeNearDupes ?? true,
          },
        });

        // 4) Build digest
        const urls = ranked.slice(0, 12).map((i: any) => i.url).filter(Boolean);
        const titles = ranked.slice(0, 12).map((i: any) => ({ title: i.title, source: i.source }));
        const style = prefs?.search?.summaryStyle ?? 'short';
        const useOpenAI = prefs?.search?.useOpenAI !== false;
        
        const digest = await buildDigest(urls, titles, style, useOpenAI);

        console.info('[YN api] panel', { topic, fetched: items.length, pool: pool.length, usedOpenAI: digest.usedOpenAI });

        // 5) Panel response
        const showN = prefs?.display?.linksToShow ?? 7;
        panels.push({
          title: topic,
          type: 'topic',
          summaryMd: digest.summaryMd,
          items: ranked.slice(0, showN).map((item: any) => ({
            ...item,
            timeAgo: timeAgo(item.pubDate),
          })),
          meta: { usedOpenAI: digest.usedOpenAI, recentWindowHours: hours }
        });
      } catch (err: any) {
        console.error('[YN api] panel error', topic, err?.message || err);
        panels.push({
          title: topic,
          type: 'topic',
          summaryMd: `Error: ${err?.message || 'Failed to fetch'}`,
          items: [],
          meta: { usedOpenAI: false, recentWindowHours: 72 }
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
