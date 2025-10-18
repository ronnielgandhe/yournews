export default async function handler(req, res) {
  const terms = req.query.terms || '';
  if (!terms) return res.status(400).json({ error: 'Missing terms parameter' });
  try {
  console.log('/api/search/grouped proxy received request', { terms });
    const url = `http://localhost:8000/search/grouped?terms=${encodeURIComponent(terms)}`;
    const _fetch = globalThis.fetch;
    if (!_fetch) {
      console.error('Proxy /api/search/grouped error: fetch is not available in runtime');
      return res.status(500).json({ error: 'Server missing fetch implementation' });
    }
    const resp = await _fetch(url);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('Proxy /api/search/grouped error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
