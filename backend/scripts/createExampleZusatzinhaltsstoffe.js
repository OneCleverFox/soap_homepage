/**
 * Script zum Erstellen von Beispiel-Zusatzinhaltsstoffen
 * 
 * Ausführung:
 * cd backend
 * node scripts/createExampleZusatzinhaltsstoffe.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Lade Environment-Variablen
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.development')
});

// Modelle laden
const ZusatzInhaltsstoff = require('../src/models/ZusatzInhaltsstoff');
const Bestand = require('../src/models/Bestand');

// Beispiel-Zusatzinhaltsstoffe
const beispielInhaltsstoffe = [
  {
    bezeichnung: 'Aktivkohle Pulver',
    typ: 'aktivkohle',
    beschreibung: 'Fein gemahlene Aktivkohle für entgiftende und reinigende Seifen',
    wirkung: 'Entgiftend, reinigend, mattierend. Ideal für unreine und fettige Haut.',
    ekPreis: 8.50,
    gesamtInGramm: 250,
    dosierung: {
      empfohleneProzentzahl: 3,
      maximaleMenge: 8,
      hinweise: 'Sparsam verwenden, da starke Färbung. Gut mischen um Klumpenbildung zu vermeiden.'
    },
    eigenschaften: {
      farbe: 'Tiefschwarz',
      textur: 'pulver',
      wasserlöslichkeit: 'unlöslich',
      korngroesse: 'Sehr fein (<0,1mm)'
    },
    lagerung: {
      temperatur: 'Raumtemperatur',
      lichtschutz: true,
      luftdicht: true,
      haltbarkeitMonate: 36
    },
    hersteller: 'NaturPur GmbH',
    artikelNummer: 'AK-250',
    mindestbestand: 100,
    preisProGramm: 8.50 / 250,  // Auto-Berechnung
    preisPro10Gramm: (8.50 / 250) * 10,  // Auto-Berechnung
    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Keine bekannten Allergene',
      hautvertraeglichkeit: 'sehr gut',
      besondereHinweise: 'Bei Kontakt mit Augen sofort ausspülen'
    },
    kategorien: ['entgiftend', 'reinigend', 'problemhaut']
  },
  {
    bezeichnung: 'Mondschein Peeling-Granulat',
    typ: 'peeling',
    beschreibung: 'Sanftes Peeling-Granulat aus natürlichen Mineralien mit schimmerndem Effekt',
    wirkung: 'Sanfte Hauterneuerung, entfernt abgestorbene Hautschüppchen, verleiht der Haut einen zarten Schimmer.',
    ekPreis: 12.90,
    gesamtInGramm: 200,
    dosierung: {
      empfohleneProzentzahl: 8,
      maximaleMenge: 15,
      hinweise: 'Gleichmäßig in die Seifenmasse einarbeiten. Nicht für empfindliche Haut geeignet.'
    },
    eigenschaften: {
      farbe: 'Silberweiß mit Schimmer',
      textur: 'granulat',
      wasserlöslichkeit: 'unlöslich',
      korngroesse: '0,3-0,8mm'
    },
    lagerung: {
      temperatur: 'Raumtemperatur',
      lichtschutz: false,
      luftdicht: true,
      haltbarkeitMonate: 24
    },
    hersteller: 'CosmoPur Naturkosmetik',
    artikelNummer: 'MP-200',
    mindestbestand: 80,
    preisProGramm: 12.90 / 200,  // Auto-Berechnung
    preisPro10Gramm: (12.90 / 200) * 10,  // Auto-Berechnung
    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Keine bekannten Allergene',
      hautvertraeglichkeit: 'gut',
      besondereHinweise: 'Nicht für sehr empfindliche Haut. Bei Hautreizungen Verwendung einstellen.'
    },
    kategorien: ['peeling', 'schimmer', 'hauterneuerung']
  },
  {
    bezeichnung: 'Bio-Haferflocken fein',
    typ: 'peeling',
    beschreibung: 'Fein gemahlene Bio-Haferflocken für sanfte Peeling-Wirkung',
    wirkung: 'Mild peelend, beruhigend, pflegend. Ideal für empfindliche und trockene Haut.',
    ekPreis: 4.20,
    gesamtInGramm: 500,
    dosierung: {
      empfohleneProzentzahl: 10,
      maximaleMenge: 20,
      hinweise: 'Sehr sanft, auch für empfindliche Haut geeignet. Gut mit anderen Ölen vermischen.'
    },
    eigenschaften: {
      farbe: 'Beige bis hellbraun',
      textur: 'flocken',
      wasserlöslichkeit: 'teilweise',
      korngroesse: '0,5-2mm'
    },
    lagerung: {
      temperatur: 'Kühl und trocken',
      lichtschutz: true,
      luftdicht: true,
      haltbarkeitMonate: 18
    },
    hersteller: 'Bio-Zentrale München',
    artikelNummer: 'BH-500',
    mindestbestand: 200,    preisProGramm: 4.20 / 500,  // Auto-Berechnung
    preisPro10Gramm: (4.20 / 500) * 10,  // Auto-Berechnung    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Enthält Gluten',
      hautvertraeglichkeit: 'sehr gut',
      besondereHinweise: 'Bei Gluten-Allergie nicht verwenden'
    },
    kategorien: ['peeling', 'beruhigend', 'bio', 'empfindliche-haut']
  },
  {
    bezeichnung: 'Spirulina Pulver',
    typ: 'farbe',
    beschreibung: 'Natürliches Spirulina-Algenpulver für grüne Färbung und pflegende Eigenschaften',
    wirkung: 'Färbend (grün), antioxidativ, nährend. Reich an Vitaminen und Mineralien.',
    ekPreis: 15.80,
    gesamtInGramm: 100,
    dosierung: {
      empfohleneProzentzahl: 2,
      maximaleMenge: 5,
      hinweise: 'Sehr farbintensiv. Kleine Mengen verwenden. Kann bei Überdosierung krümelig werden.'
    },
    eigenschaften: {
      farbe: 'Dunkelgrün',
      textur: 'pulver',
      wasserlöslichkeit: 'teilweise',
      korngroesse: 'Sehr fein (<0,05mm)'
    },
    lagerung: {
      temperatur: 'Kühl (unter 15°C)',
      lichtschutz: true,
      luftdicht: true,
      haltbarkeitMonate: 24
    },
    hersteller: 'SuperFoods International',
    artikelNummer: 'SP-100',
    mindestbestand: 50,
    preisProGramm: 15.80 / 100,  // Auto-Berechnung
    preisPro10Gramm: (15.80 / 100) * 10,  // Auto-Berechnung
    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Kann Spuren von Krustentieren enthalten',
      hautvertraeglichkeit: 'gut',
      besondereHinweise: 'Bei Schilddrüsenerkrankungen Arzt konsultieren'
    },
    kategorien: ['färbend', 'pflegend', 'antioxidativ', 'natürlich']
  },
  {
    bezeichnung: 'Rosenknospen getrocknet',
    typ: 'pflegend',
    beschreibung: 'Getrocknete Bio-Rosenknospen für dekorative und pflegende Eigenschaften',
    wirkung: 'Beruhigend, pflegend, dekorativ. Verleiht einen zarten Rosenduft.',
    ekPreis: 22.50,
    gesamtInGramm: 50,
    dosierung: {
      empfohleneProzentzahl: 5,
      maximaleMenge: 8,
      hinweise: 'Vor Verwendung leicht zerkleinern. Können auch ganz eingearbeitet werden für dekorativen Effekt.'
    },
    eigenschaften: {
      farbe: 'Rosa bis dunkelrot',
      textur: 'flocken',
      wasserlöslichkeit: 'teilweise',
      korngroesse: '2-8mm'
    },
    lagerung: {
      temperatur: 'Raumtemperatur',
      lichtschutz: true,
      luftdicht: true,
      haltbarkeitMonate: 24
    },
    hersteller: 'Rosenfeld Naturprodukte',
    artikelNummer: 'RK-150',
    mindestbestand: 50,
    preisProGramm: 18.50 / 150,  // Auto-Berechnung
    preisPro10Gramm: (18.50 / 150) * 10,  // Auto-Berechnung
    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Kann allergische Reaktionen bei Rosenallergikern auslösen',
      hautvertraeglichkeit: 'sehr gut',
      besondereHinweise: 'Bei bekannter Rosenallergie nicht verwenden'
    },
    kategorien: ['pflegend', 'beruhigend', 'dekorativ', 'bio', 'duftig']
  },
  {
    bezeichnung: 'Titandioxid (CI 77891)',
    typ: 'farbe',
    beschreibung: 'Reines Titandioxid für weiße Färbung und Deckkraft in Seifen',
    wirkung: 'Weißfärbend, deckend, UV-protektiv. Verleiht der Seife Opazität.',
    ekPreis: 8.90,
    gesamtInGramm: 200,
    dosierung: {
      empfohleneProzentzahl: 1,
      maximaleMenge: 3,
      hinweise: 'Sehr deckkräftig. In warmem Öl auflösen vor Zugabe zur Seifenmasse.'
    },
    eigenschaften: {
      farbe: 'Reinweiß',
      textur: 'pulver',
      wasserlöslichkeit: 'unlöslich',
      korngroesse: 'Nano bis mikrofein'
    },
    lagerung: {
      temperatur: 'Raumtemperatur',
      lichtschutz: false,
      luftdicht: true,
      haltbarkeitMonate: 60
    },
    hersteller: 'Colorant Chemie GmbH',
    artikelNummer: 'TD-500',
    mindestbestand: 200,
    preisProGramm: 22.00 / 500,  // Auto-Berechnung
    preisPro10Gramm: (22.00 / 500) * 10,  // Auto-Berechnung
    verfuegbar: true,
    sicherheit: {
      allergenhinweise: 'Keine bekannten Allergene',
      hautvertraeglichkeit: 'sehr gut',
      besondereHinweise: 'Staubentwicklung vermeiden. Bei Inhalation kann reizend wirken.'
    },
    kategorien: ['färbend', 'deckend', 'uv-schutz']
  }
];

async function createExampleZusatzinhaltsstoffe() {
  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB verbunden');

    console.log('🧹 Lösche existierende Beispiel-Zusatzinhaltsstoffe...');
    await ZusatzInhaltsstoff.deleteMany({
      bezeichnung: { $in: beispielInhaltsstoffe.map(b => b.bezeichnung) }
    });

    console.log('📦 Erstelle neue Zusatzinhaltsstoffe...');
    const erstellteInhaltsstoffe = [];

    for (const inhaltsstoffData of beispielInhaltsstoffe) {
      try {
        const inhaltsstoff = new ZusatzInhaltsstoff(inhaltsstoffData);
        await inhaltsstoff.save();
        erstellteInhaltsstoffe.push(inhaltsstoff);

        // Bestand-Eintrag erstellen
        const bestand = new Bestand({
          typ: 'zusatzinhaltsstoff',
          artikelId: inhaltsstoff._id,
          artikelModell: 'ZusatzInhaltsstoff',
          menge: Math.floor(Math.random() * 200) + 50, // Zufällige Menge zwischen 50-250g
          einheit: 'g',
          mindestbestand: inhaltsstoff.mindestbestand,
          letzteAktualisierung: new Date()
        });
        await bestand.save();

        console.log(`✅ ${inhaltsstoff.bezeichnung} erstellt (${bestand.menge}g)`);
      } catch (error) {
        console.error(`❌ Fehler bei ${inhaltsstoffData.bezeichnung}:`, error.message);
      }
    }

    console.log(`\n🎉 ${erstellteInhaltsstoffe.length} Zusatzinhaltsstoffe erfolgreich erstellt!`);
    
    // Zusammenfassung anzeigen
    console.log('\n📊 Übersicht der erstellten Zusatzinhaltsstoffe:');
    for (const inhaltsstoff of erstellteInhaltsstoffe) {
      console.log(`   • ${inhaltsstoff.bezeichnung} (${inhaltsstoff.typ}) - ${inhaltsstoff.preisProGramm.toFixed(4)}€/g`);
    }

    console.log('\n💡 Nächste Schritte:');
    console.log('   1. Frontend starten und Zusatzinhaltsstoffe-Verwaltung öffnen');
    console.log('   2. Portfolio-Produkte mit Zusatzinhaltsstoffen erweitern');
    console.log('   3. Warenberechnungen aktualisieren');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Zusatzinhaltsstoffe:', error);
  } finally {
    console.log('🔌 Schließe MongoDB-Verbindung...');
    await mongoose.connection.close();
    console.log('✅ Fertig!');
  }
}

// Ausführen wenn direkt aufgerufen
if (require.main === module) {
  createExampleZusatzinhaltsstoffe();
}

module.exports = { createExampleZusatzinhaltsstoffe, beispielInhaltsstoffe };