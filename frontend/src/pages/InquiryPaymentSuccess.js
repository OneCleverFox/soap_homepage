import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle,
  Assignment
} from '@mui/icons-material';
import api from '../services/api';

const InquiryPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const processPayment = async () => {
      try {
        const inquiryId = searchParams.get('inquiryId');
        const orderId = searchParams.get('orderId');
        const paypalOrderId = searchParams.get('token');

        if (!inquiryId || !paypalOrderId) {
          setError('Fehlende Zahlungsinformationen');
          setLoading(false);
          return;
        }

        // PayPal-Zahlung abschließen - unterscheide zwischen normalen Anfragen und Bestellungen
        const endpoint = orderId 
          ? `/inquiries/${inquiryId}/capture-order-payment`
          : `/inquiries/${inquiryId}/capture-payment`;
          
        const response = await api.post(endpoint, {
          paypalOrderId
        });

        if (response.data.success) {
          setSuccess(true);
          setOrderNumber(response.data.orderNumber);
        } else {
          setError('Zahlung konnte nicht abgeschlossen werden');
        }
      } catch (error) {
        console.error('❌ Fehler beim Abschließen der Zahlung:', error);
        setError('Fehler beim Abschließen der Zahlung');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Zahlung wird verarbeitet...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {success ? (
            <>
              <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Zahlung erfolgreich!
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Vielen Dank für Ihre Zahlung. Ihre Anfrage wurde erfolgreich bezahlt.
              </Typography>
              {orderNumber && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Bestellnummer:</strong> {orderNumber}
                </Typography>
              )}
              <Alert severity="success" sx={{ my: 3 }}>
                Wir werden Ihre Bestellung umgehend bearbeiten und Sie über den Versandstatus informieren.
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
            </>
          ) : (
            <>
              <Typography variant="h4" color="error" gutterBottom>
                Zahlung fehlgeschlagen
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                {error || 'Unbekannter Fehler beim Abschließen der Zahlung'}
              </Typography>
              <Alert severity="error" sx={{ my: 3 }}>
                Bitte versuchen Sie es erneut oder kontaktieren Sie unseren Support.
              </Alert>
              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
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
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default InquiryPaymentSuccess;