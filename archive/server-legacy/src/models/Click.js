const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true,
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
  },
  ts: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient user click history queries
clickSchema.index({ userId: 1, ts: -1 });

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;
