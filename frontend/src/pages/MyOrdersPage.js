import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper
} from '@mui/material';
import {
  Receipt
} from '@mui/icons-material';
import OrderHistory from '../components/OrderHistory';

const MyOrdersPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Receipt sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Meine Bestellungen
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Hier finden Sie eine Übersicht über all Ihre Bestellungen. Sie können den Status verfolgen, 
          Rechnungen herunterladen und bei ausstehenden Zahlungen den Bezahlvorgang abschließen.
        </Typography>

        <OrderHistory />
      </Paper>
    </Container>
  );
};

export default MyOrdersPage;