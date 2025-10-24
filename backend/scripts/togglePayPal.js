const mongoose = require('mongoose');
const AdminSettings = require('../src/models/AdminSettings');

// MongoDB-Verbindung
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/soapshop', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function togglePayPal() {
  try {
    console.log('🔧 PayPal Status ändern...');
    
    // Kommandozeilenargument prüfen
    const action = process.argv[2]; // enable, disable, sandbox, live
    
    if (!action || !['enable', 'disable', 'sandbox', 'live'].includes(action)) {
      console.log('❌ Ungültiger Parameter!');
      console.log('💡 Verwendung:');
      console.log('   node togglePayPal.js enable   - PayPal aktivieren (Sandbox)');
      console.log('   node togglePayPal.js disable  - PayPal deaktivieren');
      console.log('   node togglePayPal.js sandbox  - PayPal Sandbox-Modus');
      console.log('   node togglePayPal.js live     - PayPal Live-Modus');
      process.exit(1);
    }
    
    // Admin Settings laden oder erstellen
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = new AdminSettings();
      console.log('📝 Neue Admin-Einstellungen erstellt');
    }
    
    // PayPal-Modus setzen
    switch (action) {
      case 'enable':
        settings.paypal.mode = 'sandbox';
        console.log('✅ PayPal aktiviert (Sandbox-Modus)');
        break;
      case 'disable':
        settings.paypal.mode = 'disabled';
        console.log('❌ PayPal deaktiviert');
        break;
      case 'sandbox':
        settings.paypal.mode = 'sandbox';
        console.log('🧪 PayPal Sandbox-Modus aktiviert');
        break;
      case 'live':
        settings.paypal.mode = 'live';
        console.log('🚀 PayPal Live-Modus aktiviert');
        break;
    }
    
    await settings.save();
    console.log('💾 PayPal-Konfiguration gespeichert');
    
    // Status der Umgebungsvariablen prüfen
    if (settings.paypal.mode !== 'disabled') {
      const requiredEnvVars = settings.paypal.mode === 'live' 
        ? ['PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET']
        : ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET'];
      
      console.log('');
      console.log('🔍 Prüfe erforderliche Umgebungsvariablen:');
      requiredEnvVars.forEach(envVar => {
        const isSet = !!process.env[envVar];
        console.log(`   ${envVar}: ${isSet ? '✅ Gesetzt' : '❌ NICHT GESETZT'}`);
      });
      
      const allSet = requiredEnvVars.every(envVar => !!process.env[envVar]);
      if (!allSet) {
        console.log('');
        console.log('⚠️  WARNUNG: Nicht alle erforderlichen Umgebungsvariablen sind gesetzt!');
        console.log('   PayPal funktioniert möglicherweise nicht korrekt.');
      }
    }
    
    console.log('');
    console.log('🎉 PayPal-Status erfolgreich geändert!');
    console.log('💳 Aktueller Modus:', settings.paypal.mode);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Ändern des PayPal-Status:', error);
    process.exit(1);
  }
}

togglePayPal();