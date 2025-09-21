import { useState } from 'react';

export default function Home() {
  // Minimal state: query input, loading/error, digest and sources, showSources toggle
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [digest, setDigest] = useState(null); // { summary_md }
  const [sources, setSources] = useState([]);
  const [showSources, setShowSources] = useState(false);

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
        <h1 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>News Digest</h1>

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
            <div style={{ fontSize: '0.95rem', color: '#073b6b', marginBottom: '0.5rem' }}><strong>Digest</strong></div>
            <div style={{ color: '#222' }} dangerouslySetInnerHTML={renderMarkdown(digest.summary_md)} />
          </div>
        )}

        {digest && (
          <div style={{ textAlign: 'left' }}>
            <button onClick={() => setShowSources(s => !s)} style={{ background: 'transparent', border: 'none', color: '#0b74de', cursor: 'pointer', padding: 0 }}>
              {showSources ? 'Hide Sources' : 'View Sources'}
            </button>
            {showSources && (
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

        <div style={{ marginTop: '2rem', color: '#666', fontSize: '0.9rem' }}>
          {/* Short note about simplified UI */}
          This page provides a single, focused flow: enter a query, build a digest, and optionally view sources. Other UI controls were removed to reduce clutter.
        </div>
      </div>
    </div>
  );
}
