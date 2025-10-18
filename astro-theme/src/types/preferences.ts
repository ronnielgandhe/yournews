export interface SearchPreferences {
  timeWindowHours: number;
  sourcesMode: 'all' | 'allowlist';
  allowlist: string[];
  maxLinks: number;
  summaryStyle: 'short' | 'medium' | 'long';
  useOpenAI: boolean;
}

export interface RankingPreferences {
  recencyAlpha: number;
  perDomainCap: number;
  bm25Weight: number;
  profileAlpha: number;
  dedupeNearDupes: boolean;
}

export interface DisplayPreferences {
  linksToShow: number;
  showImages: boolean;
  showMeta: boolean;
  showDebugScores: boolean;
}

export interface Preferences {
  search: SearchPreferences;
  ranking: RankingPreferences;
  display: DisplayPreferences;
}

export const DEFAULT_PREFS: Preferences = {
  search: {
    timeWindowHours: 72,
    sourcesMode: 'all',
    allowlist: [],
    maxLinks: 12,
    summaryStyle: 'short',
    useOpenAI: true,
  },
  ranking: {
    recencyAlpha: 0.2,
    perDomainCap: 2,
    bm25Weight: 1,
    profileAlpha: 0,
    dedupeNearDupes: true,
  },
  display: {
    linksToShow: 7,
    showImages: true,
    showMeta: true,
    showDebugScores: false,
  },
};
