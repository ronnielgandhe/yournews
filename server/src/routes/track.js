const express = require('express');
const Click = require('../models/Click');
const Article = require('../models/Article');

const router = express.Router();

/**
 * POST /track
 * Track user click on an article
 * Body: { userId, articleId }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, articleId } = req.body;

    // Validate required fields
    if (!userId || !articleId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'articleId'],
      });
    }

    // Verify article exists
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ 
        error: 'Article not found',
        articleId,
      });
    }

    // Create click record
    const click = await Click.create({
      userId,
      articleId,
      ts: new Date(),
    });

    console.log('Click tracked:', { userId, articleId: click._id });

    res.json({ 
      ok: true, 
      clickId: click._id,
    });
  } catch (err) {
    console.error('Track click error:', err);
    
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid articleId format',
      });
    }

    res.status(500).json({ 
      error: 'Failed to track click',
      message: err.message,
    });
  }
});

module.exports = router;
