export default async function handler(req, res) {
  const url = `http://localhost:8000/ai/multi-digest`;
  try {
    const r = await fetch(url, { method: req.method, headers: { 'Content-Type': 'application/json' }, body: req.method === 'POST' ? JSON.stringify(req.body) : undefined });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    console.error('/api/multi-digest proxy failed', err);
    res.status(500).json({ error: 'proxy failed' });
  }
}
