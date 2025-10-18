// API proxy for /search/panels endpoint - multi-panel search

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, userId = 'demo' } = req.body || {};

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const url = 'http://localhost:8000/search/panels';
    const _fetch = globalThis.fetch;
    
    if (!_fetch) {
      console.error('Proxy /api/search-panels error: fetch is not available in runtime');
      return res.status(500).json({ error: 'Server missing fetch implementation' });
    }

    const resp = await _fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, userId }),
    });

    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    const text = await resp.text();
    console.error('Proxy /api/search-panels non-json response:', text.slice(0, 200));
    return res.status(resp.status).json({ 
      error: 'Upstream returned non-JSON', 
      body: text.slice(0, 200) 
    });
  } catch (err) {
    console.error('Proxy /api/search-panels error:', err);
    res.status(500).json({ error: 'Proxy failed', message: err.message });
  }
}
