/**
 * Admin-User für Testing erstellen
 */

// Environment-Variablen laden
require('dotenv').config({ path: '.env.development' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

// MongoDB Verbindung
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soap_homepage';

async function createAdminUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Mit MongoDB verbunden');

    // Prüfe ob Admin bereits existiert
    const existingAdmin = await User.findOne({ email: 'admin@gluecksmomente.de' });
    
    if (existingAdmin) {
      console.log('✅ Admin-User existiert bereits:', existingAdmin.email);
      console.log('🔑 Role:', existingAdmin.role);
      return;
    }

    // Admin-User erstellen mit korrektem Passwort-Format
    const plainPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@gluecksmomente.de',
      password: plainPassword, // Klartext für Validation, wird dann gehasht
      vorname: 'Admin',
      nachname: 'User',
      role: 'admin',
      isVerified: true,
      kundennummer: 'ADMIN001'
    });

    await adminUser.save();
    
    console.log('✅ Admin-User erfolgreich erstellt!');
    console.log('📧 Email: admin@gluecksmomente.de');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: admin');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Admin-Users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

// Skript ausführen
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };