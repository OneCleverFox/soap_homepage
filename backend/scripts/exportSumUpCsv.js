/**
 * Exportiert Portfolio-Produkte als CSV für SumUp-Import.
 *
 * Nutzung:
 *   node scripts/exportSumUpCsv.js              → gibt CSV auf stdout aus
 *   node scripts/exportSumUpCsv.js --all
 *   node scripts/exportSumUpCsv.js --image-base-url=https://...
 *   node scripts/exportSumUpCsv.js --output=./datei.csv   → speichert Datei
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

if (process.env.DOTENV_KEY) {
  require('dotenv-vault/config');
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../..', '.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
}

const Portfolio = require('../src/models/Portfolio');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    includeInactive: true,
    vatPercent: 0,
    imageBaseUrl: 'https://soap-homepage-backend-production.up.railway.app',
    output: null // null = stdout
  };

  for (const arg of args) {
    if (arg === '--all') {
      config.includeInactive = true;
      continue;
    }

    if (arg === '--active-only') {
      config.includeInactive = false;
      continue;
    }

    if (arg.startsWith('--vat=')) {
      const vatValue = Number(arg.split('=')[1]);
      if (!Number.isNaN(vatValue) && vatValue >= 0 && vatValue <= 100) {
        config.vatPercent = vatValue;
      }
      continue;
    }

    if (arg.startsWith('--image-base-url=')) {
      const urlValue = arg.split('=').slice(1).join('=').trim();
      config.imageBaseUrl = urlValue.replace(/\/$/, '');
      continue;
    }

    if (arg.startsWith('--output=')) {
      const outputPath = arg.split('=').slice(1).join('=');
      if (outputPath) {
        config.output = path.resolve(process.cwd(), outputPath);
      }
    }
  }

  return config;
}

function categoryLabel(category) {
  switch (category) {
    case 'seife':
      return 'Seife';
    case 'werkstuck':
      return 'Werkstueck';
    case 'schmuck':
      return 'Schmuck';
    default:
      return 'Allgemein';
  }
}

function sanitize(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r?\n|\r/g, ' ').trim();
}

function csvEscape(value) {
  const normalized = sanitize(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatPrice(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num < 0) return '0.00';
  return num.toFixed(2);
}

function buildDescription(product) {
  const shortDesc = sanitize(product.beschreibung?.kurz);
  const longDesc = sanitize(product.beschreibung?.lang);
  const details = [];

  if (product.gramm) details.push(`${product.gramm}g`);
  if (product.seife) details.push(product.seife);
  if (product.aroma) details.push(product.aroma);

  const combinedDesc = shortDesc || longDesc;
  if (!combinedDesc && details.length === 0) return '';
  if (!combinedDesc) return details.join(' | ');
  if (details.length === 0) return combinedDesc;
  return `${combinedDesc} | ${details.join(' | ')}`;
}

async function run() {
  const config = parseArgs();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!uri) {
    console.error('❌ Keine DB-URI gefunden (MONGODB_URI / MONGO_URI / DATABASE_URL).');
    process.exit(2);
  }

  const query = config.includeInactive ? {} : { aktiv: true };

  console.error('🔌 Verbinde mit MongoDB...');
  await mongoose.connect(uri);

  try {
    const products = await Portfolio.find(query)
      .select('name preis kategorie article_number beschreibung gramm seife aroma aktiv bilder.hauptbildData.contentType bilder.galerie.contentType')
      .sort({ kategorie: 1, name: 1 })
      .lean();

    const getImageUrl = (product) => {
      if (product.bilder?.hauptbildData?.contentType) {
        return `${config.imageBaseUrl}/api/portfolio/${product._id}/hauptbild.jpg`;
      }
      if (product.bilder?.galerie?.[0]?.contentType) {
        return `${config.imageBaseUrl}/api/portfolio/${product._id}/galerie/0.jpg`;
      }
      return '';
    };

    const headers = ['Name', 'Price', 'Tax', 'SKU', 'Barcode', 'Category', 'Description', 'Image'];
    const lines = [headers.map(csvEscape).join(',')];

    for (const product of products) {
      const sku = sanitize(product.article_number) || sanitize(product._id);
      const imageUrl = getImageUrl(product);
      const row = [
        product.name,
        formatPrice(product.preis),
        String(config.vatPercent),
        sku,
        '',
        categoryLabel(product.kategorie),
        buildDescription(product),
        imageUrl
      ];

      lines.push(row.map(csvEscape).join(','));
    }

    const withImages = products.filter(p => getImageUrl(p) !== '').length;

    const csvContent = `\uFEFF${lines.join('\r\n')}\r\n`;

    if (config.output) {
      fs.mkdirSync(path.dirname(config.output), { recursive: true });
      fs.writeFileSync(config.output, csvContent, 'utf8');
      console.error(`✅ CSV gespeichert: ${config.output}`);
    } else {
      process.stdout.write(csvContent);
    }

    const infoLines = [
      `📦 Exportierte Produkte: ${products.length} (davon ${withImages} mit Bild-URL)`,
      `🧾 MwSt: ${config.vatPercent}%`,
      `🖼️  Bild-Basis-URL: ${config.imageBaseUrl}`,
      config.includeInactive ? 'ℹ️  Alle Produkte (aktiv + inaktiv).' : 'ℹ️  Nur aktive Produkte (--active-only).'
    ];
    infoLines.forEach(l => console.error(l));
  } finally {
    await mongoose.disconnect();
    console.error('👋 Verbindung geschlossen.');
  }
}

run().catch((error) => {
  console.error('❌ Fehler beim CSV-Export:', error.message);
  process.exit(1);
});
