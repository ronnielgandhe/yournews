export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });
  try {
    const url = `http://localhost:8000/ai/digest-from-links`;
    const _fetch = globalThis.fetch;
    if (!_fetch) return res.status(500).json({ error: 'Server missing fetch' });
    const resp = await _fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}) });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('/api/digest-from-links proxy failed', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
