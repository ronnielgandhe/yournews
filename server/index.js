
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const RSSParser = require('rss-parser');
const parser = new RSSParser();
// Use global fetch (Node 18+) when available, otherwise lazily load node-fetch
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

const app = express();
const port = process.env.PORT || 8000;

// Hardcoded NewsAPI key
const NEWSAPI_KEY = "82e28d486ce646df892eb56db113cd4d";

app.use(cors());
app.use(express.json());

// --- health
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
  try {
    const ok = !!process.env.OPENAI_API_KEY;
    const nkey = !!NEWSAPI_KEY;
    console.log('Startup keys: OPENAI_API_KEY present=', ok, ' NEWSAPI_KEY present=', nkey);
    if (ok) {
      const k = process.env.OPENAI_API_KEY || '';
      console.log('OPENAI_API_KEY length=', k.length, 'prefix=', k.slice(0,4) + '...');
    }
  } catch (e) {
    console.log('Error reading env at startup', e && e.message);
  }
});

// --- /search?q=TERM
app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: 'Missing q parameter' });
  }
  try {
  // Broaden the query by removing the sources filter (was limiting results)
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWSAPI_KEY}`;
  const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch from NewsAPI' });
    }
    const data = await response.json();
  // Debug: log the raw response from NewsAPI to help diagnose empty results
  console.log('NewsAPI response status:', data.status, 'totalResults:', data.totalResults);
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      source: a.source && a.source.name ? a.source.name : '',
      publishedAt: a.publishedAt
    }));
    res.json({ articles });
  } catch (e) {
    console.error('Error in /search:', e);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// --- helper: normalize rss item
function normalizeRssItem(it) {
  return {
    title: it.title || '',
    url: it.link || it.enclosure || '',
    source: (it.creator || it.source && it.source.name) || 'Google News',
    publishedAt: it.pubDate || it.isoDate || null,
    description: it.contentSnippet || it.content || it.summary || ''
  };
}

// --- /search/all?q=TERM  (returns { newsapi: [...], google: [...] })
app.get('/search/all', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  try {
    // NewsAPI
    const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWSAPI_KEY}`;
    const newsResp = await fetch(newsUrl);
    const newsJson = newsResp.ok ? await newsResp.json() : { articles: [] };
    const newsArticles = (newsJson.articles || []).map(a => ({ title: a.title, url: a.url, source: a.source && a.source.name ? a.source.name : '', publishedAt: a.publishedAt }));

    // Google RSS
    const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    let googleItems = [];
    try {
      const feed = await parser.parseURL(gUrl);
      googleItems = (feed.items || []).slice(0, 10).map(normalizeRssItem);
    } catch (e) {
      console.warn('Google RSS parse failed', e && e.message);
      googleItems = [];
    }

    res.json({ newsapi: newsArticles, google: googleItems });
  } catch (e) {
    console.error('Error in /search/all:', e);
    res.status(500).json({ error: 'Failed to fetch combined news' });
  }
});

// --- /search/grouped?terms=one,two,three
app.get('/search/grouped', async (req, res) => {
  const termsRaw = req.query.terms || req.query.q || '';
  if (!termsRaw) return res.status(400).json({ error: 'Missing terms parameter' });
  const terms = String(termsRaw).split(',').map(s => s.trim()).filter(Boolean).slice(0, 12);
  const newsResults = {};
  const googleResults = {};
  try {
    await Promise.all(terms.map(async (t) => {
      // NewsAPI per term
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(t)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${NEWSAPI_KEY}`;
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          newsResults[t] = (j.articles || []).map(a => ({ title: a.title, url: a.url, source: a.source && a.source.name ? a.source.name : '', publishedAt: a.publishedAt }));
        } else {
          newsResults[t] = [];
        }
      } catch (e) {
        newsResults[t] = [];
      }

      // Google RSS per term
      try {
        const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(t)}&hl=en-US&gl=US&ceid=US:en`;
        const feed = await parser.parseURL(gUrl);
        googleResults[t] = (feed.items || []).slice(0,5).map(normalizeRssItem);
      } catch (e) {
        googleResults[t] = [];
      }
    }));

    res.json({ newsapi: newsResults, google: googleResults });
  } catch (e) {
    console.error('Error in /search/grouped:', e);
    res.status(500).json({ error: 'Failed to fetch grouped results' });
  }
});

// --- AI status and simple local AI fallbacks
app.get('/ai/status', (_req, res) => {
  const openaiKey = !!process.env.OPENAI_API_KEY;
  const newsapiKey = !!NEWSAPI_KEY;
  res.json({ openai: { available: openaiKey, lastError: openaiKey ? null : 'OPENAI_API_KEY missing' }, newsapi: { available: newsapiKey, lastError: newsapiKey ? null : 'NEWSAPI_KEY missing' } });
});

// --- helper: call OpenAI Chat Completions via REST
async function callOpenAIChat(prompt, system = 'You are a helpful summarization assistant. Output markdown only.') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 800
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    const err = new Error(`OpenAI error: ${resp.status} ${resp.statusText} - ${txt}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const content = data && data.choices && data.choices[0] && (data.choices[0].message ? data.choices[0].message.content : data.choices[0].text);
  return String(content || '').trim();
}

// --- simple extractor: split text into frequent words
app.post('/ai/extract', express.json(), (req, res) => {
  const text = String((req.body && req.body.text) || req.query.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing text in body' });
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const freq = {};
  words.forEach(w => { if (w.length > 3) freq[w] = (freq[w] || 0) + 1; });
  const terms = Object.keys(freq).sort((a,b) => freq[b] - freq[a]).slice(0,8);
  res.json({ primary_terms: terms.slice(0,4), relation_queries: terms.slice(4,6), separate_terms: terms.slice(6,8), terms });
});

// --- digest-from-links: local fallback summarizer that fetches titles and returns markdown
app.post('/ai/digest-from-links', express.json(), async (req, res) => {
  const { topic, links, style } = req.body || {};
  console.log('/ai/digest-from-links called, topic=', topic, 'links_count=', Array.isArray(links) ? links.length : 0, 'style=', style, 'OPENAI present=', !!process.env.OPENAI_API_KEY);
  if (!links || !Array.isArray(links) || links.length === 0) return res.status(400).json({ error: 'Missing links' });
  try {
    const fetchTitle = async (u) => {
      try {
        const r = await fetch(u, { redirect: 'follow' });
        const text = await r.text();
        const m = text.match(/<title>([^<]*)<\/?title>/i);
        return (m && m[1]) ? m[1].trim() : u;
      } catch (e) {
        return u;
      }
    };
    const pairs = await Promise.all(links.slice(0,5).map(async (u) => ({ url: u, title: await fetchTitle(u) })));
    // Attempt OpenAI generation first (if key present), otherwise fall back to local list-based MD
    const listText = pairs.map(p => `- ${p.title} — ${p.url}`).join('\n');
    const mdLocal = `### ${topic || 'Digest'}\n\nStyle: ${style || 'short'}\n\n` + pairs.map(p => `- [${p.title}](${p.url})`).join('\n');
    if (process.env.OPENAI_API_KEY) {
      try {
          const prompt = `Write a concise digest in markdown for the topic: ${topic || 'Topic'}.\nStyle: ${style || 'short'}.\nInclude a short lead sentence, then 3-6 bullet points summarizing the items below. Use the title and URL as needed. Output only markdown.\n\nItems:\n${listText}`;
          console.log('OpenAI: sending prompt for digest-from-links, topic=', topic, 'style=', style);
          // mask long prompt in logs but show length
          console.log('OpenAI: prompt length=', prompt.length);
          const reply = await callOpenAIChat(prompt, `You are a news summarizer. When asked for a style, adapt tone succinctly (examples: short, long, ELI5, bullets).`);
          console.log('OpenAI: reply length=', reply ? reply.length : 0);
          if (reply && reply.length > 0) {
            console.log('OpenAI: returning AI-generated digest for topic=', topic);
            return res.json({ topic: topic || '', style: style || 'short', summary_md: reply, generator: 'ai' });
          } else {
            console.log('OpenAI: empty reply, falling back to local');
          }
      } catch (err) {
        console.warn('OpenAI /ai/digest-from-links failed, falling back to local. Error:', err && err.message);
      }
    }
    // fallback
    return res.json({ topic: topic || '', style: style || 'short', summary_md: mdLocal, generator: 'local' });
  } catch (e) {
    console.error('Error in /ai/digest-from-links:', e);
    res.status(500).json({ error: 'Failed to build digest' });
  }
});

// --- digest: accept terms and itemsByTerm and return simple markdown digests
app.post('/ai/digest', express.json(), (req, res) => {
  const { terms, itemsByTerm, style } = req.body || {};
  if (!terms || !Array.isArray(terms) || terms.length === 0) return res.status(400).json({ error: 'Missing terms' });
  try {
    (async () => {
      try {
        const results = [];
        for (const t of terms.slice(0,8)) {
          const items = (itemsByTerm && itemsByTerm[t]) || [];
          const listText = (items || []).slice(0,5).map(it => `- ${it.title || it.source || 'link'} — ${it.url}`).join('\n');
          const mdLocal = `### ${t}\n\nStyle: ${style || 'short'}\n\n` + (items || []).slice(0,5).map(it => `- [${it.title || it.source || 'link'}](${it.url})`).join('\n');
          if (process.env.OPENAI_API_KEY) {
            try {
              const prompt = `Write a digest in markdown for the topic: ${t}. Style: ${style || 'short'}. Include a short lead and 3-6 bullets summarizing these items:\n${listText}`;
              console.log('OpenAI: sending prompt for term=', t, 'style=', style);
              console.log('OpenAI: prompt length=', prompt.length);
              const reply = await callOpenAIChat(prompt, 'You are a concise news summarizer. Output markdown only.');
              console.log('OpenAI: reply length for term=', t, ':', reply ? reply.length : 0);
              if (reply && reply.length > 0) {
                console.log('OpenAI: generated digest for term=', t);
                results.push({ term: t, style: style || 'short', summary_md: reply, generator: 'ai' });
                continue;
              } else {
                console.log('OpenAI: empty reply for term=', t, ', falling back');
              }
            } catch (err) {
              console.warn('OpenAI /ai/digest failed for term', t, 'error:', err && err.message);
            }
          }
          results.push({ term: t, style: style || 'short', summary_md: mdLocal, generator: 'local' });
        }
        res.json({ digests: results });
      } catch (e) {
        console.error('Error in async digest loop:', e);
        res.status(500).json({ error: 'Failed to create digest' });
      }
    })();
  } catch (e) {
    console.error('Error in /ai/digest:', e);
    res.status(500).json({ error: 'Failed to create digest' });
  }
});
