export type AppPrefs = {
  summaryLevel: 'short' | 'medium' | 'long';
  windowHours: 24 | 36 | 48 | 72;
  perDomainCap: 1 | 2 | 3;
  recencyAlpha: number; // 0..0.6
  openai: boolean; // AI on/off
  defaultProfile: 'default' | 'technology' | 'finance' | 'ai' | 'sports' | 'world';
};

export const DEFAULT_PREFS: AppPrefs = {
  summaryLevel: 'short',
  windowHours: 48,
  perDomainCap: 1,
  recencyAlpha: 0.30,
  openai: true,
  defaultProfile: 'default'
};

export const PREFS_KEY = 'yn_prefs';

export function loadPrefs(): AppPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (!stored) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: AppPrefs) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
