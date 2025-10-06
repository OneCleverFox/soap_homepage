# 📊 Lagerverwaltung - Übersicht

## ✅ Implementierte Features

### 1️⃣ **Bestandsführung**
```
┌─────────────────────────────────────────────────┐
│  ROHSTOFFE                    FERTIGPRODUKTE    │
├─────────────────────────────────────────────────┤
│  • Rohseifen (kg/g)          • Portfolio (Stk.) │
│  • Duftöle (ml/l)                                │
│  • Verpackungen (Stk.)                           │
├─────────────────────────────────────────────────┤
│  Jeder Artikel:                                  │
│  - Aktueller Bestand                             │
│  - Mindestbestand                                │
│  - Einheit                                       │
│  - Notizen                                       │
│  - Letzte Änderung                               │
└─────────────────────────────────────────────────┘
```

### 2️⃣ **Inventur**
```
┌─────────────────────────────────────────┐
│  INVENTUR DURCHFÜHREN                   │
├─────────────────────────────────────────┤
│  1. Typ wählen (Rohseife/Duft/etc.)     │
│  2. Artikel auswählen                   │
│  3. Neue Menge eingeben                 │
│  4. Mindestbestand festlegen            │
│  5. Notizen hinzufügen                  │
│                                          │
│  → Bestand wird aktualisiert             │
│  → Bewegungs-Log wird erstellt          │
└─────────────────────────────────────────┘
```

### 3️⃣ **Produktion**
```
┌─────────────────────────────────────────────────────┐
│  PRODUKTION VERBUCHEN                               │
├─────────────────────────────────────────────────────┤
│  INPUT:                                             │
│  • Produkt: Lavendelseife                           │
│  • Anzahl: 10 Stück                                 │
│                                                      │
│  AUTOMATISCHE AUSBUCHUNG:                           │
│  ✓ Rohseife: -1.2 kg (120g × 10)                    │
│  ✓ Duftöl:   -10 ml (1ml × 10)                      │
│  ✓ Verpackung: -10 Stück                            │
│                                                      │
│  AUTOMATISCHE EINBUCHUNG:                           │
│  ✓ Lavendelseife: +10 Stück                         │
│                                                      │
│  FEHLER-HANDLING:                                   │
│  ❌ Nicht genug Rohstoff? → Abbruch + Fehlermeldung │
└─────────────────────────────────────────────────────┘
```

### 4️⃣ **Bestellungen** (Automatisch)
```
┌──────────────────────────────────────────┐
│  BESTELLUNG ERSTELLT                     │
│  Bestellnummer: #GM-2025-10-001          │
├──────────────────────────────────────────┤
│  Artikel:                                │
│  • 2x Lavendelseife                      │
│  • 1x Rosenduftseife                     │
│                                          │
│  AUTOMATISCHE LAGERABBUCHUNG:            │
│  ✓ Lavendelseife: -2 Stück               │
│  ✓ Rosenduftseife: -1 Stück              │
│                                          │
│  BEWEGUNGS-LOG:                          │
│  → Typ: Ausgang                          │
│  → Grund: Bestellung #GM-2025-10-001     │
│  → Referenz: Kunde email@example.com     │
└──────────────────────────────────────────┘
```

### 5️⃣ **Retouren/Stornierung**
```
┌─────────────────────────────────────────┐
│  STATUS GEÄNDERT: Retourniert           │
│  Bestellnummer: #GM-2025-10-001         │
├─────────────────────────────────────────┤
│  AUTOMATISCHE WIEDEREINBUCHUNG:         │
│  ✓ Lavendelseife: +2 Stück              │
│  ✓ Rosenduftseife: +1 Stück             │
│                                          │
│  BEWEGUNGS-LOG:                         │
│  → Typ: Eingang                          │
│  → Grund: Retoure #GM-2025-10-001       │
└─────────────────────────────────────────┘
```

### 6️⃣ **Warnungen**
```
┌─────────────────────────────────────────────┐
│  ⚠️  WARNUNG: MINDESTBESTAND UNTERSCHRITTEN │
├─────────────────────────────────────────────┤
│  • Olivenöl-Seife: 8 kg (Min: 10 kg)        │
│    Fehlmenge: 2 kg                          │
│                                              │
│  • Lavendelöl: 45 ml (Min: 50 ml)           │
│    Fehlmenge: 5 ml                          │
│                                              │
│  → Anzeige im Dashboard                     │
│  → Farbliche Markierung in Tabellen         │
└─────────────────────────────────────────────┘
```

### 7️⃣ **Historie / Audit Trail**
```
┌────────────────────────────────────────────────────────┐
│  BEWEGUNGSHISTORIE: Lavendelseife                      │
├────────────────────────────────────────────────────────┤
│  Datum         │ Typ      │ Menge │ Bestand │ Grund    │
│────────────────┼──────────┼───────┼─────────┼──────────│
│  06.10 14:30   │ Ausgang  │ -2    │ 48→46   │ Bestellung│
│  06.10 10:15   │ Eingang  │ +10   │ 38→48   │ Produktion│
│  05.10 16:45   │ Inventur │ +20   │ 18→38   │ Lieferung │
│  05.10 09:00   │ Ausgang  │ -5    │ 23→18   │ Bestellung│
└────────────────────────────────────────────────────────┘
```

## 🔄 Workflows

### Workflow 1: Neues Produkt produzieren
```
1. Admin → Lager → Produktion
2. Produkt auswählen
3. Anzahl eingeben
4. Produzieren klicken
   ↓
   System prüft Rohstoffverfügbarkeit
   ↓
   Bei ausreichend: Rohstoffe --, Produkt ++
   Bei zu wenig: Fehlermeldung
```

### Workflow 2: Rohstoffe nachbestellen
```
1. Lieferung erhalten
2. Admin → Lager → Inventur
3. Rohstoff wählen
4. Neue Gesamtmenge eingeben
5. Notiz: "Lieferung Firma X, 06.10.2025"
6. Speichern
   ↓
   Bestand aktualisiert
   Bewegungs-Log erstellt
```

### Workflow 3: Beschädigte Ware
```
1. Admin → Lager → Rohstoffe/Produkte Tab
2. Artikel finden → Korrigieren klicken
3. Änderung: -3 (für 3 beschädigte Stück)
4. Notiz: "Beschädigung beim Transport"
5. Korrigieren
   ↓
   Bestand -3
   Bewegungs-Log: Korrektur
```

## 📱 Mobile Features

```
┌─────────────────────────────┐
│  📱 MOBILE ANSICHT          │
├─────────────────────────────┤
│  ✓ Card-basierte Listen     │
│  ✓ Fullscreen-Dialoge       │
│  ✓ Touch-freundliche Buttons│
│  ✓ Responsive Tabs           │
│  ✓ Optimierte Formulare     │
└─────────────────────────────┘
```

## 🗄️ Datenbank-Struktur

```
MongoDB Collections:

bestand
├─ _id
├─ typ (rohseife/duftoil/verpackung/produkt)
├─ artikelId (ref → Rohseife/Duftoil/Verpackung/Portfolio)
├─ artikelModell
├─ menge
├─ einheit
├─ mindestbestand
├─ notizen
└─ letzteAenderung
   ├─ datum
   ├─ grund
   ├─ menge
   ├─ vorher
   └─ nachher

bewegung (Audit Trail)
├─ _id
├─ typ (eingang/ausgang/inventur/produktion/korrektur/retoure)
├─ bestandId (ref → bestand)
├─ artikel
│  ├─ typ
│  ├─ artikelId
│  └─ name
├─ menge
├─ einheit
├─ bestandVorher
├─ bestandNachher
├─ grund
├─ referenz
│  ├─ typ (bestellung/produktion/inventur)
│  └─ id
├─ notizen
└─ userId
```

## 📊 API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/lager/bestand` | GET | Alle Bestände |
| `/api/lager/warnungen` | GET | Mindestbestand-Warnungen |
| `/api/lager/inventur` | POST | Inventur durchführen |
| `/api/lager/produktion` | POST | Produktion verbuchen |
| `/api/lager/korrektur` | POST | Bestand korrigieren |
| `/api/lager/historie/:id` | GET | Bewegungshistorie |
| `/api/lager/artikel` | GET | Verfügbare Artikel |

## 🎯 Best Practices

### DO ✅
- Regelmäßige Inventuren (monatlich)
- Realistische Mindestbestände setzen
- Notizen bei Korrekturen angeben
- Historie vor größeren Änderungen prüfen
- Warnungen ernst nehmen

### DON'T ❌
- Produktion ohne Rohstoffprüfung
- Mindestbestand zu niedrig setzen
- Korrekturen ohne Grund
- Inventur für reguläre Bewegungen nutzen
- Bestand manuell in DB ändern

## 🚀 Deployment Status

- ✅ Backend: Railway (Auto-Deploy bei Push)
- ✅ Frontend: Vercel (Auto-Deploy bei Push)
- ✅ Database: MongoDB Atlas
- ✅ Models: Bestand, Bewegung
- ✅ Routes: /api/lager/*
- ✅ Frontend: AdminLager.js
- ✅ Integration: Order.js (Auto-Abbuchung)

---

**Version 1.0.0** | 06.10.2025 | Glücksmomente Manufaktur 🧼✨
