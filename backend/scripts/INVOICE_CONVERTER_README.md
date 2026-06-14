# 💱 Invoice Currency Converter

Ein vollständiges System zur Konvertierung von Dollar-Rechnungen zu Euro, mit PDF-Auslese und API-Endpoints.

## 🎯 Features

- ✅ PDF-Auslese mit automatischer Dollar-Erkennung
- ✅ Automatische Konvertierung USD → EUR
- ✅ REST API für Datei-Upload und Konvertierung
- ✅ Flexible Wechselkursangabe
- ✅ JSON-Export mit detaillierten Konversionsdaten
- ✅ CLI-Tool für Batch-Verarbeitung

## 📦 Installation

Die notwendigen Dependencies sind bereits installiert:
- `pdf-parse` (PDF-Verarbeitung)
- `express` (API)
- `multer` (File-Upload)

## 🚀 Verwendung

### 1. CLI-Tool (Kommandozeile)

```bash
# Basis-Verwendung mit Standard-Wechselkurs (0.92)
node scripts/convertInvoiceCurrency.js invoice.pdf

# Mit benutzerdefinierten Wechselkurs
node scripts/convertInvoiceCurrency.js invoice.pdf 0.95
```

**Ausgabe:**
- `invoice_CONVERTED.txt` - Text mit Euro-Beträgen
- `invoice_CONVERSION.json` - Strukturierte Daten

### 2. REST API

Die API-Route muss erst in `src/server.js` registriert werden:

```javascript
// In server.js hinzufügen:
const invoiceCurrencyRouter = require('./routes/invoiceCurrencyConverter');
app.use('/api', invoiceCurrencyRouter);
```

#### Endpoints

##### POST `/api/convert-invoice`
PDF-Datei hochladen und konvertieren

```bash
curl -F "invoice=@invoice.pdf" \
     -F "exchangeRate=0.92" \
     http://localhost:3000/api/convert-invoice
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalFile": "invoice.pdf",
    "processedAt": "2026-06-13T10:30:00Z",
    "exchangeRate": 0.92,
    "amounts": [
      { "usd": 0.51, "eur": 0.47 },
      { "usd": 5.00, "eur": 4.60 }
    ],
    "totals": {
      "totalUSD": 5.51,
      "totalEUR": 5.07
    }
  }
}
```

##### POST `/api/convert-amount`
Einzelbetrag konvertieren

```bash
curl -X POST http://localhost:3000/api/convert-amount \
  -H "Content-Type: application/json" \
  -d '{"usdAmount": 100.50, "exchangeRate": 0.92}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "usd": 100.50,
    "eur": 92.46,
    "exchangeRate": 0.92,
    "convertedAt": "2026-06-13T10:30:00Z"
  }
}
```

##### GET `/api/exchange-rate`
Aktuellen Wechselkurs abrufen

```bash
curl http://localhost:3000/api/exchange-rate
```

### 3. Programmatische Nutzung

```javascript
const { processPDF, convertToEuro } = require('./scripts/convertInvoiceCurrency');

// PDF verarbeiten
const result = await processPDF('invoice.pdf', 0.92);
console.log('Total EUR:', result.totals.totalEUR);

// Einzelbetrag konvertieren
const eurAmount = convertToEuro(100.50, 0.92);
console.log('EUR:', eurAmount); // "92.46"
```

## 📊 Railway-Rechnung Beispiel

Die hochgeladene Railway-Rechnung:

```
Original USD: $0.51
Wechselkurs: 1 USD = 0.92 EUR
Konvertiert: €0.47 EUR
```

## 🔧 Konfiguration

### Wechselkurs

Der Standard-Wechselkurs ist in `convertInvoiceCurrency.js`:

```javascript
const DEFAULT_EXCHANGE_RATE = 0.92;
```

Für dynamische Kurse kann eine externe API integriert werden:

```javascript
// z.B. exchangerate-api.com
const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
const data = await response.json();
const rate = data.rates.EUR;
```

## 📝 Dateien

| Datei | Beschreibung |
|-------|-------------|
| `scripts/convertInvoiceCurrency.js` | Haupt-Module mit allen Funktionen |
| `scripts/testCurrencyConverter.js` | Test-Script mit Demos |
| `src/routes/invoiceCurrencyConverter.js` | Express API-Routes |

## 🧪 Tests

```bash
# Demo-Test ausführen
node scripts/testCurrencyConverter.js
```

## 📌 Nächste Schritte

1. **Route registrieren** in `src/server.js`:
   ```javascript
   const invoiceCurrencyRouter = require('./routes/invoiceCurrencyConverter');
   app.use('/api', invoiceCurrencyRouter);
   ```

2. **Frontend-Component** erstellen für Datei-Upload

3. **Datenbank-Integration** zum Speichern von Konversionshistorie

4. **Dynamischer Wechselkurs** aus externem API abrufen

## 🚀 Production-Ready Features

- [x] PDF-Parsing mit Fehlerbehandlung
- [x] Input-Validierung
- [x] File-Upload mit Größenlimit
- [x] JSON-Export
- [x] Umfassende Fehlerbehandlung
- [ ] Rate-Limiting für API
- [ ] Authentication
- [ ] Logging
- [ ] Datenbank-Persistierung

## 📄 Lizenz

MIT
