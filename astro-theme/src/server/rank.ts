/**
 * Ranking and scoring logic for news items
 */

import type { PanelItem } from './rss';

interface Preferences {
  search: {
    timeWindowHours: number;
  };
  ranking: {
    recencyAlpha: number;
    perDomainCap: number;
    bm25Weight: number;
    profileAlpha: number;
    dedupeNearDupes: boolean;
  };
}

interface ScoredItem extends PanelItem {
  score: number;
}

function bm25Score(text: string, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const docText = text.toLowerCase();
  
  let score = 0;
  queryTerms.forEach(term => {
    const tf = (docText.match(new RegExp(term, 'g')) || []).length;
    if (tf > 0) {
      // Simplified BM25: k1=1.2, b=0.75
      score += (tf * 2.2) / (tf + 1.2);
    }
  });
  
  return score;
}

function recencyBoost(pubDate: string | undefined, windowHours: number, alpha: number): number {
  if (!pubDate || alpha === 0) return 0;
  
  const ageMs = Date.now() - new Date(pubDate).getTime();
  const ageHours = ageMs / (1000 * 3600);
  
  if (ageHours > windowHours) return 0;
  
  // Linear decay from 1.0 to 0 over the time window
  const recencyFactor = 1 - (ageHours / windowHours);
  return alpha * recencyFactor;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function scoreItems(
  items: PanelItem[],
  query: string,
  prefs: Preferences
): PanelItem[] {
  const { ranking, search } = prefs;
  
  // Score each item
  const scored: ScoredItem[] = items.map(item => {
    const textScore = bm25Score(item.title, query) * ranking.bm25Weight;
    const recency = recencyBoost(item.pubDate, search.timeWindowHours, ranking.recencyAlpha);
    const profileScore = 0; // Stub for now
    
    return {
      ...item,
      score: textScore + recency + profileScore,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Apply per-domain cap
  const domainCounts = new Map<string, number>();
  const capped: PanelItem[] = [];

  for (const item of scored) {
    const domain = item.source || extractDomain(item.url);
    const count = domainCounts.get(domain) || 0;

    if (count < ranking.perDomainCap) {
      capped.push(item);
      domainCounts.set(domain, count + 1);
    }
  }

  // Dedupe near-duplicates if enabled (simple title similarity)
  if (ranking.dedupeNearDupes) {
    const unique: PanelItem[] = [];
    const seen = new Set<string>();

    for (const item of capped) {
      const normalized = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const key = normalized.split(/\s+/).slice(0, 5).join(' '); // First 5 words

      if (!seen.has(key)) {
        unique.push(item);
        seen.add(key);
      }
    }

    return unique;
  }

  return capped;
}
