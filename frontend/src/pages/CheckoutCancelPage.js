import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  Card,
  CardContent
} from '@mui/material';
import {
  Cancel,
  ShoppingCart,
  Home,
  Support
} from '@mui/icons-material';

const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('orderId');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Cancel Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Cancel sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="warning.main">
            Zahlung abgebrochen
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Ihre Zahlung wurde abgebrochen oder ist fehlgeschlagen
          </Typography>
        </Box>

        {/* Information */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Was ist passiert?</strong>
          </Typography>
          <Typography variant="body2" gutterBottom>
            • Sie haben die Zahlung bei PayPal abgebrochen
          </Typography>
          <Typography variant="body2" gutterBottom>
            • Es gab ein technisches Problem bei der Zahlung
          </Typography>
          <Typography variant="body2">
            • Die Zahlungsdaten konnten nicht verarbeitet werden
          </Typography>
        </Alert>

        {orderId && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bestellinformationen
              </Typography>
              <Typography variant="body1">
                <strong>Bestellung:</strong> {orderId}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ihre Bestellung wurde erstellt, aber die Zahlung wurde nicht abgeschlossen. 
                Sie können die Zahlung später nachholen oder eine neue Bestellung aufgeben.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* What to do next */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Was können Sie jetzt tun?
            </Typography>
            <Typography variant="body1" gutterBottom>
              🛒 Gehen Sie zurück zu Ihrem Warenkorb und versuchen Sie es erneut
            </Typography>
            <Typography variant="body1" gutterBottom>
              💳 Verwenden Sie eine andere Zahlungsmethode
            </Typography>
            <Typography variant="body1" gutterBottom>
              📞 Kontaktieren Sie uns, wenn Sie technische Probleme haben
            </Typography>
            <Typography variant="body1">
              🏠 Stöbern Sie weiter in unserem Shop
            </Typography>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={() => navigate('/cart')}
            sx={{ mr: 2, mb: 2 }}
          >
            Zurück zum Warenkorb
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            sx={{ mr: 2, mb: 2 }}
          >
            Zur Startseite
          </Button>
          <Button
            variant="outlined"
            startIcon={<Support />}
            onClick={() => navigate('/contact')}
            sx={{ mb: 2 }}
          >
            Support kontaktieren
          </Button>
        </Box>

        {/* Additional Help */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Benötigen Sie Hilfe?</strong><br />
            Falls Sie weiterhin Probleme bei der Zahlung haben, kontaktieren Sie uns gerne. 
            Wir helfen Ihnen bei der Bestellabwicklung!
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
};

export default CheckoutCancelPage;