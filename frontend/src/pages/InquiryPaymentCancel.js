import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  Card,
  CardContent
} from '@mui/material';
import {
  Cancel,
  Assignment
} from '@mui/icons-material';

const InquiryPaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Cancel sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Zahlung abgebrochen
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Sie haben die Zahlung abgebrochen. Keine Sorge, Ihre Anfrage bleibt bestehen.
          </Typography>
          <Alert severity="info" sx={{ my: 3 }}>
            Sie können die Zahlung jederzeit in Ihren Anfragen nachholen.
          </Alert>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Assignment />}
              onClick={() => navigate('/customer-inquiries')}
            >
              Zu meinen Anfragen
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
            >
              Zur Startseite
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default InquiryPaymentCancel;