import { useState, useEffect } from 'react';
import { usePrefs } from '../contexts/PrefsContext';
import PrefField from './PrefField';
import { IoClose } from 'react-icons/io5';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { prefs, setPrefs } = usePrefs();
  const [activeTab, setActiveTab] = useState<'search' | 'ranking' | 'display'>('search');
  const [localPrefs, setLocalPrefs] = useState(prefs);

  useEffect(() => {
    setLocalPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    setPrefs(localPrefs);
    onClose();
  };

  const updateSearch = (field: string, value: any) => {
    setLocalPrefs({ ...localPrefs, search: { ...localPrefs.search, [field]: value } });
  };

  const updateRanking = (field: string, value: any) => {
    setLocalPrefs({ ...localPrefs, ranking: { ...localPrefs.ranking, [field]: value } });
  };

  const updateDisplay = (field: string, value: any) => {
    setLocalPrefs({ ...localPrefs, display: { ...localPrefs.display, [field]: value } });
  };

  return (
    <div className='fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4' onClick={onClose}>
      <div className='bg-black/85 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-semibold text-white'>Settings</h2>
          <button onClick={onClose} className='text-white/60 hover:text-white transition-colors'>
            <IoClose size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 mb-6'>
          {(['search', 'ranking', 'display'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='space-y-4'>
          {activeTab === 'search' && (
            <>
              <PrefField label='Time Window (hours)' hint='How far back to search for articles'>
                <input
                  type='number'
                  value={localPrefs.search.timeWindowHours}
                  onChange={(e) => updateSearch('timeWindowHours', parseInt(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='1'
                  max='168'
                />
              </PrefField>

              <PrefField label='Max Links' hint='Maximum articles to fetch per query'>
                <input
                  type='number'
                  value={localPrefs.search.maxLinks}
                  onChange={(e) => updateSearch('maxLinks', parseInt(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='5'
                  max='50'
                />
              </PrefField>

              <PrefField label='Summary Style' hint='How verbose the AI summary should be'>
                <select
                  value={localPrefs.search.summaryStyle}
                  onChange={(e) => updateSearch('summaryStyle', e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                >
                  <option value='short'>Short</option>
                  <option value='medium'>Medium</option>
                  <option value='long'>Long</option>
                </select>
              </PrefField>

              <PrefField label='Use OpenAI' hint='Enable AI-powered summaries'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={localPrefs.search.useOpenAI}
                    onChange={(e) => updateSearch('useOpenAI', e.target.checked)}
                    className='w-5 h-5'
                  />
                  <span className='text-white/70 text-sm'>Enable AI summaries</span>
                </label>
              </PrefField>

              <PrefField label='Sources Mode' hint='Filter by specific sources or use all'>
                <select
                  value={localPrefs.search.sourcesMode}
                  onChange={(e) => updateSearch('sourcesMode', e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                >
                  <option value='all'>All Sources</option>
                  <option value='allowlist'>Allowlist Only</option>
                </select>
              </PrefField>

              {localPrefs.search.sourcesMode === 'allowlist' && (
                <PrefField label='Allowed Sources' hint='Comma-separated list of domains'>
                  <input
                    type='text'
                    value={localPrefs.search.allowlist.join(', ')}
                    onChange={(e) => updateSearch('allowlist', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                    className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                    placeholder='e.g., nytimes.com, bbc.com'
                  />
                </PrefField>
              )}
            </>
          )}

          {activeTab === 'ranking' && (
            <>
              <PrefField label='Recency Alpha (0-1)' hint='How much to weight recent articles'>
                <input
                  type='number'
                  value={localPrefs.ranking.recencyAlpha}
                  onChange={(e) => updateRanking('recencyAlpha', parseFloat(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='0'
                  max='1'
                  step='0.1'
                />
              </PrefField>

              <PrefField label='Per-Domain Cap' hint='Max articles per source domain'>
                <input
                  type='number'
                  value={localPrefs.ranking.perDomainCap}
                  onChange={(e) => updateRanking('perDomainCap', parseInt(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='1'
                  max='10'
                />
              </PrefField>

              <PrefField label='BM25 Weight' hint='Text relevance score weight'>
                <input
                  type='number'
                  value={localPrefs.ranking.bm25Weight}
                  onChange={(e) => updateRanking('bm25Weight', parseFloat(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='0'
                  max='5'
                  step='0.1'
                />
              </PrefField>

              <PrefField label='Profile Alpha (0-1)' hint='Personalization weight (0 = no personalization)'>
                <input
                  type='number'
                  value={localPrefs.ranking.profileAlpha}
                  onChange={(e) => updateRanking('profileAlpha', parseFloat(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='0'
                  max='1'
                  step='0.1'
                />
              </PrefField>

              <PrefField label='Dedupe Near-Duplicates' hint='Remove similar articles'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={localPrefs.ranking.dedupeNearDupes}
                    onChange={(e) => updateRanking('dedupeNearDupes', e.target.checked)}
                    className='w-5 h-5'
                  />
                  <span className='text-white/70 text-sm'>Remove duplicate content</span>
                </label>
              </PrefField>
            </>
          )}

          {activeTab === 'display' && (
            <>
              <PrefField label='Links to Show' hint='Number of article links displayed per window'>
                <input
                  type='number'
                  value={localPrefs.display.linksToShow}
                  onChange={(e) => updateDisplay('linksToShow', parseInt(e.target.value))}
                  className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white'
                  min='1'
                  max='20'
                />
              </PrefField>

              <PrefField label='Show Images' hint='Display article thumbnails'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={localPrefs.display.showImages}
                    onChange={(e) => updateDisplay('showImages', e.target.checked)}
                    className='w-5 h-5'
                  />
                  <span className='text-white/70 text-sm'>Show article images</span>
                </label>
              </PrefField>

              <PrefField label='Show Metadata' hint='Display source and timestamp info'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={localPrefs.display.showMeta}
                    onChange={(e) => updateDisplay('showMeta', e.target.checked)}
                    className='w-5 h-5'
                  />
                  <span className='text-white/70 text-sm'>Show article metadata</span>
                </label>
              </PrefField>

              <PrefField label='Debug Scores' hint='Show ranking scores (for developers)'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={localPrefs.display.showDebugScores}
                    onChange={(e) => updateDisplay('showDebugScores', e.target.checked)}
                    className='w-5 h-5'
                  />
                  <span className='text-white/70 text-sm'>Show debug information</span>
                </label>
              </PrefField>
            </>
          )}
        </div>

        {/* Footer */}
        <div className='flex gap-3 mt-6 pt-4 border-t border-white/10'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
