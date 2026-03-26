const mongoose = require('mongoose');

const articleNumberSequenceSchema = new mongoose.Schema({
  scope: {
    type: String,
    required: true,
    default: 'portfolio'
  },
  categoryPrefix: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  year: {
    type: Number,
    required: true
  },
  lastValue: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'article_number_sequences'
});

articleNumberSequenceSchema.index(
  { scope: 1, categoryPrefix: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model('ArticleNumberSequence', articleNumberSequenceSchema);
