const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

const app = express();
const port = process.env.PORT || 3001;
const parser = new Parser();

// Middleware
app.use(cors());
app.use(express.json());

// Store topics globally for this session
let extractedTopics = [];

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Extract topics from free text
app.post('/topics', (req, res) => {
  try {
    const { freeText } = req.body;
    
    if (!freeText || typeof freeText !== 'string') {
      return res.status(400).json({ error: 'freeText is required and must be a string' });
    }

    // Simple topic extraction - extract words longer than 3 characters
    // Remove common stop words and punctuation
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
    
    const words = freeText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

    // Take most relevant words (limit to 10)
    const topics = words.slice(0, 10);
    
    // Store for later use in feed filtering
    extractedTopics = topics;
    
    res.json({ topics });
  } catch (error) {
    console.error('Error extracting topics:', error);
    res.status(500).json({ error: 'Failed to extract topics' });
  }
});

// Fetch and filter RSS feed
app.get('/feed', async (req, res) => {
  try {
    let articles = [];
    
    try {
      // Reuters RSS feed URL
      const rssUrl = 'https://feeds.reuters.com/reuters/topNews';
      
      // Parse RSS feed
      const feed = await parser.parseURL(rssUrl);
      
      // Process articles
      articles = feed.items.map(item => ({
        title: item.title,
        source: 'Reuters',
        date: item.pubDate,
        link: item.link,
        description: item.contentSnippet || item.content || ''
      }));
      
    } catch (rssError) {
      console.log('RSS feed unavailable, using mock data for demonstration');
      
      // Mock data for demonstration when RSS is unavailable
      articles = [
        {
          title: 'Artificial Intelligence Breakthrough in Medical Diagnosis',
          source: 'Reuters',
          date: new Date().toISOString(),
          link: 'https://reuters.com/technology/ai-medical-breakthrough',
          description: 'Scientists develop new AI system that can diagnose diseases with 95% accuracy using machine learning algorithms.'
        },
        {
          title: 'Climate Change Summit Addresses Technology Solutions',
          source: 'Reuters', 
          date: new Date(Date.now() - 3600000).toISOString(),
          link: 'https://reuters.com/environment/climate-tech',
          description: 'World leaders discuss how technology and artificial intelligence can help combat climate change.'
        },
        {
          title: 'New Machine Learning Algorithm Improves Weather Prediction',
          source: 'Reuters',
          date: new Date(Date.now() - 7200000).toISOString(), 
          link: 'https://reuters.com/science/weather-ai',
          description: 'Researchers use advanced machine learning techniques to create more accurate weather forecasting models.'
        },
        {
          title: 'Tech Giants Invest Billions in AI Research',
          source: 'Reuters',
          date: new Date(Date.now() - 10800000).toISOString(),
          link: 'https://reuters.com/business/tech-ai-investment',
          description: 'Major technology companies announce massive investments in artificial intelligence and machine learning research.'
        },
        {
          title: 'Global Economy Shows Signs of Recovery',
          source: 'Reuters',
          date: new Date(Date.now() - 14400000).toISOString(),
          link: 'https://reuters.com/business/economy-recovery',
          description: 'Economic indicators suggest a gradual recovery in global markets following recent challenges.'
        }
      ];
    }

    // Deduplicate by title
    const uniqueArticles = articles.filter((article, index, arr) => 
      arr.findIndex(a => a.title === article.title) === index
    );

    // Filter by extracted topics if any exist
    let filteredArticles = uniqueArticles;
    if (extractedTopics.length > 0) {
      filteredArticles = uniqueArticles.filter(article => {
        const articleText = (article.title + ' ' + article.description).toLowerCase();
        return extractedTopics.some(topic => articleText.includes(topic.toLowerCase()));
      });
    }

    // If no filtered articles and we have topics, return all articles as fallback
    if (filteredArticles.length === 0 && extractedTopics.length > 0) {
      filteredArticles = uniqueArticles;
    }

    // Group results by relevance/topic match
    const groupedResults = {
      highly_relevant: [],
      somewhat_relevant: [],
      other: []
    };

    filteredArticles.forEach(article => {
      const articleText = (article.title + ' ' + article.description).toLowerCase();
      const matchCount = extractedTopics.filter(topic => 
        articleText.includes(topic.toLowerCase())
      ).length;

      if (matchCount >= 2) {
        groupedResults.highly_relevant.push(article);
      } else if (matchCount === 1) {
        groupedResults.somewhat_relevant.push(article);
      } else {
        groupedResults.other.push(article);
      }
    });

    res.json({
      total: filteredArticles.length,
      topics: extractedTopics,
      groups: groupedResults
    });

  } catch (error) {
    console.error('Error in feed endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});