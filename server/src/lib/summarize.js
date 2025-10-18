// OpenAI-powered article summarization with DB caching

const Article = require('../models/Article');

// Use global fetch (Node 18+) when available, otherwise lazily load node-fetch
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

/**
 * Generate summary for a single article using OpenAI.
 * Checks if summary already exists, calls API if missing, saves to DB.
 * @param {Object} article - Mongoose Article document
 * @returns {Promise<string>} Summary text
 */
async function generateSummary(article) {
  // Return existing summary if present
  if (article.summary && article.summary.trim()) {
    return article.summary;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  // Fallback if no API key
  if (!apiKey) {
    console.warn('No OPENAI_API_KEY, setting summary to "Summary unavailable"');
    article.summary = 'Summary unavailable';
    await article.save();
    return article.summary;
  }

  try {
    const prompt = `Summarize this article in 3 concise sentences.

Title: ${article.title}
Content: ${(article.content || '').slice(0, 800)}

Output only the summary, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise news summarizer.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('OpenAI API error:', response.status, errorText.slice(0, 200));
      article.summary = 'Summary unavailable';
      await article.save();
      return article.summary;
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || 'Summary unavailable';
    
    article.summary = summary;
    await article.save();
    
    console.log('Generated summary for article:', article._id);
    return summary;
  } catch (err) {
    console.error('Error generating summary:', err.message);
    article.summary = 'Summary unavailable';
    await article.save();
    return article.summary;
  }
}

/**
 * Summarize top N most recent articles that don't have summaries yet.
 * @param {number} n - Number of articles to summarize
 * @returns {Promise<number>} Count of articles summarized
 */
async function summarizeTopN(n = 30) {
  try {
    // Find recent articles without summaries
    const articles = await Article.find({ summary: null })
      .sort({ pubDate: -1 })
      .limit(n);

    console.log(`Summarizing ${articles.length} articles...`);

    let count = 0;
    for (const article of articles) {
      await generateSummary(article);
      count++;
    }

    console.log(`Summarized ${count} articles`);
    return count;
  } catch (err) {
    console.error('Error in summarizeTopN:', err);
    return 0;
  }
}

module.exports = { generateSummary, summarizeTopN };
