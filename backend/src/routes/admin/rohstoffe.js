const express = require('express');
const Giessform = require('../../models/Giessform');
const Giesswerkstoff = require('../../models/Giesswerkstoff');

const router = express.Router();

// Hilfsfunktion: Nächste verfügbare Inventarnummer generieren
const generateNextInventarnummer = async () => {
  try {
    // Alle existierenden Inventarnummern abrufen
    const existingForms = await Giessform.find({}, 'inventarnummer').sort({ inventarnummer: 1 });
    
    // Wenn keine Gießformen existieren, starte bei GF-001
    if (existingForms.length === 0) {
      return 'GF-001';
    }
    
    // Extrahiere alle Nummern und finde die kleinste verfügbare
    // Unterstütze sowohl GF001 als auch GF-001 Format
    const existingNumbers = existingForms
      .map(form => {
        // Versuche beide Formate: GF-001 und GF001
        let match = form.inventarnummer.match(/^GF-(\d+)$/);
        if (!match) {
          match = form.inventarnummer.match(/^GF(\d+)$/);
        }
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null)
      .sort((a, b) => a - b);
    
    // Finde die kleinste Lücke oder die nächste Nummer
    let nextNumber = 1;
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] !== nextNumber) {
        break;
      }
      nextNumber++;
    }
    
    // Formatiere als GF-XXX mit führenden Nullen
    return `GF-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating inventarnummer:', error);
    throw error;
  }
};

// =====================
// GIESSFORMEN ROUTES
// =====================

// @route   GET /api/admin/rohstoffe/giessformen
// @desc    Alle Gießformen abrufen
// @access  Private (Admin only)
router.get('/giessformen', async (req, res) => {
  try {
    const giessformen = await Giessform.find({}).sort({ reihenfolge: 1, name: 1 }).lean();
    
    res.json({
      success: true,
      count: giessformen.length,
      data: giessformen
    });
  } catch (error) {
    console.error('Gießformen Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Gießformen'
    });
  }
});

// @route   POST /api/admin/rohstoffe/giessformen
// @desc    Neue Gießform erstellen
// @access  Private (Admin only)
router.post('/giessformen', async (req, res) => {
  try {
    console.log('📥 Received request body:', req.body);
    
    const {
      name,
      form,
      material,
      volumenMl,
      tiefeMm,
      laengeMm,
      breiteMm,
      durchmesserMm,
      anschaffungskosten,
      lieferant,
      verfuegbar
    } = req.body;

    console.log('📝 Extracted name field:', `"${name}"`);

    // Validierung der Pflichtfelder
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name ist ein Pflichtfeld und darf nicht leer sein'
      });
    }

    // Automatisch die nächste verfügbare Inventarnummer generieren
    const inventarnummer = await generateNextInventarnummer();

    const newGiessform = new Giessform({
      inventarnummer,
      name: name.trim(),
      form: form || 'sonstiges',
      material: material || 'silikon',
      volumenMl: volumenMl || 100,
      tiefeMm: tiefeMm || 30,
      laengeMm: laengeMm || null,
      breiteMm: breiteMm || null,
      durchmesserMm: durchmesserMm || null,
      anschaffungskosten: anschaffungskosten || 0,
      lieferant: lieferant || '',
      verfuegbar: verfuegbar !== undefined ? verfuegbar : true
    });

    const savedForm = await newGiessform.save();

    res.status(201).json({
      success: true,
      message: 'Gießform erfolgreich erstellt',
      data: savedForm
    });
  } catch (error) {
    console.error('Gießform Create Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Gießform: ' + error.message
    });
  }
});

// @route   GET /api/admin/rohstoffe/giessformen/next-inventarnummer
// @desc    Nächste verfügbare Inventarnummer abrufen
// @access  Private (Admin only)
router.get('/giessformen/next-inventarnummer', async (req, res) => {
  try {
    const nextInventarnummer = await generateNextInventarnummer();
    
    res.json({
      success: true,
      data: { inventarnummer: nextInventarnummer }
    });
  } catch (error) {
    console.error('Next Inventarnummer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Inventarnummer'
    });
  }
});

// @route   PUT /api/admin/rohstoffe/giessformen/:id
// @desc    Gießform aktualisieren
// @access  Private (Admin only)
router.put('/giessformen/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedForm = await Giessform.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: 'Gießform nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Gießform erfolgreich aktualisiert',
      data: updatedForm
    });
  } catch (error) {
    console.error('Gießform Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Gießform'
    });
  }
});

// @route   DELETE /api/admin/rohstoffe/giessformen/:id
// @desc    Gießform löschen
// @access  Private (Admin only)
router.delete('/giessformen/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedForm = await Giessform.findByIdAndDelete(id);

    if (!deletedForm) {
      return res.status(404).json({
        success: false,
        message: 'Gießform nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Gießform erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Gießform Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Gießform'
    });
  }
});

// =====================
// GIESSWERKSTOFF ROUTES
// =====================

// @route   GET /api/admin/rohstoffe/giesswerkstoff
// @desc    Alle Gießwerkstoffe abrufen
// @access  Private (Admin only)
router.get('/giesswerkstoff', async (req, res) => {
  try {
    const giesswerkstoff = await Giesswerkstoff.find({}).sort({ reihenfolge: 1, name: 1 }).lean();
    
    res.json({
      success: true,
      count: giesswerkstoff.length,
      data: giesswerkstoff
    });
  } catch (error) {
    console.error('Gießwerkstoff Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Gießwerkstoffe'
    });
  }
});

// @route   POST /api/admin/rohstoffe/giesswerkstoff
// @desc    Neuen Gießwerkstoff erstellen
// @access  Private (Admin only)
router.post('/giesswerkstoff', async (req, res) => {
  try {
    const newGiesswerkstoff = new Giesswerkstoff(req.body);
    const savedWerkstoff = await newGiesswerkstoff.save();

    res.status(201).json({
      success: true,
      message: 'Gießwerkstoff erfolgreich erstellt',
      data: savedWerkstoff
    });
  } catch (error) {
    console.error('Gießwerkstoff Create Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Gießwerkstoffs'
    });
  }
});

// @route   PUT /api/admin/rohstoffe/giesswerkstoff/:id
// @desc    Gießwerkstoff aktualisieren
// @access  Private (Admin only)
router.put('/giesswerkstoff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Bereinige leere Strings für Objekt-Felder
    const updateData = { ...req.body };
    
    // Bereinige mischkonfiguration - leerer String zu korrektem Objekt
    if (updateData.mischkonfiguration === '') {
      updateData.mischkonfiguration = {
        berechnungsFaktor: 1.5,
        schwundProzent: 5,
        zusaetzlichesMaterial: []
      };
    }
    
    console.log('🔄 Cleaned update data:', updateData);
    
    const updatedWerkstoff = await Giesswerkstoff.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedWerkstoff) {
      return res.status(404).json({
        success: false,
        message: 'Gießwerkstoff nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Gießwerkstoff erfolgreich aktualisiert',
      data: updatedWerkstoff
    });
  } catch (error) {
    console.error('Gießwerkstoff Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Gießwerkstoffs'
    });
  }
});

// @route   DELETE /api/admin/rohstoffe/giesswerkstoff/:id
// @desc    Gießwerkstoff löschen
// @access  Private (Admin only)
router.delete('/giesswerkstoff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedWerkstoff = await Giesswerkstoff.findByIdAndDelete(id);

    if (!deletedWerkstoff) {
      return res.status(404).json({
        success: false,
        message: 'Gießwerkstoff nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Gießwerkstoff erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Gießwerkstoff Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Gießwerkstoffs'
    });
  }
});

// PUT /api/admin/rohstoffe/giesswerkstoff/:id/mischkonfiguration - Mischverhältnis konfigurieren
router.put('/giesswerkstoff/:id/mischkonfiguration', async (req, res) => {
  try {
    const { id } = req.params;
    const { berechnungsFaktor, schwundProzent, zusaetzlichesMaterial } = req.body;

    // Validierung
    if (berechnungsFaktor && (berechnungsFaktor < 1 || berechnungsFaktor > 10)) {
      return res.status(400).json({ 
        message: 'Berechnungsfaktor muss zwischen 1 und 10 liegen' 
      });
    }

    if (schwundProzent && (schwundProzent < 0 || schwundProzent > 50)) {
      return res.status(400).json({ 
        message: 'Schwundprozent muss zwischen 0 und 50 liegen' 
      });
    }

    const giesswerkstoff = await Giesswerkstoff.findByIdAndUpdate(
      id,
      {
        'mischkonfiguration.berechnungsFaktor': berechnungsFaktor || 1.5,
        'mischkonfiguration.schwundProzent': schwundProzent || 5,
        'mischkonfiguration.zusaetzlichesMaterial': zusaetzlichesMaterial || []
      },
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!giesswerkstoff) {
      return res.status(404).json({ message: 'Gießwerkstoff nicht gefunden' });
    }

    res.json({
      message: 'Mischkonfiguration erfolgreich aktualisiert',
      data: giesswerkstoff
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Mischkonfiguration:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Mischkonfiguration',
      error: error.message 
    });
  }
});

module.exports = router;