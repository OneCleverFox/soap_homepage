const express = require('express');
const router = express.Router();
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');
const Bestand = require('../models/Bestand');
const { auth, checkPermission } = require('../middleware/auth');

// @route   GET /api/zusatzinhaltsstoffe
// @desc    Alle Zusatzinhaltsstoffe abrufen
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
  try {
    const { typ, verfuegbar, sortBy = 'bezeichnung' } = req.query;
    
    // Filter aufbauen
    const filter = {};
    if (typ) filter.typ = typ;
    if (verfuegbar !== undefined) filter.verfuegbar = verfuegbar === 'true';
    
    // Sortierung
    const sortOption = {};
    sortOption[sortBy] = 1;
    
    const inhaltsstoffe = await ZusatzInhaltsstoff.find(filter)
      .sort(sortOption)
      .lean();
    
    // Bestände hinzufügen
    const inhaltsstoffeWithStock = await Promise.all(
      inhaltsstoffe.map(async (stoff) => {
        const bestand = await Bestand.findOne({
          typ: 'zusatzinhaltsstoff',
          artikelId: stoff._id
        });
        
        return {
          ...stoff,
          bestand: bestand ? {
            menge: bestand.menge,
            einheit: bestand.einheit,
            mindestbestand: bestand.mindestbestand,
            niedrigerBestand: bestand.menge <= bestand.mindestbestand
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      data: inhaltsstoffeWithStock
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Zusatzinhaltsstoffe:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Zusatzinhaltsstoffe',
      error: error.message
    });
  }
});

// @route   POST /api/zusatzinhaltsstoffe
// @desc    Neuen Zusatzinhaltsstoff erstellen
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const inhaltsstoff = new ZusatzInhaltsstoff(req.body);
    await inhaltsstoff.save();
    
    // Automatisch Bestand-Eintrag erstellen
    const bestand = new Bestand({
      typ: 'zusatzinhaltsstoff',
      artikelId: inhaltsstoff._id,
      artikelModell: 'ZusatzInhaltsstoff',
      menge: 0,
      einheit: 'g',
      mindestbestand: inhaltsstoff.mindestbestand || 50,
      letzteAktualisierung: new Date()
    });
    await bestand.save();
    
    res.status(201).json({
      success: true,
      message: 'Zusatzinhaltsstoff erfolgreich erstellt',
      data: inhaltsstoff
    });
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Zusatzinhaltsstoffs:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ein Zusatzinhaltsstoff mit dieser Bezeichnung existiert bereits'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen des Zusatzinhaltsstoffs',
      error: error.message
    });
  }
});

// @route   GET /api/zusatzinhaltsstoffe/:id
// @desc    Einzelnen Zusatzinhaltsstoff abrufen
// @access  Private (inventory.read)
router.get('/:id', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    const inhaltsstoff = await ZusatzInhaltsstoff.findById(req.params.id);
    
    if (!inhaltsstoff) {
      return res.status(404).json({
        success: false,
        message: 'Zusatzinhaltsstoff nicht gefunden'
      });
    }
    
    // Bestand hinzufügen
    const bestand = await Bestand.findOne({
      typ: 'zusatzinhaltsstoff',
      artikelId: inhaltsstoff._id
    });
    
    const result = {
      ...inhaltsstoff.toObject(),
      bestand: bestand ? {
        menge: bestand.menge,
        einheit: bestand.einheit,
        mindestbestand: bestand.mindestbestand,
        niedrigerBestand: bestand.menge <= bestand.mindestbestand
      } : null
    };
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen des Zusatzinhaltsstoffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Zusatzinhaltsstoffs',
      error: error.message
    });
  }
});

// @route   PUT /api/zusatzinhaltsstoffe/:id
// @desc    Zusatzinhaltsstoff aktualisieren
// @access  Private (inventory.update)
router.put('/:id', auth, checkPermission('inventory.update'), async (req, res) => {
  try {
    const inhaltsstoff = await ZusatzInhaltsstoff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!inhaltsstoff) {
      return res.status(404).json({
        success: false,
        message: 'Zusatzinhaltsstoff nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Zusatzinhaltsstoff erfolgreich aktualisiert',
      data: inhaltsstoff
    });
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Zusatzinhaltsstoffs:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Zusatzinhaltsstoffs',
      error: error.message
    });
  }
});

// @route   DELETE /api/zusatzinhaltsstoffe/:id
// @desc    Zusatzinhaltsstoff löschen
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const inhaltsstoff = await ZusatzInhaltsstoff.findById(req.params.id);
    
    if (!inhaltsstoff) {
      return res.status(404).json({
        success: false,
        message: 'Zusatzinhaltsstoff nicht gefunden'
      });
    }
    
    // Prüfe ob der Inhaltsstoff in Produkten verwendet wird
    const Portfolio = require('../models/Portfolio');
    const verwendungCount = await Portfolio.countDocuments({
      'zusatzinhaltsstoffe.inhaltsstoffName': inhaltsstoff.bezeichnung
    });
    
    if (verwendungCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Dieser Zusatzinhaltsstoff wird noch in ${verwendungCount} Produkt(en) verwendet und kann nicht gelöscht werden`
      });
    }
    
    // Lösche Inhaltsstoff und Bestand
    await ZusatzInhaltsstoff.findByIdAndDelete(req.params.id);
    await Bestand.deleteOne({
      typ: 'zusatzinhaltsstoff',
      artikelId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'Zusatzinhaltsstoff erfolgreich gelöscht'
    });
    
  } catch (error) {
    console.error('Fehler beim Löschen des Zusatzinhaltsstoffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Zusatzinhaltsstoffs',
      error: error.message
    });
  }
});

// @route   POST /api/zusatzinhaltsstoffe/:id/bestand
// @desc    Bestand eines Zusatzinhaltsstoffs ändern
// @access  Private (inventory.update)
router.post('/:id/bestand', auth, checkPermission('inventory.update'), async (req, res) => {
  try {
    const { menge, aktion, grund } = req.body; // aktion: 'eingang', 'ausgang', 'korrektur'
    
    const inhaltsstoff = await ZusatzInhaltsstoff.findById(req.params.id);
    if (!inhaltsstoff) {
      return res.status(404).json({
        success: false,
        message: 'Zusatzinhaltsstoff nicht gefunden'
      });
    }
    
    // Bestand finden oder erstellen
    let bestand = await Bestand.findOne({
      typ: 'zusatzinhaltsstoff',
      artikelId: req.params.id
    });
    
    if (!bestand) {
      bestand = new Bestand({
        typ: 'zusatzinhaltsstoff',
        artikelId: req.params.id,
        artikelModell: 'ZusatzInhaltsstoff',
        menge: 0,
        einheit: 'g',
        mindestbestand: inhaltsstoff.mindestbestand
      });
    }
    
    // Bestandsänderung durchführen
    const alteMenge = bestand.menge;
    
    switch (aktion) {
      case 'eingang':
        bestand.menge += menge;
        break;
      case 'ausgang':
        if (bestand.menge < menge) {
          return res.status(400).json({
            success: false,
            message: 'Nicht genügend Bestand verfügbar'
          });
        }
        bestand.menge -= menge;
        break;
      case 'korrektur':
        bestand.menge = menge;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Ungültige Aktion'
        });
    }
    
    bestand.letzteAktualisierung = new Date();
    await bestand.save();
    
    // Bewegung protokollieren
    const Bewegung = require('../models/Bewegung');
    const bewegung = new Bewegung({
      typ: 'zusatzinhaltsstoff',
      artikelId: req.params.id,
      artikelName: inhaltsstoff.bezeichnung,
      bewegungstyp: aktion,
      menge: menge,
      einheit: 'g',
      alteMenge: alteMenge,
      neueMenge: bestand.menge,
      grund: grund || `${aktion.charAt(0).toUpperCase() + aktion.slice(1)} von ${inhaltsstoff.bezeichnung}`,
      benutzer: req.user.id
    });
    await bewegung.save();
    
    res.json({
      success: true,
      message: `Bestand erfolgreich ${aktion === 'eingang' ? 'erhöht' : aktion === 'ausgang' ? 'reduziert' : 'korrigiert'}`,
      data: {
        alteMenge,
        neueMenge: bestand.menge,
        differenz: bestand.menge - alteMenge
      }
    });
    
  } catch (error) {
    console.error('Fehler bei Bestandsänderung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Bestandsänderung',
      error: error.message
    });
  }
});

// @route   GET /api/zusatzinhaltsstoffe/typen/liste
// @desc    Verfügbare Typen abrufen
// @access  Private (inventory.read)
router.get('/typen/liste', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    const typen = [
      { wert: 'aktivkohle', label: 'Aktivkohle' },
      { wert: 'peeling', label: 'Peeling' },
      { wert: 'farbe', label: 'Farbe' },
      { wert: 'duftstoff', label: 'Duftstoff' },
      { wert: 'pflegend', label: 'Pflegend' },
      { wert: 'sonstiges', label: 'Sonstiges' }
    ];
    
    res.json({
      success: true,
      data: typen
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Typen',
      error: error.message
    });
  }
});

module.exports = router;