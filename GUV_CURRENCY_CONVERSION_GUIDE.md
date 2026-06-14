# 💱 GUV-Rechnung: Dollar zu Euro Konvertierung

## Wie es funktioniert

Wenn Sie auf der GUV-Seite eine Rechnung hochladen, die in Dollar ($) ist, erkennt das System automatisch:

1. **Alle Dollar-Beträge** in der Rechnung
2. **Konvertiert sie zu Euro** (mit aktuellem Wechselkurs)
3. **Zeigt ein Info-Alert** in der Vorschau

## Beispiel: Railway Invoice

### Hochgeladene PDF
```
Invoice 12C4M5UM-0002
Amount due: $0.51 USD

- Disk: $0.00
- Network: $0.08  
- vCPU: $0.04
- Memory: $1.40
- Hobby plan: $5.00

Total: $0.51 USD
```

### Was die KI erkennt
```
💱 Währungskonvertierung erkannt!

Original (USD):      $0.51
Konvertiert (EUR):   €0.47
Wechselkurs:         1 USD = 0.92 EUR

Gefundene Beträge:
- $0.51 → €0.47
- $0.08 → €0.07
- $0.04 → €0.04
- $1.40 → €1.29
- $5.00 → €4.60
... (und weitere)
```

## Im Admin-Panel

1. Gehen Sie zu: **Admin → GUV-Rechnung** (http://localhost:3001/admin/guv-rechnung)
2. Klicken Sie auf **PDF/Bild hochladen**
3. Wählen Sie die Dollar-Rechnung aus
4. Das System analysiert die Datei mit KI
5. In der Vorschau sehen Sie:
   - Automatisch erkannte Beträge
   - **Spezial-Alert mit Währungskonvertierung** (orange/gelb hervorgehoben)
   - Alle konvertierten Positionen
   - Wechselkurs-Information

## Was wird gespeichert?

- **Betrag in EUR** wird automatisch eingetragen (konvertiert)
- **Beschreibung** erhält Prefix: `[USD → EUR]`
- **Currency-Info** wird mitgespeichert:
  - Original USD-Betrag
  - EUR-Betrag
  - Alle erkannten Positionen
  - Wechselkurs

## Features

### ✅ Automatische Erkennung
- Erkennt alle Formate: `$100`, `$100.50`, `$0.51`
- Auch mit Tausender-Trennzeichen: `$1,000.50`

### ✅ Exakte Konvertierung
- Standardwechselkurs: 1 USD = 0.92 EUR
- Alle Beträge werden auf 2 Dezimalstellen gerundet
- Gesamtsumme wird berechnet

### ✅ Benutzerfreundliches UI
- Orange/gelber Alert, um Dollar-Rechnungen hervorzuheben
- Auflistung aller erkannten Dollar-Positionen
- Maximale 5 Positionen angezeigt, Rest zusammengefasst
- Wechselkurs-Information sichtbar

### ✅ Manuelle Anpassung möglich
Sie können den konvertierten Betrag vor dem Speichern noch manuell ändern

## Technische Details

### Erkannte Muster
```
/\$[\d,]*\.?\d+/g
```

Beispiele:
- `$100` ✓
- `$100.50` ✓
- `$0.51` ✓
- `$1,000` ✓
- `$1,000.99` ✓

### Wechselkurs-Logik
- **Standard-Rate:** 1 USD = 0.92 EUR
- **Berechnung:** USD-Betrag × 0.92 = EUR-Betrag
- **Rounding:** Alle Beträge auf 2 Dezimalstellen
- **Format:** €0.47 (Euro-Format mit Komma oder Punkt je nach Locale)

## Häufige Fragen

### F: Kann ich den Wechselkurs ändern?
**A:** Momentan ist er fest auf 0.92 EUR pro USD. Für Änderungen kontaktieren Sie den Administrator oder bearbeiten Sie die Datei:
```
backend/src/controllers/guvController.js
→ Funktion: detectAndConvertCurrency
→ Zeile: exchangeRate = 0.92
```

### F: Was passiert bei sehr kleinen Beträgen?
**A:** Sie werden korrekt konvertiert und gerundet:
- $0.01 → €0.01
- $0.001 → €0.00

### F: Kann die KI auch Mixed-Currency erkennen?
**A:** Ja! Wenn eine Rechnung Dollar und Euro mischt, erkennt es alle Dollar-Beträge und konvertiert nur diese.

### F: Werden nur die Gesamtsummen konvertiert oder auch die Positionen?
**A:** Es werden ALLE Dollar-Beträge erkannt und angezeigt, einschließlich:
- Einzelne Positionen
- Zwischensummen
- Rabatte
- Gesamtbeträge

## Beispiel-Workflow

```
1. User lädt Railway Invoice hoch
   ↓
2. System liest PDF-Text aus
   ↓
3. Regex sucht nach $-Beträgen
   ↓
4. Findet: $0.51, $0.08, $0.04, $1.40, $5.00, ...
   ↓
5. Konvertiert jeden Betrag: × 0.92
   ↓
6. Berechnet Summen: $19.56 → €18.00
   ↓
7. Zeigt Alert in der Vorschau mit allen Details
   ↓
8. User bestätigt oder bearbeitet
   ↓
9. Speichert Rechnung mit EUR-Betrag
```

## Debugging

Falls Sie sehen möchten, was genau erkannt wurde:

```bash
# Test-Script ausführen:
cd backend
node scripts/testGuvCurrencyConversion.js

# Ausgabe zeigt alle erkannten Dollar-Beträge und Konvertierungen
```

## Zukunfts-Roadmap

- [ ] Dynamischer Wechselkurs aus API
- [ ] Verschiedene Währungen (GBP, CHF, etc.)
- [ ] Export mit ursprünglicher Währung
- [ ] Wechselkurs-Historie
- [ ] Manuelle Wechselkurs-Override Pro Rechnung

---

**Erstellt:** 2026-06-13
**System:** GUV-Rechnung Bildanalyse mit Währungskonvertierung
