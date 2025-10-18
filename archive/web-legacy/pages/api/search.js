export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  try {
    const url = `http://localhost:8000/search?q=${encodeURIComponent(q)}`;
    const _fetch = globalThis.fetch;
    if (!_fetch) {
      console.error('Proxy /api/search error: fetch is not available in runtime');
      return res.status(500).json({ error: 'Server missing fetch implementation' });
    }
    const resp = await _fetch(url);
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }
    const text = await resp.text();
    console.error('Proxy /api/search non-json response length=', String(text || '').slice(0,200));
    return res.status(resp.status).json({ error: 'Upstream returned non-JSON', body: String(text).slice(0,200) });
  } catch (err) {
    console.error('Proxy /api/search error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
