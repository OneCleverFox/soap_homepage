# 📦 Lagerverwaltungssystem - Dokumentation

## Überblick

Das Lagerverwaltungssystem bietet vollständige Bestandsführung für Rohstoffe und Fertigprodukte mit automatischer Buchung bei Produktion und Bestellungen.

## Features

### 1. **Bestandsführung** 
- Rohseifen (kg/g)
- Duftöle (ml/l)
- Verpackungen (Stück)
- Fertigprodukte (Stück)

### 2. **Inventur**
- Manuelles Setzen von Beständen
- Festlegung von Mindestbeständen
- Notizen/Kommentare
- Automatische Warnung bei Unterschreitung

### 3. **Produktion**
- Auswahl eines Fertigprodukts
- Eingabe der Produktionsmenge
- **Automatische Ausbuchung** aller benötigten Rohstoffe:
  - Rohseife (basierend auf `gramm`)
  - Duftöl (1 ml pro Produkt)
  - Verpackung (1 Stück pro Produkt)
- **Automatische Einbuchung** des Fertigprodukts
- Fehlermeldung bei unzureichendem Bestand

### 4. **Bestandskorrektur**
- Manuelle Anpassung (+ oder -)
- Grund/Notizen erforderlich
- Für Retouren, Beschädigungen, etc.

### 5. **Historie**
- Vollständiger Audit Trail
- Alle Bewegungen nachvollziehbar
- Datum, Typ, Menge, Bestand vorher/nachher
- Grund und Benutzer

### 6. **Warnungen**
- Automatische Erkennung Mindestbestand
- Dashboard-Anzeige
- Farbliche Markierung in Tabellen

## Datenbank-Modelle

### `Bestand` (bestand Collection)
```javascript
{
  typ: 'rohseife' | 'duftoil' | 'verpackung' | 'produkt',
  artikelId: ObjectId,
  artikelModell: 'Rohseife' | 'Duftoil' | 'Verpackung' | 'Portfolio',
  menge: Number,
  einheit: 'kg' | 'g' | 'ml' | 'l' | 'stück',
  mindestbestand: Number,
  notizen: String,
  letzteAenderung: {
    datum: Date,
    grund: String,
    menge: Number,
    vorher: Number,
    nachher: Number
  }
}
```

### `Bewegung` (bewegung Collection)
```javascript
{
  typ: 'eingang' | 'ausgang' | 'inventur' | 'produktion' | 'korrektur' | 'retoure',
  bestandId: ObjectId,
  artikel: {
    typ: String,
    artikelId: ObjectId,
    name: String
  },
  menge: Number,
  einheit: String,
  bestandVorher: Number,
  bestandNachher: Number,
  grund: String,
  referenz: {
    typ: String,
    id: ObjectId
  },
  notizen: String,
  userId: ObjectId
}
```

## API Endpoints

### `GET /api/lager/bestand`
Holt alle Bestände gruppiert nach Typ

**Response:**
```json
{
  "success": true,
  "data": {
    "rohseifen": [...],
    "duftoele": [...],
    "verpackungen": [...],
    "produkte": [...]
  }
}
```

### `GET /api/lager/warnungen`
Holt Artikel unter Mindestbestand

### `POST /api/lager/inventur`
Führt Inventur durch (setzt Bestand)

**Body:**
```json
{
  "typ": "rohseife",
  "artikelId": "60d5ec49f1b2c8b1f8e4e1a1",
  "menge": 50,
  "einheit": "kg",
  "mindestbestand": 10,
  "notizen": "Lieferung vom 06.10.2025"
}
```

### `POST /api/lager/produktion`
Verbucht Produktion mit automatischer Rohstoffbuchung

**Body:**
```json
{
  "produktId": "60d5ec49f1b2c8b1f8e4e1a1",
  "anzahl": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "10x Lavendelseife erfolgreich produziert",
  "data": {
    "produkt": {
      "name": "Lavendelseife",
      "anzahl": 10,
      "neuerBestand": 25
    },
    "rohstoffVerbrauch": [
      {
        "rohstoff": "Olivenöl-Seife",
        "menge": 1.2,
        "einheit": "kg",
        "neuerBestand": 48.8
      },
      {
        "rohstoff": "Lavendel",
        "menge": 10,
        "einheit": "ml",
        "neuerBestand": 190
      },
      {
        "rohstoff": "Karton klein",
        "menge": 10,
        "einheit": "stück",
        "neuerBestand": 90
      }
    ]
  }
}
```

### `POST /api/lager/korrektur`
Korrigiert Bestand manuell

**Body:**
```json
{
  "bestandId": "60d5ec49f1b2c8b1f8e4e1a1",
  "aenderung": -5,
  "notizen": "Beschädigung bei Verpackung"
}
```

### `GET /api/lager/historie/:bestandId`
Holt Bewegungshistorie für einen Artikel

### `GET /api/lager/artikel`
Holt alle verfügbaren Artikel für Dropdowns

## Frontend-Komponenten

### AdminLager.js
Hauptkomponente mit:
- 4 Tabs (Rohseifen, Duftöle, Verpackungen, Produkte)
- Mobile-optimiert (Cards vs. Tabelle)
- Dialoge für Inventur, Produktion, Korrektur, Historie
- Warnungen-Badge
- Echtzeit-Updates

## Workflow-Beispiele

### 1. Neue Rohstoffe eintragen
1. **Admin** → **Lager** → **Inventur**
2. Typ: `Rohseife`
3. Artikel: `Olivenöl-Seife`
4. Menge: `50 kg`
5. Mindestbestand: `10 kg`
6. **Speichern**

### 2. Produktion verbuchen
1. **Admin** → **Lager** → **Produktion**
2. Produkt: `Lavendelseife` (aus Portfolio)
3. Anzahl: `10 Stück`
4. **Produzieren**
   - System prüft Rohstoffverfügbarkeit
   - Bucht automatisch aus:
     - Rohseife (gramm × anzahl)
     - Duftöl (1 ml × anzahl)
     - Verpackung (1 × anzahl)
   - Bucht Fertigprodukt ein (+10)

### 3. Bestand korrigieren
1. In Tabelle **Korrigieren** klicken
2. Änderung: `-3` (für Beschädigung)
3. Notizen: `Beschädigung beim Transport`
4. **Korrigieren**

### 4. Historie prüfen
1. In Tabelle **Historie** klicken
2. Sieht alle Bewegungen chronologisch
3. Mit Datum, Typ, Menge, Grund

## Best Practices

### Inventur
- **Regelmäßig durchführen** (z.B. monatlich)
- Mindestbestände realistisch setzen
- Notizen nutzen für Lieferantendaten

### Produktion
- **Vor Produktion** prüfen ob Rohstoffe reichen
- Bei Fehlermeldung: Rohstoffe nachbestellen
- Nach Produktion: Warnungen prüfen

### Korrektur
- **Nur für Sonderfälle** (Beschädigung, Retoure, etc.)
- **Immer Grund angeben** (Audit Trail)
- Nicht für reguläre Produktion nutzen

### Bestellungen (zukünftig)
- Bei Bestellausgang automatisch Produktbestand reduzieren
- Bei Retoure: Korrektur mit Grund "Retoure"

## Erweiterungsmöglichkeiten

1. **Automatische Bestellvorschläge**
   - Bei Unterschreitung Mindestbestand
   - Basierend auf Verbrauchshistorie

2. **Reporting**
   - Verbrauchsanalyse
   - Bestandswert
   - Umschlagshäufigkeit

3. **Barcode-Scanner**
   - Schnellere Inventur
   - Mobile App

4. **Lieferanten-Integration**
   - Automatische Bestellungen
   - Lieferzeiten-Tracking

5. **Multi-Standort**
   - Verschiedene Lagerorte
   - Transfers zwischen Standorten

## Support & Fehlerbehandlung

### Fehlermeldungen

**"Nicht genug Rohseife auf Lager"**
- Lösung: Inventur durchführen oder Rohstoff nachbestellen

**"Produkt nicht gefunden"**
- Lösung: Produkt muss im Portfolio existieren

**"BestandId nicht gefunden"**
- Lösung: Artikel muss zuerst per Inventur angelegt werden

### Logs
Alle Operationen werden protokolliert:
- Backend Console: Fehlerdetails
- Bewegung Collection: Audit Trail
- Frontend Messages: Benutzer-Feedback

---

## Changelog

### Version 1.0.0 (06.10.2025)
- ✅ Initiales Release
- ✅ Bestandsführung für 4 Kategorien
- ✅ Inventur-Funktion
- ✅ Produktionsbuchung mit automatischer Rohstoffausbuchung
- ✅ Bestandskorrektur
- ✅ Bewegungshistorie
- ✅ Warnungen bei Mindestbestand
- ✅ Mobile-optimiertes Frontend
- ✅ Audit Trail (Bewegung-Model)

---

**Entwickelt für Glücksmomente Manufaktur** 🧼✨
