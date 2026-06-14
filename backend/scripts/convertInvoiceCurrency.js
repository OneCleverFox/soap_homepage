#!/usr/bin/env node

/**
 * Script zum Umwandeln von Dollar-Rechnungen in Euro
 * Liest PDF-Dateien aus, extrahiert Dollar-Beträge und konvertiert in EUR
 * 
 * Verwendung: node scripts/convertInvoiceCurrency.js <pdf-pfad> [wechselkurs]
 * Beispiel: node scripts/convertInvoiceCurrency.js ./invoice.pdf 0.92
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Wechselkurs USD -> EUR (aktuell - kann auch dynamisch geladen werden)
const DEFAULT_EXCHANGE_RATE = 0.92; // 1 USD = 0.92 EUR (ungefährer Wert)

/**
 * Extrahiert Geldbeträge aus Text
 */
function extractMoneyAmounts(text) {
  // Pattern für USD-Beträge: $123.45, $0.51, etc.
  const dollarPattern = /\$[\d,]*\.?\d+/g;
  const matches = text.match(dollarPattern) || [];
  
  return matches.map(match => {
    const amount = parseFloat(match.replace('$', '').replace(',', ''));
    return {
      original: match,
      amount: amount,
      currency: 'USD'
    };
  });
}

/**
 * Konvertiert USD-Betrag in EUR
 */
function convertToEuro(usdAmount, exchangeRate) {
  return (usdAmount * exchangeRate).toFixed(2);
}

/**
 * Ersetzt Dollar-Beträge im Text durch Euro-Beträge
 */
function replaceWithEuro(text, exchangeRate) {
  return text.replace(/\$[\d,]*\.?\d+/g, (match) => {
    const usdAmount = parseFloat(match.replace('$', '').replace(',', ''));
    const eurAmount = convertToEuro(usdAmount, exchangeRate);
    return `€${eurAmount}`;
  });
}

/**
 * Hauptfunktion zum Verarbeiten der PDF
 */
async function processPDF(pdfPath, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  try {
    // Überprüfe ob Datei existiert
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF-Datei nicht gefunden: ${pdfPath}`);
    }

    // Lese PDF
    const fileBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(fileBuffer);
    
    const originalText = data.text;
    
    // Extrahiere Dollar-Beträge
    const dollarAmounts = extractMoneyAmounts(originalText);
    
    if (dollarAmounts.length === 0) {
      console.log('⚠️  Keine Dollar-Beträge in der PDF gefunden.');
      return;
    }

    // Berechne Summen
    const totalUSD = dollarAmounts.reduce((sum, item) => sum + item.amount, 0);
    const totalEUR = convertToEuro(totalUSD, exchangeRate);
    
    // Konvertiere Text
    const convertedText = replaceWithEuro(originalText, exchangeRate);

    // Ausgabe
    console.log('\n' + '='.repeat(60));
    console.log('📄 RECHNUNGSKONVERTIERUNG USD → EUR');
    console.log('='.repeat(60));
    console.log(`\n📋 Datei: ${pdfPath}`);
    console.log(`💱 Wechselkurs: 1 USD = ${exchangeRate} EUR\n`);
    
    console.log('💰 GEFUNDENE BETRÄGE:');
    console.log('-'.repeat(60));
    dollarAmounts.forEach((item, index) => {
      const eur = convertToEuro(item.amount, exchangeRate);
      console.log(`  ${index + 1}. ${item.original} USD  →  €${eur} EUR`);
    });
    
    console.log('\n📊 SUMMEN:');
    console.log('-'.repeat(60));
    console.log(`  Gesamtbetrag USD: $${totalUSD.toFixed(2)}`);
    console.log(`  Gesamtbetrag EUR: €${totalEUR}`);
    
    // Speichere konvertierte Ausgabe
    const outputPath = pdfPath.replace('.pdf', '_CONVERTED.txt');
    fs.writeFileSync(outputPath, convertedText);
    console.log(`\n✅ Konvertierter Text gespeichert: ${outputPath}`);
    
    // Erstelle auch JSON-Ausgabe
    const jsonOutput = {
      originalFile: path.basename(pdfPath),
      processedAt: new Date().toISOString(),
      exchangeRate: exchangeRate,
      amounts: dollarAmounts.map(item => ({
        usd: item.amount,
        eur: parseFloat(convertToEuro(item.amount, exchangeRate))
      })),
      totals: {
        totalUSD: parseFloat(totalUSD.toFixed(2)),
        totalEUR: parseFloat(totalEUR)
      }
    };
    
    const jsonPath = pdfPath.replace('.pdf', '_CONVERSION.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`📄 JSON-Daten gespeichert: ${jsonPath}\n`);
    
    return jsonOutput;

  } catch (error) {
    console.error(`❌ Fehler beim Verarbeiten der PDF: ${error.message}`);
    process.exit(1);
  }
}

// Haupteinstiegspunkt
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Verwendung: node scripts/convertInvoiceCurrency.js <pdf-pfad> [wechselkurs]');
    console.log('Beispiel: node scripts/convertInvoiceCurrency.js ./invoice.pdf 0.92');
    process.exit(0);
  }

  const pdfPath = args[0];
  const exchangeRate = args[1] ? parseFloat(args[1]) : DEFAULT_EXCHANGE_RATE;

  if (isNaN(exchangeRate)) {
    console.error('❌ Ungültiger Wechselkurs. Bitte eine Dezimalzahl eingeben (z.B. 0.92)');
    process.exit(1);
  }

  await processPDF(pdfPath, exchangeRate);
}

// Exportiere Funktionen für externe Nutzung
module.exports = {
  processPDF,
  extractMoneyAmounts,
  convertToEuro,
  replaceWithEuro
};

// Führe aus wenn direkt aufgerufen
if (require.main === module) {
  main();
}
