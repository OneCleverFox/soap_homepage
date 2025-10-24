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
  Receipt
} from '@mui/icons-material';
import api from '../services/api';

const OrderPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    const processPayment = async () => {
      try {
        const paypalOrderId = searchParams.get('token');
        const orderNum = searchParams.get('orderNumber');

        if (!paypalOrderId || !orderNum) {
          setError('Fehlende Zahlungsinformationen');
          setLoading(false);
          return;
        }

        // PayPal-Zahlung für Bestellung abschließen
        const response = await api.post('/orders/payment/capture', {
          paypalOrderId,
          orderNumber: orderNum
        });

        if (response.data.success) {
          setSuccess(true);
          setOrderNumber(response.data.orderNumber);
          setTransactionId(response.data.transactionId);
        } else {
          setError(response.data.message || 'Fehler beim Abschließen der Zahlung');
        }
      } catch (error) {
        console.error('❌ Fehler beim Verarbeiten der Zahlung:', error);
        setError(error.response?.data?.message || 'Ein unerwarteter Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Zahlung wird verarbeitet...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bitte warten Sie, während wir Ihre Zahlung abschließen.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {success ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CardContent>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Zahlung erfolgreich!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Vielen Dank! Ihre Zahlung wurde erfolgreich abgeschlossen.
            </Typography>
            
            {orderNumber && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Bestellnummer: {orderNumber}
                </Typography>
                {transactionId && (
                  <Typography variant="body2" color="text.secondary">
                    Transaktions-ID: {transactionId}
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details zu Ihrer Bestellung.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/profile')}
                startIcon={<Receipt />}
              >
                Meine Bestellungen anzeigen
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
      ) : (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CardContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fehler bei der Zahlung
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bitte versuchen Sie es erneut oder kontaktieren Sie unseren Support.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/profile')}
              >
                Zu meinen Bestellungen
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
      )}
    </Container>
  );
};

export default OrderPaymentSuccess;