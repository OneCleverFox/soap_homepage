import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  useMediaQuery,
  useTheme,
  Fab,
  Collapse,
  IconButton,
  AppBar,
  Toolbar,
  Slide
} from '@mui/material';
import {
  ShoppingCart,
  Payment,
  LocalShipping,
  Security,
  ExpandMore,
  CheckCircle,
  Receipt,
  ArrowBack,
  ExpandLess,
  ExpandMore as ExpandIcon,
  ShoppingBag
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const MobileCheckoutPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(AuthContext);
  const { items, getCartTotal, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderData, setOrderData] = useState({
    rechnungsadresse: {
      vorname: '',
      nachname: '',
      strasse: '',
      hausnummer: '',
      plz: '',
      stadt: '',
      land: 'Deutschland'
    },
    lieferadresse: {
      verwendeRechnungsadresse: true,
      vorname: '',
      nachname: '',
      strasse: '',
      hausnummer: '',
      plz: '',
      stadt: '',
      land: 'Deutschland'
    },
    notizen: '',
    agbAkzeptiert: false,
    datenschutzAkzeptiert: false
  });
  const [error, setError] = useState('');

  // Mobile Steps
  const checkoutSteps = [
    { label: 'Adresse', icon: <LocalShipping /> },
    { label: 'Prüfung', icon: <Receipt /> },
    { label: 'Zahlung', icon: <Payment /> }
  ];

  // Prüfen ob Warenkorb leer ist
  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  // Kundendaten laden falls angemeldet
  const loadCustomerData = useCallback(async (retryCount = 0) => {
    console.log('📡 Loading customer data... (Retry:', retryCount, ')');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}/kunden/profil`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const kunde = data.data;
        
        setCustomerData(kunde);
        
        if (kunde) {
          setOrderData(prev => ({
            ...prev,
            rechnungsadresse: {
              vorname: kunde.vorname || '',
              nachname: kunde.nachname || '',
              strasse: kunde.adresse?.strasse || '',
              hausnummer: kunde.adresse?.hausnummer || '',
              plz: kunde.adresse?.plz || '',
              stadt: kunde.adresse?.ort || '',
              land: kunde.adresse?.land || 'Deutschland'
            }
          }));
        }
      }
    } catch (error) {
      console.error('💥 Fehler beim Laden der Kundendaten:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCustomerData();
    }
  }, [user, loadCustomerData]);

  // Bestellung erstellen und an PayPal weiterleiten
  const handlePayPalCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const orderPayload = {
        artikel: items.map(item => ({
          produktType: item.produktType || 'portfolio',
          produktId: item._id,
          produktSnapshot: {
            name: item.name || item.title,
            beschreibung: item.beschreibung || item.description,
            bild: item.hauptbild || item.images?.[0],
            kategorie: item.kategorie
          },
          menge: item.quantity,
          einzelpreis: item.preis || item.price,
          gesamtpreis: (item.preis || item.price) * item.quantity,
          konfiguration: item.konfiguration || {}
        })),
        besteller: {
          name: user?.name || `${orderData.rechnungsadresse.vorname} ${orderData.rechnungsadresse.nachname}`,
          email: user?.email || '',
          kundennummer: user?.kundennummer || ''
        },
        rechnungsadresse: orderData.rechnungsadresse,
        lieferadresse: orderData.lieferadresse.verwendeRechnungsadresse 
          ? orderData.rechnungsadresse 
          : orderData.lieferadresse,
        notizen: orderData.notizen,
        zahlungsart: 'paypal'
      };

      console.log('🛒 Sende Bestellung an PayPal:', orderPayload);

      const response = await fetch(`${apiUrl}/orders/paypal-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();
      console.log('💳 PayPal Response:', data);

      if (response.ok && data.success && data.approvalUrl) {
        localStorage.setItem('tempOrderData', JSON.stringify(orderPayload));
        window.location.href = data.approvalUrl;
      } else {
        setError(data.message || 'Fehler beim Erstellen der PayPal-Bestellung');
      }
    } catch (error) {
      console.error('💥 PayPal Checkout Fehler:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Header mit Zurück-Button
  const MobileHeader = () => (
    <AppBar 
      position="sticky" 
      sx={{ 
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important' }}>
        <IconButton 
          edge="start" 
          onClick={() => navigate('/cart')}
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Bestellung abschließen
        </Typography>
        <IconButton 
          onClick={() => setShowOrderSummary(!showOrderSummary)}
          sx={{ 
            bgcolor: showOrderSummary ? 'primary.main' : 'transparent',
            color: showOrderSummary ? 'white' : 'inherit'
          }}
        >
          <ShoppingBag />
        </IconButton>
      </Toolbar>
    </AppBar>
  );

  // Mobile Step Indicator
  const MobileStepIndicator = () => (
    <Box sx={{ 
      p: 2, 
      bgcolor: 'background.paper',
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {checkoutSteps.map((step, index) => (
          <Box 
            key={index}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              opacity: index <= activeStep ? 1 : 0.4
            }}
          >
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%',
              bgcolor: index <= activeStep ? 'primary.main' : 'grey.300',
              color: index <= activeStep ? 'white' : 'grey.600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1
            }}>
              {index < activeStep ? <CheckCircle /> : step.icon}
            </Box>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {step.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Mobile Order Summary
  const MobileOrderSummary = () => (
    <Slide direction="up" in={showOrderSummary} mountOnEnter unmountOnExit>
      <Paper 
        sx={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          maxHeight: '70vh',
          overflow: 'auto'
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Bestellübersicht</Typography>
            <IconButton onClick={() => setShowOrderSummary(false)}>
              <ExpandLess />
            </IconButton>
          </Box>
          
          <List dense>
            {items.map((item, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar 
                    src={item.hauptbild || item.images?.[0]} 
                    variant="rounded"
                    sx={{ width: 40, height: 40 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" noWrap>
                        {item.name || item.title}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        €{((item.preis || item.price) * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  }
                  secondary={`${item.quantity}x €${(item.preis || item.price).toFixed(2)}`}
                />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Gesamt:</Typography>
            <Typography variant="h6" color="primary">
              €{getCartTotal().toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );

  // Address Form für Mobile
  const MobileAddressForm = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Rechnungsadresse
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Vorname"
            value={orderData.rechnungsadresse.vorname}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, vorname: e.target.value }
            }))}
            size="small"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Nachname"
            value={orderData.rechnungsadresse.nachname}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, nachname: e.target.value }
            }))}
            size="small"
          />
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Straße"
            value={orderData.rechnungsadresse.strasse}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, strasse: e.target.value }
            }))}
            size="small"
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Nr."
            value={orderData.rechnungsadresse.hausnummer}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, hausnummer: e.target.value }
            }))}
            size="small"
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="PLZ"
            value={orderData.rechnungsadresse.plz}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, plz: e.target.value }
            }))}
            size="small"
          />
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Stadt"
            value={orderData.rechnungsadresse.stadt}
            onChange={(e) => setOrderData(prev => ({
              ...prev,
              rechnungsadresse: { ...prev.rechnungsadresse, stadt: e.target.value }
            }))}
            size="small"
          />
        </Grid>
      </Grid>

      {/* Delivery Address Toggle */}
      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={orderData.lieferadresse.verwendeRechnungsadresse}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                lieferadresse: { ...prev.lieferadresse, verwendeRechnungsadresse: e.target.checked }
              }))}
            />
          }
          label="Lieferadresse ist identisch mit Rechnungsadresse"
        />
      </Box>

      {/* Notes */}
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Anmerkungen (optional)"
          multiline
          rows={3}
          value={orderData.notizen}
          onChange={(e) => setOrderData(prev => ({ ...prev, notizen: e.target.value }))}
          size="small"
        />
      </Box>
    </Box>
  );

  // Terms and Conditions
  const MobileTermsSection = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Bestätigung
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={orderData.agbAkzeptiert}
            onChange={(e) => setOrderData(prev => ({ ...prev, agbAkzeptiert: e.target.checked }))}
          />
        }
        label="Ich akzeptiere die AGB und Widerrufsbelehrung"
      />
      
      <FormControlLabel
        control={
          <Checkbox
            checked={orderData.datenschutzAkzeptiert}
            onChange={(e) => setOrderData(prev => ({ ...prev, datenschutzAkzeptiert: e.target.checked }))}
          />
        }
        label="Ich akzeptiere die Datenschutzerklärung"
      />
    </Box>
  );

  // Sticky Bottom Bar
  const StickyBottomBar = () => (
    <Paper 
      elevation={3}
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        zIndex: 1200,
        display: showOrderSummary ? 'none' : 'block'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Gesamt: <strong>€{getCartTotal().toFixed(2)}</strong>
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => setShowOrderSummary(true)}
          endIcon={<ExpandIcon />}
        >
          Details
        </Button>
      </Box>
      
      {activeStep < checkoutSteps.length - 1 ? (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => setActiveStep(prev => prev + 1)}
          disabled={
            (activeStep === 0 && (!orderData.rechnungsadresse.vorname || !orderData.rechnungsadresse.nachname)) ||
            (activeStep === 1 && (!orderData.agbAkzeptiert || !orderData.datenschutzAkzeptiert))
          }
          sx={{ minHeight: 48 }}
        >
          Weiter
        </Button>
      ) : (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handlePayPalCheckout}
          disabled={loading || !orderData.agbAkzeptiert || !orderData.datenschutzAkzeptiert}
          startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
          sx={{ minHeight: 48 }}
        >
          {loading ? 'Wird verarbeitet...' : 'Mit PayPal bezahlen'}
        </Button>
      )}
    </Paper>
  );

  // Render Current Step
  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        return <MobileAddressForm />;
      case 1:
        return <MobileTermsSection />;
      case 2:
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Bereit für die Zahlung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Klicken Sie unten, um mit PayPal zu bezahlen
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <Box sx={{ pb: 10 }}>
        <MobileHeader />
        <MobileStepIndicator />
        
        <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
          {renderCurrentStep()}
        </Box>
        
        <StickyBottomBar />
        <MobileOrderSummary />
      </Box>
    );
  }

  // Desktop Layout (Original)
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Original Desktop Layout bleibt unverändert */}
      <Typography variant="h4" gutterBottom>
        Bestellung abschließen
      </Typography>
      {/* ... Rest des Desktop Layouts ... */}
    </Container>
  );
};

export default MobileCheckoutPage;