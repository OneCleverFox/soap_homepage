// Script zum Prüfen der Production Environment Variables
// Führe dieses Script auf Railway aus um zu sehen welche ENV-Vars gesetzt sind

console.log('🔍 PRODUCTION ENVIRONMENT CHECK');
console.log('================================');

const requiredVars = [
  'NODE_ENV',
  'PORT', 
  'MONGODB_URI',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_MODE',
  'FRONTEND_URL'
];

console.log('\n📊 Environment Variables Status:');
console.log('================================');

let missingVars = [];
let weakVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const maskedValue = value ? 
    (value.length > 20 ? value.substring(0, 10) + '...' + value.substring(value.length - 5) : 
     value.substring(0, 10) + '...') : 
    'NOT SET';
  
  console.log(`${status} ${varName}: ${maskedValue}`);
  
  if (!value) {
    missingVars.push(varName);
  } else if (varName === 'JWT_SECRET' && value.length < 32) {
    weakVars.push(`${varName} (zu kurz: ${value.length} Zeichen)`);
  }
});

console.log('\n🔐 Security Check:');
console.log('==================');

if (missingVars.length > 0) {
  console.log('❌ Fehlende Environment Variables:');
  missingVars.forEach(var => console.log(`   - ${var}`));
}

if (weakVars.length > 0) {
  console.log('⚠️ Schwache Environment Variables:');
  weakVars.forEach(var => console.log(`   - ${var}`));
}

if (missingVars.length === 0 && weakVars.length === 0) {
  console.log('✅ Alle Environment Variables korrekt gesetzt!');
}

console.log('\n🌍 Current Environment:');
console.log('=======================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Platform: ${process.env.RAILWAY_ENVIRONMENT || 'Unknown'}`);
console.log(`Git Commit: ${process.env.RAILWAY_GIT_COMMIT_SHA || 'Unknown'}`);

// Zusätzliche Railway-spezifische Checks
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('\n🚂 Railway Environment Detected');
  console.log('Railway Project:', process.env.RAILWAY_PROJECT_NAME || 'Unknown');
  console.log('Railway Service:', process.env.RAILWAY_SERVICE_NAME || 'Unknown');
}

// MongoDB Connection Test (ohne sensible Daten zu loggen)
if (process.env.MONGODB_URI) {
  console.log('\n🗄️ MongoDB URI Check:');
  const uri = process.env.MONGODB_URI;
  if (uri.includes('mongodb+srv://')) {
    console.log('✅ Using MongoDB Atlas (SRV connection)');
  } else if (uri.includes('mongodb://')) {
    console.log('⚠️ Using standard MongoDB connection');
  }
  
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.log('❌ WARNING: Using localhost MongoDB in production!');
  }
}