export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });
  try {
  console.log('/api/ai/extract proxy received request', { method: req.method, body: req.body && (Array.isArray(req.body) ? '[array]' : '[object]') });
    const url = `http://localhost:8000/ai/extract`;
    const _fetch = globalThis.fetch;
    if (!_fetch) {
      console.error('Proxy /api/ai/extract error: fetch is not available in runtime');
      return res.status(500).json({ error: 'Server missing fetch implementation' });
    }
    const resp = await _fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('Proxy /api/ai/extract error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
