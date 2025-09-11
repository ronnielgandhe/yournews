export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  try {
    const url = `http://localhost:8000/search?q=${encodeURIComponent(q)}`;
    // Use global fetch in Node 18+, otherwise dynamic import
    const _fetch = globalThis.fetch ? globalThis.fetch : (await import('node-fetch')).default;
    const resp = await _fetch(url);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('Proxy /api/search error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
