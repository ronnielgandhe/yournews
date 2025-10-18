export default async function handler(req, res) {
  const userId = req.query.userId || 'demo';
  
  try {
    const url = `http://localhost:8000/feed?userId=${encodeURIComponent(userId)}`;
    const _fetch = globalThis.fetch;
    
    if (!_fetch) {
      console.error('Proxy /api/feed error: fetch is not available in runtime');
      return res.status(500).json({ error: 'Server missing fetch implementation' });
    }
    
    const resp = await _fetch(url);
    const ct = resp.headers.get('content-type') || '';
    
    if (ct.includes('application/json')) {
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }
    
    const text = await resp.text();
    console.error('Proxy /api/feed non-json response length=', String(text || '').slice(0,200));
    return res.status(resp.status).json({ 
      error: 'Upstream returned non-JSON', 
      body: String(text).slice(0,200) 
    });
  } catch (err) {
    console.error('Proxy /api/feed error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
