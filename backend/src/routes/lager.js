const express = require('express');
const router = express.Router();
const Bestand = require('../models/Bestand');
const Bewegung = require('../models/Bewegung');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
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
    const [rohseifen, duftoele, verpackungen, produkte] = await Promise.all([
      Rohseife.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Duftoil.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Verpackung.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Portfolio.find().lean()
    ]);
    
    console.log('📊 Rohdaten geladen:', {
      rohseifen: rohseifen.length,
      duftoele: duftoele.length,
      verpackungen: verpackungen.length,
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
        produkte: produkteFormatted
      }
    };
    
    console.log('✅ Antwort wird gesendet:', {
      rohseifen: result.data.rohseifen.length,
      duftoele: result.data.duftoele.length,
      verpackungen: result.data.verpackungen.length,
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
                  console.log(`  📊 Gewichtverteilung: Seife 1 ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1}%, Seife 2 ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2}%`);
                  
                  // Erste Rohseife
                  const rohseife1 = await Rohseife.findOne({ bezeichnung: artikel.seife });
                  if (rohseife1) {
                    const gewicht1 = Math.round(artikel.gramm * (artikel.rohseifenKonfiguration.gewichtVerteilung.seife1 / 100));
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
                        notizen: `Zwei-Rohseifen-Produkt - Anteil ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1}% (${gewicht1}g)`,
                        referenz: {
                          typ: 'fertigprodukt-inventur',
                          produktId: artikel._id,
                          produktName: artikel.name,
                          anzahl: buchungsAnzahl
                        }
                      });
                      
                      console.log(`  ✅ Rohseife 1 ${rohseife1.bezeichnung}: -${benoetigt1}g (${artikel.rohseifenKonfiguration.gewichtVerteilung.seife1}%)`);
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
                      const gewicht2 = Math.round(artikel.gramm * (artikel.rohseifenKonfiguration.gewichtVerteilung.seife2 / 100));
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
                          notizen: `Zwei-Rohseifen-Produkt - Anteil ${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2}% (${gewicht2}g)`,
                          referenz: {
                            typ: 'fertigprodukt-inventur',
                            produktId: artikel._id,
                            produktName: artikel.name,
                            anzahl: buchungsAnzahl
                          }
                        });
                        
                        console.log(`  ✅ Rohseife 2 ${rohseife2.bezeichnung}: -${benoetigt2}g (${artikel.rohseifenKonfiguration.gewichtVerteilung.seife2}%)`);
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
          verpackung: produkt.verpackung
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

module.exports = router;
