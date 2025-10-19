import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Receipt,
  Email,
  Home
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const hasProcessed = useRef(false); // Verhindert mehrfache Ausführung

  const bestellnummer = searchParams.get('bestellnummer');
  const paypalOrderId = searchParams.get('token');

  useEffect(() => {
    const capturePayment = async () => {
      // Verhindere mehrfache Ausführung (React StrictMode)
      if (hasProcessed.current) {
        console.log('🔄 PayPal-Verarbeitung bereits gestartet, überspringe...');
        return;
      }
      hasProcessed.current = true;

      if (!bestellnummer || !paypalOrderId) {
        setError('Fehlende Parameter für Zahlungsabschluss');
        setLoading(false);
        return;
      }

      try {
        console.log('🏁 Schließe PayPal-Zahlung ab:', { bestellnummer, paypalOrderId });
        
        // Hole Bestelldaten aus localStorage
        const bestellungData = JSON.parse(localStorage.getItem('pendingOrder') || '{}');
        
        // Wenn keine Bestelldaten im localStorage sind, versuche die Bestellung direkt zu laden
        if (!bestellungData.bestellnummer) {
          console.log('⚠️ Keine Bestelldaten im localStorage, lade Bestellung direkt...');
          
          // Versuche die Bestellung direkt aus der DB zu laden
          const orderResponse = await fetch(`/api/orders/${bestellnummer}`);
          if (orderResponse.ok) {
            const orderResult = await orderResponse.json();
            if (orderResult.success) {
              setOrderDetails(orderResult.data);
              clearCart();
              localStorage.removeItem('pendingOrder');
              console.log('✅ Bestellung erfolgreich geladen');
              setLoading(false);
              return;
            }
          }
          
          // Falls die Bestellung nicht gefunden wird, trotzdem PayPal-Success versuchen
          console.log('⚠️ Bestellung nicht gefunden, versuche PayPal-Success mit minimalen Daten...');
        }
        
        // PayPal-Success-API aufrufen (auch wenn bestellungData leer ist)
        const response = await fetch('/api/orders/paypal-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paypalOrderId,
            bestellungData: bestellungData.bestellnummer ? bestellungData : {
              bestellnummer: bestellnummer
            }
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setOrderDetails(result.data);
          // Warenkorb leeren nach erfolgreicher Bestellung
          clearCart();
          // Entferne Bestelldaten aus localStorage
          localStorage.removeItem('pendingOrder');
          console.log('✅ Zahlung erfolgreich abgeschlossen');
        } else {
          // Falls PayPal-Success fehlschlägt, versuche die Bestellung direkt zu laden
          console.log('⚠️ PayPal-Success fehlgeschlagen, versuche direkte Bestellladung...');
          const orderResponse = await fetch(`/api/orders/${bestellnummer}`);
          if (orderResponse.ok) {
            const orderResult = await orderResponse.json();
            if (orderResult.success) {
              setOrderDetails(orderResult.data);
              clearCart();
              localStorage.removeItem('pendingOrder');
              console.log('✅ Bestellung erfolgreich geladen als Fallback');
            } else {
              setError(result.message || 'Fehler beim Abschließen der Zahlung');
            }
          } else {
            setError(result.message || 'Fehler beim Abschließen der Zahlung');
          }
        }
      } catch (error) {
        console.error('❌ Fehler beim Zahlungsabschluss:', error);
        setError('Ein unerwarteter Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    capturePayment();
  }, [bestellnummer, paypalOrderId, clearCart]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">
            Zahlung wird abgeschlossen...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bitte warten Sie, während wir Ihre Zahlung verarbeiten.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fehler beim Zahlungsabschluss
            </Typography>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/cart')}
              sx={{ mr: 2 }}
            >
              Zurück zum Warenkorb
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/contact')}
            >
              Support kontaktieren
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Success Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Bestellung erfolgreich!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Vielen Dank für Ihre Bestellung bei Glücksmomente Manufaktur
          </Typography>
        </Box>

        {orderDetails && (
          <>
            {/* Order Details */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Receipt sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Bestelldetails
                  </Typography>
                </Box>
                <Typography variant="body1" gutterBottom>
                  <strong>Bestellnummer:</strong> {orderDetails.bestellnummer}
                </Typography>
                {orderDetails.zahlung?.transactionId && (
                  <Typography variant="body1" gutterBottom>
                    <strong>PayPal Transaktions-ID:</strong> {orderDetails.zahlung.transactionId}
                  </Typography>
                )}
                <Typography variant="body1" gutterBottom>
                  <strong>Gesamtbetrag:</strong> {formatPrice(orderDetails.preise?.gesamtsumme || 0)}
                </Typography>
                <Typography variant="body1">
                  <strong>Status:</strong> {orderDetails.zahlung?.status === 'bezahlt' ? 'Bezahlt' : orderDetails.status}
                </Typography>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Email sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Wie geht es weiter?
                  </Typography>
                </Box>
                <Typography variant="body1" gutterBottom>
                  ✉️ Sie erhalten in Kürze eine Bestellbestätigung per E-Mail
                </Typography>
                <Typography variant="body1" gutterBottom>
                  📦 Wir bereiten Ihre Bestellung vor und versenden sie schnellstmöglich
                </Typography>
                <Typography variant="body1" gutterBottom>
                  🚚 Sie erhalten eine Versandbenachrichtigung mit Tracking-Nummer
                </Typography>
                <Typography variant="body1">
                  📞 Bei Fragen stehen wir Ihnen gerne zur Verfügung
                </Typography>
              </CardContent>
            </Card>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Zur Startseite
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/products')}
          >
            Weiter einkaufen
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutSuccessPage;