// Test Dashboard API
const axios = require('axios');

async function testDashboardAPI() {
  try {
    console.log('🔍 Teste Dashboard API...');
    
    // Direkter API-Aufruf ohne Auth für Test
    const response = await axios.get('http://localhost:5000/api/dashboard/overview', {
      headers: {
        'Authorization': 'Bearer test', // Fake token für Test
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dashboard API Response:', response.data);
  } catch (error) {
    console.log('❌ Dashboard API Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testDashboardAPI();