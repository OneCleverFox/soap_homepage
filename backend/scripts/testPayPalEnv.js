// Lade .env-Datei
require('dotenv').config();

// PayPal Test Script - direkt ausführbar ohne MongoDB
console.log('💳 PayPal Umgebungsvariablen Test');
console.log('=================================');

console.log('🔍 Umgebungsvariablen:');
console.log('PAYPAL_CLIENT_ID (alt):', process.env.PAYPAL_CLIENT_ID ? '✅ Gesetzt' : '❌ NICHT GESETZT');
console.log('PAYPAL_CLIENT_SECRET (alt):', process.env.PAYPAL_CLIENT_SECRET ? '✅ Gesetzt' : '❌ NICHT GESETZT');
console.log('PAYPAL_SANDBOX_CLIENT_ID (neu):', process.env.PAYPAL_SANDBOX_CLIENT_ID ? '✅ Gesetzt' : '❌ NICHT GESETZT');
console.log('PAYPAL_SANDBOX_CLIENT_SECRET (neu):', process.env.PAYPAL_SANDBOX_CLIENT_SECRET ? '✅ Gesetzt' : '❌ NICHT GESETZT');
console.log('PAYPAL_LIVE_CLIENT_ID:', process.env.PAYPAL_LIVE_CLIENT_ID ? '✅ Gesetzt' : '❌ NICHT GESETZT');
console.log('PAYPAL_LIVE_CLIENT_SECRET:', process.env.PAYPAL_LIVE_CLIENT_SECRET ? '✅ Gesetzt' : '❌ NICHT GESETZT');

console.log('');
console.log('📋 Sandbox Credentials (Service-Logik):');
const sandboxClientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
const sandboxClientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

if (sandboxClientId && sandboxClientSecret) {
  console.log('✅ Sandbox Credentials vollständig');
  console.log('Client ID:', sandboxClientId.substring(0, 20) + '...');
  console.log('Secret:', sandboxClientSecret.substring(0, 20) + '...');
  console.log('Quelle:', process.env.PAYPAL_SANDBOX_CLIENT_ID ? 'Neue Variablen' : 'Alte Variablen');
} else {
  console.log('❌ Sandbox Credentials unvollständig');
}

console.log('');
console.log('📋 Live Credentials:');
if (process.env.PAYPAL_LIVE_CLIENT_ID && process.env.PAYPAL_LIVE_CLIENT_SECRET) {
  console.log('✅ Live Credentials vollständig');
  console.log('Client ID:', process.env.PAYPAL_LIVE_CLIENT_ID.substring(0, 20) + '...');
  console.log('Secret:', process.env.PAYPAL_LIVE_CLIENT_SECRET.substring(0, 20) + '...');
} else {
  console.log('❌ Live Credentials unvollständig');
}

console.log('');
console.log('💡 Status:');
if (sandboxClientId && sandboxClientSecret) {
  console.log('✅ PayPal kann im Sandbox-Modus betrieben werden');
} else {
  console.log('⚠️  Keine gültigen PayPal-Credentials gefunden');
}