
const path = require('path');
// Load the .env file that lives next to this file (server/.env). This is more robust
// than the default which looks in the process cwd and can miss the file when the
// server is started from the repo root or elsewhere.
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Safely load the OpenAI SDK if installed. Some environments may not have it
// or we may want to run without it, so keep a null sentinel.
let OpenAI = null;
try {
  // use require instead of import so this file stays CommonJS-compatible
  OpenAI = require('openai');
} catch (err) {
  OpenAI = null;
}
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

// enable CORS for the web frontend
app.use(cors());

// Parse JSON bodies (add once at top level)
app.use(express.json());

// Load AI helper (server-friendly)
let aiHelper = null;
try {
  aiHelper = require(path.join(__dirname, '..', 'lib', 'ai.js'));
} catch (e) {
  try { aiHelper = require(path.join(__dirname, '..', 'lib', 'ai')); } catch (e2) { aiHelper = null; }
}


// Using Google News RSS as the single news source. NewsAPI removed.

// (duplicate simple extractor removed — improved extractor remains below)


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

// helper: fetch Google News RSS for a query
async function fetchGoogleForQuery(q, pageSize = 10) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const feed = await parser.parseURL(url);
  const items = (feed && feed.items) ? feed.items.map(normalizeRssItem).slice(0, pageSize) : [];
  return items;
}

// --- /search/all?q=TERM  (returns { newsapi: [], google: [...] })
app.get('/search/all', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  try {
    const googleArticles = await fetchGoogleForQuery(q, 10);
    return res.json({ newsapi: [], google: googleArticles });
  } catch (e) {
    console.error('Error in /search/all:', e);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Mount new routes for MVP features
app.use('/ingest', require('./src/routes/ingest'));
app.use('/track', require('./src/routes/track'));
app.use('/feed', require('./src/routes/feed'));
app.use('/seed', require('./src/routes/seed'));

// Connect to MongoDB and start server
(async () => {
  try {
    // Only connect if MONGODB_URI is provided
    if (process.env.MONGODB_URI) {
      const { connectDB } = require('./src/lib/db');
      await connectDB();
      console.log('✓ MongoDB connected');
    } else {
      console.warn('⚠ MONGODB_URI not set - persistence features disabled');
    }

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log('OPENAI_API_KEY present=', !!process.env.OPENAI_API_KEY);
      console.log('NEWSAPI_KEY present=', !!process.env.NEWSAPI_KEY);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

// --- /search/grouped?terms=a,b,c  returns { newsapi: {term: []}, google: {term: [...]}}
app.get('/search/grouped', async (req, res) => {
  try {
    let terms = [];
    if (req.query.terms) {
      terms = Array.isArray(req.query.terms) ? req.query.terms : String(req.query.terms).split(',').map(s => s.trim()).filter(Boolean);
    } else if (req.query.q) {
      terms = [String(req.query.q).trim()];
    }
    if (!terms || terms.length === 0) return res.status(400).json({ error: 'Missing terms' });

    const newsResults = {};
    const googleResults = {};

    await Promise.all(terms.map(async (t) => {
      try {
        const g = await fetchGoogleForQuery(t, 8);
        newsResults[t] = [];
        googleResults[t] = g;
        console.log('/search/grouped', { term: t, newsapiCount: 0, googleCount: Array.isArray(g) ? g.length : 0 });
      } catch (e) {
        newsResults[t] = [];
        googleResults[t] = [];
      }
    }));

    return res.json({ newsapi: newsResults, google: googleResults });
  } catch (e) {
    console.error('Error in /search/grouped:', e);
    res.status(500).json({ error: 'Failed to fetch grouped results' });
  }
});

// --- AI status and simple local AI fallbacks
app.get('/ai/status', (_req, res) => {
  const openaiKey = !!process.env.OPENAI_API_KEY;
  // Fix: check the env var instead of an undefined global
  const newsapiKey = !!process.env.NEWSAPI_KEY;
  res.json({
    openai: { available: openaiKey, lastError: openaiKey ? null : 'OPENAI_API_KEY missing' },
    newsapi: { available: newsapiKey, lastError: newsapiKey ? null : 'NEWSAPI_KEY missing' }
  });
});

// --- REMOVED DUPLICATE /ai/extract (lines 115-148)
// Keeping only the improved version below (lines 150-190)

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

// --- improved /ai/extract: filter stopwords, dedupe case-insensitively, limit to 8 terms, and log safe metrics
app.post('/ai/extract', async (req, res) => {
  const text = String((req.body && req.body.text) || req.query.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const stopwords = new Set(['the','is','are','a','an','and','or','but','if','of','in','to','for','on','with','as','by','from','that','this','it','be','was','were','will','would','should','can','could','have','has','had','at','what','which','when','where','how','why','not','no','really','over']);

  const finalize = (arr) => {
    const seen = new Set();
    const out = [];
    for (let s of (arr || [])) {
      if (!s) continue;
      s = String(s).toLowerCase().trim();
      const tokens = s.split(/\s+/).filter(Boolean).filter(tok => !stopwords.has(tok));
      if (tokens.length === 0) continue;
      const cand = tokens.join(' ');
      if (cand.length < 2) continue;
      if (seen.has(cand)) continue;
      seen.add(cand);
      out.push(cand);
      if (out.length >= 8) break;
    }
    return out;
  };

  // Try OpenAI first (SDK), parse JSON, then finalize
  if (process.env.OPENAI_API_KEY && OpenAI) {
    try {
      console.log('/ai/extract: using OpenAI SDK');
      const client = new OpenAI.OpenAIApi(new OpenAI.Configuration({ apiKey: process.env.OPENAI_API_KEY }));
      const model = 'gpt-4o-mini';
      const systemPrompt = `You extract search queries from messy user text. Return strict JSON only.\nRules:\n- Pull concise, searchable terms (entities & noun phrases).\n- Detect relationships like "<entity> impact on <topic>" as separate queries.\n- Lowercase, dedupe, ≤8 total.\n- If a term implies a market/ticker (e.g., nvidia), include 'nvda stock' as a term.\nOutput:\n{\"primary_terms\":[],\"relation_queries\":[],\"separate_terms\":[]}`;
      const messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content: text } ];
      const resp = await client.createChatCompletion({ model, messages, temperature: 0.2, max_tokens: 300 });
      const raw = resp && resp.data && resp.data.choices && resp.data.choices[0] && resp.data.choices[0].message && resp.data.choices[0].message.content;
      if (raw) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            const parsed = JSON.parse(m[0]);
            const combined = [];
            if (Array.isArray(parsed.primary_terms)) combined.push(...parsed.primary_terms);
            if (Array.isArray(parsed.relation_queries)) combined.push(...parsed.relation_queries);
            if (Array.isArray(parsed.separate_terms)) combined.push(...parsed.separate_terms);
            const final = finalize(combined);
            const primary_terms = final.slice(0,4);
            const relation_queries = final.slice(4,6);
            const separate_terms = final.slice(6,8);
            console.log('/ai/extract', { inputLen: text.length, termsCount: final.length });
            return res.json({ primary_terms, relation_queries, separate_terms });
          } catch (e) {
            console.warn('/ai/extract parse failed', e && e.message);
          }
        }
      }
    } catch (err) {
      console.warn('/ai/extract: OpenAI SDK error', err && (err.message || err.toString()));
    }
  }

  // Fallback local split and finalize
  try {
    const candidates = text.split(/[,&]| and |\s+/).map(s => String(s).trim().toLowerCase()).filter(Boolean);
    const final = finalize(candidates);
    const primary_terms = final.slice(0,4);
    const relation_queries = final.slice(4,6);
    const separate_terms = final.slice(6,8);
    console.log('/ai/extract', { inputLen: text.length, termsCount: final.length });
    return res.json({ primary_terms, relation_queries, separate_terms });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to extract terms' });
  }
});

// --- digest-from-links: local fallback summarizer that fetches titles and returns markdown
app.post('/ai/digest-from-links', async (req, res) => {
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
          const reply = await callOpenAIChat(prompt, 'Summarize meaning and impact. Do not copy headlines. Provide concise analysis of what\'s happening and why it matters.');
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
app.post('/ai/digest', (req, res) => {
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
              console.log('/ai/digest', { term: t, itemCount: (items || []).length });
              const reply = await callOpenAIChat(prompt, 'Summarize meaning and impact. Do not copy headlines. Provide concise analysis of what\'s happening and why it matters.');
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

// --- /ai/multi-digest: accepts { query } and when AI_MULTI_QUERY_ENABLED=true will
// ask AI to split the query, fetch results for each, and return a combined markdown digest
app.post('/ai/multi-digest', async (req, res) => {
  const { query, style } = req.body || {};
  if (!query || !String(query).trim()) return res.status(400).json({ error: 'Missing query' });
  const enabled = (process.env.AI_MULTI_QUERY_ENABLED === 'true' || process.env.NEXT_PUBLIC_AI_MULTI_QUERY_ENABLED === 'true');
  if (!enabled) return res.status(400).json({ error: 'AI_MULTI_QUERY_ENABLED not enabled' });
  try {
    // 1) suggest sub-queries
    const suggest = aiHelper && aiHelper.aiSuggestQueries ? await aiHelper.aiSuggestQueries(String(query)) : { queries: [String(query)], intentTags: [] };
    const queries = Array.isArray(suggest.queries) && suggest.queries.length ? suggest.queries : [String(query)];
    const intentTags = Array.isArray(suggest.intentTags) ? suggest.intentTags : [];

    // 2) fetch google items per subquery
    const itemsByQuery = {};
    await Promise.all(queries.map(async (q) => {
      try {
        const items = await fetchGoogleForQuery(q, 6);
        itemsByQuery[q] = items.map(normalizeRssItem);
      } catch (e) {
        itemsByQuery[q] = [];
      }
    }));

    // 3) build digests per query and combine
    const sections = [];
    if (aiHelper && aiHelper.aiBuildDigest) {
      for (const q of queries) {
        const articles = (itemsByQuery[q] || []).map((it, idx) => ({ id: `${q}-${idx}`, title: it.title || '', url: it.url || '', source: { name: it.source || 'Google News', domain: '' }, publishedAt: it.publishedAt || new Date().toISOString(), summary: it.description || '' }));
        const md = await aiHelper.aiBuildDigest({ query: q, articles });
  sections.push({ query: q, markdown: md, articles });
      }
    } else {
      // fallback: simple markdown sections
      for (const q of queries) {
        const articles = (itemsByQuery[q] || []).slice(0,5);
        const md = `## ${q}\n\n` + articles.map(a => `- [${a.title}](${a.url})`).join('\n');
        sections.push({ query: q, markdown: md, articles });
      }
    }

    // compute entities and timeline if enabled
    let entities = null;
    let timeline = null;
    try {
      if ((process.env.AI_TIMELINE_ENABLED === 'true' || process.env.NEXT_PUBLIC_AI_TIMELINE_ENABLED === 'true') && aiHelper && aiHelper.aiBuildTimeline) {
        // combine all articles
        const allArticles = [];
        for (const s of sections) allArticles.push(...(s.articles || []));
        timeline = await aiHelper.aiBuildTimeline(allArticles);
      }
      if (aiHelper && aiHelper.aiExtractEntities) {
        const allArticles = [];
        for (const s of sections) allArticles.push(...(s.articles || []));
        entities = await aiHelper.aiExtractEntities(allArticles);
      }
    } catch (e) {
      console.warn('ai extra processing failed (timeline/entities)', e && e.message);
    }

    return res.json({ intentTags, sections, timeline, entities });
    // Optionally include timeline and extracted entities if feature flags are enabled
    // (compute them after sections to avoid slowing main loop when disabled)
  } catch (e) {
    console.error('Error in /ai/multi-digest:', e);
    res.status(500).json({ error: 'Failed to build multi digest' });
  }
});

// --- aiSummarize: summarize a digest markdown at a given level
app.post('/ai/summarize', async (req, res) => {
  const { digestMd, level } = req.body || {};
  if (!digestMd || !level) return res.status(400).json({ error: 'Missing digestMd or level' });
  try {
    if (!(process.env.AI_SUMMARY_LEVELS_ENABLED === 'true' || process.env.NEXT_PUBLIC_AI_SUMMARY_LEVELS_ENABLED === 'true')) {
      return res.status(400).json({ error: 'AI summary levels not enabled' });
    }

    // simple in-memory LRU-like cache with TTL
    if (!global.__aiSummCache) {
      global.__aiSummCache = new Map(); // key -> { summary, ts }
      // prune periodically
      setInterval(() => {
        const now = Date.now();
        for (const [k, v] of global.__aiSummCache.entries()) {
          if (now - v.ts > 1000 * 60 * 60) { // 1 hour TTL
            global.__aiSummCache.delete(k);
          }
        }
        // cap size at 200 entries
        if (global.__aiSummCache.size > 200) {
          const keys = Array.from(global.__aiSummCache.keys()).slice(0, global.__aiSummCache.size - 200);
          for (const kk of keys) global.__aiSummCache.delete(kk);
        }
      }, 1000 * 60 * 5);
    }

    const key = `lvl:${String(level)}|hash:${require('crypto').createHash('sha256').update(String(digestMd)).digest('hex')}`;
    const cached = global.__aiSummCache.get(key);
    if (cached && (Date.now() - cached.ts) < (1000 * 60 * 60)) {
      return res.json({ summary: cached.summary, cached: true });
    }

    if (aiHelper && aiHelper.aiSummarizeAtLevel) {
      const out = await aiHelper.aiSummarizeAtLevel(String(digestMd), String(level));
      global.__aiSummCache.set(key, { summary: out, ts: Date.now() });
      return res.json({ summary: out, cached: false });
    }
    return res.status(500).json({ error: 'AI summarize helper missing' });
  } catch (e) {
    console.error('Error in /ai/summarize:', e);
    return res.status(500).json({ error: 'Failed to summarize' });
  }
});
