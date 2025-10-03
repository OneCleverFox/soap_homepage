const express = require('express');
const router = express.Router();
const Verpackung = require('../models/Verpackung');

// @route   GET /api/verpackungen
// @desc    Alle Verpackungen abrufen
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { form, verfuegbar, vorratStatus } = req.query;
    
    let filter = {};
    if (form) filter.form = form;
    if (verfuegbar !== undefined) filter.verfuegbar = verfuegbar === 'true';
    
    const verpackungen = await Verpackung.find(filter)
      .sort({ bezeichnung: 1 });

    // Vorrat-Status für jede Verpackung berechnen
    const verpackungenMitStatus = verpackungen.map(verpackung => {
      const obj = verpackung.toObject();
      obj.vorratStatus = verpackung.vorratStatus;
      obj.gesamtwert = verpackung.gesamtwert;
      return obj;
    });

    // Optional nach Vorrat-Status filtern
    let result = verpackungenMitStatus;
    if (vorratStatus) {
      result = verpackungenMitStatus.filter(v => v.vorratStatus === vorratStatus);
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Verpackungen Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Verpackungs-Daten'
    });
  }
});

// @route   GET /api/verpackungen/:id
// @desc    Einzelne Verpackung abrufen
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const verpackung = await Verpackung.findById(req.params.id);

    if (!verpackung) {
      return res.status(404).json({
        success: false,
        message: 'Verpackung nicht gefunden'
      });
    }

    const result = verpackung.toObject();
    result.vorratStatus = verpackung.vorratStatus;
    result.gesamtwert = verpackung.gesamtwert;

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Verpackung Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Verpackung'
    });
  }
});

// @route   POST /api/verpackungen/calculate
// @desc    Kosten für bestimmte Anzahl Verpackungen berechnen
// @access  Public
router.post('/calculate', async (req, res) => {
  try {
    const { verpackungen } = req.body; // Array von {bezeichnung, anzahl}

    if (!verpackungen || !Array.isArray(verpackungen)) {
      return res.status(400).json({
        success: false,
        message: 'Verpackungen-Array ist erforderlich'
      });
    }

    const berechnungen = [];
    let gesamtkosten = 0;
    let gesamtStueck = 0;

    for (const verpackung of verpackungen) {
      const { bezeichnung, anzahl } = verpackung;
      
      if (!anzahl || anzahl <= 0) {
        return res.status(400).json({
          success: false,
          message: `Gültige Anzahl für "${bezeichnung}" ist erforderlich`
        });
      }

      const verpackungData = await Verpackung.findOne({ bezeichnung, verfuegbar: true });
      
      if (!verpackungData) {
        return res.status(404).json({
          success: false,
          message: `Verpackung "${bezeichnung}" nicht gefunden`
        });
      }

      const kosten = verpackungData.berechneKostenFuerAnzahl(anzahl);
      gesamtkosten += kosten;
      gesamtStueck += anzahl;

      // Lagerbestand prüfen
      const ausreichendVorrat = verpackungData.kannLiefern(anzahl);

      berechnungen.push({
        bezeichnung,
        anzahl,
        kostenProStueck: verpackungData.kostenProStueck,
        kosten: parseFloat(kosten.toFixed(4)),
        verfuegbareStueck: verpackungData.aktuellVorrat,
        ausreichendVorrat,
        form: verpackungData.form,
        groesse: verpackungData.groesse,
        material: verpackungData.material,
        vorratStatus: verpackungData.vorratStatus
      });
    }

    res.status(200).json({
      success: true,
      data: {
        berechnungen,
        gesamtStueck,
        gesamtkosten: parseFloat(gesamtkosten.toFixed(4)),
        durchschnittKostenProStueck: gesamtStueck > 0 ? parseFloat((gesamtkosten / gesamtStueck).toFixed(4)) : 0
      }
    });

  } catch (error) {
    console.error('Verpackung Calculation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler',
      error: error.message
    });
  }
});

// @route   POST /api/verpackungen/vorrat/reduzieren
// @desc    Vorrat reduzieren (bei Verkauf/Verwendung)
// @access  Public
router.post('/vorrat/reduzieren', async (req, res) => {
  try {
    const { bezeichnung, anzahl } = req.body;

    if (!bezeichnung || !anzahl || anzahl <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bezeichnung und gültige Anzahl sind erforderlich'
      });
    }

    const verpackung = await Verpackung.findOne({ bezeichnung });

    if (!verpackung) {
      return res.status(404).json({
        success: false,
        message: 'Verpackung nicht gefunden'
      });
    }

    if (!verpackung.reduziereVorrat(anzahl)) {
      return res.status(400).json({
        success: false,
        message: `Nicht genügend Vorrat. Verfügbar: ${verpackung.aktuellVorrat}, Benötigt: ${anzahl}`
      });
    }

    await verpackung.save();

    res.status(200).json({
      success: true,
      message: `Vorrat um ${anzahl} Stück reduziert`,
      data: {
        bezeichnung: verpackung.bezeichnung,
        neuerVorrat: verpackung.aktuellVorrat,
        vorratStatus: verpackung.vorratStatus
      }
    });

  } catch (error) {
    console.error('Vorrat Reduzieren Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Reduzieren des Vorrats'
    });
  }
});

// @route   POST /api/verpackungen/vorrat/erhoehen
// @desc    Vorrat erhöhen (bei Nachbestellung)
// @access  Public
router.post('/vorrat/erhoehen', async (req, res) => {
  try {
    const { bezeichnung, anzahl } = req.body;

    if (!bezeichnung || !anzahl || anzahl <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bezeichnung und gültige Anzahl sind erforderlich'
      });
    }

    const verpackung = await Verpackung.findOne({ bezeichnung });

    if (!verpackung) {
      return res.status(404).json({
        success: false,
        message: 'Verpackung nicht gefunden'
      });
    }

    verpackung.erhoeheVorrat(anzahl);
    await verpackung.save();

    res.status(200).json({
      success: true,
      message: `Vorrat um ${anzahl} Stück erhöht`,
      data: {
        bezeichnung: verpackung.bezeichnung,
        neuerVorrat: verpackung.aktuellVorrat,
        vorratStatus: verpackung.vorratStatus,
        letzteBeschaffung: verpackung.letzteBeschaffung
      }
    });

  } catch (error) {
    console.error('Vorrat Erhöhen Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erhöhen des Vorrats'
    });
  }
});

// @route   GET /api/verpackungen/stats/overview
// @desc    Übersicht über Verpackungsbestand
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const verpackungen = await Verpackung.find({ verfuegbar: true });
    
    const stats = {
      gesamt: verpackungen.length,
      gesamtwert: 0,
      vorratStatus: {
        leer: 0,
        kritisch: 0,
        niedrig: 0,
        ausreichend: 0
      },
      nachForm: {},
      nachMaterial: {}
    };

    verpackungen.forEach(verpackung => {
      // Gesamtwert
      stats.gesamtwert += verpackung.gesamtwert;
      
      // Vorrat-Status
      const status = verpackung.vorratStatus;
      stats.vorratStatus[status]++;
      
      // Nach Form
      if (!stats.nachForm[verpackung.form]) {
        stats.nachForm[verpackung.form] = 0;
      }
      stats.nachForm[verpackung.form]++;
      
      // Nach Material
      if (verpackung.material && verpackung.material !== 'sonstiges') {
        if (!stats.nachMaterial[verpackung.material]) {
          stats.nachMaterial[verpackung.material] = 0;
        }
        stats.nachMaterial[verpackung.material]++;
      }
    });

    stats.gesamtwert = parseFloat(stats.gesamtwert.toFixed(2));

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Verpackung Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken'
    });
  }
});

// @route   GET /api/verpackungen/forms
// @desc    Verfügbare Verpackungsformen abrufen
// @access  Public
router.get('/forms', async (req, res) => {
  try {
    const formen = await Verpackung.distinct('form', { verfuegbar: true });
    
    res.status(200).json({
      success: true,
      data: formen.filter(form => form && form !== 'sonstiges')
    });
  } catch (error) {
    console.error('Verpackung Forms Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Verpackungsformen'
    });
  }
});

module.exports = router;