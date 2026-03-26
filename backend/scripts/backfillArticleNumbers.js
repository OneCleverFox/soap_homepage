/**
 * Backfill: Erzeugt Artikelnummern für alle Portfolio-Produkte ohne article_number.
 * Aufruf: node backend/scripts/backfillArticleNumbers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');
const { generateArticleNumber } = require('../src/services/articleNumberService');

async function backfill() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ Keine DB-URI gefunden (MONGODB_URI / MONGO_URI / DATABASE_URL)');
    process.exit(2);
  }

  console.log('🔌 Verbinde mit MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Verbunden.\n');

  const products = await Portfolio.find({
    $or: [
      { article_number: { $exists: false } },
      { article_number: null },
      { article_number: '' }
    ]
  })
    .select('_id name kategorie article_number')
    .sort({ createdAt: 1 })
    .lean();

  console.log(`📦 ${products.length} Produkte ohne Artikelnummer gefunden.\n`);

  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const articleNumber = await generateArticleNumber({
        category: product.kategorie || 'allgemein'
      });

      await Portfolio.updateOne(
        { _id: product._id, $or: [{ article_number: { $exists: false } }, { article_number: null }, { article_number: '' }] },
        { $set: { article_number: articleNumber } }
      );

      console.log(`✅ ${product.name.padEnd(30)} [${product.kategorie || '?'}]  →  ${articleNumber}`);
      success++;
    } catch (err) {
      console.error(`❌ ${product.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Erfolgreich: ${success}`);
  console.log(`❌ Fehlgeschlagen: ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Abschluss-Zähler
  const total = await Portfolio.countDocuments({});
  const withNum = await Portfolio.countDocuments({
    article_number: { $exists: true, $nin: [null, ''] }
  });
  console.log(`📊 Stand danach: ${withNum}/${total} Produkte haben Artikelnummern.\n`);

  await mongoose.disconnect();
  console.log('🔌 Verbindung getrennt.');
}

backfill().catch(err => {
  console.error('Kritischer Fehler:', err);
  process.exit(1);
});
