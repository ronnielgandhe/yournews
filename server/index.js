
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3001;

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
});

// --- /search?q=TERM
app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: 'Missing q parameter' });
  }
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sources=reuters&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWSAPI_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch from NewsAPI' });
    }
    const data = await response.json();
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
