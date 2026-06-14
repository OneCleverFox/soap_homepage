#!/usr/bin/env node

/**
 * Test-Script für die Invoice Currency Converter
 * Demonstriert die Konvertierung der Railway-Rechnung
 */

const {
  processPDF,
  extractMoneyAmounts,
  convertToEuro
} = require('./convertInvoiceCurrency');

// Demo: Railway Invoice $0.51 USD konvertieren
async function testDemo() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 DEMO: Currency Converter Test');
  console.log('='.repeat(70) + '\n');

  // Test 1: Einfache Konvertierung
  console.log('Test 1: Einzelbetrag konvertieren');
  console.log('-'.repeat(70));
  const usdAmount = 0.51;
  const exchangeRate = 0.92;
  const eurAmount = convertToEuro(usdAmount, exchangeRate);
  
  console.log(`Input:  $${usdAmount} USD`);
  console.log(`Rate:   1 USD = ${exchangeRate} EUR`);
  console.log(`Output: €${eurAmount} EUR\n`);

  // Test 2: Railway Invoice-Text
  console.log('Test 2: Text mit Dollar-Beträgen extrahieren');
  console.log('-'.repeat(70));
  
  const sampleText = `
Railway Invoice
Amount due: $0.51 USD
Invoice date: January 1, 2026

Disk usage: $0.00
Network: $0.08
vCPU: $0.04
Memory: $1.40
Hobby plan: $5.00

Subtotal: $6.52
Discount: -$1.52
Total: $5.00
  `;

  const amounts = extractMoneyAmounts(sampleText);
  console.log(`Gefundene Dollar-Beträge:`);
  amounts.forEach((item, idx) => {
    const eur = convertToEuro(item.amount, exchangeRate);
    console.log(`  ${idx + 1}. ${item.original} USD → €${eur} EUR`);
  });

  const totalUSD = amounts.reduce((sum, item) => sum + item.amount, 0);
  const totalEUR = convertToEuro(totalUSD, exchangeRate);
  console.log(`\n  Gesamtsumme: $${totalUSD.toFixed(2)} USD → €${totalEUR} EUR\n`);

  // Test 3: Komplexe Wechselkurse
  console.log('Test 3: Verschiedene Wechselkurse');
  console.log('-'.repeat(70));
  const testRates = [0.85, 0.90, 0.92, 0.95, 1.00];
  console.log(`Test-Betrag: $100 USD`);
  testRates.forEach(rate => {
    const eur = convertToEuro(100, rate);
    console.log(`  Rate ${rate}: €${eur} EUR`);
  });
  console.log('\n');
}

// Hauptfunktion
async function main() {
  try {
    await testDemo();
    console.log('✅ Demo abgeschlossen!\n');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();
