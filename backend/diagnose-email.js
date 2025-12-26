require('dotenv').config(); // .env-Datei laden
const { Resend } = require('resend');

console.log('🔍 [E-Mail Diagnose] Prüfe E-Mail-Konfiguration...\n');

// 1. Umgebungsvariablen prüfen
const apiKey = process.env.RESEND_API_KEY;
console.log('1. API-Key Status:');
console.log('   RESEND_API_KEY:', apiKey ? 
  `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} Zeichen)` : 
  'NICHT GESETZT ❌'
);

if (!apiKey) {
  console.log('\n❌ PROBLEM: RESEND_API_KEY ist nicht gesetzt!');
  console.log('📝 LÖSUNG:');
  console.log('   1. Gehen Sie zu https://resend.com (kostenlos bis 3000 E-Mails/Monat)');
  console.log('   2. Erstellen Sie einen Account');
  console.log('   3. API Key generieren');
  console.log('   4. In backend/.env RESEND_API_KEY=re_xxxxx setzen');
  process.exit(1);
}

// 2. API-Key testen
console.log('\n2. API-Key Test:');
const resend = new Resend(apiKey);

async function testAPIKey() {
  try {
    console.log('   📡 Teste Verbindung zu Resend API...');
    
    // Teste mit einer einfachen Domain-Abfrage
    const result = await resend.domains.list();
    console.log('   ✅ API-Key ist gültig!');
    console.log('   📋 Domains:', result.data?.data?.length || 0);
    
    return true;
  } catch (error) {
    console.log('   ❌ API-Key Test fehlgeschlagen:');
    console.log('   📝 Fehler:', error.message);
    
    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      console.log('\n🔧 LÖSUNG: API-Key ist ungültig oder falsch formatiert');
      console.log('   1. Prüfen Sie den Key auf https://resend.com/api-keys');
      console.log('   2. Key muss mit "re_" beginnen');
      console.log('   3. Neuen Key generieren falls nötig');
    }
    
    return false;
  }
}

async function testEmail() {
  console.log('\n3. E-Mail Test:');
  try {
    const { data, error } = await resend.emails.send({
      from: 'test@resend.dev', // Resend Test-Domain
      to: ['ralle.jacob84@googlemail.com'],
      subject: '🧪 Test E-Mail von Gluecksmomente Seifenmanufaktur',
      html: '<h1>Test erfolgreich!</h1><p>Ihr E-Mail-Service funktioniert korrekt.</p>'
    });

    if (error) {
      console.log('   ❌ E-Mail-Versand fehlgeschlagen:', error);
      return false;
    }

    console.log('   ✅ Test-E-Mail gesendet!');
    console.log('   📩 Message ID:', data?.id);
    return true;
  } catch (error) {
    console.log('   ❌ E-Mail-Test Fehler:', error.message);
    return false;
  }
}

async function runDiagnose() {
  const apiValid = await testAPIKey();
  
  if (apiValid) {
    await testEmail();
  }
  
  console.log('\n📋 ZUSAMMENFASSUNG:');
  console.log('   - Für kostenlosen Service: https://resend.com (3000 E-Mails/Monat)');
  console.log('   - Nach API-Key Setup: Backend neu starten');
  console.log('   - Test-E-Mails verwenden test@resend.dev als Absender');
}

runDiagnose();