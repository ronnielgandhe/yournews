// Fetch entity image from Wikipedia or article og:image

// Use global fetch (Node 18+) when available, otherwise lazily load node-fetch
const fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : async (...args) => {
      const mod = await import('node-fetch');
      return mod.default(...args);
    };

/**
 * Fetch image thumbnail from Wikipedia REST API
 * @param {string} query - Search query/entity name
 * @returns {Promise<string|null>} Image URL or null
 */
async function getWikipediaImage(query) {
  try {
    // Wikipedia REST API summary endpoint
    const searchQuery = encodeURIComponent(query.trim());
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'YourNews/1.0' }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Check for thumbnail
    if (data.thumbnail && data.thumbnail.source) {
      return data.thumbnail.source;
    }

    // Check for originalimage
    if (data.originalimage && data.originalimage.source) {
      return data.originalimage.source;
    }

    return null;
  } catch (err) {
    console.warn('Wikipedia image fetch error:', err.message);
    return null;
  }
}

/**
 * Extract og:image from article HTML
 * @param {string} url - Article URL
 * @returns {Promise<string|null>} Image URL or null
 */
async function getArticleOgImage(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Look for og:image meta tag
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Alternative og:image format
    const ogImageMatch2 = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    if (ogImageMatch2 && ogImageMatch2[1]) {
      return ogImageMatch2[1];
    }

    return null;
  } catch (err) {
    console.warn('Article og:image fetch error:', err.message);
    return null;
  }
}

/**
 * Get entity image - try Wikipedia first, fallback to first article's og:image
 * @param {string} query - Search query
 * @param {Array} articles - Array of articles (for og:image fallback)
 * @returns {Promise<string|null>} Image URL or null
 */
async function getEntityImage(query, articles = []) {
  // Try Wikipedia first
  const wikiImage = await getWikipediaImage(query);
  if (wikiImage) {
    return wikiImage;
  }

  // Fallback: try first article's og:image
  if (articles && articles.length > 0) {
    const firstArticle = articles[0];
    if (firstArticle.url) {
      const ogImage = await getArticleOgImage(firstArticle.url);
      if (ogImage) {
        return ogImage;
      }
    }
  }

  return null;
}

module.exports = { getEntityImage, getWikipediaImage, getArticleOgImage };
