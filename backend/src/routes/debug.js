const express = require('express');
const router = express.Router();
const Bestand = require('../models/Bestand');

// Debug Route für Bestand-Analyse
router.get('/analyze-bestand', async (req, res) => {
  try {
    console.log('🔍 Analyzing Bestand collection...');
    
    // Zeige alle verschiedenen 'typ' Werte
    const types = await Bestand.distinct('typ');
    console.log('🔍 Gefundene typ-Werte:', types);
    
    // Zeige alle Einträge mit menge < mindestbestand
    const unterMindest = await Bestand.find({
      $expr: { $lte: ['$menge', '$mindestbestand'] }
    }).limit(10);
    
    console.log('📊 Einträge unter Mindestbestand:', unterMindest.length);
    
    // Detaillierte Ausgabe
    const details = [];
    for (const item of unterMindest) {
      details.push({
        typ: item.typ,
        menge: item.menge,
        mindestbestand: item.mindestbestand,
        artikelId: item.artikelId,
        einheit: item.einheit
      });
    }
    
    // Zeige ein paar Beispiel-Einträge
    const samples = await Bestand.find({}).limit(5);
    const sampleDetails = samples.map(s => ({
      typ: s.typ,
      menge: s.menge,
      mindestbestand: s.mindestbestand,
      artikelId: s.artikelId,
      einheit: s.einheit
    }));
    
    res.json({
      success: true,
      types: types,
      unterMindest: details,
      samples: sampleDetails
    });
    
  } catch (error) {
    console.error('❌ Analyze Bestand Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;