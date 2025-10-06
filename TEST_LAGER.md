# 🧪 Test-Anleitung Lagerverwaltung

## Vorbereitung

### Backend & Frontend starten
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm start
```

## Test-Szenarien

### ✅ Szenario 1: Inventur durchführen

1. **Als Admin einloggen**
   - Browser: http://localhost:3000/login
   - Admin-Credentials eingeben

2. **Zu Lager navigieren**
   - Admin-Menü → Lager

3. **Inventur-Button klicken**
   - "Inventur" Button oben rechts

4. **Rohseife eintragen**
   ```
   Typ: Rohseife
   Artikel: [Wähle eine Rohseife aus der DB]
   Menge: 50
   Einheit: kg
   Mindestbestand: 10
   Notizen: "Test-Inventur 06.10.2025"
   ```
   - **Speichern** klicken
   
5. **Prüfen**
   - ✅ Toast-Nachricht "Inventur erfolgreich"
   - ✅ Rohseife erscheint in Tab "Rohseifen"
   - ✅ Bestand zeigt 50 kg

6. **Weitere Rohstoffe**
   - Wiederhole für Duftöl (ml)
   - Wiederhole für Verpackung (Stück)

### ✅ Szenario 2: Produktion verbuchen

**Voraussetzung:** Portfolio-Produkt mit Rezeptur muss existieren

1. **Produktion-Button klicken**
   - "Produktion" Button oben rechts

2. **Produkt auswählen**
   ```
   Produkt: [Wähle Portfolio-Produkt]
   Anzahl: 5
   ```
   
3. **Produzieren klicken**

4. **Prüfen**
   - ✅ Success-Message mit Rohstoffverbrauch
   - Beispiel:
     ```
     5x Lavendelseife erfolgreich produziert
     
     Rohstoffverbrauch:
     - Olivenöl-Seife: 0.6 kg (Neuer Bestand: 49.4 kg)
     - Lavendelöl: 5 ml (Neuer Bestand: 45 ml)
     - Karton klein: 5 Stück (Neuer Bestand: 45 Stück)
     ```
   
5. **Tabs prüfen**
   - Tab "Rohseifen": Bestand -0.6 kg
   - Tab "Duftöle": Bestand -5 ml
   - Tab "Verpackungen": Bestand -5 Stück
   - Tab "Fertigprodukte": +5 Stück (neu eingebucht)

### ✅ Szenario 3: Fehler-Handling

1. **Produktion ohne Rohstoffe**
   - Wähle Produkt mit mehr Bedarf als Lager hat
   - **Erwartung:** 
     ```
     ❌ Nicht genug Rohseife "Olivenöl-Seife" auf Lager. 
        Benötigt: 10 kg, Verfügbar: 2 kg
     ```

2. **Produkt ohne Rohstoff-Eintrag**
   - Erstelle Portfolio-Produkt mit Rohseife die NICHT in DB existiert
   - Versuche Produktion
   - **Erwartung:**
     ```
     ❌ Rohseife "Neue-Seife-123" nicht in Datenbank gefunden.
        Bitte erst unter Rohstoffe anlegen.
     ```

### ✅ Szenario 4: Korrektur

1. **In Tabelle: Korrigieren-Button klicken**
   
2. **Bestand erhöhen**
   ```
   Änderung: +10
   Notizen: "Nachlieferung Firma X"
   ```
   - **Erwartung:** Bestand +10

3. **Bestand verringern**
   ```
   Änderung: -3
   Notizen: "Beschädigung beim Transport"
   ```
   - **Erwartung:** Bestand -3

### ✅ Szenario 5: Historie

1. **In Tabelle: Historie-Button klicken**

2. **Prüfen**
   - ✅ Alle Bewegungen chronologisch
   - ✅ Typ-Badges (Eingang/Ausgang/Inventur)
   - ✅ Menge mit Farbe (+grün/-rot)
   - ✅ Bestand vorher → nachher
   - ✅ Grund und Datum

### ✅ Szenario 6: Warnungen

1. **Artikel unter Mindestbestand bringen**
   - Korrektur: Setze Bestand auf 5 (wenn Mindestbestand 10)

2. **Prüfen**
   - ✅ Warnung-Alert oben erscheint
   - ✅ Rot markierte Zeile in Tabelle
   - ✅ "Unter Mindestbestand!" Chip

### ✅ Szenario 7: Mobile-Ansicht

1. **Browser Dev-Tools öffnen** (F12)
2. **Responsive-Modus** (Ctrl+Shift+M)
3. **iPhone/Samsung einstellen**

4. **Prüfen**
   - ✅ Cards statt Tabelle
   - ✅ Fullscreen-Dialoge
   - ✅ Scrollbare Tabs
   - ✅ Touch-freundliche Buttons

## 🔍 Backend-Logs prüfen

Terminal mit Backend sollte zeigen:
```
📦 Lagerbestand aktualisiert: Lavendelseife -2 (Neuer Bestand: 18)
📦 Lagerbestand erhöht (storniert): Lavendelseife +2 (Neuer Bestand: 20)
```

## 🗄️ Datenbank prüfen

### MongoDB Compass

1. **Collection: bestand**
   ```json
   {
     "_id": "...",
     "typ": "rohseife",
     "artikelId": "...",
     "artikelModell": "Rohseife",
     "menge": 49.4,
     "einheit": "kg",
     "mindestbestand": 10,
     "letzteAenderung": {
       "datum": "2025-10-06T...",
       "grund": "produktion",
       "menge": -0.6,
       "vorher": 50,
       "nachher": 49.4
     }
   }
   ```

2. **Collection: bewegung**
   ```json
   {
     "_id": "...",
     "typ": "ausgang",
     "bestandId": "...",
     "artikel": {
       "typ": "rohseife",
       "artikelId": "...",
       "name": "Olivenöl-Seife"
     },
     "menge": -0.6,
     "einheit": "kg",
     "bestandVorher": 50,
     "bestandNachher": 49.4,
     "grund": "Produktion von 5x Lavendelseife",
     "referenz": {
       "typ": "produktion",
       "id": "..."
     },
     "userId": "...",
     "createdAt": "2025-10-06T..."
   }
   ```

## ✅ Erfolgs-Kriterien

- [ ] Inventur funktioniert für alle 4 Typen
- [ ] Produktion bucht korrekte Rohstoffe ab
- [ ] Produktion findet Rohstoffe nach NAME
- [ ] Fehlermeldung wenn Rohstoff nicht in DB
- [ ] Fehlermeldung wenn nicht genug Bestand
- [ ] Korrektur funktioniert (+/-)
- [ ] Historie zeigt alle Bewegungen
- [ ] Warnungen bei Mindestbestand
- [ ] Mobile-Ansicht funktioniert
- [ ] Keine Console-Errors im Browser

## 🐛 Bekannte Probleme

Keine bekannt - wenn Fehler auftreten:
1. Backend-Logs prüfen
2. Browser Console prüfen (F12)
3. MongoDB Compass prüfen

## 📝 Test-Daten Vorbereiten

Falls DB leer ist:

1. **Rohstoffe anlegen**
   - Admin → Rohstoffe
   - 1x Rohseife: "Olivenöl-Seife"
   - 1x Duftöl: "Lavendelöl"
   - 1x Verpackung: "Karton klein"

2. **Portfolio-Produkt anlegen**
   - Admin → Portfolio-Verwaltung
   - Name: "Lavendelseife"
   - Seife: "Olivenöl-Seife" (EXAKTER Name!)
   - Gramm: 120
   - Aroma: "Lavendelöl" (EXAKTER Name!)
   - Verpackung: "Karton klein" (EXAKTER Name!)

3. **Inventur durchführen**
   - Für alle 3 Rohstoffe Bestand eintragen

4. **Produktion testen**
   - Sollte jetzt funktionieren!

---

**Viel Erfolg beim Testen! 🚀**
