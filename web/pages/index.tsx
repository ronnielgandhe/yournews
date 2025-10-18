import { useState, useEffect } from 'react';

export default function Home() {
  // State for personalized feed
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const userId = 'demo'; // Fixed demo user for MVP
  const [keywords, setKeywords] = useState([]);

  // Legacy digest state (keep for backward compatibility with existing UI)
  const [query, setQuery] = useState('');
  const [digest, setDigest] = useState(null);
  const [sources, setSources] = useState([]);
  const [intentTags, setIntentTags] = useState([]);
  const [timelineData, setTimelineData] = useState(null);
  const [entitiesData, setEntitiesData] = useState(null);
  const [summaryLevel, setSummaryLevel] = useState('short');
  const [summaryCache] = useState(() => new Map());
  const summaryLevelsEnabled = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AI_SUMMARY_LEVELS_ENABLED === 'true') || (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_AI_SUMMARY_LEVELS_ENABLED === 'true');
  const [showSources, setShowSources] = useState(false);
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'digest'

  // Load personalized feed on mount
  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/feed?userId=${userId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load feed: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      setFeed(data.items || []);
      setKeywords(data.keywords || []);
    } catch (e) {
      console.error('Load feed error:', e);
      setError(String(e && (e as any).message ? (e as any).message : e));
    } finally {
      setLoading(false);
    }
  };

  const handleReadArticle = async (article) => {
    try {
      // Track click
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, articleId: article._id }),
      });
      
      // Open article in new tab
      window.open(article.url, '_blank');
      
      // Reload feed to get updated personalization
      setTimeout(() => loadFeed(), 500);
    } catch (e) {
      console.error('Track click error:', e);
    }
  };

  // Render minimal markdown (headings, bullets, links)
  const renderMarkdown = (md) => {
    if (!md) return null;
    const html = md
      .replace(/^###?\s*(.*)$/gm, '<strong>$1</strong>')
      .replace(/^##\s*(.*)$/gm, '<h4>$1</h4>')
      .replace(/^\-\s+(.*)$/gm, '<li>$1</li>')
      .replace(/\n{2,}/g, '<br/><br/>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    const withUl = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, (m) => `<ul>${m}</ul>`);
    return { __html: withUl };
  };

  // Core flow: fetch search results (Google RSS via Next proxy /api/search-all), take top links, send to /api/digest-from-links
  const buildDigest = async () => {
    setError('');
    setDigest(null);
    setSources([]);
    setShowSources(false);
    if (!query || !query.trim()) return setError('Please enter a query');
    setLoading(true);
    try {
      // 1) fetch headlines via the server proxy
  const sRes = await fetch(`/api/search-all?q=${encodeURIComponent(query.trim())}`);
      if (!sRes.ok) throw new Error('Search failed');
      const sData = await sRes.json();
      const google = Array.isArray(sData.google) ? sData.google : [];
      // pick top 5 unique URLs
      const urls = [];
      const seen = new Set();
      for (const it of google) {
        const u = it && it.url;
        if (!u) continue;
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        if (urls.length >= 5) break;
      }
      if (urls.length === 0) {
        setError('No source links found for that query');
        setLoading(false);
        return;
      }

      // 2) If multi-query AI is enabled client-side, call the multi-digest proxy which will ask AI to split queries
      const multiEnabled = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AI_MULTI_QUERY_ENABLED === 'true') || (typeof window !== 'undefined' && (window as any).__NEXT_DATA__ && (window as any).__NEXT_DATA__.env && (window as any).__NEXT_DATA__.env.NEXT_PUBLIC_AI_MULTI_QUERY_ENABLED === 'true') || (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_AI_MULTI_QUERY_ENABLED === 'true');
      if (multiEnabled) {
        const mdRes = await fetch('/api/multi-digest', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim(), style: 'short' })
        });
        if (!mdRes.ok) throw new Error('Multi-digest failed');
        const mdJson = await mdRes.json();
        // mdJson: { intentTags: [], sections: [{query, markdown, articles}] }
        const combinedMd = (mdJson.sections || []).map(s => s.markdown || `## ${s.query}`).join('\n\n');
        setDigest({ summary_md: combinedMd });
        if (mdJson.intentTags) setIntentTags(mdJson.intentTags || []);
        if (mdJson.timeline) setTimelineData(mdJson.timeline);
        if (mdJson.entities) setEntitiesData(mdJson.entities);
        // flatten sources grouped by section for the View Sources UI
  const grouped = [];
        (mdJson.sections || []).forEach((s) => {
          const urls = (s.articles || []).map(a => a.url).filter(Boolean);
          grouped.push({ label: s.query, urls });
        });
        setSources(grouped);
      
      } else {
        // 2) request a digest from the server (will use OpenAI if configured, otherwise return local fallback)
        const dRes = await fetch('/api/digest-from-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: query.trim(), links: urls, style: 'short' })
        });
        if (!dRes.ok) {
          const txt = await dRes.text();
          throw new Error('Digest failed: ' + txt.slice(0, 200));
        }
        const dData = await dRes.json();
        // Keep the raw markdown and the source list for optional viewing
        setDigest({ summary_md: dData.summary_md || '' });
        setSources(urls);
      }
    } catch (e) {
      console.error('Build digest error', e);
      setError(String(e && e.message ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  // NOTE: removed UI and state for grouped results, AI Flow chips, style selector, extract, per-headline checkboxes,
  // duplicated digest builders, and advanced controls. Those features were removed to simplify the UX and keep
  // a single linear flow: type query -> Build Digest -> view digest -> optionally view sources. The underlying
  // server endpoints (proxied as /api/search-all and /api/digest-from-links) remain intact and are used above.

  return (
    <div style={{ minHeight: '100vh', padding: '3rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>YourNews</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setViewMode('feed')}
              style={{ 
                padding: '0.35rem 0.75rem', 
                borderRadius: 6, 
                border: viewMode === 'feed' ? '2px solid #0b74de' : '1px solid #ddd',
                background: viewMode === 'feed' ? '#e8f6ff' : 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Feed
            </button>
            <button 
              onClick={() => setViewMode('digest')}
              style={{ 
                padding: '0.35rem 0.75rem', 
                borderRadius: 6, 
                border: viewMode === 'digest' ? '2px solid #0b74de' : '1px solid #ddd',
                background: viewMode === 'digest' ? '#e8f6ff' : 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Search
            </button>
          </div>
        </div>

        {viewMode === 'feed' && (
          <>
            {keywords.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: '0.3rem' }}>
                  <strong>Personalized for you:</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {keywords.map((kw, i) => (
                    <span key={i} style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: 12, fontSize: '0.8rem' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={{ color: '#b00020', marginBottom: '0.75rem' }}>{error}</div>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading feed...</div>
            ) : feed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>No articles yet.</p>
                <p style={{ fontSize: '0.9rem' }}>Run the seed command to populate your feed:</p>
                <code style={{ background: '#f5f5f5', padding: '0.5rem', borderRadius: 4, display: 'inline-block' }}>
                  curl http://localhost:8000/seed
                </code>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  {feed.length} articles • Click to read and personalize your feed
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {feed.map((article) => (
                    <div 
                      key={article._id}
                      style={{ 
                        border: '1px solid #e5e7eb', 
                        borderRadius: 8, 
                        padding: '1rem',
                        background: 'white',
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1rem', lineHeight: 1.4 }}>
                        {article.title}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
                        {article.source} • {new Date(article.pubDate).toLocaleDateString()}
                      </div>
                      <p style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
                        {(article.summary || '').slice(0, 200)}
                        {article.summary && article.summary.length > 200 ? '...' : ''}
                      </p>
                      <button
                        onClick={() => handleReadArticle(article)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: 6,
                          border: 'none',
                          background: '#0b74de',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Read →
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fef3c7', borderRadius: 6, border: '1px solid #fbbf24' }}>
              <div style={{ fontSize: '0.9rem', color: '#78350f' }}>
                <strong>💡 Tip:</strong> Click a few articles—your feed adapts to your interests after 3 clicks!
              </div>
            </div>
          </>
        )}

        {viewMode === 'digest' && (
          <>
            <h2 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Search & Digest</h2>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <input
            aria-label="Search news"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search news..."
            style={{ flex: 1, fontSize: '1rem', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buildDigest(); } }}
          />
          <button
            onClick={buildDigest}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#0b74de', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Building…' : 'Build Digest'}
          </button>
        </div>

        {error && <div style={{ color: '#b00020', marginBottom: '0.75rem' }}>{error}</div>}

        {digest && (
          <div style={{ border: '1px solid #e6eef9', background: '#f8fbff', padding: '0.85rem', borderRadius: 8, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.95rem', color: '#073b6b' }}><strong>Digest</strong></div>
              {/* intent tags show as tiny chips when returned */}
              {intentTags && intentTags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {intentTags.map((t, i) => (
                    <span key={i} style={{ background: '#e8f1ff', color: '#063663', padding: '0.15rem 0.45rem', borderRadius: 12, fontSize: '0.75rem' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ color: '#222' }} dangerouslySetInnerHTML={renderMarkdown(digest.summary_md)} />

            {/* Summary level control (short/medium/long) */}
            {summaryLevelsEnabled && (
              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#333' }}>Summary:</div>
                {['short','medium','long'].map(l => (
                  <button key={l} onClick={async () => {
                    try {
                      setLoading(true);
                      setError('');
                      setSummaryLevel(l);
                      const key = `${digest.summary_md}||${l}`;
                      if (summaryCache.has(key)) {
                        setDigest({ summary_md: summaryCache.get(key) });
                        setLoading(false);
                        return;
                      }
                      const r = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ digestMd: digest.summary_md, level: l }) });
                      if (!r.ok) {
                        const txt = await r.text().catch(() => '');
                        throw new Error('Summarize failed: ' + txt.slice(0,200));
                      }
                      const j = await r.json();
                      if (j && j.summary) {
                        summaryCache.set(key, j.summary);
                        setDigest({ summary_md: j.summary });
                      } else {
                        throw new Error('Invalid summarize response');
                      }
                    } catch (e) {
                      setError(String(e && e.message ? e.message : e));
                    } finally { setLoading(false); }
                  }} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: summaryLevel===l ? '1px solid #0b74de' : '1px solid #ddd', background: summaryLevel===l ? '#e8f6ff' : 'white', cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {digest && (
          <div style={{ textAlign: 'left' }}>
            <button onClick={() => setShowSources(s => !s)} style={{ background: 'transparent', border: 'none', color: '#0b74de', cursor: 'pointer', padding: 0 }}>
              {showSources ? 'Hide Sources' : 'View Sources'}
            </button>
            {showSources && (
              <div style={{ marginTop: '0.5rem' }}>
                {/* timeline if present */}
                {timelineData && (
                  <div style={{ marginBottom: '0.6rem', padding: '0.5rem', background: '#fff', border: '1px solid #eef6ff', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.85rem', color: '#333', marginBottom: '0.25rem' }}><strong>Timeline</strong></div>
                    <ol style={{ paddingLeft: '1.1rem', margin: 0 }}>
                      {(timelineData.items || []).map((it, i) => (
                        <li key={i} style={{ marginBottom: '0.3rem' }}><strong>{it.date}</strong>: {it.text}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* entities if present */}
                {entitiesData && entitiesData.length > 0 && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#333', marginBottom: '0.25rem' }}><strong>Entities</strong></div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {entitiesData.map((e, i) => (
                        <span key={i} style={{ background: '#fff7e6', color: '#663c00', padding: '0.2rem 0.45rem', borderRadius: 8, fontSize: '0.8rem' }}>{e.name} ({e.type})</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* sources may be an array of groups {label, urls} or a flat array of urls */}
                {Array.isArray(sources) && sources.length > 0 && sources[0] && sources[0].label ? (
                  <div>
                    {sources.map((g, gi) => (
                      <div key={gi} style={{ marginBottom: '0.6rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#333', marginBottom: '0.2rem' }}><strong>{g.label}</strong></div>
                        <ul style={{ paddingLeft: '1.1rem' }}>
                          {(g.urls || []).map((u, i) => (
                            <li key={i} style={{ marginBottom: '0.35rem' }}><a href={u} target="_blank" rel="noreferrer" style={{ color: '#0b74de' }}>{u}</a></li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem' }}>
                    {sources.map((u, i) => (
                      <li key={i} style={{ marginBottom: '0.4rem' }}>
                        <a href={u} target="_blank" rel="noreferrer" style={{ color: '#0b74de' }}>{u}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

            <div style={{ marginTop: '2rem', color: '#666', fontSize: '0.9rem' }}>
              Legacy search & digest interface. The new personalized feed is on the "Feed" tab.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
