/**
 * Script zum Hinzufügen individueller Beschreibungen für alle Seifen im Portfolio
 * Ausführen mit: node backend/scripts/updateProductDescriptions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');

// Individuelle Beschreibungen für jede Seife
const productDescriptions = [
  {
    name: 'Zen Garten',
    beschreibung: {
      kurz: 'Beruhigende Lavendelseife für innere Ruhe und entspannte Momente wie in einem japanischen Garten.',
      lang: 'Unsere Zen Garten Seife bringt die meditative Ruhe eines japanischen Gartens in Ihr Badezimmer. Der sanfte Duft von echtem Lavendel wirkt beruhigend auf Körper und Geist und hilft, den Stress des Alltags loszulassen. Die zarte rosa Färbung entsteht durch natürliche Pflanzenfarbstoffe. Jede Seife wird mit Achtsamkeit handgefertigt und enthält nur ausgewählte natürliche Zutaten.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Sheabutter, Lavendelöl (ätherisch), Lavendelblüten, Rosa Tonerde, Natronlauge, destilliertes Wasser',
      anwendung: 'Die Seife sanft auf der angefeuchteten Haut aufschäumen und mit warmem Wasser abspülen. Besonders wohltuend am Abend für ein entspannendes Ritual. Auch als Raumduft im Kleiderschrank geeignet.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Mit echten Lavendelblüten • Beruhigend für Haut und Sinne • Rosa Tonerde'
    },
    weblink: 'https://drive.google.com/file/d/zen-garten-doku'
  },
  {
    name: 'Vanilla Dream',
    beschreibung: {
      kurz: 'Cremige Aloe-Vera-Seife mit zartem Vanilleduft für samtige, gepflegte Haut.',
      lang: 'Die Vanilla Dream Seife vereint die pflegenden Eigenschaften von Aloe Vera mit dem süßen, wohligen Duft natürlicher Vanille. Aloe Vera spendet intensive Feuchtigkeit und beruhigt die Haut, während die Vanille ein Gefühl von Geborgenheit und Wärme vermittelt. Ein kleiner Luxus für die tägliche Pflegeroutine.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Aloe Vera Gel, Sheabutter, Vanilleextrakt, natürliche Vanillearoma, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen, sanft einmassieren und mit lauwarmem Wasser abspülen. Ideal für die tägliche Gesichts- und Körperpflege. Besonders für normale bis trockene Haut geeignet.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Mit Aloe Vera • Feuchtigkeitsspendend • Süßer Vanilleduft'
    },
    weblink: 'https://drive.google.com/file/d/vanilla-dream-doku'
  },
  {
    name: 'süsses Gold',
    beschreibung: {
      kurz: 'Luxuriöse Honigseife mit Vanille für intensive Pflege und goldenen Glanz.',
      lang: 'Süsses Gold ist eine wahre Kostbarkeit für Ihre Haut. Die Kombination aus naturreinem Bienenhonig und süßer Vanille verwöhnt Ihre Sinne und spendet intensive Pflege. Honig ist seit Jahrhunderten für seine antibakteriellen und feuchtigkeitsspendenden Eigenschaften bekannt. Diese Seife hinterlässt ein seidig-weiches Hautgefühl und einen goldenen Schimmer.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Sheabutter, Bienenhonig, Vanilleextrakt, Haferflocken, Goldglimmer (kosmetisch), Natronlauge, destilliertes Wasser',
      anwendung: 'Sanft auf der feuchten Haut aufschäumen und mit lauwarmem Wasser abspülen. Täglich anwendbar. Der enthaltene Honig macht die Seife besonders pflegend für trockene Hautpartien.',
      besonderheiten: 'Vegetarisch • Handmade • Ohne Palmöl • Mit echtem Bienenhonig • Goldschimmer • Feuchtigkeitsspendend'
    },
    weblink: 'https://drive.google.com/file/d/suesses-gold-doku'
  },
  {
    name: 'Bienenseide',
    beschreibung: {
      kurz: 'Edle Sheabutter-Seife mit zartem Jasminduft für seidige, verwöhnte Haut.',
      lang: 'Bienenseide ist eine Hommage an die Kostbarkeit der Natur. Reichhaltige Sheabutter trifft auf den betörenden Duft von Jasmin und erschafft eine Seife, die Ihre Haut wie Seide umschmeichelt. Die cremige Textur und der luxuriöse Duft machen jede Anwendung zu einem besonderen Moment.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Sheabutter (20%), Jasminöl (ätherisch), Bienenwachs, Honig, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen und sanft einmassieren. Mit warmem Wasser abspülen. Besonders geeignet für trockene und reife Haut. Täglich anwendbar.',
      besonderheiten: 'Vegetarisch • Handmade • Ohne Palmöl • Hoher Sheabutter-Anteil • Jasminduft • Mit Bienenwachs'
    },
    weblink: 'https://drive.google.com/file/d/bienenseide-doku'
  },
  {
    name: 'weiße Orchidee',
    beschreibung: {
      kurz: 'Elegante Sheabutter-Seife mit exotischem Jasminduft für verwöhnende Momente.',
      lang: 'Die weiße Orchidee verkörpert Eleganz und Reinheit. Diese zarte Seife mit pflegender Sheabutter und dem exotischen Duft von Jasmin ist wie eine sanfte Umarmung für Ihre Haut. Perfekt für alle, die sich nach einem Hauch von Luxus im Alltag sehnen.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Sheabutter, Jasminöl (ätherisch), weiße Tonerde, Titandioxid (kosmetisch), Natronlauge, destilliertes Wasser',
      anwendung: 'Sanft auf der feuchten Haut verteilen und aufschäumen. Mit lauwarmem Wasser abspülen. Ideal für die tägliche Gesichts- und Körperpflege. Auch für sensible Haut geeignet.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Mit Sheabutter • Zarter Jasminduft • Weiße Tonerde'
    },
    weblink: 'https://drive.google.com/file/d/weisse-orchidee-doku'
  },
  {
    name: 'First Rule',
    beschreibung: {
      kurz: 'Kraftvolle Sandelholz-Seife mit maskulinem Charakter für selbstbewusste Männer.',
      lang: 'First Rule ist mehr als nur eine Seife - sie ist eine Lebenseinstellung. Der holzig-warme Duft von Sandelholz vermittelt Kraft und Selbstbewusstsein. Die rosa Färbung steht für die moderne Männlichkeit, die stark und sensibel zugleich sein darf. Perfekt für den Mann von heute.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Rizinusöl, Sandelholzöl (ätherisch), Zedernholzöl, Aktivkohle, Rosa Tonerde, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen, kräftig aufschäumen und gründlich abspülen. Besonders geeignet für die tägliche Körperpflege nach dem Sport. Auch als Rasierseife verwendbar.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Maskuliner Duft • Große 100g Seife • Mit Aktivkohle'
    },
    weblink: 'https://drive.google.com/file/d/first-rule-doku'
  },
  {
    name: 'Madagaskar',
    beschreibung: {
      kurz: 'Exotische Sheabutter-Vanille-Seife wie eine Reise auf die tropische Insel.',
      lang: 'Madagaskar entführt Sie auf eine Sinnesreise zur fernen Tropeninsel. Die edle Bourbon-Vanille aus Madagaskar vereint sich mit reichhaltiger Sheabutter zu einer Seife, die Fernweh und Entspannung zugleich vermittelt. Jede Anwendung ist wie ein kleiner Urlaub für die Sinne.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Sheabutter, Bourbon-Vanille aus Madagaskar, Vanilleextrakt, Kakaobutter, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen und sanft einmassieren. Mit warmem Wasser abspülen. Der intensive Vanilleduft bleibt noch lange auf der Haut spürbar.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Echte Bourbon-Vanille • Mit Kakaobutter • Exotischer Duft'
    },
    weblink: 'https://drive.google.com/file/d/madagaskar-doku'
  },
  {
    name: 'Eiszeit',
    beschreibung: {
      kurz: 'Erfrischende transparente Minzseife für einen coolen, belebenden Frischekick.',
      lang: 'Eiszeit ist der ultimative Frischekick! Die transparente Seife mit intensivem Minzöl wirkt erfrischend und belebend wie ein Sprung ins kühle Wasser. Perfekt für heiße Sommertage oder als Muntermacher am Morgen. Die klare Optik symbolisiert Reinheit und Klarheit.',
      inhaltsstoffe: 'Glycerin (pflanzlich), transparente Seifenbasis, Pfefferminzöl (ätherisch), Eukalyptusöl, Menthol, blaue Lebensmittelfarbe, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen und aufschäumen. Gründlich mit Wasser abspülen. Besonders erfrischend morgens oder nach dem Sport. Kühlend bei müden Beinen.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Intensive Minze • Transparente Optik • Kühlender Effekt'
    },
    weblink: 'https://drive.google.com/file/d/eiszeit-doku'
  },
  {
    name: 'Fresh Rule',
    beschreibung: {
      kurz: 'Belebende Minzseife für Frischefanatiker - der perfekte Energiekick.',
      lang: 'Fresh Rule ist die Powerseife für alle, die Frische lieben! Die Kombination aus kühlender Minze und der lebendigen rosa Farbe macht diese 100g Seife zum perfekten Begleiter für einen energiegeladenen Start in den Tag. Ideal auch nach dem Sport für ein erfrischendes Duscherlebnis.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Rizinusöl, Pfefferminzöl (ätherisch), Spearmintöl, Menthol, Rosa Tonerde, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen, kräftig aufschäumen und gründlich abspülen. Morgens für einen frischen Start oder nach dem Sport zur Erfrischung und Revitalisierung.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Doppel-Minze-Power • Große 100g Seife • Energiespendend'
    },
    weblink: 'https://drive.google.com/file/d/fresh-rule-doku'
  },
  {
    name: 'Black Iron',
    beschreibung: {
      kurz: 'Maskuline schwarze Seife mit Sandelholz und Aktivkohle für den modernen Mann.',
      lang: 'Black Iron ist die ultimative Männerseife. Schwarz wie Eisen, stark wie Stahl - diese Seife mit Aktivkohle reinigt porentief und entfernt Unreinheiten. Der edle Sandelholzduft unterstreicht den maskulinen Charakter. Für Männer, die Wert auf Qualität und markantes Design legen.',
      inhaltsstoffe: 'Olivenöl, Kokosöl, Rizinusöl, Aktivkohle, Sandelholzöl (ätherisch), Zedernholzöl, Teebaumöl, schwarze Tonerde, Natronlauge, destilliertes Wasser',
      anwendung: 'Auf die feuchte Haut auftragen und gründlich einmassieren. Kurz einwirken lassen und mit warmem Wasser abspülen. Aktivkohle reinigt porentief. 2-3 Mal wöchentlich für beste Ergebnisse.',
      besonderheiten: 'Vegan • Handmade • Ohne Palmöl • Mit Aktivkohle • Sandelholzduft • Porentiefe Reinigung'
    },
    weblink: 'https://drive.google.com/file/d/black-iron-doku'
  }
];

// MongoDB-Verbindung und Update-Funktion
async function updateProductDescriptions() {
  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB verbunden!\n');

    // Alle existierenden Produkte abrufen
    const existingProducts = await Portfolio.find({});
    console.log(`📦 ${existingProducts.length} Produkte in der Datenbank gefunden.\n`);

    let updateCount = 0;
    let notFoundCount = 0;

    // Für jede Beschreibung das passende Produkt suchen und updaten
    for (const desc of productDescriptions) {
      const product = existingProducts.find(p => p.name === desc.name);

      if (product) {
        console.log(`🔄 Update: ${product.name}`);
        
        // Update mit den neuen Beschreibungen
        await Portfolio.findByIdAndUpdate(product._id, {
          $set: {
            beschreibung: desc.beschreibung,
            weblink: desc.weblink
          }
        });
        
        updateCount++;
        console.log(`   ✅ Beschreibung hinzugefügt`);
      } else {
        notFoundCount++;
        console.log(`   ⚠️  Produkt "${desc.name}" nicht in DB gefunden - wird übersprungen`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${updateCount} Produkte erfolgreich aktualisiert`);
    if (notFoundCount > 0) {
      console.log(`⚠️  ${notFoundCount} Beschreibungen konnten keinem Produkt zugeordnet werden`);
    }
    console.log('='.repeat(50) + '\n');

    // Zeige aktualisierte Produkte
    console.log('📋 Aktualisierte Produkte:');
    const updatedProducts = await Portfolio.find({ 'beschreibung.kurz': { $exists: true } });
    updatedProducts.forEach(p => {
      console.log(`   • ${p.name}: ${p.beschreibung?.kurz?.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Update:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Datenbankverbindung geschlossen.');
  }
}

// Script ausführen
console.log('🚀 Starte Update der Produktbeschreibungen...\n');
updateProductDescriptions();
