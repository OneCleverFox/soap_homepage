#!/usr/bin/env node

/**
 * Test für GUV-Rechnung mit Dollar-Konvertierung (IMPROVED)
 * Demonstriert wie die Bildanalyse Dollar-Beträge erkennt und zu EUR konvertiert
 */

const fs = require('fs');
const path = require('path');

// Verbesserte detectAndConvertCurrency Funktion mit intelligenter Erkennung
function detectAndConvertCurrency(ocrText, options = {}) {
  const exchangeRate = parseFloat(options?.exchangeRate || 0.92);
  
  // Versuche zuerst, den FINALBETRAG zu finden
  const finalAmountPatterns = [
    /(?:total|amount\s+due|betrag.*?fallig|gesamtsumme|summe)[\s:]*\$[\d,]*\.?\d+/gi,
    /\$[\d,]*\.?\d+\s*(?:usd|eur|€)?(?:\s+due|\s+total)?$/gim
  ];

  const dollarPattern = /\$[\d,]*\.?\d+/g;
  let mainAmount = null;

  // Versuche Finalbetrag zu finden
  for (const pattern of finalAmountPatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      for (const line of match) {
        const dollarMatch = line.match(dollarPattern);
        if (dollarMatch) {
          const amount = parseFloat(dollarMatch[0].replace('$', '').replace(',', ''));
          if (amount > 0 && amount >= 0.01) {
            mainAmount = amount;
            break;
          }
        }
      }
      if (mainAmount) break;
    }
  }

  // Falls Finalbetrag gefunden wurde, verwende nur diesen!
  if (mainAmount) {
    const mainAmountEUR = parseFloat((mainAmount * exchangeRate).toFixed(2));
    
    return {
      hasDollarCurrency: true,
      dollarAmounts: [
        {
          original: `$${mainAmount.toFixed(2)}`,
          amount: mainAmount,
          amount_eur: mainAmountEUR
        }
      ],
      totalUSD: mainAmount,
      totalEUR: mainAmountEUR,
      exchangeRate: exchangeRate,
      detectionMethod: 'finalbetrag - INTELLIGENT!'
    };
  }

  // Fallback: Sammle alle signifikanten Dollar-Beträge (>= 0.01)
  const dollarMatches = ocrText.match(dollarPattern) || [];
  
  if (dollarMatches.length === 0) {
    return {
      hasDollarCurrency: false,
      dollarAmounts: [],
    };
  }

  const dollarAmounts = [...new Set(dollarMatches)]
    .map(match => {
      const amount = parseFloat(match.replace('$', '').replace(',', ''));
      return {
        original: match,
        amount: amount,
        amount_eur: parseFloat((amount * exchangeRate).toFixed(2))
      };
    })
    .filter(item => item.amount >= 0.01)
    .sort((a, b) => b.amount - a.amount);

  const totalUSD = dollarAmounts.reduce((sum, item) => sum + item.amount, 0);
  const totalEUR = parseFloat((totalUSD * exchangeRate).toFixed(2));

  return {
    hasDollarCurrency: true,
    dollarAmounts: dollarAmounts,
    totalUSD: parseFloat(totalUSD.toFixed(2)),
    totalEUR: totalEUR,
    exchangeRate: exchangeRate,
    detectionMethod: 'fallback - alle signifikanten Beträge'
  };
}

// Test mit Railway-Rechnung
const railwayReceiptText = `
Railway Invoice 
Invoice number 12C4M5UM-0002
Date of issue January 1, 2026

Bill to: ralle.jacob84@googlemail.com

Amount due: $0.51 USD

Description                                    Qty    Unit price         Amount
Disk (per GB / min) Dec 1, 2025 - Jan 1, 2026    0    $0.00000347222221  $0.00
Network (per MB) Dec 1, 2025 - Jan 1, 2026    1,594  $0.00005           $0.08
vCPU (per vCPU / min) Dec 1, 2025 - Jan 1, 2026 8,201 $0.00000462962962 $0.04
Memory (per MB / min) Dec 1, 2025 - Jan 1, 2026 6,042,274 $0.00000023148148 $1.40
Hobby plan Jan 1 - Feb 1, 2026                   1    $5.00              $5.00

Subtotal: $6.52
Discount: -$1.52
Total: $5.00
Applied balance: -$4.49
Amount due: $0.51 USD
`;

console.log('='.repeat(70));
console.log('🧪 GUV-Rechnung Bildanalyse - Dollar Konvertierung Test (INTELLIGENT)');
console.log('='.repeat(70) + '\n');

console.log('📄 Test-Szenario: Railway.com Rechnung mit Dollar-Beträgen\n');

// Führe die Erkennung durch
const result = detectAndConvertCurrency(railwayReceiptText);

console.log('✅ ERGEBNISSE:\n');
console.log('Währung erkannt:', result.hasDollarCurrency ? 'JA ✓' : 'NEIN ✗');
console.log('Erkennungs-Methode:', result.detectionMethod);
console.log('Anzahl Beträge:', result.dollarAmounts.length);

if (result.hasDollarCurrency) {
  console.log('\n💰 ERKANNTE BETRÄGE:');
  console.log('-'.repeat(70));
  result.dollarAmounts.forEach((amount, idx) => {
    console.log(`  ${idx + 1}. ${amount.original.padEnd(12)} USD → €${String(amount.amount_eur).padEnd(8)} EUR`);
  });
  
  console.log('\n📊 SUMMEN:');
  console.log('-'.repeat(70));
  console.log(`  Gesamtbetrag USD: $${result.totalUSD.toFixed(2)}`);
  console.log(`  Gesamtbetrag EUR: €${result.totalEUR.toFixed(2)}`);
  console.log(`  Wechselkurs:      1 USD = ${result.exchangeRate} EUR`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ VERBESSERUNG: INTELLIGENTE FINALBETRAG-ERKENNUNG\n');
  
  if (result.detectionMethod.includes('finalbetrag')) {
    console.log('✓ GENAU: Es wurde der FINALBETRAG erkannt!');
    console.log(`  "Amount due: $${result.totalUSD.toFixed(2)} USD" wurde identifiziert`);
    console.log(`  → Statt alle Posten zu summieren ($19.56),`);
    console.log(`  → wird nur der Rechnungsbetrag konvertiert ($${result.totalUSD.toFixed(2)})`);
    console.log(`  → KORREKT: €${result.totalEUR.toFixed(2)} ✓`);
  } else {
    console.log('⚠ FALLBACK: Es wurden alle signifikanten Beträge summiert');
    console.log('  (Wird verwendet, wenn kein Finalbetrag gefunden wird)');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 WIE DIE INTELLIGENTE ERKENNUNG FUNKTIONIERT:\n');
  console.log('1️⃣  Sucht nach Finalbetrag-Keywords:');
  console.log('    - "Amount due", "Total", "Gesamtsumme", etc.');
  console.log('2️⃣  Extrahiert den $-Betrag von dieser Zeile');
  console.log('3️⃣  Falls gefunden → Verwende NUR diesen einen Betrag');
  console.log('4️⃣  Falls nicht gefunden → Fallback (nur signifikante Beträge)');
  console.log('5️⃣  Winzige Unit-Preise werden immer gefiltert');
}

// Test mit verschiedenen Wechselkursen
console.log('='.repeat(70));
console.log('💱 WECHSELKURS-SZENARIEN:\n');

const testRates = [0.85, 0.90, 0.92, 0.95, 1.00];
const testAmount = 100.50;

console.log(`Test-Betrag: $${testAmount}`);
console.log('-'.repeat(70));

testRates.forEach(rate => {
  const converted = parseFloat((testAmount * rate).toFixed(2));
  console.log(`  Rate ${rate}: $${testAmount} → €${converted}`);
});

console.log('\n' + '='.repeat(70));
console.log('✅ Test abgeschlossen!\n');
