import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { useCompanyInfo } from '../hooks/useCompanyInfo';
import { API_URL } from '../services/api';

const TestCompanyInfoPage = () => {
  const { companyInfo, loading, error } = useCompanyInfo();
  const [directApiTest, setDirectApiTest] = useState(null);

  useEffect(() => {
    // Direkter API-Test
    const testAPI = async () => {
      try {
        console.log('🧪 Direkter API-Test startet...');
        const response = await fetch(`${API_URL}/invoice/company-info`);
        const data = await response.json();
        setDirectApiTest(data);
        console.log('🧪 Direkter API-Test Ergebnis:', data);
      } catch (error) {
        console.error('🧪 Direkter API-Test Fehler:', error);
        setDirectApiTest({ error: error.message });
      }
    };
    testAPI();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Company Info API Test</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>🔗 API URL:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
          {API_URL}/invoice/company-info
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>📡 useCompanyInfo Hook Result:</Typography>
        <Typography variant="body2"><strong>Loading:</strong> {loading ? 'true' : 'false'}</Typography>
        <Typography variant="body2"><strong>Error:</strong> {error ? error.message : 'none'}</Typography>
        <Box sx={{ mt: 2, bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
          <pre>{JSON.stringify(companyInfo, null, 2)}</pre>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>🧪 Direct API Test Result:</Typography>
        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
          <pre>{JSON.stringify(directApiTest, null, 2)}</pre>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>📋 Extracted Data:</Typography>
        <Typography><strong>Name:</strong> {companyInfo.name || 'N/A'}</Typography>
        <Typography><strong>Email:</strong> {companyInfo.contact?.email || 'N/A'}</Typography>
        <Typography><strong>Phone:</strong> {companyInfo.contact?.phone || 'N/A'}</Typography>
        <Typography><strong>Street:</strong> {companyInfo.address?.street || 'N/A'}</Typography>
        <Typography><strong>City:</strong> {companyInfo.address?.city || 'N/A'}</Typography>
        <Typography><strong>CEO:</strong> {companyInfo.taxInfo?.ceo || 'N/A'}</Typography>
        <Typography><strong>VAT ID:</strong> {companyInfo.taxInfo?.vatId || 'N/A'}</Typography>
      </Paper>
    </Container>
  );
};

export default TestCompanyInfoPage;