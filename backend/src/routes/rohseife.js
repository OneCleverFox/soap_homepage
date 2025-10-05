const express = require('express');
const Rohseife = require('../models/Rohseife');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rohseife
// @desc    Alle Rohseife-Materialien abrufen
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { includeUnavailable } = req.query;
    
    // Filter: wenn includeUnavailable=true, dann alle anzeigen, sonst nur verfügbare
    const filter = includeUnavailable === 'true' ? {} : { verfuegbar: true };
    
    const rohseifeMaterialien = await Rohseife.find(filter)
      .sort({ bezeichnung: 1 });

    res.status(200).json({
      success: true,
      count: rohseifeMaterialien.length,
      data: rohseifeMaterialien
    });
  } catch (error) {
    console.error('Rohseife Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rohseife-Daten'
    });
  }
});

// @route   GET /api/rohseife/:id
// @desc    Einzelnes Rohseife-Material abrufen
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const rohseifeMaterial = await Rohseife.findById(req.params.id);

    if (!rohseifeMaterial) {
      return res.status(404).json({
        success: false,
        message: 'Rohseife-Material nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: rohseifeMaterial
    });
  } catch (error) {
    console.error('Rohseife Item Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Rohseife-Materials'
    });
  }
});

// @route   POST /api/rohseife/calculate
// @desc    Kosten für bestimmte Grammzahl berechnen
// @access  Public
router.post('/calculate', async (req, res) => {
  try {
    const { materialien } = req.body; // Array von {bezeichnung, gramm}

    if (!materialien || !Array.isArray(materialien)) {
      return res.status(400).json({
        success: false,
        message: 'Materialien-Array ist erforderlich'
      });
    }

    const berechnungen = [];
    let gesamtkosten = 0;

    for (const material of materialien) {
      const { bezeichnung, gramm } = material;
      
      const rohseife = await Rohseife.findOne({ bezeichnung, verfuegbar: true });
      
      if (!rohseife) {
        return res.status(404).json({
          success: false,
          message: `Rohseife-Material "${bezeichnung}" nicht gefunden`
        });
      }

      const kosten = rohseife.preisProGramm * gramm;
      gesamtkosten += kosten;

      berechnungen.push({
        bezeichnung,
        gramm,
        preisProGramm: rohseife.preisProGramm,
        kosten: parseFloat(kosten.toFixed(4)),
        verfuegbaresMaterial: rohseife.aktuellVorrat,
        ausreichend: rohseife.aktuellVorrat >= gramm
      });
    }

    res.status(200).json({
      success: true,
      data: {
        berechnungen,
        gesamtkosten: parseFloat(gesamtkosten.toFixed(4)),
        waehrung: '€'
      }
    });

  } catch (error) {
    console.error('Kostenkalkulation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Kostenkalkulation'
    });
  }
});

// @route   POST /api/rohseife
// @desc    Neues Rohseife-Material erstellen
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const rohseifeMaterial = new Rohseife(req.body);
    const savedMaterial = await rohseifeMaterial.save();

    res.status(201).json({
      success: true,
      message: 'Rohseife-Material erfolgreich erstellt',
      data: savedMaterial
    });
  } catch (error) {
    console.error('Rohseife Create Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ein Rohseife-Material mit dieser Bezeichnung existiert bereits'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen des Rohseife-Materials',
      error: error.message
    });
  }
});

// @route   PUT /api/rohseife/:id
// @desc    Rohseife-Material aktualisieren
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const rohseifeMaterial = await Rohseife.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!rohseifeMaterial) {
      return res.status(404).json({
        success: false,
        message: 'Rohseife-Material nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Rohseife-Material erfolgreich aktualisiert',
      data: rohseifeMaterial
    });
  } catch (error) {
    console.error('Rohseife Update Error:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Rohseife-Materials',
      error: error.message
    });
  }
});

// @route   PUT /api/rohseife/:id/vorrat
// @desc    Vorrat aktualisieren (z.B. nach Verbrauch oder Nachbestellung)
// @access  Private (Admin only)
router.put('/:id/vorrat', auth, async (req, res) => {
  try {
    const { aktion, menge, grund } = req.body; // aktion: 'verbrauch' oder 'nachbestellung'

    if (!aktion || !menge) {
      return res.status(400).json({
        success: false,
        message: 'Aktion und Menge sind erforderlich'
      });
    }

    const rohseife = await Rohseife.findById(req.params.id);
    
    if (!rohseife) {
      return res.status(404).json({
        success: false,
        message: 'Rohseife-Material nicht gefunden'
      });
    }

    if (aktion === 'verbrauch') {
      rohseife.aktuellVorrat -= menge;
      if (rohseife.aktuellVorrat < 0) {
        return res.status(400).json({
          success: false,
          message: 'Nicht genügend Vorrat verfügbar'
        });
      }
    } else if (aktion === 'nachbestellung') {
      rohseife.aktuellVorrat += menge;
      rohseife.letzteBeschaffung = new Date();
    }

    await rohseife.save();

    console.log(`📦 Vorrat ${aktion}: ${rohseife.bezeichnung} - ${menge}g (${grund || 'Kein Grund angegeben'})`);

    res.status(200).json({
      success: true,
      message: `Vorrat erfolgreich ${aktion === 'verbrauch' ? 'reduziert' : 'erhöht'}`,
      data: {
        bezeichnung: rohseife.bezeichnung,
        vorherVorrat: aktion === 'verbrauch' ? rohseife.aktuellVorrat + menge : rohseife.aktuellVorrat - menge,
        neuerVorrat: rohseife.aktuellVorrat,
        vorratStatus: rohseife.vorratStatus
      }
    });

  } catch (error) {
    console.error('Vorrat Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Vorrats'
    });
  }
});

// @route   GET /api/rohseife/stats/overview
// @desc    Rohseife-Statistiken und Lagerbestand
// @access  Private (Admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalMaterialien = await Rohseife.countDocuments();
    const verfuegbareMaterialien = await Rohseife.countDocuments({ verfuegbar: true });
    
    // Materialien mit kritischem Vorrat
    const kritischerVorrat = await Rohseife.find({
      $expr: { $lte: ['$aktuellVorrat', '$mindestbestand'] }
    }).select('bezeichnung aktuellVorrat mindestbestand');

    // Gesamtwert des Lagers
    const lagerWert = await Rohseife.aggregate([
      {
        $project: {
          bezeichnung: 1,
          wert: { $multiply: ['$aktuellVorrat', '$preisProGramm'] }
        }
      },
      {
        $group: {
          _id: null,
          gesamtwert: { $sum: '$wert' }
        }
      }
    ]);

    // Durchschnittspreis pro Gramm
    const avgPreis = await Rohseife.aggregate([
      {
        $group: {
          _id: null,
          durchschnittspreisProGramm: { $avg: '$preisProGramm' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalMaterialien,
        verfuegbareMaterialien,
        kritischerVorrat: kritischerVorrat.length,
        kritischeMaterialien: kritischerVorrat,
        gesamtLagerWert: lagerWert[0]?.gesamtwert || 0,
        durchschnittspreisProGramm: avgPreis[0]?.durchschnittspreisProGramm || 0
      }
    });
  } catch (error) {
    console.error('Rohseife Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rohseife-Statistiken'
    });
  }
});

// @route   DELETE /api/rohseife/:id
// @desc    Rohseife-Material löschen
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const rohseifeMaterial = await Rohseife.findByIdAndDelete(req.params.id);

    if (!rohseifeMaterial) {
      return res.status(404).json({
        success: false,
        message: 'Rohseife-Material nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Rohseife-Material erfolgreich gelöscht',
      data: rohseifeMaterial
    });
  } catch (error) {
    console.error('Rohseife Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Rohseife-Materials'
    });
  }
});

module.exports = router;