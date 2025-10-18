export default async function handler(_req, res) {
  try {
    const url = `http://localhost:8000/ai/status`;
    const _fetch = globalThis.fetch;
    if (!_fetch) return res.status(500).json({ error: 'Missing fetch' });
    const r = await _fetch(url);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    console.error('/api/ai/status proxy failed', err);
    res.status(500).json({ openai: false });
  }
}
