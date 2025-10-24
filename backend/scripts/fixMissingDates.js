/**
 * Repariere fehlende erstelltAm Felder in bestehenden Bestellungen
 */

// Environment-Variablen laden
require('dotenv').config({ path: '.env.development' });

const mongoose = require('mongoose');
const Order = require('../src/models/Order');

// MongoDB Verbindung
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soap_homepage';

async function fixMissingCreatedDates() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Mit MongoDB verbunden');

    // Finde Bestellungen ohne erstelltAm
    const ordersWithoutDate = await Order.find({ 
      $or: [
        { erstelltAm: { $exists: false } },
        { erstelltAm: null }
      ] 
    });

    console.log(`🔍 Gefunden: ${ordersWithoutDate.length} Bestellungen ohne erstelltAm`);

    let fixed = 0;
    for (const order of ordersWithoutDate) {
      // Verwende _id ObjectId Zeitstempel als Fallback
      const fallbackDate = order._id.getTimestamp();
      
      order.erstelltAm = fallbackDate;
      await order.save();
      
      console.log(`✅ Bestellung ${order.bestellnummer} repariert: ${fallbackDate}`);
      fixed++;
    }

    console.log(`🎉 ${fixed} Bestellungen erfolgreich repariert!`);

  } catch (error) {
    console.error('❌ Fehler beim Reparieren der Bestellungen:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

// Skript ausführen
if (require.main === module) {
  fixMissingCreatedDates();
}

module.exports = { fixMissingCreatedDates };