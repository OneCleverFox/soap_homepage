import React, { useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Email,
  Home
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const InquirySuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const hasCleared = useRef(false); // Verhindert mehrfache Ausführung
  
  const { inquiryId, total } = location.state || {};

  // Warenkorb im Hintergrund leeren nach erfolgreicher Anfrage (nur einmal!)
  useEffect(() => {
    const clearCartInBackground = async () => {
      // Verhindere mehrfache Ausführung
      if (hasCleared.current) {
        return;
      }
      hasCleared.current = true;

      try {
        await clearCart();
        console.log('✅ Warenkorb erfolgreich geleert nach Anfrage-Erstellung');
      } catch (error) {
        console.warn('⚠️ Fehler beim Leeren des Warenkorbs:', error);
        // Fehler nicht dem User anzeigen, da die Anfrage erfolgreich war
      }
    };

    // Nur ausführen wenn inquiryId vorhanden ist (echte Erfolgsseite)
    if (inquiryId) {
      clearCartInBackground();
    }
  }, [inquiryId]); // Nur von inquiryId abhängig, clearCart bewusst ausgeschlossen

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Anfrage erfolgreich gesendet!
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          Vielen Dank für Ihre Anfrage. Wir haben alle Details erhalten und werden uns schnellstmöglich bei Ihnen melden.
        </Typography>

        {inquiryId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Anfrage-Nr.:</strong> {inquiryId}
              {total && (
                <>
                  <br />
                  <strong>Gesamtwert:</strong> {formatPrice(total)}
                </>
              )}
            </Typography>
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Email sx={{ mr: 1 }} />
            Wie geht es weiter?
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            • Wir prüfen Ihre Anfrage und die Verfügbarkeit der gewünschten Produkte
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            • Bei Annahme erstellen wir eine verbindliche Bestellung für Sie
          </Typography>
          <Typography variant="body2">
            • Die Zahlung erfolgt erst nach unserer Bestätigung
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            size="large"
          >
            Zur Startseite
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => navigate('/products')}
            size="large"
          >
            Weitere Produkte ansehen
          </Button>
        </Box>

        <Typography variant="caption" display="block" sx={{ mt: 3, color: 'text.secondary' }}>
          Bei Fragen können Sie uns jederzeit kontaktieren.
        </Typography>
      </Paper>
    </Container>
  );
};

export default InquirySuccessPage;