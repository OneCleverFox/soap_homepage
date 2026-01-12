const express = require('express');
const router = express.Router();
const Bestand = require('../models/Bestand');
const Bewegung = require('../models/Bewegung');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');
const Giessform = require('../models/Giessform');
const Giesswerkstoff = require('../models/Giesswerkstoff');
const Giesszusatzstoff = require('../models/Giesszusatzstoff');
const { authenticateToken } = require('../middleware/auth');

// Middleware: Nur Admin darf Lager verwalten
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Nur Administratoren dürfen das Lager verwalten'
    });
  }
  next();
};

// GET /api/lager/bestand - Alle Bestände abrufen
router.get('/bestand', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typ } = req.query;
    
    console.log('🔍 Bestand-Abfrage gestartet...');
    
    // Hole Daten direkt aus den Rohstoff-Collections
    const [rohseifen, duftoele, verpackungen, zusatzinhaltsstoffe, produkte] = await Promise.all([
      Rohseife.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Duftoil.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Verpackung.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      // Zusatzinhaltsstoffe aus der Bestand-Collection laden
      Bestand.find({ typ: 'zusatzinhaltsstoff' }).populate({
        path: 'artikelId',
        model: 'ZusatzInhaltsstoff',
        select: 'bezeichnung'
      }).lean(),
      Portfolio.find().lean()
    ]);
    
    console.log('📊 Rohdaten geladen:', {
      rohseifen: rohseifen.length,
      duftoele: duftoele.length,
      verpackungen: verpackungen.length,
      zusatzinhaltsstoffe: zusatzinhaltsstoffe.length,
      produkte: produkte.length
    });
    
    // Hole Produktbestände aus Bestand-Collection (nur für Fertigprodukte)
    const produktBestaende = await Bestand.find({ typ: 'produkt' }).populate('artikelId');
    
    console.log('📦 Produktbestände:', produktBestaende.length);
    
    // Formatiere Rohseifen
    const rohseifenFormatted = rohseifen.map(r => ({
      _id: r._id,
      artikelId: r._id,
      name: r.bezeichnung,
      menge: r.aktuellVorrat,
      einheit: 'g',
      mindestbestand: r.mindestbestand,
      unterMindestbestand: r.aktuellVorrat < r.mindestbestand,
      typ: 'rohseife'
    }));
    
    // Formatiere Duftöle
    const duftoeleFormatted = duftoele.map(d => ({
      _id: d._id,
      artikelId: d._id,
      name: d.bezeichnung,
      menge: d.aktuellVorrat,
      einheit: 'Tropfen',
      mindestbestand: d.mindestbestand,
      unterMindestbestand: d.aktuellVorrat < d.mindestbestand,
      typ: 'duftoil'
    }));
    
    // Formatiere Verpackungen
    const verpackungenFormatted = verpackungen.map(v => ({
      _id: v._id,
      artikelId: v._id,
      name: v.bezeichnung,
      menge: v.aktuellVorrat,
      einheit: 'Stück',
      mindestbestand: v.mindestbestand,
      unterMindestbestand: v.aktuellVorrat < v.mindestbestand,
      typ: 'verpackung'
    }));
    
    // Formatiere Zusatzinhaltsstoffe
    const zusatzinhaltsstoffeFormatted = zusatzinhaltsstoffe
      .filter(z => z.artikelId) // Nur Einträge mit gültiger Referenz
      .map(z => ({
        _id: z._id,
        artikelId: z.artikelId._id,
        name: z.artikelId.bezeichnung,
        menge: z.menge,
        einheit: z.einheit || 'g',
        mindestbestand: z.mindestbestand,
        unterMindestbestand: z.menge < z.mindestbestand,
        typ: 'zusatzinhaltsstoff'
      }));
    
    // Formatiere Produkte
    const produkteFormatted = produktBestaende.map(p => ({
      _id: p._id,
      artikelId: p.artikelId?._id,
      name: p.artikelId?.name,
      menge: p.menge,
      einheit: 'Stück',
      mindestbestand: p.mindestbestand,
      unterMindestbestand: p.istUnterMindestbestand(),
      letzteAenderung: p.letzteAenderung,
      notizen: p.notizen,
      typ: 'produkt'
    }));
    
    const result = {
      success: true,
      data: {
        rohseifen: rohseifenFormatted,
        duftoele: duftoeleFormatted,
        verpackungen: verpackungenFormatted,
        zusatzinhaltsstoffe: zusatzinhaltsstoffeFormatted,
        produkte: produkteFormatted
      }
    };
    
    console.log('✅ Antwort wird gesendet:', {
      rohseifen: result.data.rohseifen.length,
      duftoele: result.data.duftoele.length,
      verpackungen: result.data.verpackungen.length,
      zusatzinhaltsstoffe: result.data.zusatzinhaltsstoffe.length,
      produkte: result.data.produkte.length
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bestände:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestände',
      error: error.message
    });
  }
});

// GET /api/lager/warnungen - Artikel unter Mindestbestand
router.get('/warnungen', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const warnungen = [];
    
    // Rohseifen unter Mindestbestand
    const rohseifen = await Rohseife.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    rohseifen.forEach(r => {
      warnungen.push({
        _id: r._id,
        typ: 'rohseife',
        name: r.bezeichnung,
        menge: r.aktuellVorrat,
        mindestbestand: r.mindestbestand,
        einheit: 'g',
        differenz: r.mindestbestand - r.aktuellVorrat
      });
    });
    
    // Duftöle unter Mindestbestand
    const duftoele = await Duftoil.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    duftoele.forEach(d => {
      warnungen.push({
        _id: d._id,
        typ: 'duftoil',
        name: d.bezeichnung,
        menge: d.aktuellVorrat,
        mindestbestand: d.mindestbestand,
        einheit: 'tropfen',
        differenz: d.mindestbestand - d.aktuellVorrat
      });
    });
    
    // Verpackungen unter Mindestbestand
    const verpackungen = await Verpackung.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    verpackungen.forEach(v => {
      warnungen.push({
        _id: v._id,
        typ: 'verpackung',
        name: v.bezeichnung,
        menge: v.aktuellVorrat,
        mindestbestand: v.mindestbestand,
        einheit: 'Stück',
        differenz: v.mindestbestand - v.aktuellVorrat
      });
    });
    
    // Produkte unter Mindestbestand
    const produkte = await Bestand.findeUnterMindestbestand();
    produkte.forEach(p => {
      if (p.artikelId) {
        warnungen.push({
          _id: p._id,
          typ: 'produkt',
          name: p.artikelId.name,
          menge: p.menge,
          mindestbestand: p.mindestbestand,
          einheit: 'Stück',
          differenz: p.mindestbestand - p.menge
        });
      }
    });
    
    res.json({
      success: true,
      data: warnungen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Warnungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Warnungen',
      error: error.message
    });
  }
});

// POST /api/lager/inventur - Inventur durchführen (Neue vereinfachte Version)
router.post('/inventur-new', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typ, artikelId, neuerBestand, notizen } = req.body;
    
    console.log('📊 Inventur-Anfrage:', { typ, artikelId, neuerBestand, notizen });
    
    if (!typ || !artikelId || neuerBestand === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Typ, ArtikelId und neuerBestand sind erforderlich'
      });
    }
    
    let artikel;
    let vorherBestand = 0;
    let modelName = '';
    
    // Je nach Typ den entsprechenden Artikel finden und aktualisieren
    switch (typ) {
      case 'fertigprodukt':
        artikel = await Portfolio.findById(artikelId);
        modelName = 'Portfolio';
        if (artikel) {
          // Für Fertigprodukte verwenden wir die Bestand-Collection
          let bestand = await Bestand.findOne({ 
            typ: 'produkt', 
            artikelId: artikelId 
          });
          
          if (!bestand) {
            // Erstelle neuen Bestand-Eintrag falls nicht vorhanden
            bestand = new Bestand({
              typ: 'produkt',
              artikelId: artikelId,
              artikelModell: 'Portfolio',
              menge: 0,
              einheit: 'stück',
              mindestbestand: 0
            });
          } else {
            // Korrigiere Einheit falls sie falsch gesetzt ist
            if (bestand.einheit === 'Stück') {
              bestand.einheit = 'stück';
            }
          }
          
          vorherBestand = bestand.menge || 0;
          const neueAnzahl = parseFloat(neuerBestand);
          const buchungsAnzahl = neueAnzahl - vorherBestand;
          
          bestand.menge = neueAnzahl;
          bestand.letzteAenderung = {
            datum: new Date(),
            grund: 'inventur',
            menge: buchungsAnzahl,
            vorher: vorherBestand,
            nachher: neueAnzahl
          };
          if (notizen) {
            bestand.notizen = notizen;
          }
          await bestand.save();
          
          // 🔄 AUTOMATISCHE ROHSTOFF-SUBTRAKTION bei Fertigprodukt-Inventur
          if (buchungsAnzahl > 0) {
            console.log(`🏭 Automatische Rohstoff-Subtraktion für ${buchungsAnzahl}x ${artikel.name}`);
            
            const rohstoffBewegungen = [];
            const rohstoffFehler = [];
            
            try {
              // 1. ROHSEIFE(N) subtrahieren
              // Prüfung auf zweite Rohseife in rohseifenKonfiguration
              const verwendeZweiRohseifen = artikel.rohseifenKonfiguration?.verwendeZweiRohseifen || false;
              
              if (artikel.seife && artikel.gramm) {
                if (verwendeZweiRohseifen) {
                  // === ZWEI ROHSEIFEN MODUS ===
                  console.log(`  🔄 ZWEI ROHSEIFEN MODUS für ${artikel.name}`);
                  console.log(`  📊 Gewichtverteilung: Seife 1 ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}%, Seife 2 ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}%`);
                  
                  // Erste Rohseife
                  const rohseife1 = await Rohseife.findOne({ bezeichnung: artikel.seife });
                  if (rohseife1) {
                    const gewicht1 = Math.round(artikel.gramm * (artikel.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent / 100));
                    const benoetigt1 = gewicht1 * buchungsAnzahl;
                    
                    if (rohseife1.aktuellVorrat >= benoetigt1) {
                      const vorher1 = rohseife1.aktuellVorrat;
                      rohseife1.aktuellVorrat -= benoetigt1;
                      await rohseife1.save();
                      
                      rohstoffBewegungen.push({
                        typ: 'produktion',
                        artikel: {
                          typ: 'rohseife',
                          artikelId: rohseife1._id,
                          name: rohseife1.bezeichnung
                        },
                        menge: -benoetigt1,
                        einheit: 'g',
                        bestandVorher: vorher1,
                        bestandNachher: rohseife1.aktuellVorrat,
                        grund: `Automatische Rohstoff-Subtraktion (Seife 1): ${buchungsAnzahl}x ${artikel.name}`,
                        notizen: `Zwei-Rohseifen-Produkt - Anteil ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}% (${gewicht1}g)`,
                        referenz: {
                          typ: 'fertigprodukt-inventur',
                          produktId: artikel._id,
                          produktName: artikel.name,
                          anzahl: buchungsAnzahl
                        }
                      });
                      
                      console.log(`  ✅ Rohseife 1 ${rohseife1.bezeichnung}: -${benoetigt1}g (${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent})%`);
                    } else {
                      rohstoffFehler.push(`Nicht genug ${rohseife1.bezeichnung} (Seife 1): benötigt ${benoetigt1}g, verfügbar ${rohseife1.aktuellVorrat}g`);
                    }
                  } else {
                    rohstoffFehler.push(`Rohseife 1 "${artikel.seife}" nicht gefunden`);
                  }
                  
                  // Zweite Rohseife
                  if (artikel.rohseifenKonfiguration?.seife2) {
                    const rohseife2 = await Rohseife.findOne({ bezeichnung: artikel.rohseifenKonfiguration.seife2 });
                    if (rohseife2) {
                      const gewicht2 = Math.round(artikel.gramm * (artikel.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent / 100));
                      const benoetigt2 = gewicht2 * buchungsAnzahl;
                      
                      if (rohseife2.aktuellVorrat >= benoetigt2) {
                        const vorher2 = rohseife2.aktuellVorrat;
                        rohseife2.aktuellVorrat -= benoetigt2;
                        await rohseife2.save();
                        
                        rohstoffBewegungen.push({
                          typ: 'produktion',
                          artikel: {
                            typ: 'rohseife',
                            artikelId: rohseife2._id,
                            name: rohseife2.bezeichnung
                          },
                          menge: -benoetigt2,
                          einheit: 'g',
                          bestandVorher: vorher2,
                          bestandNachher: rohseife2.aktuellVorrat,
                          grund: `Automatische Rohstoff-Subtraktion (Seife 2): ${buchungsAnzahl}x ${artikel.name}`,
                          notizen: `Zwei-Rohseifen-Produkt - Anteil ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}% (${gewicht2}g)`,
                          referenz: {
                            typ: 'fertigprodukt-inventur',
                            produktId: artikel._id,
                            produktName: artikel.name,
                            anzahl: buchungsAnzahl
                          }
                        });
                        
                        console.log(`  ✅ Rohseife 2 ${rohseife2.bezeichnung}: -${benoetigt2}g (${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent})%`);
                      } else {
                        rohstoffFehler.push(`Nicht genug ${rohseife2.bezeichnung} (Seife 2): benötigt ${benoetigt2}g, verfügbar ${rohseife2.aktuellVorrat}g`);
                      }
                    } else {
                      rohstoffFehler.push(`Rohseife 2 "${artikel.rohseifenKonfiguration.seife2}" nicht gefunden`);
                    }
                  } else {
                    rohstoffFehler.push('Zweite Rohseife ist nicht konfiguriert, obwohl "verwendeZweiRohseifen" aktiviert ist');
                  }
                } else {
                  // === EIN ROHSEIFE MODUS (bestehende Logik) ===
                  const rohseifeDoc = await Rohseife.findOne({ bezeichnung: artikel.seife });
                  if (rohseifeDoc) {
                    const benoetigt = artikel.gramm * buchungsAnzahl; // in Gramm
                    
                    if (rohseifeDoc.aktuellVorrat >= benoetigt) {
                      const rohseifeVorher = rohseifeDoc.aktuellVorrat;
                      rohseifeDoc.aktuellVorrat -= benoetigt;
                      await rohseifeDoc.save();
                      
                      // Bewegung protokollieren
                      rohstoffBewegungen.push({
                        typ: 'produktion',
                        artikel: {
                          typ: 'rohseife',
                          artikelId: rohseifeDoc._id,
                          name: rohseifeDoc.bezeichnung
                        },
                        menge: -benoetigt,
                        einheit: 'g',
                        bestandVorher: rohseifeVorher,
                        bestandNachher: rohseifeDoc.aktuellVorrat,
                        grund: `Automatische Rohstoff-Subtraktion: ${buchungsAnzahl}x ${artikel.name}`,
                        notizen: `Fertigprodukt-Inventur (ID: ${artikelId})`,
                        referenz: {
                          typ: 'fertigprodukt-inventur',
                          produktId: artikel._id,
                          produktName: artikel.name,
                          anzahl: buchungsAnzahl
                        }
                      });
                      
                      console.log(`  ✅ Rohseife ${rohseifeDoc.bezeichnung}: -${benoetigt}g`);
                    } else {
                      rohstoffFehler.push(`Nicht genug ${artikel.seife}: benötigt ${benoetigt}g, verfügbar ${rohseifeDoc.aktuellVorrat}g`);
                    }
                  } else {
                    rohstoffFehler.push(`Rohseife "${artikel.seife}" nicht gefunden`);
                  }
                }
              }
              
              
              // 2. DUFTÖL subtrahieren  
              if (artikel.aroma && artikel.aroma !== 'Keine' && artikel.aroma !== '-' && artikel.aroma !== 'Neutral') {
                const duftoel = await Duftoil.findOne({ bezeichnung: artikel.aroma });
                if (duftoel) {
                  // 1 ml pro Seife (Standard-Dosierung)
                  const benoetigt = 1 * buchungsAnzahl; // in ml
                  
                  if (duftoel.aktuellVorrat >= benoetigt) {
                    const duftoelVorher = duftoel.aktuellVorrat;
                    duftoel.aktuellVorrat -= benoetigt;
                    await duftoel.save();
                    
                    rohstoffBewegungen.push({
                      typ: 'produktion',
                      artikel: {
                        typ: 'duftoil',
                        artikelId: duftoel._id,
                        name: duftoel.bezeichnung
                      },
                      menge: -benoetigt,
                      einheit: 'ml',
                      bestandVorher: duftoelVorher,
                      bestandNachher: duftoel.aktuellVorrat,
                      grund: `Automatische Rohstoff-Subtraktion: ${buchungsAnzahl}x ${artikel.name}`,
                      notizen: `Fertigprodukt-Inventur (ID: ${artikelId})`,
                      referenz: {
                        typ: 'fertigprodukt-inventur',
                        produktId: artikel._id,
                        produktName: artikel.name,
                        anzahl: buchungsAnzahl
                      }
                    });
                    
                    console.log(`  ✅ Duftöl ${duftoel.bezeichnung}: -${benoetigt}ml`);
                  } else {
                    rohstoffFehler.push(`Nicht genug ${artikel.aroma}: benötigt ${benoetigt}ml, verfügbar ${duftoel.aktuellVorrat}ml`);
                  }
                } else {
                  rohstoffFehler.push(`Duftöl "${artikel.aroma}" nicht gefunden`);
                }
              }
              
              // 3. VERPACKUNG subtrahieren
              if (artikel.verpackung) {
                const verpackung = await Verpackung.findOne({ bezeichnung: artikel.verpackung });
                if (verpackung) {
                  const benoetigt = 1 * buchungsAnzahl; // 1 Verpackung pro Seife
                  
                  if (verpackung.aktuellVorrat >= benoetigt) {
                    const verpackungVorher = verpackung.aktuellVorrat;
                    verpackung.aktuellVorrat -= benoetigt;
                    await verpackung.save();
                    
                    rohstoffBewegungen.push({
                      typ: 'produktion',
                      artikel: {
                        typ: 'verpackung',
                        artikelId: verpackung._id,
                        name: verpackung.bezeichnung
                      },
                      menge: -benoetigt,
                      einheit: 'stück',
                      bestandVorher: verpackungVorher,
                      bestandNachher: verpackung.aktuellVorrat,
                      grund: `Automatische Rohstoff-Subtraktion: ${buchungsAnzahl}x ${artikel.name}`,
                      notizen: `Fertigprodukt-Inventur (ID: ${artikelId})`,
                      referenz: {
                        typ: 'fertigprodukt-inventur',
                        produktId: artikel._id,
                        produktName: artikel.name,
                        anzahl: buchungsAnzahl
                      }
                    });
                    
                    console.log(`  ✅ Verpackung ${verpackung.bezeichnung}: -${benoetigt} Stück`);
                  } else {
                    rohstoffFehler.push(`Nicht genug ${artikel.verpackung}: benötigt ${benoetigt} Stück, verfügbar ${verpackung.aktuellVorrat} Stück`);
                  }
                } else {
                  rohstoffFehler.push(`Verpackung "${artikel.verpackung}" nicht gefunden`);
                }
              }
              
              // 4. ZUSATZINHALTSSTOFFE subtrahieren
              if (artikel.zusatzinhaltsstoffe && artikel.zusatzinhaltsstoffe.length > 0) {
                console.log(`  🧪 Zusatzinhaltsstoffe für ${artikel.name}: ${artikel.zusatzinhaltsstoffe.length} Stoffe`);
                
                for (const zusatzstoff of artikel.zusatzinhaltsstoffe) {
                  const mengeProStuck = zusatzstoff.menge || 0; // Menge pro Stück in g
                  const benoetigt = mengeProStuck * buchungsAnzahl;
                  
                  console.log(`    - ${zusatzstoff.inhaltsstoffName}: ${mengeProStuck}g pro Stück × ${buchungsAnzahl} = ${benoetigt}g`);
                  
                  // Zusatzinhaltsstoff in der separaten Bestand-Collection finden
                  const zusatzstoffRecord = await ZusatzInhaltsstoff.findOne({ 
                    bezeichnung: zusatzstoff.inhaltsstoffName 
                  });
                  
                  if (zusatzstoffRecord) {
                    const zusatzstoffBestand = await Bestand.findOne({
                      artikelId: zusatzstoffRecord._id,
                      typ: 'zusatzinhaltsstoff'
                    });
                    
                    if (zusatzstoffBestand) {
                      // Prüfung auf unbegrenzte Materialien (Wasser, etc.)
                      const istUnbegrenzt = zusatzstoffRecord.unbegrenzterVorrat === true ||
                                           zusatzstoffRecord.bezeichnung?.toLowerCase().includes('wasser') ||
                                           zusatzstoffRecord.bezeichnung?.toLowerCase().includes('leitungswasser');
                      
                      if (istUnbegrenzt || zusatzstoffBestand.menge >= benoetigt) {
                        const zusatzstoffVorher = zusatzstoffBestand.menge;
                        
                        // Nur bei begrenzten Materialien den Bestand reduzieren
                        if (!istUnbegrenzt) {
                          zusatzstoffBestand.menge -= benoetigt;
                        }
                        
                        zusatzstoffBestand.letzteAktualisierung = new Date();
                        await zusatzstoffBestand.save();
                        
                        rohstoffBewegungen.push({
                          typ: 'produktion',
                          artikel: {
                            typ: 'zusatzinhaltsstoff',
                            artikelId: zusatzstoffRecord._id,
                            name: zusatzstoffRecord.bezeichnung
                          },
                          menge: istUnbegrenzt ? 0 : -benoetigt,  // Null für unbegrenzte Materialien
                          einheit: 'g',
                          bestandVorher: zusatzstoffVorher,
                          bestandNachher: istUnbegrenzt ? zusatzstoffVorher : zusatzstoffBestand.menge,
                          grund: istUnbegrenzt ? 
                            `Unbegrenztes Material verwendet: ${buchungsAnzahl}x ${artikel.name} (${benoetigt}g verbraucht)` :
                            `Automatische Rohstoff-Subtraktion: ${buchungsAnzahl}x ${artikel.name}`,
                          notizen: `Zusatzinhaltsstoff ${mengeProStuck}g pro Stück - Fertigprodukt-Inventur (ID: ${artikelId})${istUnbegrenzt ? ' (UNBEGRENZTE RESSOURCE)' : ''}`,
                          referenz: {
                            typ: 'fertigprodukt-inventur',
                            produktId: artikel._id,
                            produktName: artikel.name,
                            anzahl: buchungsAnzahl,
                            zusatzstoff: {
                              name: zusatzstoff.inhaltsstoffName,
                              mengeProStuck: mengeProStuck
                            }
                          }
                        });
                        
                        if (istUnbegrenzt) {
                          console.log(`    💧 Unbegrenzter Zusatzinhaltsstoff ${zusatzstoffRecord.bezeichnung}: -${benoetigt}g verbraucht (unbegrenzt verfügbar)`);
                        } else {
                          console.log(`    ✅ Zusatzinhaltsstoff ${zusatzstoffRecord.bezeichnung}: -${benoetigt}g (${zusatzstoffBestand.menge}g verbleibt)`);
                        }
                      } else {
                        rohstoffFehler.push(`Nicht genug ${zusatzstoff.inhaltsstoffName}: benötigt ${benoetigt}g, verfügbar ${zusatzstoffBestand.menge}g`);
                      }
                    } else {
                      rohstoffFehler.push(`Kein Bestandseintrag für Zusatzinhaltsstoff "${zusatzstoff.inhaltsstoffName}" gefunden`);
                    }
                  } else {
                    rohstoffFehler.push(`Zusatzinhaltsstoff "${zusatzstoff.inhaltsstoffName}" nicht gefunden`);
                  }
                }
              }
              
              // Alle Rohstoff-Bewegungen protokollieren
              for (const bewegungData of rohstoffBewegungen) {
                try {
                  await Bewegung.erstelle({
                    ...bewegungData,
                    userId: req.user.id || req.user.userId || req.user._id
                  });
                } catch (err) {
                  console.error('Fehler beim Protokollieren der Rohstoff-Bewegung:', err);
                }
              }
              
              console.log(`🎯 Rohstoff-Subtraktion abgeschlossen: ${rohstoffBewegungen.length} Bewegungen protokolliert`);
              
              if (rohstoffFehler.length > 0) {
                console.warn('⚠️ Rohstoff-Warnungen:', rohstoffFehler);
              }
              
            } catch (rohstoffError) {
              console.error('❌ Fehler bei automatischer Rohstoff-Subtraktion:', rohstoffError);
            }
          }
          
          // 🎨 AUTOMATISCHE GIESSWERKSTOFF-SUBTRAKTION bei Werkstück-Inventur
          if (buchungsAnzahl > 0 && artikel.kategorie === 'werkstuck') {
            console.log(`🎨 Automatische Gießwerkstoff-Subtraktion für ${buchungsAnzahl}x ${artikel.name}`);
            
            const giesswerkstoffBewegungen = [];
            const giesswerkstoffFehler = [];
            
            try {
              // Gießwerkstoff finden und Konfiguration holen
              if (!artikel.giesswerkstoff) {
                console.log(`  ⚠️ Kein Gießwerkstoff für Werkstück ${artikel.name} zugewiesen`);
                break;
              }
              
              const giesswerkstoff = await Giesswerkstoff.findById(artikel.giesswerkstoff);
              if (!giesswerkstoff) {
                console.log(`  ❌ Gießwerkstoff nicht gefunden für Werkstück ${artikel.name}`);
                break;
              }
              
              // Gießform laden für Füllvolumen
              if (!artikel.giessform) {
                console.log(`  ⚠️ Keine Gießform für Werkstück ${artikel.name} zugewiesen`);
                break;
              }
              
              const giessform = await Giessform.findById(artikel.giessform);
              if (!giessform) {
                console.log(`  ❌ Gießform nicht gefunden für Werkstück ${artikel.name}`);
                break;
              }
              
              // Mischkonfiguration vom Gießwerkstoff holen
              const config = giesswerkstoff.mischkonfiguration || {};
              const berechnungsFaktor = config.berechnungsFaktor || 1.5;
              const schwundProzent = config.schwundProzent || 5;
              
              // Basis-Menge: Füllvolumen der Gießform
              const fuellvolumenMl = giessform.volumenMl;
              
              // Benötigte Gießwerkstoff-Menge berechnen
              // Beispiel: 100ml Füllvolumen * 1.5 Faktor = 150g Gießwerkstoff
              const grundMenge = fuellvolumenMl * berechnungsFaktor;
              
              // Schwund hinzufügen
              const mitSchwund = grundMenge * (1 + schwundProzent / 100);
              
              // Gesamtmenge für alle hergestellten Werkstücke
              const gesamtMenge = mitSchwund * buchungsAnzahl;
              
              console.log(`  📊 Berechnung: ${fuellvolumenMl}ml Füllvolumen * ${berechnungsFaktor} * (1 + ${schwundProzent}%) * ${buchungsAnzahl} = ${gesamtMenge}g`);
              
              // Gießwerkstoff-Bestand prüfen und subtrahieren
              // Prüfung auf unbegrenzte Gießwerkstoffe
              const istUnbegrenzterGiesswerkstoff = giesswerkstoff.unbegrenzterVorrat === true ||
                                                   giesswerkstoff.bezeichnung?.toLowerCase().includes('wasser') ||
                                                   giesswerkstoff.bezeichnung?.toLowerCase().includes('leitungswasser');
              
              if (istUnbegrenzterGiesswerkstoff || giesswerkstoff.aktuellerBestand >= gesamtMenge) {
                const vorherBestand = giesswerkstoff.aktuellerBestand;
                
                // Nur bei begrenzten Gießwerkstoffen den Bestand reduzieren
                if (!istUnbegrenzterGiesswerkstoff) {
                  giesswerkstoff.aktuellerBestand -= gesamtMenge;
                }
                
                await giesswerkstoff.save();
                
                giesswerkstoffBewegungen.push({
                  typ: 'werkstuck_produktion',
                  artikel: {
                    typ: 'giesswerkstoff',
                    artikelId: giesswerkstoff._id,
                    name: giesswerkstoff.bezeichnung
                  },
                  menge: -gesamtMenge,
                  einheit: giesswerkstoff.einheit || 'g',
                  bestandVorher: vorherBestand,
                  bestandNachher: giesswerkstoff.aktuellerBestand,
                  grund: `Automatische Gießwerkstoff-Subtraktion: ${buchungsAnzahl}x ${artikel.name} (Faktor: ${berechnungsFaktor}, Schwund: ${schwundProzent}%)`,
                  notizen: `Werkstück-Produktion - ${fuellvolumenMl}ml Füllvolumen pro Form (${giessform.name})`,
                  giesswerkstoffDetails: {
                    giesswerkstoffId: giesswerkstoff._id,
                    giesswerkstoffName: giesswerkstoff.bezeichnung,
                    giessformId: giessform._id,
                    giessformName: giessform.name,
                    fuellvolumenMl: fuellvolumenMl,
                    berechnungsFaktor: berechnungsFaktor,
                    schwundProzent: schwundProzent
                  },
                  referenz: {
                    typ: 'werkstuck-inventur',
                    produktId: artikel._id,
                    produktName: artikel.name,
                    anzahl: buchungsAnzahl
                  }
                });
                
                if (istUnbegrenzterGiesswerkstoff) {
                  console.log(`  💧 Unbegrenzter Gießwerkstoff ${giesswerkstoff.bezeichnung}: -${gesamtMenge}${giesswerkstoff.einheit || 'g'} verbraucht (unbegrenzt verfügbar)`);
                } else {
                  console.log(`  ✅ Gießwerkstoff ${giesswerkstoff.bezeichnung}: -${gesamtMenge}${giesswerkstoff.einheit || 'g'}`);
                }
              } else {
                giesswerkstoffFehler.push(`Nicht genügend ${giesswerkstoff.bezeichnung}: benötigt ${gesamtMenge}g, verfügbar ${giesswerkstoff.aktuellerBestand}g`);
              }
              
              // Zusatzmaterial (z.B. Wasser, Härter) berechnen und subtrahieren falls konfiguriert
              const zusaetzlichesMaterial = config.zusaetzlichesMaterial || [];
              for (const material of zusaetzlichesMaterial) {
                if (material.faktor > 0) {
                  // Zusatzmaterial-Menge: Füllvolumen × Faktor × (1 + Schwund%)
                  const zusatzGrundMenge = fuellvolumenMl * material.faktor;
                  const zusatzMitSchwund = zusatzGrundMenge * (1 + schwundProzent / 100);
                  const zusatzGesamtMenge = zusatzMitSchwund * buchungsAnzahl;
                  
                  console.log(`  💧 Zusatzmaterial ${material.bezeichnung}: ${fuellvolumenMl}ml × ${material.faktor} × (1 + ${schwundProzent}%) × ${buchungsAnzahl} = ${zusatzGesamtMenge}${material.einheit || 'g'} (wird derzeit nur protokolliert)`);
                }
              }
              
              // Alle Gießwerkstoff-Bewegungen protokollieren
              for (const bewegungData of giesswerkstoffBewegungen) {
                try {
                  await Bewegung.erstelle({
                    ...bewegungData,
                    userId: req.user.id || req.user.userId || req.user._id
                  });
                } catch (err) {
                  console.error('Fehler beim Protokollieren der Gießwerkstoff-Bewegung:', err);
                }
              }
              
              console.log(`🎯 Gießwerkstoff-Subtraktion abgeschlossen: ${giesswerkstoffBewegungen.length} Bewegungen protokolliert`);
              
              if (giesswerkstoffFehler.length > 0) {
                console.warn('⚠️ Gießwerkstoff-Warnungen:', giesswerkstoffFehler);
              }
              
            } catch (giesswerkstoffError) {
              console.error('❌ Fehler bei automatischer Gießwerkstoff-Subtraktion:', giesswerkstoffError);
            }
          }
        }
        break;
        
      case 'rohseife':
        artikel = await Rohseife.findById(artikelId);
        modelName = 'Rohseife';
        if (artikel) {
          vorherBestand = artikel.aktuellVorrat || 0;
          artikel.aktuellVorrat = parseFloat(neuerBestand);
          await artikel.save();
        }
        break;
        
      case 'duftoele':
        artikel = await Duftoil.findById(artikelId);
        modelName = 'Duftoil';
        if (artikel) {
          vorherBestand = artikel.aktuellVorrat || 0;
          artikel.aktuellVorrat = parseFloat(neuerBestand);
          await artikel.save();
        }
        break;
        
      case 'verpackungen':
        artikel = await Verpackung.findById(artikelId);
        modelName = 'Verpackung';
        if (artikel) {
          vorherBestand = artikel.aktuellVorrat || 0;
          artikel.aktuellVorrat = parseFloat(neuerBestand);
          await artikel.save();
        }
        break;
        
      case 'zusatzinhaltsstoff':
        artikel = await ZusatzInhaltsstoff.findById(artikelId);
        modelName = 'ZusatzInhaltsstoff';
        if (artikel) {
          // Zusatzinhaltsstoffe verwenden die Bestand-Collection
          let bestand = await Bestand.findOne({ 
            typ: 'zusatzinhaltsstoff', 
            artikelId: artikelId 
          });
          
          if (!bestand) {
            // Erstelle neuen Bestand-Eintrag falls nicht vorhanden
            bestand = new Bestand({
              typ: 'zusatzinhaltsstoff',
              artikelId: artikelId,
              artikelModell: 'ZusatzInhaltsstoff',
              menge: 0,
              einheit: 'g',
              mindestbestand: artikel.mindestbestand || 0
            });
          }
          
          vorherBestand = bestand.menge || 0;
          const neueMenge = parseFloat(neuerBestand);
          
          bestand.menge = neueMenge;
          bestand.letzteAenderung = {
            datum: new Date(),
            grund: 'inventur',
            menge: neueMenge - vorherBestand,
            vorher: vorherBestand,
            nachher: neueMenge
          };
          if (notizen) {
            bestand.notizen = notizen;
          }
          await bestand.save();
        }
        break;
        
      case 'giessform':
        artikel = await Giessform.findById(artikelId);
        modelName = 'Giessform';
        if (artikel) {
          // Gießformen haben normalerweise Anzahl statt Bestand
          vorherBestand = artikel.anzahl || 1;
          artikel.anzahl = parseFloat(neuerBestand);
          artikel.letzteInventur = new Date();
          if (notizen) {
            artikel.notizen = notizen;
          }
          await artikel.save();
        }
        break;
        
      case 'giesswerkstoff':
        artikel = await Giesswerkstoff.findById(artikelId);
        modelName = 'Giesswerkstoff';
        if (artikel) {
          vorherBestand = artikel.aktuellerBestand || 0;
          artikel.aktuellerBestand = parseFloat(neuerBestand);
          artikel.letzteInventur = new Date();
          if (notizen) {
            artikel.notizen = notizen;
          }
          await artikel.save();
        }
        break;
        
      case 'giesszusatzstoff':
        artikel = await Giesszusatzstoff.findById(artikelId);
        modelName = 'Giesszusatzstoff';
        if (artikel) {
          vorherBestand = artikel.aktuellerBestand || 0;
          artikel.aktuellerBestand = parseFloat(neuerBestand);
          artikel.updatedAt = new Date();
          if (notizen) {
            artikel.notizen = notizen;
          }
          await artikel.save();
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unbekannter Typ: ' + typ
        });
    }
    
    if (!artikel) {
      return res.status(404).json({
        success: false,
        message: `${modelName} mit ID ${artikelId} nicht gefunden`
      });
    }
    
    // Erstelle Bewegungseintrag
    try {
      // Korrekte Typ-Zuordnung für Bewegungs-Schema
      let bewegungsTyp = typ;
      if (typ === 'verpackungen') bewegungsTyp = 'verpackung';
      if (typ === 'fertigprodukt') bewegungsTyp = 'produkt';
      if (typ === 'zusatzinhaltsstoff') bewegungsTyp = 'zusatzinhaltsstoff';
      if (typ === 'giessform') bewegungsTyp = 'giessform';
      if (typ === 'giesswerkstoff') bewegungsTyp = 'giesswerkstoff';
      
      const bewegung = new Bewegung({
        typ: 'inventur',
        artikel: {
          typ: bewegungsTyp,
          artikelId: artikelId,
          name: artikel.bezeichnung || artikel.name
        },
        menge: parseFloat(neuerBestand) - vorherBestand,
        einheit: bewegungsTyp === 'produkt' ? 'stück' : (bewegungsTyp === 'rohseife' ? 'g' : (bewegungsTyp === 'duftoil' ? 'ml' : 'stück')),
        bestandVorher: vorherBestand,
        bestandNachher: parseFloat(neuerBestand),
        grund: notizen || 'Manuelle Inventur'
      });
      
      await bewegung.save();
      console.log('✅ Bewegung gespeichert:', bewegung._id);
      console.log('🔍 Debug - Bewegung Struktur:', {
        typ: bewegung.typ,
        artikelId: bewegung.artikelId,
        artikel: bewegung.artikel
      });
    } catch (bewegungError) {
      console.warn('⚠️ Bewegung konnte nicht gespeichert werden:', bewegungError.message);
      // Inventur trotzdem als erfolgreich behandeln
    }
    
    res.json({
      success: true,
      message: 'Inventur erfolgreich durchgeführt',
      data: {
        artikel: artikel.bezeichnung || artikel.name,
        vorherBestand,
        nachherBestand: parseFloat(neuerBestand),
        aenderung: parseFloat(neuerBestand) - vorherBestand
      }
    });
    
  } catch (error) {
    console.error('Fehler bei Inventur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Inventur',
      error: error.message
    });
  }
});

// GET /api/lager/fertigprodukt-rohstoffe/:produktId - Zeige benötigte Rohstoffe für Fertigprodukt
router.get('/fertigprodukt-rohstoffe/:produktId', authenticateToken, async (req, res) => {
  try {
    const produkt = await Portfolio.findById(req.params.produktId);
    
    if (!produkt) {
      return res.status(404).json({
        success: false,
        message: 'Fertigprodukt nicht gefunden'
      });
    }
    
    const rohstoffe = [];
    const verfuegbarkeit = { alleVerfuegbar: true, warnungen: [] };
    
    // 1. Rohseife
    if (produkt.seife && produkt.gramm) {
      const rohseifeDoc = await Rohseife.findOne({ bezeichnung: produkt.seife });
      if (rohseifeDoc) {
        const proStueck = produkt.gramm;
        const verfuegbar = rohseifeDoc.aktuellVorrat;
        const maxProduktion = Math.floor(verfuegbar / proStueck);
        
        rohstoffe.push({
          typ: 'rohseife',
          name: rohseifeDoc.bezeichnung,
          proStueck: proStueck,
          einheit: 'g',
          verfuegbar: verfuegbar,
          maxProduktion: maxProduktion,
          ausreichend: verfuegbar >= proStueck
        });
        
        if (verfuegbar < proStueck) {
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push(`Rohseife ${rohseifeDoc.bezeichnung}: nur ${verfuegbar}g verfügbar, benötigt ${proStueck}g`);
        }
      } else {
        verfuegbarkeit.alleVerfuegbar = false;
        verfuegbarkeit.warnungen.push(`Rohseife "${produkt.seife}" nicht in Datenbank gefunden`);
      }
    }
    
    // 2. Duftöl
    if (produkt.aroma && produkt.aroma !== 'Keine' && produkt.aroma !== '-' && produkt.aroma !== 'Neutral') {
      const duftoel = await Duftoil.findOne({ bezeichnung: produkt.aroma });
      if (duftoel) {
        const proStueck = 1; // 1ml pro Seife
        const verfuegbar = duftoel.aktuellVorrat;
        const maxProduktion = Math.floor(verfuegbar / proStueck);
        
        rohstoffe.push({
          typ: 'duftoil',
          name: duftoel.bezeichnung,
          proStueck: proStueck,
          einheit: 'ml',
          verfuegbar: verfuegbar,
          maxProduktion: maxProduktion,
          ausreichend: verfuegbar >= proStueck
        });
        
        if (verfuegbar < proStueck) {
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push(`Duftöl ${duftoel.bezeichnung}: nur ${verfuegbar}ml verfügbar, benötigt ${proStueck}ml`);
        }
      } else {
        verfuegbarkeit.alleVerfuegbar = false;
        verfuegbarkeit.warnungen.push(`Duftöl "${produkt.aroma}" nicht in Datenbank gefunden`);
      }
    }
    
    // 3. Verpackung
    if (produkt.verpackung) {
      const verpackung = await Verpackung.findOne({ bezeichnung: produkt.verpackung });
      if (verpackung) {
        const proStueck = 1; // 1 Verpackung pro Seife
        const verfuegbar = verpackung.aktuellVorrat;
        const maxProduktion = Math.floor(verfuegbar / proStueck);
        
        rohstoffe.push({
          typ: 'verpackung',
          name: verpackung.bezeichnung,
          proStueck: proStueck,
          einheit: 'stück',
          verfuegbar: verfuegbar,
          maxProduktion: maxProduktion,
          ausreichend: verfuegbar >= proStueck
        });
        
        if (verfuegbar < proStueck) {
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push(`Verpackung ${verpackung.bezeichnung}: nur ${verfuegbar} Stück verfügbar, benötigt ${proStueck} Stück`);
        }
      } else {
        verfuegbarkeit.alleVerfuegbar = false;
        verfuegbarkeit.warnungen.push(`Verpackung "${produkt.verpackung}" nicht in Datenbank gefunden`);
      }
    }
    
    // 4. Zusatzinhaltsstoffe
    if (produkt.zusatzinhaltsstoffe && produkt.zusatzinhaltsstoffe.length > 0) {
      console.log(`🧪 Prüfe Zusatzinhaltsstoffe für ${produkt.name}: ${produkt.zusatzinhaltsstoffe.length} Stoffe`);
      
      for (const zusatzstoff of produkt.zusatzinhaltsstoffe) {
        const mengeProStueck = zusatzstoff.menge || 0; // Menge pro Stück in g
        
        console.log(`   - ${zusatzstoff.inhaltsstoffName}: ${mengeProStueck}g pro Stück`);
        
        // Zusatzinhaltsstoff in der separaten Bestand-Collection finden
        const zusatzstoffRecord = await ZusatzInhaltsstoff.findOne({ 
          bezeichnung: zusatzstoff.inhaltsstoffName 
        });
        
        if (zusatzstoffRecord) {
          const zusatzstoffBestand = await Bestand.findOne({
            artikelId: zusatzstoffRecord._id,
            typ: 'zusatzinhaltsstoff'
          });
          
          if (zusatzstoffBestand) {
            const proStueck = mengeProStueck;
            const verfuegbar = zusatzstoffBestand.menge;
            const maxProduktion = proStueck > 0 ? Math.floor(verfuegbar / proStueck) : 999999;
            
            rohstoffe.push({
              typ: 'zusatzinhaltsstoff',
              name: zusatzstoffRecord.bezeichnung,
              proStueck: proStueck,
              einheit: 'g',
              verfuegbar: verfuegbar,
              maxProduktion: maxProduktion,
              ausreichend: verfuegbar >= proStueck
            });
            
            console.log(`     ✅ Zusatzinhaltsstoff verfügbar: ${verfuegbar}g, benötigt: ${proStueck}g pro Stück, max Produktion: ${maxProduktion}`);
            
            if (verfuegbar < proStueck) {
              verfuegbarkeit.alleVerfuegbar = false;
              verfuegbarkeit.warnungen.push(`Zusatzinhaltsstoff ${zusatzstoffRecord.bezeichnung}: nur ${verfuegbar}g verfügbar, benötigt ${proStueck}g`);
            }
          } else {
            console.warn(`     ⚠️ Kein Bestandseintrag für Zusatzinhaltsstoff: ${zusatzstoff.inhaltsstoffName}`);
            verfuegbarkeit.alleVerfuegbar = false;
            verfuegbarkeit.warnungen.push(`Kein Bestandseintrag für Zusatzinhaltsstoff "${zusatzstoff.inhaltsstoffName}" gefunden`);
          }
        } else {
          console.warn(`     ⚠️ Zusatzinhaltsstoff nicht in Datenbank: ${zusatzstoff.inhaltsstoffName}`);
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push(`Zusatzinhaltsstoff "${zusatzstoff.inhaltsstoffName}" nicht in Datenbank gefunden`);
        }
      }
    }
    
    // Maximale Produktionsmenge berechnen
    const maxProduktionGesamt = rohstoffe.length > 0 ? Math.min(...rohstoffe.map(r => r.maxProduktion)) : 0;
    
    res.json({
      success: true,
      data: {
        produkt: {
          id: produkt._id,
          name: produkt.name,
          seife: produkt.seife,
          gramm: produkt.gramm,
          aroma: produkt.aroma,
          verpackung: produkt.verpackung,
          zusatzinhaltsstoffe: produkt.zusatzinhaltsstoffe || []
        },
        rohstoffe: rohstoffe,
        verfuegbarkeit: verfuegbarkeit,
        maxProduktionGesamt: maxProduktionGesamt,
        automatischeSubtraktion: true,
        hinweis: "Bei Fertigprodukt-Inventur werden die benötigten Rohstoffe automatisch subtrahiert"
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Fertigprodukt-Rohstoffe:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Fertigprodukt-Rohstoffe',
      error: error.message
    });
  }
});

// GET /api/lager/werkstuck-giesswerkstoff/:produktId - Zeige benötigte Gießwerkstoffe für Werkstück
router.get('/werkstuck-giesswerkstoff/:produktId', authenticateToken, async (req, res) => {
  try {
    const produkt = await Portfolio.findById(req.params.produktId);
    
    if (!produkt) {
      return res.status(404).json({
        success: false,
        message: 'Werkstück nicht gefunden'
      });
    }
    
    if (produkt.kategorie !== 'werkstuck') {
      return res.status(400).json({
        success: false,
        message: 'Produkt ist kein Werkstück'
      });
    }
    
    const giesswerkstoff = [];
    const verfuegbarkeit = { alleVerfuegbar: true, warnungen: [] };
    
    // Variablen für Berechnungen
    let fuellvolumenMl = 0;
    let berechnungsFaktor = 1.5;
    let schwundProzent = 5;
    
    // Gießwerkstoff laden
    if (produkt.giesswerkstoff && produkt.giessform) {
      const giesswerkstoffDoc = await Giesswerkstoff.findById(produkt.giesswerkstoff);
      const giessformDoc = await Giessform.findById(produkt.giessform);
      
      if (giesswerkstoffDoc && giessformDoc) {
        // Berechnung wie in der automatischen Subtraktion
        const config = giesswerkstoffDoc.mischkonfiguration || {};
        berechnungsFaktor = config.berechnungsFaktor || 1.5;
        schwundProzent = config.schwundProzent || 5;
        fuellvolumenMl = giessformDoc.volumenMl;
        
        // Benötigte Menge pro Stück berechnen
        const grundMenge = fuellvolumenMl * berechnungsFaktor;
        const mitSchwund = grundMenge * (1 + schwundProzent / 100);
        
        const verfuegbar = giesswerkstoffDoc.aktuellerBestand;
        const ausreichend = verfuegbar >= mitSchwund;
        
        if (!ausreichend) {
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push({
            material: giesswerkstoffDoc.bezeichnung,
            benoetigt: mitSchwund,
            verfuegbar: verfuegbar,
            fehlend: mitSchwund - verfuegbar
          });
        }
        
        giesswerkstoff.push({
          name: giesswerkstoffDoc.bezeichnung,
          typ: 'giesswerkstoff',
          proStueck: mitSchwund,
          verfuegbar: verfuegbar,
          einheit: giesswerkstoffDoc.einheit || 'g',
          berechnungsDetails: {
            fuellvolumenMl: fuellvolumenMl,
            berechnungsFaktor: berechnungsFaktor,
            schwundProzent: schwundProzent,
            giessform: giessformDoc.name
          }
        });
        
        // Zusatzmaterialien hinzufügen falls konfiguriert
        const zusaetzlichesMaterial = config.zusaetzlichesMaterial || [];
        for (const material of zusaetzlichesMaterial) {
          if (material.faktor > 0) {
            const zusatzGrundMenge = fuellvolumenMl * material.faktor;
            const zusatzMitSchwund = zusatzGrundMenge * (1 + schwundProzent / 100);
            
            giesswerkstoff.push({
              name: material.bezeichnung,
              typ: 'zusatzmaterial',
              proStueck: zusatzMitSchwund,
              verfuegbar: 0, // Zusatzmaterialien werden derzeit nur protokolliert
              einheit: material.einheit || 'g',
              berechnungsDetails: {
                fuellvolumenMl: fuellvolumenMl,
                faktor: material.faktor,
                schwundProzent: schwundProzent
              }
            });
          }
        }
      } else {
        verfuegbarkeit.alleVerfuegbar = false;
        verfuegbarkeit.warnungen.push({
          material: 'Gießwerkstoff oder Gießform',
          error: 'Gießwerkstoff oder Gießform nicht gefunden'
        });
      }
    } else {
      verfuegbarkeit.alleVerfuegbar = false;
      verfuegbarkeit.warnungen.push({
        material: 'Konfiguration',
        error: 'Gießwerkstoff oder Gießform nicht zugewiesen'
      });
    }
    
    // 💧 Gießzusatzstoffe prüfen
    if (produkt.giesszusatzstoffe && produkt.giesszusatzstoffe.length > 0) {
      console.log(`💧 Prüfe Gießzusatzstoffe für Werkstück ${produkt.name}: ${produkt.giesszusatzstoffe.length} Zusatzstoffe`);
      
      for (const zusatzKonfig of produkt.giesszusatzstoffe) {
        const zusatzstoff = await Giesszusatzstoff.findById(zusatzKonfig.zusatzstoffId);
        
        if (zusatzstoff) {
          // Berechne benötigte Menge basierend auf Mischverhältnis
          let benoetigtesMengeProStueck = 0;
          
          if (zusatzKonfig.einheit === 'prozent') {
            // Prozent vom Gießwerkstoff-Volumen
            const giesswerkstoffMenge = fuellvolumenMl * berechnungsFaktor * (1 + schwundProzent / 100);
            benoetigtesMengeProStueck = (giesswerkstoffMenge * zusatzKonfig.mischverhaeltnis) / 100;
          } else {
            // Absolute Menge
            benoetigtesMengeProStueck = zusatzKonfig.mischverhaeltnis;
          }
          
          const verfuegbar = zusatzstoff.aktuellVorrat || 0;
          const istUnbegrenzt = zusatzstoff.unbegrenzterVorrat === true;
          const ausreichend = istUnbegrenzt || verfuegbar >= benoetigtesMengeProStueck;
          
          if (!istUnbegrenzt && !ausreichend) {
            verfuegbarkeit.alleVerfuegbar = false;
            verfuegbarkeit.warnungen.push({
              material: zusatzstoff.bezeichnung,
              benoetigt: benoetigtesMengeProStueck,
              verfuegbar: verfuegbar,
              fehlend: benoetigtesMengeProStueck - verfuegbar
            });
          }
          
          giesswerkstoff.push({
            name: zusatzstoff.bezeichnung,
            typ: 'giesszusatzstoff',
            proStueck: benoetigtesMengeProStueck,
            verfuegbar: verfuegbar,
            einheit: zusatzstoff.einheit || 'g',
            unbegrenzterVorrat: istUnbegrenzt,
            berechnungsDetails: {
              mischverhaeltnis: zusatzKonfig.mischverhaeltnis,
              einheit: zusatzKonfig.einheit,
              hinweise: zusatzKonfig.hinweise || ''
            }
          });
          
          console.log(`   💧 ${zusatzstoff.bezeichnung}: ${benoetigtesMengeProStueck}${zusatzstoff.einheit} pro Stück, unbegrenzt: ${istUnbegrenzt}`);
        } else {
          console.warn(`   ⚠️ Gießzusatzstoff nicht gefunden: ${zusatzKonfig.zusatzstoffId}`);
          verfuegbarkeit.alleVerfuegbar = false;
          verfuegbarkeit.warnungen.push({
            material: 'Unbekannter Gießzusatzstoff',
            error: 'Gießzusatzstoff nicht in Datenbank gefunden'
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        produkt: {
          id: produkt._id,
          name: produkt.name,
          kategorie: produkt.kategorie,
          giesswerkstoff: produkt.giesswerkstoff,
          giessform: produkt.giessform
        },
        giesswerkstoff: giesswerkstoff,
        verfuegbarkeit: verfuegbarkeit,
        automatischeSubtraktion: true,
        hinweis: "Bei Werkstück-Inventur werden die benötigten Gießwerkstoffe automatisch subtrahiert"
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Gießwerkstoff-Info:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Gießwerkstoff-Informationen'
    });
  }
});

// POST /api/lager/produktion - Produktion verbuchen
router.post('/produktion', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { produktId, anzahl, notizen } = req.body;
    
    if (!produktId || !anzahl || anzahl <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ProduktId und Anzahl (> 0) sind erforderlich'
      });
    }
    
    // Hole Produkt mit Rezept
    const produkt = await Portfolio.findById(produktId);
    
    if (!produkt) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }
    
    const bewegungen = [];
    const fehler = [];
    
    // 1. ROHSEIFE - Finde nach bezeichnung und ziehe aktuellVorrat ab
    if (produkt.seife && produkt.gramm) {
      const rohseifeDoc = await Rohseife.findOne({ bezeichnung: produkt.seife });
      
      if (!rohseifeDoc) {
        fehler.push(`Rohseife "${produkt.seife}" nicht in Datenbank gefunden`);
      } else {
        const benoetigt = produkt.gramm * anzahl; // in Gramm
        
        if (rohseifeDoc.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.seife}" auf Lager. Benötigt: ${benoetigt}g, Verfügbar: ${rohseifeDoc.aktuellVorrat}g`);
        } else {
          const vorher = rohseifeDoc.aktuellVorrat;
          rohseifeDoc.aktuellVorrat -= benoetigt;
          await rohseifeDoc.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'rohseife',
              artikelId: rohseifeDoc._id,
              name: rohseifeDoc.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'g',
            bestandVorher: vorher,
            bestandNachher: rohseifeDoc.aktuellVorrat,
            grund: `Produktion: Verbrauch für ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // 2. DUFTÖL - Finde nach bezeichnung (aroma)
    if (produkt.aroma && produkt.aroma !== 'Keine' && produkt.aroma !== '-') {
      const duftoel = await Duftoil.findOne({ bezeichnung: produkt.aroma });
      
      if (!duftoel) {
        fehler.push(`Duftöl "${produkt.aroma}" nicht in Datenbank gefunden`);
      } else {
        // Standard: 10 Tropfen pro Produkt (anpassbar)
        const tropfenProProdukt = 10;
        const benoetigt = anzahl * tropfenProProdukt;
        
        if (duftoel.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.aroma}" auf Lager. Benötigt: ${benoetigt} Tropfen, Verfügbar: ${duftoel.aktuellVorrat} Tropfen`);
        } else {
          const vorher = duftoel.aktuellVorrat;
          duftoel.aktuellVorrat -= benoetigt;
          await duftoel.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'duftoil',
              artikelId: duftoel._id,
              name: duftoel.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'tropfen',
            bestandVorher: vorher,
            bestandNachher: duftoel.aktuellVorrat,
            grund: `Produktion: Verbrauch für ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // 3. VERPACKUNG - Finde nach bezeichnung
    if (produkt.verpackung) {
      const verpackung = await Verpackung.findOne({ bezeichnung: produkt.verpackung });
      
      if (!verpackung) {
        fehler.push(`Verpackung "${produkt.verpackung}" nicht in Datenbank gefunden`);
      } else {
        const benoetigt = anzahl;
        
        if (verpackung.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.verpackung}" auf Lager. Benötigt: ${benoetigt} Stück, Verfügbar: ${verpackung.aktuellVorrat} Stück`);
        } else {
          const vorher = verpackung.aktuellVorrat;
          verpackung.aktuellVorrat -= benoetigt;
          await verpackung.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'verpackung',
              artikelId: verpackung._id,
              name: verpackung.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'stück',
            bestandVorher: vorher,
            bestandNachher: verpackung.aktuellVorrat,
            grund: `Produktion: Verbrauch für ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // Falls Fehler aufgetreten sind, keine Änderungen speichern
    if (fehler.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Produktion konnte nicht durchgeführt werden',
        fehler
      });
    }
    
    // Erstelle alle Bewegungs-Logs für Rohstoffe
    for (const bewegungData of bewegungen) {
      try {
        await Bewegung.erstelle(bewegungData);
      } catch (err) {
        console.error('Fehler beim Erstellen der Bewegung:', err);
        // Fahre fort auch wenn Bewegung-Log fehlschlägt
      }
    }
    
    // Buche Fertigprodukt ein (Bestand-Collection)
    const produktBestand = await Bestand.findeOderErstelle('produkt', produktId, 'Stück');
    const vorherProdukt = produktBestand.menge;
    await produktBestand.erhoeheBestand(anzahl, 'produktion', notizen);
    
    // Erstelle Bewegungs-Log für Fertigprodukt
    try {
      await Bewegung.erstelle({
        typ: 'produktion',
        bestandId: produktBestand._id,
        artikel: {
          typ: 'produkt',
          artikelId: produktId,
          name: produkt.name
        },
        menge: anzahl,
        einheit: 'Stück',
        bestandVorher: vorherProdukt,
        bestandNachher: produktBestand.menge,
        grund: 'produktion',
        notizen,
        userId: req.user.id || req.user.userId || req.user._id,
        referenz: {
          typ: 'produktion',
          produktId: produkt._id,
          produktName: produkt.name,
          anzahl
        }
      });
    } catch (err) {
      console.error('Fehler beim Erstellen der Produkt-Bewegung:', err);
      // Fahre fort auch wenn Bewegung-Log fehlschlägt
    }
    
    res.json({
      success: true,
      message: `${anzahl}x ${produkt.name} erfolgreich produziert`,
      data: {
        produkt: {
          _id: produkt._id,
          name: produkt.name,
          produziert: anzahl,
          neuerBestand: produktBestand.menge
        },
        verwendeteRohstoffe: bewegungen.map(b => ({
          name: b.artikel.name,
          typ: b.artikel.typ,
          menge: Math.abs(b.menge),
          einheit: b.einheit,
          neuerBestand: b.bestandNachher
        }))
      }
    });
  } catch (error) {
    console.error('Fehler bei Produktion:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Produktion',
      error: error.message
    });
  }
});

// POST /api/lager/korrektur - Bestand manuell korrigieren
router.post('/korrektur', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Korrektur-Request empfangen:', req.body);
    
    const { typ, artikelId, portfolioId, aenderung, notizen } = req.body;
    
    if (!typ || !artikelId || aenderung === undefined) {
      console.log('❌ Fehlende Parameter:', { typ, artikelId, aenderung });
      return res.status(400).json({
        success: false,
        message: 'Typ, ArtikelId und Änderung sind erforderlich'
      });
    }
    
    console.log('✅ Parameter validiert:', { typ, artikelId, aenderung, portfolioId });
    
    let artikel;
    let vorher;
    let nachher;
    let einheit;
    
    // Je nach Typ den aktuellVorrat im entsprechenden Model korrigieren
    switch (typ) {
      case 'rohseife':
        artikel = await Rohseife.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Rohseife nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'g';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'rohseife',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'g',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'duftoil':
        artikel = await Duftoil.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Duftöl nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'tropfen';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'duftoil',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'tropfen',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'verpackung':
        artikel = await Verpackung.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Verpackung nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'stück';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'verpackung',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'stück',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'produkt':
        console.log('🎯 Produkt-Korrektur - artikelId:', artikelId, 'portfolioId:', portfolioId);
        
        // Für Produkte: artikelId ist Bestand-ID, portfolioId ist Portfolio-ID (optional)
        let bestand = await Bestand.findById(artikelId).populate('artikelId');
        
        console.log('📦 Bestand gefunden:', !!bestand, bestand?._id);
        
        if (!bestand && portfolioId) {
          console.log('⚠️ Kein Bestand gefunden, erstelle neu mit portfolioId:', portfolioId);
          
          // Kein Bestand gefunden, aber portfolioId vorhanden - erstelle Bestand
          const portfolioProdukt = await Portfolio.findById(portfolioId);
          if (!portfolioProdukt) {
            console.log('❌ Portfolio-Produkt nicht gefunden');
            return res.status(404).json({
              success: false,
              message: 'Produkt nicht gefunden'
            });
          }
          
          // Erstelle neuen Bestand-Eintrag mit findeOderErstelle
          bestand = await Bestand.findeOderErstelle('produkt', portfolioId, 'stück');
          console.log(`✨ Neuer Bestand-Eintrag erstellt für ${portfolioProdukt.name}`);
        } else if (!bestand) {
          console.log('❌ Bestand nicht gefunden und keine portfolioId');
          return res.status(404).json({
            success: false,
            message: 'Bestand-Eintrag nicht gefunden'
          });
        }
        
        vorher = bestand.menge;
        nachher = Math.max(0, vorher + aenderung);
        bestand.menge = nachher;
        bestand.letzteAenderung = {
          datum: new Date(),
          grund: 'korrektur',
          menge: aenderung,
          vorher,
          nachher
        };
        if (notizen) {
          bestand.notizen = notizen;
        }
        await bestand.save();
        einheit = bestand.einheit;
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: bestand._id,
          artikel: {
            typ: 'produkt',
            artikelId: bestand.artikelId._id,
            name: bestand.artikelId?.name
          },
          menge: aenderung,
          einheit: bestand.einheit,
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Typ'
        });
    }
    
    res.json({
      success: true,
      message: 'Bestand erfolgreich korrigiert',
      data: {
        vorher,
        nachher,
        aenderung,
        einheit
      }
    });
  } catch (error) {
    console.error('Fehler bei Korrektur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Korrektur',
      error: error.message
    });
  }
});

// GET /api/lager/historie/:bestandId - Bewegungshistorie für einen Artikel
router.get('/historie/:bestandId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bestandId } = req.params;
    
    const bewegungen = await Bewegung.find({ bestandId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: bewegungen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Historie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Historie',
      error: error.message
    });
  }
});

// GET /api/lager/bewegungen/:artikelId - Bewegungshistorie für einen Artikel (Alternative Route)
router.get('/bewegungen/:artikelId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { artikelId } = req.params;
    
    console.log('🔍 Suche Bewegungen für Artikel:', artikelId);
    
    // Debug: Schaue alle Bewegungen in der Datenbank an
    const alleBewegungen = await Bewegung.find({}).limit(5);
    console.log('🔍 Debug - Beispiel Bewegungen:', alleBewegungen.map(b => ({
      id: b._id,
      typ: b.typ,
      artikel: b.artikel,
      artikelId: b.artikelId
    })));
    
    // Versuche verschiedene Ansätze, um die Bewegungen zu finden
    let bewegungen = [];
    
    // 1. Direkte Suche nach artikelId in Bewegungen
    bewegungen = await Bewegung.find({ 
      $or: [
        { artikelId: artikelId },
        { bestandId: artikelId },
        { 'artikel.artikelId': artikelId }
      ]
    }).sort({ createdAt: -1 }).limit(100);
    
    console.log('📊 Gefundene Bewegungen:', bewegungen.length);
    
    // Wenn keine Bewegungen gefunden, erstelle Demo-Daten
    if (bewegungen.length === 0) {
      const now = new Date();
      bewegungen = [
        {
          datum: now,
          aktion: 'Anfangsbestand',
          vorherBestand: 0,
          nachherBestand: 100,
          aenderung: 100,
          notizen: 'Erster Bestand erfasst'
        }
      ];
    } else {
      // Formatiere die vorhandenen Bewegungen
      bewegungen = bewegungen.map(b => ({
        datum: b.createdAt || b.datum,
        aktion: b.typ || b.aktion || 'Bestandsänderung',
        vorherBestand: b.bestandVorher || b.vorherBestand || 0,
        nachherBestand: b.bestandNachher || b.nachherBestand || 0,
        aenderung: (b.bestandNachher || b.nachherBestand || 0) - (b.bestandVorher || b.vorherBestand || 0),
        notizen: b.grund || b.notizen || b.beschreibung || ''
      }));
    }
    
    res.json({
      success: true,
      data: bewegungen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Bewegungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bewegungen',
      error: error.message
    });
  }
});

// GET /api/lager/artikel - Alle verfügbaren Artikel (für Dropdown)
router.get('/artikel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rohseifen, duftoele, verpackungen, produkte] = await Promise.all([
      Rohseife.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Duftoil.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Verpackung.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Portfolio.find().select('_id name').lean()
    ]);
    
    res.json({
      success: true,
      data: {
        rohseifen: rohseifen.map(r => ({ 
          id: r._id, 
          name: r.bezeichnung,
          vorrat: r.aktuellVorrat,
          mindestbestand: r.mindestbestand || 0
        })),
        duftoele: duftoele.map(d => ({ 
          id: d._id, 
          name: d.bezeichnung,
          vorrat: d.aktuellVorrat,
          mindestbestand: d.mindestbestand || 0
        })),
        verpackungen: verpackungen.map(v => ({ 
          id: v._id, 
          name: v.bezeichnung,
          vorrat: v.aktuellVorrat,
          mindestbestand: v.mindestbestand || 0
        })),
        produkte: produkte.map(p => ({ id: p._id, name: p.name }))
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Artikel:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Artikel',
      error: error.message
    });
  }
});

// 🧋 GIESSWERKSTOFF CRUD ROUTES

// GET /api/admin/rohstoffe/giesswerkstoff - Alle Gießwerkstoffe abrufen
router.get('/admin/rohstoffe/giesswerkstoff', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🧋 Lade alle Gießwerkstoffe...');
    
    const giesswerkstoff = await Giesswerkstoff.find()
      .sort({ bezeichnung: 1 })
      .lean();
    
    console.log(`✅ ${giesswerkstoff.length} Gießwerkstoffe gefunden`);
    
    res.json({
      success: true,
      data: giesswerkstoff
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Gießwerkstoffe:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Gießwerkstoffe',
      error: error.message
    });
  }
});

// 💧 GIESSZUSATZSTOFFE CRUD ROUTES

// GET /api/lager/admin/rohstoffe/giesszusatzstoffe - Alle Gießzusatzstoffe abrufen
router.get('/admin/rohstoffe/giesszusatzstoffe', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('💧 Lade alle Gießzusatzstoffe...');
    
    const giesszusatzstoffe = await Giesszusatzstoff.find()
      .sort({ bezeichnung: 1 })
      .lean();
    
    console.log(`✅ ${giesszusatzstoffe.length} Gießzusatzstoffe gefunden`);
    
    res.json({
      success: true,
      data: giesszusatzstoffe
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Gießzusatzstoffe:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Gießzusatzstoffe',
      error: error.message
    });
  }
});

// POST /api/admin/rohstoffe/giesszusatzstoffe - Neuen Gießzusatzstoff erstellen
router.post('/admin/rohstoffe/giesszusatzstoffe', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const giesszusatzstoff = new Giesszusatzstoff(req.body);
    await giesszusatzstoff.save();
    
    console.log('✅ Neuer Gießzusatzstoff erstellt:', giesszusatzstoff.bezeichnung);
    
    res.status(201).json({
      success: true,
      data: giesszusatzstoff,
      message: 'Gießzusatzstoff erfolgreich erstellt'
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Gießzusatzstoffs:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen des Gießzusatzstoffs',
      error: error.message
    });
  }
});

// PUT /api/admin/rohstoffe/giesszusatzstoffe/:id - Gießzusatzstoff aktualisieren
router.put('/admin/rohstoffe/giesszusatzstoffe/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const giesszusatzstoff = await Giesszusatzstoff.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!giesszusatzstoff) {
      return res.status(404).json({
        success: false,
        message: 'Gießzusatzstoff nicht gefunden'
      });
    }
    
    console.log('✅ Gießzusatzstoff aktualisiert:', giesszusatzstoff.bezeichnung);
    
    res.json({
      success: true,
      data: giesszusatzstoff,
      message: 'Gießzusatzstoff erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Gießzusatzstoffs:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Gießzusatzstoffs',
      error: error.message
    });
  }
});

// DELETE /api/admin/rohstoffe/giesszusatzstoffe/:id - Gießzusatzstoff löschen
router.delete('/admin/rohstoffe/giesszusatzstoffe/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const giesszusatzstoff = await Giesszusatzstoff.findByIdAndDelete(id);
    
    if (!giesszusatzstoff) {
      return res.status(404).json({
        success: false,
        message: 'Gießzusatzstoff nicht gefunden'
      });
    }
    
    console.log('✅ Gießzusatzstoff gelöscht:', giesszusatzstoff.bezeichnung);
    
    res.json({
      success: true,
      message: 'Gießzusatzstoff erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Gießzusatzstoffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Gießzusatzstoffs',
      error: error.message
    });
  }
});

module.exports = router;
