const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Portfolio = require('../src/models/Portfolio');

async function checkMissingImages() {
  try {
    console.log('🔍 Verbinde mit Datenbank...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Verbindung hergestellt\n');

    const portfolioItems = await Portfolio.find({}).select('_id name bilder kategorie').lean();
    
    console.log(`📊 Gefundene Portfolio-Einträge: ${portfolioItems.length}\n`);

    const itemsWithoutMainImage = [];
    const itemsWithoutGallery = [];
    const itemsComplete = [];

    for (const item of portfolioItems) {
      const hasMainImage = !!(item.bilder?.hauptbild && item.bilder.hauptbild.trim()) || 
                           !!(item.bilder?.hauptbildData?.data && item.bilder.hauptbildData.contentType);
      const hasGalleryImages = item.bilder?.galerie && item.bilder.galerie.length > 0;

      if (!hasMainImage) {
        itemsWithoutMainImage.push({
          id: item._id,
          name: item.name,
          kategorie: item.kategorie
        });
      }

      if (!hasGalleryImages) {
        itemsWithoutGallery.push({
          id: item._id,
          name: item.name,
          kategorie: item.kategorie
        });
      }

      if (hasMainImage && hasGalleryImages) {
        itemsComplete.push({
          id: item._id,
          name: item.name,
          kategorie: item.kategorie
        });
      }
    }

    console.log('📋 ZUSAMMENFASSUNG:\n');
    console.log(`✅ Einträge mit Hauptbild UND Galerie: ${itemsComplete.length}`);
    console.log(`⚠️  Einträge OHNE Hauptbild: ${itemsWithoutMainImage.length}`);
    console.log(`⚠️  Einträge OHNE Galeriebilder: ${itemsWithoutGallery.length}\n`);

    if (itemsWithoutMainImage.length > 0) {
      console.log('❌ EINTRÄGE OHNE HAUPTBILD:');
      itemsWithoutMainImage.forEach(item => {
        console.log(`   - ${item.name} (${item.kategorie}) - ID: ${item.id}`);
      });
      console.log('');
    }

    if (itemsWithoutGallery.length > 0) {
      console.log('⚠️  EINTRÄGE OHNE GALERIEBILDER:');
      itemsWithoutGallery.forEach(item => {
        console.log(`   - ${item.name} (${item.kategorie}) - ID: ${item.id}`);
      });
      console.log('');
    }

    console.log('\n💡 EMPFEHLUNG:');
    console.log('Laden Sie Bilder für die betroffenen Produkte über die Admin-Oberfläche hoch:');
    console.log('https://gluecksmomente-manufaktur.vercel.app/admin/portfolio');

    await mongoose.connection.close();
    console.log('\n✅ Datenbankverbindung geschlossen');

  } catch (error) {
    console.error('❌ Fehler bei der Diagnose:', error);
    process.exit(1);
  }
}

checkMissingImages();
