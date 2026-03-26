const ArticleNumberSequence = require('../models/ArticleNumberSequence');

const CATEGORY_PREFIX_MAP = {
  seife: 'SEI',
  werkstuck: 'WER',
  schmuck: 'SCHM',
  kosmetik: 'KOS'
};

function sanitizePrefix(prefix) {
  const cleaned = String(prefix || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);

  if (cleaned.length < 2) {
    throw new Error(`Ungueltiger Kategorie-Prefix: ${prefix || 'leer'}`);
  }

  return cleaned;
}

function resolveCategoryPrefix(category) {
  const mapped = CATEGORY_PREFIX_MAP[String(category || '').toLowerCase()];
  if (mapped) {
    return mapped;
  }

  const raw = String(category || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!raw) {
    return 'GEN';
  }

  if (raw.length <= 5) {
    return raw;
  }

  return raw.slice(0, 5);
}

function buildArticleNumber(prefix, year, sequenceValue) {
  return `${prefix}-${year}-${String(sequenceValue).padStart(6, '0')}`;
}

async function getNextSequenceValue({ scope = 'portfolio', categoryPrefix, year }) {
  const safePrefix = sanitizePrefix(categoryPrefix);

  const sequence = await ArticleNumberSequence.findOneAndUpdate(
    { scope, categoryPrefix: safePrefix, year },
    {
      $inc: { lastValue: 1 },
      $setOnInsert: { scope, categoryPrefix: safePrefix, year }
    },
    { new: true, upsert: true }
  );

  return sequence.lastValue;
}

async function generateArticleNumber({ category, year = new Date().getFullYear(), scope = 'portfolio' }) {
  const categoryPrefix = resolveCategoryPrefix(category);
  const nextValue = await getNextSequenceValue({ scope, categoryPrefix, year });
  return buildArticleNumber(categoryPrefix, year, nextValue);
}

module.exports = {
  CATEGORY_PREFIX_MAP,
  resolveCategoryPrefix,
  buildArticleNumber,
  generateArticleNumber
};
