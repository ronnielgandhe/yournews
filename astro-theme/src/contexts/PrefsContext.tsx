import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Preferences } from '../types/preferences';
import { DEFAULT_PREFS } from '../types/preferences';

interface PrefsContextValue {
  prefs: Preferences;
  setPrefs: (prefs: Preferences) => void;
}

const PrefsContext = createContext<PrefsContextValue | undefined>(undefined);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('yn_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPrefsState({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  }, []);

  const setPrefs = (newPrefs: Preferences) => {
    setPrefsState(newPrefs);
    try {
      localStorage.setItem('yn_prefs', JSON.stringify(newPrefs));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  };

  return (
    <PrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const context = useContext(PrefsContext);
  if (!context) {
    throw new Error('usePrefs must be used within PrefsProvider');
  }
  return context;
}
