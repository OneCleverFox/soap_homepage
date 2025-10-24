const mongoose = require('mongoose');
const AdminSettings = require('../src/models/AdminSettings');

// MongoDB-Verbindung
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/soapshop', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setupPayPalDev() {
  try {
    console.log('🔧 PayPal Entwicklungs-Setup startet...');
    
    // Admin Settings laden oder erstellen
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = new AdminSettings();
      console.log('📝 Neue Admin-Einstellungen erstellt');
    }
    
    // PayPal auf Sandbox setzen (Credentials kommen aus ENV)
    settings.paypal.mode = 'sandbox';
    
    // Prüfe ob Umgebungsvariablen gesetzt sind
    const sandboxClientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const sandboxClientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    
    if (!sandboxClientId || !sandboxClientSecret) {
      console.log('❌ PayPal Sandbox Credentials nicht in Umgebungsvariablen gefunden!');
      console.log('💡 Bitte setze diese Umgebungsvariablen:');
      console.log('   PAYPAL_SANDBOX_CLIENT_ID=<deine-sandbox-client-id>');
      console.log('   PAYPAL_SANDBOX_CLIENT_SECRET=<deine-sandbox-client-secret>');
      console.log('');
      console.log('💳 PayPal wird auf "disabled" gesetzt');
      settings.paypal.mode = 'disabled';
    } else {
      console.log('✅ PayPal Sandbox Credentials in Umgebungsvariablen gefunden');
      console.log('💳 PayPal Sandbox-Modus aktiviert');
    }
    
    await settings.save();
    console.log('💾 PayPal-Konfiguration gespeichert');
    
    console.log('');
    console.log('🎉 Setup abgeschlossen!');
    console.log('💳 PayPal-Modus:', settings.paypal.mode);
    
    if (settings.paypal.mode === 'disabled') {
      console.log('');
      console.log('🚨 HINWEIS: PayPal ist deaktiviert, da keine Credentials gefunden wurden');
      console.log('   Setze die Umgebungsvariablen und führe das Script erneut aus');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Setup:', error);
    process.exit(1);
  }
}

setupPayPalDev();