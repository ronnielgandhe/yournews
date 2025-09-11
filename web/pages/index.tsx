import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [newsapiResults, setNewsapiResults] = useState([]);
  const [googleResults, setGoogleResults] = useState([]);
  const [terms, setTerms] = useState([]);
  const [grouped, setGrouped] = useState(null);
  const [digest, setDigest] = useState(null);
  const [style, setStyle] = useState('short');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setShowPanel(false);
    try {
      const res = await fetch(`/api/search-all?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // `/api/search-all` returns { newsapi: [...], google: [...] }
      setNewsapiResults(Array.isArray(data.newsapi) ? data.newsapi : []);
      setGoogleResults(Array.isArray(data.google) ? data.google : []);
      // also keep combined for any legacy UI
      setResults([...(Array.isArray(data.newsapi) ? data.newsapi : []), ...(Array.isArray(data.google) ? data.google : [])]);
      setShowPanel(true);
    } catch (err) {
      setError('Error fetching news');
      setResults([]);
      setNewsapiResults([]);
      setGoogleResults([]);
      setShowPanel(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: query }) });
      const data = await res.json();
      setTerms(data.terms || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleGrouped = async () => {
    if (!terms || terms.length === 0) return;
    setLoading(true);
    try {
      const q = encodeURIComponent(terms.join(','));
      const res = await fetch(`/api/search/grouped?terms=${q}`);
      const data = await res.json();
      setGrouped(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const buildDigest = async () => {
    setError('');
    setLoading(true);
    try {
      // Ensure we have terms. If none, call extract then grouped to populate terms.
      let useTerms = Array.isArray(terms) ? terms.slice() : [];

      if (!useTerms || useTerms.length === 0) {
        // Try extracting from the query
        console.log('No terms present — calling /api/ai/extract');
        const exRes = await fetch('/api/ai/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: query }) });
        if (exRes.ok) {
          const exData = await exRes.json();
          useTerms = Array.isArray(exData.terms) ? exData.terms.slice(0, 8) : [];
          setTerms(useTerms);
        } else {
          console.warn('Extract call failed', exRes.status);
        }
      }

      // If still no terms, try deriving from grouped results or run grouped based on the query
      if ((!useTerms || useTerms.length === 0) && (!grouped || Object.keys(grouped.newsapi || {}).length === 0 && Object.keys(grouped.google || {}).length === 0)) {
        // If extract didn't yield terms, run grouped using the raw query to produce term buckets
        const guess = encodeURIComponent(query || '');
        if (!guess) {
          setError('No terms available for digest. Enter a query and click Extract or Search grouped first.');
          setLoading(false);
          return;
        }
        console.log('No terms — calling /api/search/grouped with query fallback');
        const gRes = await fetch(`/api/search/grouped?terms=${guess}`);
        if (gRes.ok) {
          const gData = await gRes.json();
          setGrouped(gData);
          // pick keys
          const newsKeys = gData && gData.newsapi ? Object.keys(gData.newsapi) : [];
          const googleKeys = gData && gData.google ? Object.keys(gData.google) : [];
          useTerms = (newsKeys.length ? newsKeys : googleKeys).slice(0, 8);
          setTerms(useTerms);
        } else {
          console.warn('Grouped fallback failed', gRes.status);
        }
      }

      if (!useTerms || useTerms.length === 0) {
        setError('No terms available for digest after extract/grouped attempts.');
        setLoading(false);
        return;
      }

      // At this point we have terms — request the digest
      console.log('Requesting digest for terms:', useTerms);
      const res = await fetch('/api/ai/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terms: useTerms, style }) });
      const text = await res.text();
      // show raw response when status is not OK to help debugging
      if (!res.ok) {
        console.error('Digest request failed', res.status, text);
        setError('Digest request failed: ' + res.status + ' — see console');
        setLoading(false);
        return;
      }
      let data = null;
      try { data = JSON.parse(text); } catch (e) { console.warn('Digest response not JSON', e); }
      if (!data || !Array.isArray(data.digests)) {
        console.warn('Digest response missing digests, raw:', text);
        setError('Digest returned unexpected response — see console');
        setDigest(null);
      } else {
        console.log('Digest received', data.digests);
        setDigest(data.digests || null);
      }
    } catch (e) {
      console.error('Build digest error:', e);
      setError('Failed to build digest — see console');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '200px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search news..."
          style={{ fontSize: '1.2rem', padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginLeft: '1rem', fontSize: '1.2rem', padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', background: '#007acc', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button type="button" onClick={handleExtract} style={{ marginLeft: '0.5rem', fontSize: '1.0rem', padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid #007acc', background: '#fff', color: '#007acc' }}>
          Extract
        </button>
      </form>
      {/* Inline digest under the search bar for immediate visibility */}
      {digest && (
        <div style={{ maxWidth: '760px', margin: '0 auto 1rem', padding: '0.75rem 1rem', border: '1px solid #e6f0fb', background: '#f5fbff', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.95rem', color: '#034f84', marginBottom: '0.25rem' }}><strong>AI Digest ready</strong></div>
          {digest.map((d, i) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <strong style={{ display: 'block' }}>{d.term}</strong>
              <div style={{ color: '#222' }}>{d.summary}</div>
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
      {showPanel && (
        <div style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          borderTop: '2px solid #007acc',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          maxHeight: '40vh',
          overflowY: 'auto',
          zIndex: 1000,
          padding: '1.5rem 2rem',
        }}>
          <h3 style={{ margin: 0, marginBottom: '1rem', color: '#007acc' }}>Headlines</h3>
          {results.length === 0 && <div>No results found.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((a, i) => (
              <li key={i} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.2rem' }}>
                  {a.source} &bull; {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
                </div>
                <div>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.1rem', color: '#007acc', textDecoration: 'underline' }}>{a.title}</a>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>AI Flow:</strong>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              {terms && terms.map((t, i) => (
                <span key={i} style={{ display: 'inline-block', marginRight: '0.5rem', marginBottom: '0.5rem', padding: '0.25rem 0.5rem', border: '1px solid #ddd', borderRadius: '16px' }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" onClick={handleGrouped} style={{ fontSize: '0.95rem', padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', background: '#007acc', color: 'white' }}>Search grouped</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Style:
                <select value={style} onChange={e => setStyle(e.target.value)} style={{ padding: '0.25rem' }}>
                  <option value="short">Short</option>
                  <option value="long">Long</option>
                  <option value="eli5">ELI5</option>
                  <option value="bullets">Bullets</option>
                </select>
              </label>
              <button type="button" onClick={buildDigest} style={{ fontSize: '0.95rem', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #333', background: '#fff' }}>Build Digest</button>
            </div>
          </div>
        </div>
      )}

      {grouped && (
        <div style={{ padding: '1rem 2rem' }}>
          <h4>Grouped Results</h4>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h5>NewsAPI</h5>
              {Object.keys(grouped.newsapi || {}).map(k => (
                <div key={k} style={{ marginBottom: '1rem' }}>
                  <strong>{k}</strong>
                  <ul>
                    {(grouped.newsapi[k] || []).slice(0,5).map((it, i) => (
                      <li key={i}><a href={it.url} target="_blank" rel="noreferrer">{it.title}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <h5>Google</h5>
              {Object.keys(grouped.google || {}).map(k => (
                <div key={k} style={{ marginBottom: '1rem' }}>
                  <strong>{k}</strong>
                  <ul>
                    {(grouped.google[k] || []).slice(0,5).map((it, i) => (
                      <li key={i}><a href={it.url} target="_blank" rel="noreferrer">{it.title}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

  {/* Floating digest panel removed to avoid duplication; inline banner above is the primary display */}
    </div>
  );
}
