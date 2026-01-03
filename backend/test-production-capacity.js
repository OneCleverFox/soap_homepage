// Test-Skript für Produktionskapazitäts-API
// Ohne Server-Start, nur Logik-Test

const Portfolio = require('./src/models/Portfolio');
const Rohseife = require('./src/models/Rohseife');
const Duftoil = require('./src/models/Duftoil');
const Verpackung = require('./src/models/Verpackung');
const mongoose = require('mongoose');

// Simuliere Daten für Test
const mockPortfolioProdukte = [
  {
    _id: "portfolio1",
    name: "Lavendel Seife Classic",
    seife: "Kernseife",
    aroma: "Lavendel",
    verpackung: "Kleine Schachtel",
    gramm: 100,
    aktiv: true
  },
  {
    _id: "portfolio2", 
    name: "Rose Luxury Seife",
    seife: "Glycerinseife",
    aroma: "Rose",
    verpackung: "Große Schachtel",
    gramm: 150,
    aktiv: true
  },
  {
    _id: "portfolio3",
    name: "Neutrale Seife",
    seife: "Kernseife", 
    aroma: "Neutral",
    verpackung: "Kleine Schachtel",
    gramm: 80,
    aktiv: true
  }
];

const mockRohseifen = [
  {
    bezeichnung: "Kernseife",
    aktuellVorrat: 5000, // 5kg
    preisProGramm: 0.02,
    verfuegbar: true
  },
  {
    bezeichnung: "Glycerinseife", 
    aktuellVorrat: 1200, // 1.2kg
    preisProGramm: 0.05,
    verfuegbar: true
  }
];

const mockDuftoele = [
  {
    bezeichnung: "Lavendel",
    aktuellVorrat: 800, // Tropfen
    kostenProTropfen: 0.01,
    verfuegbar: true
  },
  {
    bezeichnung: "Rose",
    aktuellVorrat: 150, // Tropfen
    kostenProTropfen: 0.03,
    verfuegbar: true
  }
];

const mockVerpackungen = [
  {
    bezeichnung: "Kleine Schachtel",
    aktuellVorrat: 25,
    kostenProStueck: 0.15,
    verfuegbar: true
  },
  {
    bezeichnung: "Große Schachtel",
    aktuellVorrat: 8,
    kostenProStueck: 0.25,
    verfuegbar: true
  }
];

// Analysiert die Produktionskapazität für ein einzelnes Produkt
function analysiereProduktionskapazitaet(produkt, rohseifen, duftoele, verpackungen) {
  const analyse = {
    produktId: produkt._id,
    produktName: produkt.name,
    seife: produkt.seife,
    aroma: produkt.aroma,
    verpackung: produkt.verpackung,
    grammProEinheit: produkt.gramm,
    rohstoffBedarf: [],
    limitierenderFaktor: null,
    maxProduktion: 0,
    probleme: []
  };
  
  let minProduktion = Infinity;
  
  // 1. Rohseife analysieren
  const rohseife = rohseifen.find(r => 
    r.bezeichnung.toLowerCase() === produkt.seife.toLowerCase() ||
    r.bezeichnung.toLowerCase().includes(produkt.seife.toLowerCase()) ||
    produkt.seife.toLowerCase().includes(r.bezeichnung.toLowerCase())
  );
  
  if (rohseife) {
    const benoetigt = produkt.gramm; // Gramm pro Produkt
    const verfuegbar = rohseife.aktuellVorrat;
    const maxProduktionRohseife = Math.floor(verfuegbar / benoetigt);
    
    analyse.rohstoffBedarf.push({
      typ: 'rohseife',
      name: rohseife.bezeichnung,
      benoetigt: benoetigt,
      einheit: 'g',
      verfuegbar: verfuegbar,
      maxProduktion: maxProduktionRohseife,
      ausreichend: verfuegbar >= benoetigt
    });
    
    if (maxProduktionRohseife < minProduktion) {
      minProduktion = maxProduktionRohseife;
      analyse.limitierenderFaktor = 'rohseife';
    }
  } else {
    analyse.probleme.push(`Rohseife "${produkt.seife}" nicht gefunden`);
    minProduktion = 0;
  }
  
  // 2. Duftöl analysieren (falls erforderlich)
  if (produkt.aroma && produkt.aroma !== 'Neutral' && produkt.aroma !== '' && produkt.aroma !== 'Keine') {
    const duftoel = duftoele.find(d => 
      d.bezeichnung.toLowerCase() === produkt.aroma.toLowerCase() ||
      d.bezeichnung.toLowerCase().includes(produkt.aroma.toLowerCase()) ||
      produkt.aroma.toLowerCase().includes(d.bezeichnung.toLowerCase())
    );
    
    if (duftoel) {
      // Dosierung: 1 Tropfen pro 50g Seife
      const tropfenProEinheit = Math.ceil(produkt.gramm / 50);
      const verfuegbareTropfen = duftoel.aktuellVorrat;
      const maxProduktionDuftoel = Math.floor(verfuegbareTropfen / tropfenProEinheit);
      
      analyse.rohstoffBedarf.push({
        typ: 'duftoel',
        name: duftoel.bezeichnung,
        benoetigt: tropfenProEinheit,
        einheit: 'Tropfen',
        verfuegbar: verfuegbareTropfen,
        maxProduktion: maxProduktionDuftoel,
        ausreichend: verfuegbareTropfen >= tropfenProEinheit,
        dosierung: '1 Tropfen pro 50g'
      });
      
      if (maxProduktionDuftoel < minProduktion) {
        minProduktion = maxProduktionDuftoel;
        analyse.limitierenderFaktor = 'duftoel';
      }
    } else {
      analyse.probleme.push(`Duftöl "${produkt.aroma}" nicht gefunden`);
      // Duftöl ist optional - setze minProduktion nur auf 0 wenn bereits 0
      if (minProduktion === Infinity) minProduktion = 0;
    }
  }
  
  // 3. Verpackung analysieren
  const verpackung = verpackungen.find(v => 
    v.bezeichnung.toLowerCase() === produkt.verpackung.toLowerCase() ||
    v.bezeichnung.toLowerCase().includes(produkt.verpackung.toLowerCase()) ||
    produkt.verpackung.toLowerCase().includes(v.bezeichnung.toLowerCase())
  );
  
  if (verpackung) {
    const verfuegbareVerpackungen = verpackung.aktuellVorrat;
    const maxProduktionVerpackung = verfuegbareVerpackungen; // 1 Verpackung pro Produkt
    
    analyse.rohstoffBedarf.push({
      typ: 'verpackung',
      name: verpackung.bezeichnung,
      benoetigt: 1,
      einheit: 'Stück',
      verfuegbar: verfuegbareVerpackungen,
      maxProduktion: maxProduktionVerpackung,
      ausreichend: verfuegbareVerpackungen >= 1
    });
    
    if (maxProduktionVerpackung < minProduktion) {
      minProduktion = maxProduktionVerpackung;
      analyse.limitierenderFaktor = 'verpackung';
    }
  } else {
    analyse.probleme.push(`Verpackung "${produkt.verpackung}" nicht gefunden`);
    minProduktion = 0;
  }
  
  // Endgültige maximale Produktion setzen
  analyse.maxProduktion = minProduktion === Infinity ? 0 : minProduktion;
  
  return analyse;
}

// Erstellt eine Zusammenfassung der Produktionsanalyse
function erstelleProduktionsZusammenfassung(produktionsAnalyse) {
  const gesamt = produktionsAnalyse.length;
  const produzierbar = produktionsAnalyse.filter(p => p.maxProduktion > 0).length;
  const nichtProduzierbar = gesamt - produzierbar;
  
  // Limitierende Faktoren zählen
  const limitierungGruende = {};
  produktionsAnalyse.forEach(p => {
    if (p.limitierenderFaktor) {
      limitierungGruende[p.limitierenderFaktor] = (limitierungGruende[p.limitierenderFaktor] || 0) + 1;
    }
  });
  
  // Top 5 Produkte mit höchster Produktionskapazität
  const topProduktion = produktionsAnalyse
    .filter(p => p.maxProduktion > 0)
    .sort((a, b) => b.maxProduktion - a.maxProduktion)
    .slice(0, 5)
    .map(p => ({
      name: p.produktName,
      maxProduktion: p.maxProduktion,
      limitierenderFaktor: p.limitierenderFaktor
    }));
  
  // Kritische Produkte (nicht produzierbar oder sehr niedrige Kapazität)
  const kritisch = produktionsAnalyse
    .filter(p => p.maxProduktion <= 5)
    .map(p => ({
      name: p.produktName,
      maxProduktion: p.maxProduktion,
      probleme: p.probleme,
      limitierenderFaktor: p.limitierenderFaktor
    }));
  
  return {
    uebersicht: {
      gesamtProdukte: gesamt,
      produzierbar: produzierbar,
      nichtProduzierbar: nichtProduzierbar,
      produktionsrate: Math.round((produzierbar / gesamt) * 100)
    },
    limitierungen: limitierungGruende,
    topProduktion: topProduktion,
    kritischeProdukte: kritisch
  };
}

// Haupttestfunktion
function testProduktionsKapazitaetsAnalyse() {
  console.log('🧪 Teste Produktionskapazitäts-Analyse...\n');
  
  const produktionsAnalyse = [];
  
  // Analysiere jedes Produkt
  for (const produkt of mockPortfolioProdukte) {
    const analyse = analysiereProduktionskapazitaet(
      produkt, 
      mockRohseifen, 
      mockDuftoele, 
      mockVerpackungen
    );
    produktionsAnalyse.push(analyse);
    
    console.log(`📦 ${produkt.name}:`);
    console.log(`   Max. Produktion: ${analyse.maxProduktion} Stück`);
    console.log(`   Limitierender Faktor: ${analyse.limitierenderFaktor || 'keiner'}`);
    
    if (analyse.probleme.length > 0) {
      console.log(`   ⚠️ Probleme: ${analyse.probleme.join(', ')}`);
    }
    
    console.log('   Rohstoffbedarf:');
    analyse.rohstoffBedarf.forEach(r => {
      const statusIcon = r.ausreichend ? '✅' : '❌';
      console.log(`     ${statusIcon} ${r.name}: ${r.benoetigt}${r.einheit} (verfügbar: ${r.verfuegbar}) → Max: ${r.maxProduktion} Stück`);
    });
    console.log('');
  }
  
  // Sortiere nach Produktionskapazität
  produktionsAnalyse.sort((a, b) => a.maxProduktion - b.maxProduktion);
  
  // Erstelle Zusammenfassung
  const zusammenfassung = erstelleProduktionsZusammenfassung(produktionsAnalyse);
  
  console.log('📊 ZUSAMMENFASSUNG:');
  console.log(`   Gesamt: ${zusammenfassung.uebersicht.gesamtProdukte} Produkte`);
  console.log(`   Produzierbar: ${zusammenfassung.uebersicht.produzierbar} (${zusammenfassung.uebersicht.produktionsrate}%)`);
  console.log(`   Nicht produzierbar: ${zusammenfassung.uebersicht.nichtProduzierbar}`);
  console.log('');
  
  console.log('🔴 LIMITIERENDE FAKTOREN:');
  Object.entries(zusammenfassung.limitierungen).forEach(([faktor, anzahl]) => {
    console.log(`   ${faktor}: ${anzahl} Produkte`);
  });
  console.log('');
  
  console.log('🏆 TOP PRODUKTION:');
  zusammenfassung.topProduktion.forEach((p, i) => {
    console.log(`   ${i+1}. ${p.name}: ${p.maxProduktion} Stück (limitiert durch ${p.limitierenderFaktor})`);
  });
  console.log('');
  
  if (zusammenfassung.kritischeProdukte.length > 0) {
    console.log('⚠️ KRITISCHE PRODUKTE (≤5 Stück):');
    zusammenfassung.kritischeProdukte.forEach(p => {
      console.log(`   ${p.name}: ${p.maxProduktion} Stück`);
      if (p.probleme.length > 0) {
        console.log(`     Probleme: ${p.probleme.join(', ')}`);
      }
    });
  }
  
  console.log('\n✅ Test abgeschlossen!');
  
  return {
    produkte: produktionsAnalyse,
    zusammenfassung: zusammenfassung,
    generiert: new Date()
  };
}

// Test ausführen
const ergebnis = testProduktionsKapazitaetsAnalyse();