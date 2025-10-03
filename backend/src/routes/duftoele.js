const express = require('express');
const Duftoil = require('../models/Duftoil');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/duftoele
// @desc    Alle Duftöle abrufen
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { duftrichtung, intensitaet } = req.query;
    
    // Filter aufbauen
    let filter = { verfuegbar: true };
    if (duftrichtung) filter.duftrichtung = duftrichtung;
    if (intensitaet) filter.intensitaet = intensitaet;

    const duftoele = await Duftoil.find(filter)
      .sort({ bezeichnung: 1 });

    res.status(200).json({
      success: true,
      count: duftoele.length,
      data: duftoele
    });
  } catch (error) {
    console.error('Duftöle Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Duftöl-Daten'
    });
  }
});

// @route   GET /api/duftoele/:id
// @desc    Einzelnes Duftöl abrufen
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const duftoil = await Duftoil.findById(req.params.id);

    if (!duftoil) {
      return res.status(404).json({
        success: false,
        message: 'Duftöl nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: duftoil
    });
  } catch (error) {
    console.error('Duftöl Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Duftöls'
    });
  }
});

// @route   POST /api/duftoele/calculate
// @desc    Kosten für bestimmte Tropfenanzahl berechnen
// @access  Public
router.post('/calculate', async (req, res) => {
  try {
    const { duftoele } = req.body; // Array von {bezeichnung, tropfen}

    if (!duftoele || !Array.isArray(duftoele)) {
      return res.status(400).json({
        success: false,
        message: 'Duftöle-Array ist erforderlich'
      });
    }

    const berechnungen = [];
    let gesamtkosten = 0;

    for (const duftoel of duftoele) {
      const { bezeichnung, tropfen } = duftoel;
      
      const duftoil = await Duftoil.findOne({ bezeichnung, verfuegbar: true });
      
      if (!duftoil) {
        return res.status(404).json({
          success: false,
          message: `Duftöl "${bezeichnung}" nicht gefunden`
        });
      }

      const kosten = duftoil.kostenProTropfen * tropfen;
      gesamtkosten += kosten;

      // Prüfen ob Empfehlung eingehalten wird
      const empfehlungStatus = tropfen <= duftoil.empfohlungProSeife ? 'optimal' : 
                             tropfen <= duftoil.maximalProSeife ? 'stark' : 'zu_stark';

      berechnungen.push({
        bezeichnung,
        tropfen,
        kostenProTropfen: duftoil.kostenProTropfen,
        kosten: parseFloat(kosten.toFixed(6)),
        verfuegbareTropfen: duftoil.aktuellVorrat,
        ausreichend: duftoil.aktuellVorrat >= tropfen,
        empfehlungProSeife: duftoil.empfohlungProSeife,
        maximalProSeife: duftoil.maximalProSeife,
        empfehlungStatus,
        duftrichtung: duftoil.duftrichtung,
        intensitaet: duftoil.intensitaet
      });
    }

    res.status(200).json({
      success: true,
      data: {
        berechnungen,
        gesamtkosten: parseFloat(gesamtkosten.toFixed(6)),
        waehrung: '€',
        hinweise: {
          optimal: 'Empfohlene Dosierung',
          stark: 'Starke Dosierung - noch akzeptabel',
          zu_stark: 'Zu starke Dosierung - könnte überwältigend sein'
        }
      }
    });

  } catch (error) {
    console.error('Duftöl-Kostenkalkulation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Duftöl-Kostenkalkulation'
    });
  }
});

// @route   POST /api/duftoele/calculate-by-weight
// @desc    Dosierung und Kosten basierend auf Seifengewicht berechnen (1 Tropfen pro 50g)
// @access  Public
router.post('/calculate-by-weight', async (req, res) => {
  try {
    const { duftoele, seifengewicht } = req.body; // Array von {bezeichnung} und seifengewicht in Gramm

    if (!duftoele || !Array.isArray(duftoele)) {
      return res.status(400).json({
        success: false,
        message: 'Duftöle-Array ist erforderlich'
      });
    }

    if (!seifengewicht || seifengewicht <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Gültiges Seifengewicht in Gramm ist erforderlich'
      });
    }

    const berechnungen = [];
    let gesamtkosten = 0;
    let gesamtTropfen = 0;

    for (const duftoel of duftoele) {
      const { bezeichnung } = duftoel;
      
      const duftoil = await Duftoil.findOne({ bezeichnung, verfuegbar: true });
      
      if (!duftoil) {
        return res.status(404).json({
          success: false,
          message: `Duftöl "${bezeichnung}" nicht gefunden`
        });
      }

      // Berechnung: 1 Tropfen pro 50g Seife
      const benoetigeTropfen = duftoil.berechneTropfenFuerGewicht(seifengewicht);
      const kosten = duftoil.berechneKostenFuerGewicht(seifengewicht);
      
      gesamtkosten += kosten;
      gesamtTropfen += benoetigeTropfen;

      // Lagerbestand prüfen
      const ausreichendVorrat = duftoil.aktuellVorrat >= benoetigeTropfen;

      berechnungen.push({
        bezeichnung,
        seifengewicht,
        benoetigeTropfen,
        kostenProTropfen: duftoil.kostenProTropfen,
        kosten: kosten,
        verfuegbareTropfen: duftoil.aktuellVorrat,
        ausreichendVorrat,
        duftrichtung: duftoil.duftrichtung,
        intensitaet: duftoil.intensitaet,
        dosierungsformel: `1 Tropfen pro 50g = ${benoetigeTropfen} Tropfen für ${seifengewicht}g`
      });
    }

    res.status(200).json({
      success: true,
      seifengewicht,
      dosierungsregel: "1 Tropfen pro 50g Seife",
      data: {
        berechnungen,
        gesamtTropfen,
        gesamtkosten: parseFloat(gesamtkosten.toFixed(4)),
        durchschnittKostenProTropfen: gesamtTropfen > 0 ? parseFloat((gesamtkosten / gesamtTropfen).toFixed(6)) : 0
      }
    });

  } catch (error) {
    console.error('Duftöl Weight Calculation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler',
      error: error.message
    });
  }
});

// @route   GET /api/duftoele/combinations/suggestions
// @desc    Duftöl-Kombinationsvorschläge basierend auf Duftrichtungen
// @access  Public
router.get('/combinations/suggestions', async (req, res) => {
  try {
    const { hauptduft } = req.query;

    const kombinationen = {
      'blumig': ['kräuterig', 'süß'],
      'frisch': ['blumig', 'kräuterig'],
      'holzig': ['süß', 'orientalisch'],
      'süß': ['blumig', 'holzig'],
      'kräuterig': ['blumig', 'frisch'],
      'orientalisch': ['holzig', 'süß'],
      'fruchtig': ['frisch', 'süß']
    };

    if (hauptduft && kombinationen[hauptduft]) {
      const empfohleneRichtungen = kombinationen[hauptduft];
      const vorschlaege = await Duftoil.find({
        duftrichtung: { $in: empfohleneRichtungen },
        verfuegbar: true
      }).select('bezeichnung duftrichtung intensitaet empfohlungProSeife');

      res.status(200).json({
        success: true,
        hauptduft,
        empfohleneKombinationen: vorschlaege
      });
    } else {
      // Alle verfügbaren Duftrichtungen zurückgeben
      const richtungen = await Duftoil.distinct('duftrichtung', { verfuegbar: true });
      res.status(200).json({
        success: true,
        verfuegbareRichtungen: richtungen,
        kombinationen
      });
    }

  } catch (error) {
    console.error('Duftöl-Kombinationen Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Duftöl-Kombinationen'
    });
  }
});

// @route   POST /api/duftoele
// @desc    Neues Duftöl erstellen
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const duftoil = new Duftoil(req.body);
    const savedDuftoil = await duftoil.save();

    res.status(201).json({
      success: true,
      message: 'Duftöl erfolgreich erstellt',
      data: savedDuftoil
    });
  } catch (error) {
    console.error('Duftöl Create Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ein Duftöl mit dieser Bezeichnung existiert bereits'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen des Duftöls',
      error: error.message
    });
  }
});

// @route   PUT /api/duftoele/:id
// @desc    Duftöl aktualisieren
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const duftoil = await Duftoil.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!duftoil) {
      return res.status(404).json({
        success: false,
        message: 'Duftöl nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Duftöl erfolgreich aktualisiert',
      data: duftoil
    });
  } catch (error) {
    console.error('Duftöl Update Error:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Duftöls',
      error: error.message
    });
  }
});

// @route   PUT /api/duftoele/:id/vorrat
// @desc    Duftöl-Vorrat aktualisieren
// @access  Private (Admin only)
router.put('/:id/vorrat', auth, async (req, res) => {
  try {
    const { aktion, tropfen, grund } = req.body; // aktion: 'verbrauch' oder 'nachbestellung'

    if (!aktion || !tropfen) {
      return res.status(400).json({
        success: false,
        message: 'Aktion und Tropfenanzahl sind erforderlich'
      });
    }

    const duftoil = await Duftoil.findById(req.params.id);
    
    if (!duftoil) {
      return res.status(404).json({
        success: false,
        message: 'Duftöl nicht gefunden'
      });
    }

    if (aktion === 'verbrauch') {
      duftoil.aktuellVorrat -= tropfen;
      if (duftoil.aktuellVorrat < 0) {
        return res.status(400).json({
          success: false,
          message: 'Nicht genügend Tropfen verfügbar'
        });
      }
    } else if (aktion === 'nachbestellung') {
      duftoil.aktuellVorrat += tropfen;
      duftoil.letzteBeschaffung = new Date();
    }

    await duftoil.save();

    console.log(`🌸 Duftöl ${aktion}: ${duftoil.bezeichnung} - ${tropfen} Tropfen (${grund || 'Kein Grund angegeben'})`);

    res.status(200).json({
      success: true,
      message: `Duftöl-Vorrat erfolgreich ${aktion === 'verbrauch' ? 'reduziert' : 'erhöht'}`,
      data: {
        bezeichnung: duftoil.bezeichnung,
        vorherVorrat: aktion === 'verbrauch' ? duftoil.aktuellVorrat + tropfen : duftoil.aktuellVorrat - tropfen,
        neuerVorrat: duftoil.aktuellVorrat,
        vorratStatus: duftoil.vorratStatus,
        verfuegbarePortionen: duftoil.verfuegbarePortionen
      }
    });

  } catch (error) {
    console.error('Duftöl Vorrat Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Duftöl-Vorrats'
    });
  }
});

// @route   GET /api/duftoele/stats/overview
// @desc    Duftöl-Statistiken und Lagerbestand
// @access  Private (Admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalDuftoele = await Duftoil.countDocuments();
    const verfuegbareDuftoele = await Duftoil.countDocuments({ verfuegbar: true });
    
    // Duftöle mit kritischem Vorrat
    const kritischerVorrat = await Duftoil.find({
      $expr: { $lte: ['$aktuellVorrat', '$mindestbestand'] }
    }).select('bezeichnung aktuellVorrat mindestbestand');

    // Gesamtwert des Duftöl-Lagers
    const lagerWert = await Duftoil.aggregate([
      {
        $project: {
          bezeichnung: 1,
          wert: { $multiply: ['$aktuellVorrat', '$kostenProTropfen'] }
        }
      },
      {
        $group: {
          _id: null,
          gesamtwert: { $sum: '$wert' }
        }
      }
    ]);

    // Verteilung nach Duftrichtungen
    const duftrichtungVerteilung = await Duftoil.aggregate([
      { $group: { _id: '$duftrichtung', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Verteilung nach Intensität
    const intensitaetVerteilung = await Duftoil.aggregate([
      { $group: { _id: '$intensitaet', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDuftoele,
        verfuegbareDuftoele,
        kritischerVorrat: kritischerVorrat.length,
        kritischeDuftoele: kritischerVorrat,
        gesamtLagerWert: lagerWert[0]?.gesamtwert || 0,
        duftrichtungVerteilung,
        intensitaetVerteilung
      }
    });
  } catch (error) {
    console.error('Duftöl Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Duftöl-Statistiken'
    });
  }
});

module.exports = router;