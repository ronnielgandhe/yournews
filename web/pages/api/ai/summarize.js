export default async function handler(req, res) {
  const url = `http://localhost:8000/ai/summarize`;
  try {
    const r = await fetch(url, { method: req.method, headers: { 'Content-Type': 'application/json' }, body: req.method === 'POST' ? JSON.stringify(req.body) : undefined });
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await r.json();
      return res.status(r.status).json(data);
    }
    const text = await r.text();
    console.error('/api/ai/summarize proxy non-json response length=', String(text || '').slice(0,200));
    return res.status(r.status).json({ error: 'Upstream returned non-JSON', body: String(text).slice(0,200) });
  } catch (err) {
    console.error('/api/ai/summarize proxy failed', err);
    res.status(500).json({ error: 'proxy failed' });
  }
}
