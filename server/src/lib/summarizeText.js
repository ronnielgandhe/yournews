// Text summarization wrapper - OpenAI or bullet fallback

const Article = require('../models/Article');

// Use global fetch (Node 18+) when available, otherwise lazily load node-fetch
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

/**
 * Generate a bullet-point fallback summary from text
 */
function generateBulletSummary(text, maxBullets = 3) {
  if (!text || !text.trim()) {
    return 'No content available.';
  }

  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  if (sentences.length === 0) {
    return text.slice(0, 150) + '...';
  }

  // Take first N sentences as bullets
  const bullets = sentences.slice(0, maxBullets);
  return bullets.map(b => `• ${b}`).join('\n');
}

/**
 * Summarize text using OpenAI or fallback to bullets
 * @param {string} title - Article title
 * @param {string} content - Article content
 * @returns {Promise<string>} Summary text
 */
async function summarizeText(title, content) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Fallback if no API key
  if (!apiKey) {
    const text = content || title || '';
    return generateBulletSummary(text);
  }

  try {
    const text = `${title}\n\n${(content || '').slice(0, 1000)}`;
    const prompt = `Summarize this article in 2-3 concise sentences:\n\n${text}`;

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
      console.warn('OpenAI API error:', response.status);
      return generateBulletSummary(content || title);
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim();
    
    if (summary) {
      return summary;
    }
    
    return generateBulletSummary(content || title);
  } catch (err) {
    console.error('Error in summarizeText:', err.message);
    return generateBulletSummary(content || title);
  }
}

/**
 * Ensure article has a summary - fetch from DB or generate new one
 * @param {Object} article - Article object (may be plain object or Mongoose doc)
 * @returns {Promise<string>} Summary text
 */
async function ensureSummary(article) {
  // If article already has a summary, return it
  if (article.summary && article.summary.trim()) {
    return article.summary;
  }

  // Generate new summary
  const summary = await summarizeText(article.title, article.content);

  // If article has _id and is from MongoDB, save the summary
  if (article._id) {
    try {
      await Article.updateOne(
        { _id: article._id },
        { $set: { summary } }
      );
      console.log('Saved summary for article:', article._id);
    } catch (err) {
      console.warn('Failed to save summary to DB:', err.message);
    }
  }

  return summary;
}

module.exports = { summarizeText, ensureSummary, generateBulletSummary };
