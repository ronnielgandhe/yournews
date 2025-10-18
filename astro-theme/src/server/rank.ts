/**
 * Ranking and scoring logic for news items with profile support
 */

import type { PanelItem } from './rss';

export type RankProfileName = 'default' | 'technology' | 'finance' | 'sports' | 'world' | 'ai';

export interface RankProfile {
  bm25Weight: number;
  recencyAlpha: number;
  perDomainCap: number;
  sourcePrior: Record<string, number>;
  dedupeNearDupes: boolean;
  windowHours?: number;
}

export type RankFocus = { 
  keywords: string[]; 
  allowDomains: string[] 
};

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
  _focusBonus?: number;
}

/**
 * Get focus metadata (keywords + allowed domains) for a profile
 */
export function getRankFocus(name: RankProfileName): RankFocus {
  if (name === 'technology') {
    return {
      keywords: ['chip', 'semiconductor', 'iphone', 'android', 'ai', 'software', 'gpu', 'cloud', 'data center', 'app', 'startup', 'tech', 'computing', 'verge', 'crunch'],
      allowDomains: ['techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com', 'anandtech.com', 'tomshardware.com', 'semianalysis.com', '9to5mac.com', 'engadget.com']
    };
  }
  if (name === 'ai') {
    return {
      keywords: ['ai', 'llm', 'model', 'gpt', 'agent', 'ml', 'machine learning', 'openai', 'anthropic', 'deepmind', 'hugging face', 'inference', 'training'],
      allowDomains: ['openai.com', 'anthropic.com', 'huggingface.co', 'deepmind.google', 'semianalysis.com', 'arxiv.org', 'paperswithcode.com']
    };
  }
  if (name === 'finance') {
    return {
      keywords: ['markets', 'stocks', 'bond', 'fed', 'inflation', 'earnings', 'ipo', 'm&a', 'commodities', 'economy'],
      allowDomains: ['reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'marketwatch.com', 'cnbc.com']
    };
  }
  if (name === 'sports') {
    return {
      keywords: ['sports', 'game', 'team', 'player', 'coach', 'season', 'league', 'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'hockey', 'championship', 'playoff', 'tournament'],
      allowDomains: ['espn.com', 'si.com', 'bleacherreport.com', 'sports.yahoo.com', 'cbssports.com', 'nfl.com', 'nba.com', 'mlb.com']
    };
  }
  if (name === 'world') {
    return {
      keywords: ['international', 'global', 'country', 'nation', 'foreign', 'diplomatic', 'treaty', 'summit', 'conflict', 'war', 'peace', 'united nations', 'embassy', 'minister', 'president', 'prime minister'],
      allowDomains: ['reuters.com', 'bbc.com', 'apnews.com', 'aljazeera.com', 'dw.com', 'france24.com']
    };
  }
  // default keeps empty
  return { keywords: [], allowDomains: [] };
}

/**
 * Hard filter items by focus keywords and domains
 * Returns only items matching profile focus
 */
export function filterByFocus(items: PanelItem[], focus: RankFocus): PanelItem[] {
  if (!focus.keywords.length && !focus.allowDomains.length) return items;
  
  const kw = new Set(focus.keywords.map(k => k.toLowerCase()));
  const allowed = new Set(focus.allowDomains);
  
  return items.filter(it => {
    try {
      const host = new URL(it.url).hostname.replace(/^www\./, '');
      const title = (it.title || '').toLowerCase();
      // Tokenize title by non-alphanumeric chars for better matching
      const tokens = title.split(/[^a-z0-9]+/).filter(Boolean);
      const kwHit = [...kw].some(k => {
        // Check if keyword appears in title as whole word or substring
        return tokens.includes(k) || title.includes(k);
      });
      const domainHit = allowed.has(host);
      return kwHit || domainHit;
    } catch {
      return false;
    }
  });
}

/**
 * Soft boost items matching focus (doesn't filter, just boosts score)
 * Used as fallback when hard filter returns too few results
 */
export function softBoostByFocus(items: PanelItem[], focus: RankFocus): PanelItem[] {
  if (!focus.keywords.length && !focus.allowDomains.length) return items;
  
  const allowed = new Set(focus.allowDomains);
  const kw = new Set(focus.keywords.map(k => k.toLowerCase()));
  
  return items.map(it => {
    try {
      const host = new URL(it.url).hostname.replace(/^www\./, '');
      const title = (it.title || '').toLowerCase();
      const tokens = title.split(/[^a-z0-9]+/).filter(Boolean);
      const kwHit = [...kw].some(k => tokens.includes(k) || title.includes(k));
      const domainHit = allowed.has(host);
      return { 
        ...it, 
        _focusBonus: (kwHit ? 0.25 : 0) + (domainHit ? 0.35 : 0) 
      };
    } catch {
      return { ...it, _focusBonus: 0 };
    }
  });
}

export function getRankProfile(name: RankProfileName): RankProfile {
  if (name === 'technology') {
    return {
      bm25Weight: 1.2,
      recencyAlpha: 0.35,
      perDomainCap: 1,
      sourcePrior: {
        'techcrunch.com': 0.30,
        'theverge.com': 0.25,
        'wired.com': 0.25,
        'arstechnica.com': 0.30,
        'anandtech.com': 0.35,
      },
      dedupeNearDupes: true,
      windowHours: 48,
    };
  }
  if (name === 'finance') {
    return {
      bm25Weight: 1.0,
      recencyAlpha: 0.40,
      perDomainCap: 1,
      sourcePrior: {
        'reuters.com': 0.35,
        'bloomberg.com': 0.35,
        'ft.com': 0.40,
        'wsj.com': 0.30,
      },
      dedupeNearDupes: true,
      windowHours: 36,
    };
  }
  if (name === 'ai') {
    return {
      bm25Weight: 1.1,
      recencyAlpha: 0.30,
      perDomainCap: 1,
      sourcePrior: {
        'semianalysis.com': 0.40,
        'huggingface.co': 0.25,
        'arxiv.org': 0.25,
        'openai.com': 0.20,
      },
      dedupeNearDupes: true,
      windowHours: 72,
    };
  }
  // default profile
  return {
    bm25Weight: 1.0,
    recencyAlpha: 0.22,
    perDomainCap: 2,
    sourcePrior: {},
    dedupeNearDupes: true,
    windowHours: 48,
  };
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
  
  // Exponential decay
  const decay = Math.exp(-(ageHours / windowHours));
  return alpha * decay;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  };
}

export function rankItems(
  items: PanelItem[],
  query: string,
  profile: RankProfile
): PanelItem[] {
  const windowHours = profile.windowHours || 48;
  
  // Score each item
  const scored: ScoredItem[] = items.map(item => {
    const textScore = bm25Score(item.title, query) * profile.bm25Weight;
    const recency = recencyBoost(item.pubDate, windowHours, profile.recencyAlpha);
    const domain = extractDomain(item.url);
    const sourcePriorBoost = profile.sourcePrior[domain] || 0;
    const focusBonus = (item as any)._focusBonus || 0;
    
    return {
      ...item,
      score: textScore + recency + sourcePriorBoost + focusBonus,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Apply per-domain cap
  const domainCounts = new Map<string, number>();
  const capped: PanelItem[] = [];

  for (const item of scored) {
    const domain = extractDomain(item.url);
    const count = domainCounts.get(domain) || 0;

    if (count < profile.perDomainCap) {
      capped.push(item);
      domainCounts.set(domain, count + 1);
    }
  }

  // Dedupe near-duplicates if enabled (simple title similarity)
  if (profile.dedupeNearDupes) {
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

    return unique.slice(0, 20);
  }

  return capped.slice(0, 20);
}
