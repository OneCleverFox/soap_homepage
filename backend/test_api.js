const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3N2Y3M2VjZGFlNmM2NzNhNjBlOTU5NiIsInVzZXJJZCI6IjY3N2Y3M2VjZGFlNmM2NzNhNjBlOTU5NiIsIl9pZCI6IjY3N2Y3M2VjZGFlNmM2NzNhNjBlOTU5NiIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6InJqMTg0MDFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzQxNzM4MTQ2LCJpYXQiOjE3MzYzOTgxNDZ9.tAJU0_aGUrydQxE1cNNhYXNW7eTOOYFz84_N-uE6RQI';

const inventurData = {
  typ: 'fertigprodukt',
  artikelId: '68df9c6418a3c02576b5ca06', // freche Biene ID
  neuerBestand: 4,  // Von 2 auf 4 erhöhen
  notizen: 'Test-Inventur zur Rohstoff-Subtraktion'
};

console.log('📋 Teste Inventur API mit Daten:', inventurData);

fetch('http://localhost:5000/api/lager/inventur-new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(inventurData)
})
.then(response => response.json())
.then(data => {
  console.log('✅ API Response:', data);
})
.catch(error => {
  console.error('❌ Fehler:', error);
});