const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testBestand() {
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'ralle.jacob84@googlemail.com',
      password: 'Lieblingsmensch'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Get Bestand
    console.log('\n📦 Loading Bestand...');
    const bestandResponse = await axios.get(`${API_URL}/lager/bestand`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n📊 Bestand Data:');
    console.log(JSON.stringify(bestandResponse.data, null, 2));
    
    // 3. Statistics
    const data = bestandResponse.data.data;
    console.log('\n📈 Statistics:');
    console.log(`  Rohseifen: ${data.rohseifen?.length || 0}`);
    console.log(`  Duftöle: ${data.duftoele?.length || 0}`);
    console.log(`  Verpackungen: ${data.verpackungen?.length || 0}`);
    console.log(`  Produkte: ${data.produkte?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBestand();
