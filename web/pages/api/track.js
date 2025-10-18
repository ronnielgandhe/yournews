export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
  
  try {
    const url = `http://localhost:8000/track`;
    const _fetch = globalThis.fetch;
    
    if (!_fetch) {
      return res.status(500).json({ error: 'Server missing fetch' });
    }
    
    const resp = await _fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    
    const ct = resp.headers.get('content-type') || '';
    
    if (ct.includes('application/json')) {
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }
    
    const text = await resp.text();
    console.error('/api/track proxy non-json response length=', String(text || '').slice(0,200));
    return res.status(resp.status).json({ 
      error: 'Upstream returned non-JSON', 
      body: String(text).slice(0,200) 
    });
  } catch (err) {
    console.error('/api/track proxy failed', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
