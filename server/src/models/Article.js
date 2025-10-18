const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  source: {
    type: String,
    default: 'Unknown',
  },
  pubDate: {
    type: Date,
    default: Date.now,
    index: true, // Index for sorting by recency
  },
  content: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: null, // null means not yet summarized
  },
  topics: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient recent article queries
articleSchema.index({ pubDate: -1, createdAt: -1 });

// Virtual: age in milliseconds since publication
articleSchema.virtual('age').get(function() {
  return Date.now() - this.pubDate.getTime();
});

// Update updatedAt on save
articleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
