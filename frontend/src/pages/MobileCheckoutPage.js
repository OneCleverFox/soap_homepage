/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
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
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  ShoppingCart,
  Payment,
  LocalShipping,
  Security,
  CheckCircle,
  ArrowBack,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const MobileCheckoutPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(AuthContext);
  const { items } = useCart();

  // Nur verfügbare Artikel für Checkout verwenden
  const availableItems = items.filter(item => item.hasEnoughStock === true);
  const availableTotal = availableItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // Schrittweise Checkout-States
  
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [invoiceSettings, setInvoiceSettings] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [orderData, setOrderData] = useState({
    rechnungsadresse: {
      vorname: '',
      nachname: '',
      strasse: '',
      hausnummer: '',
      plz: '',
      stadt: '',
      land: 'Deutschland',
      email: ''
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

  // Validierungsfunktion für manuellen Aufruf (z.B. bei Button-Click)
  const validateAddressData = useCallback(() => {
    const errors = {};
    const { rechnungsadresse } = orderData;

    if (!rechnungsadresse.vorname?.trim()) {
      errors.vorname = 'Vorname ist erforderlich';
    }
    if (!rechnungsadresse.nachname?.trim()) {
      errors.nachname = 'Nachname ist erforderlich';
    }
    if (!rechnungsadresse.strasse?.trim()) {
      errors.strasse = 'Straße ist erforderlich';
    }
    if (!rechnungsadresse.plz?.trim()) {
      errors.plz = 'PLZ ist erforderlich';
    } else if (!/^\d{5}$/.test(rechnungsadresse.plz)) {
      errors.plz = 'PLZ muss 5 Ziffern haben';
    }
    if (!rechnungsadresse.stadt?.trim()) {
      errors.stadt = 'Stadt ist erforderlich';
    }
    if (!user && !rechnungsadresse.email?.trim()) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (rechnungsadresse.email && !/\S+@\S+\.\S+/.test(rechnungsadresse.email)) {
      errors.email = 'E-Mail Format ungültig';
    }

    console.log('🔍 Validierung Adressdaten (manuell):', { errors, hasErrors: Object.keys(errors).length > 0 });
    return Object.keys(errors).length === 0;
  }, [orderData.rechnungsadresse, user]);

  // Validierung bei Änderungen - ohne validateAddressData als Dependency um Endlosschleife zu vermeiden
  useEffect(() => {
    if (activeStep === 1) {
      // Inline-Validierung ohne separaten setState-Aufruf im useEffect
      const { rechnungsadresse } = orderData;
      const errors = {};

      if (!rechnungsadresse.vorname?.trim()) {
        errors.vorname = 'Vorname ist erforderlich';
      }
      if (!rechnungsadresse.nachname?.trim()) {
        errors.nachname = 'Nachname ist erforderlich';
      }
      if (!rechnungsadresse.strasse?.trim()) {
        errors.strasse = 'Straße ist erforderlich';
      }
      if (!rechnungsadresse.plz?.trim()) {
        errors.plz = 'PLZ ist erforderlich';
      } else if (!/^\d{5}$/.test(rechnungsadresse.plz)) {
        errors.plz = 'PLZ muss 5 Ziffern haben';
      }
      if (!rechnungsadresse.stadt?.trim()) {
        errors.stadt = 'Stadt ist erforderlich';
      }
      if (!user && !rechnungsadresse.email?.trim()) {
        errors.email = 'E-Mail ist erforderlich';
      } else if (rechnungsadresse.email && !/\S+@\S+\.\S+/.test(rechnungsadresse.email)) {
        errors.email = 'E-Mail Format ungültig';
      }

      console.log('🔍 Validierung Adressdaten (useEffect):', { errors, hasErrors: Object.keys(errors).length > 0 });
      setValidationErrors(errors);
    }
  }, [activeStep, orderData.rechnungsadresse.vorname, orderData.rechnungsadresse.nachname, 
      orderData.rechnungsadresse.strasse, orderData.rechnungsadresse.plz, orderData.rechnungsadresse.stadt, 
      orderData.rechnungsadresse.email, user]);

  // Erweiterte Step-Validierung
  const canProceedToNextStep = useCallback(() => {
    if (activeStep === 1) {
      // Prüfe direkt die Validation Errors ohne setState zu triggern
      return Object.keys(validationErrors).length === 0 && 
             orderData.rechnungsadresse.vorname?.trim() &&
             orderData.rechnungsadresse.nachname?.trim() &&
             orderData.rechnungsadresse.strasse?.trim() &&
             orderData.rechnungsadresse.plz?.trim() &&
             orderData.rechnungsadresse.stadt?.trim() &&
             (user || orderData.rechnungsadresse.email?.trim());
    }
    if (activeStep === 2) {
      return orderData.agbAkzeptiert && orderData.datenschutzAkzeptiert;
    }
    return true;
  }, [activeStep, validationErrors, orderData.rechnungsadresse, orderData.agbAkzeptiert, orderData.datenschutzAkzeptiert, user]);

  // Mobile Steps
  const checkoutSteps = [
    { label: 'Produkte', icon: <ShoppingCart /> },
    { label: 'Adresse', icon: <LocalShipping /> },
    { label: 'Datenschutz', icon: <Security /> },
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
    console.log('📡 MobileCheckout: Loading customer data... (Retry:', retryCount, ')');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}/kunden/profil`;
      console.log('🌐 MobileCheckout: Lade Kundendaten von:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 MobileCheckout: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const kunde = data.data;
        console.log('👤 MobileCheckout: Kundendaten erhalten:', kunde);
        
        if (kunde) {
          // Prüfen ob Adressdaten vorhanden sind
          if (kunde.adresse && (kunde.adresse.strasse || kunde.adresse.plz)) {
            console.log('🏠 MobileCheckout: Adressdaten gefunden, setze Rechnungsadresse...');
            
            const newRechnungsadresse = {
              vorname: kunde.vorname || '',
              nachname: kunde.nachname || '',
              strasse: kunde.adresse?.strasse || '',
              hausnummer: kunde.adresse?.hausnummer || '',
              plz: kunde.adresse?.plz || '',
              stadt: kunde.adresse?.stadt || kunde.adresse?.ort || '', // Fallback für beide Felder
              land: kunde.adresse?.land || 'Deutschland',
              email: kunde.email || user?.email || '' // E-Mail aus Profil laden
            };
            
            console.log('🏠 MobileCheckout: Neue Rechnungsadresse:', newRechnungsadresse);
            
            setOrderData(prev => ({
              ...prev,
              rechnungsadresse: newRechnungsadresse
            }));
            
            console.log('✅ MobileCheckout: Rechnungsadresse erfolgreich gesetzt');
          } else {
            console.log('⚠️ MobileCheckout: Keine Adressdaten im Kundenprofil gefunden');
            console.log('📋 MobileCheckout: Verfügbare Kundendaten:', Object.keys(kunde));
          }
        }
      } else {
        console.error('❌ MobileCheckout: Failed to load customer data:', response.status);
        const errorText = await response.text();
        console.error('❌ MobileCheckout: Error details:', errorText);
        
        // Retry bei Netzwerkfehlern
        if (retryCount < 2 && (response.status >= 500 || response.status === 0)) {
          console.log('🔄 MobileCheckout: Retrying in 1 second...');
          setTimeout(() => loadCustomerData(retryCount + 1), 1000);
        }
      }
    } catch (error) {
      console.error('💥 MobileCheckout: Fehler beim Laden der Kundendaten:', error);
    }
  }, [user]);

  // Rechnungseinstellungen laden für MwSt-Anzeige
  const loadInvoiceSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      console.log('📄 MobileCheckout: Loading invoice settings with token:', !!token);
      
      const response = await fetch(`${apiUrl}/invoice/templates/default`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📄 MobileCheckout: Invoice settings response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 MobileCheckout: Invoice settings loaded:', data);
        console.log('📄 MobileCheckout: isSmallBusiness:', data.companyInfo?.isSmallBusiness);
        setInvoiceSettings(data);
      } else {
        console.error('❌ MobileCheckout: Failed to load invoice settings, status:', response.status);
        // Fallback: KEINE MwSt anzeigen wenn Einstellungen nicht geladen werden können
        setInvoiceSettings({ companyInfo: { isSmallBusiness: true } });
      }
    } catch (error) {
      console.error('❌ MobileCheckout: Error loading invoice settings:', error);
      // Fallback: KEINE MwSt anzeigen wenn Einstellungen nicht geladen werden können
      setInvoiceSettings({ companyInfo: { isSmallBusiness: true } });
    }
  }, []);

  // Shop-Einstellungen laden für Inquiry/PayPal Modus
  const loadShopSettings = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin-settings/shop-status`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🛒 MobileCheckout: Shop settings loaded:', data.status);
        setShopSettings(data.status);
      } else {
        console.error('❌ MobileCheckout: Failed to load shop settings');
        // Fallback zu normaler Bestellung wenn Einstellungen nicht ladbar
        setShopSettings({
          shop: 'active',
          checkout: true,
          checkoutMode: 'full',
          paypal: { available: true, mode: 'sandbox' }
        });
      }
    } catch (error) {
      console.error('❌ MobileCheckout: Error loading shop settings:', error);
      // Fallback
      setShopSettings({
        shop: 'active',
        checkout: true,
        checkoutMode: 'full',
        paypal: { available: true, mode: 'sandbox' }
      });
    }
  }, []);

  useEffect(() => {
    console.log('🔄 MobileCheckout: useEffect triggered, user:', user);
    if (user && (user.kundeId || user.id)) {
      const customerId = user.kundeId || user.id;
      console.log('👤 MobileCheckout: Loading customer data for ID:', customerId);
      // Kurze Verzögerung um sicherzustellen, dass das Backend bereit ist
      setTimeout(() => loadCustomerData(), 500);
    } else {
      console.log('❌ MobileCheckout: No valid user ID found for loading customer data');
    }
  }, [user, loadCustomerData]);

  // Rechnungseinstellungen beim Laden abrufen
  useEffect(() => {
    loadInvoiceSettings();
  }, [loadInvoiceSettings]);

  // Shop-Einstellungen beim Laden abrufen
  useEffect(() => {
    loadShopSettings();
  }, [loadShopSettings]);

  // Bestellung erstellen und an PayPal weiterleiten
  const handlePayPalCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      // Preise berechnen
      const subtotal = items.reduce((sum, item) => sum + (item.preis || item.price || 0) * item.quantity, 0);
      const versandkosten = subtotal >= 30 ? 0 : 5.99;
      const total = subtotal + versandkosten;
      const mwst = total - (total / 1.19);
      
      const orderPayload = {
        artikel: items.map(item => ({
          produktType: 'portfolio',
          produktId: item.id,
          produktSnapshot: {
            name: item.name,
            beschreibung: item.beschreibung || '',
            bild: item.image || item.hauptbild || ''
          },
          menge: item.quantity,
          einzelpreis: item.price || item.preis,
          gesamtpreis: (item.price || item.preis) * item.quantity
        })),
        besteller: {
          vorname: orderData.rechnungsadresse.vorname,
          nachname: orderData.rechnungsadresse.nachname,
          email: user?.email || orderData.rechnungsadresse.email || '',
          telefon: orderData.rechnungsadresse.telefon || ''
        },
        rechnungsadresse: orderData.rechnungsadresse,
        lieferadresse: orderData.lieferadresse.verwendeRechnungsadresse 
          ? orderData.rechnungsadresse 
          : orderData.lieferadresse,
        preise: {
          zwischensumme: subtotal,
          versandkosten: versandkosten,
          mwst: {
            satz: 19,
            betrag: mwst
          },
          gesamtsumme: total
        },
        zahlung: {
          methode: 'paypal'
        },
        notizen: {
          kunde: orderData.notizen || ''
        },
        status: 'neu',
        quelle: 'website'
      };

      console.log('🛒 Sende Bestellung an PayPal:', orderPayload);

      const response = await fetch(`${apiUrl}/orders/create`, {
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

  // Address Form für Mobile
  const MobileAddressForm = () => (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '60vh' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
        Rechnungsadresse
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Vorname *"
              value={orderData.rechnungsadresse.vorname}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, vorname: e.target.value }
              }))}
              variant="outlined"
              required
              error={!!validationErrors.vorname}
              helperText={validationErrors.vorname}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Nachname *"
              value={orderData.rechnungsadresse.nachname}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, nachname: e.target.value }
              }))}
              variant="outlined"
              required
              error={!!validationErrors.nachname}
              helperText={validationErrors.nachname}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="Straße *"
              value={orderData.rechnungsadresse.strasse}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, strasse: e.target.value }
              }))}
              variant="outlined"
              required
              error={!!validationErrors.strasse}
              helperText={validationErrors.strasse}
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
              variant="outlined"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="PLZ *"
              value={orderData.rechnungsadresse.plz}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, plz: e.target.value }
              }))}
              variant="outlined"
              required
              error={!!validationErrors.plz}
              helperText={validationErrors.plz}
              inputProps={{ maxLength: 5, pattern: '[0-9]{5}' }}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="Stadt *"
              value={orderData.rechnungsadresse.stadt}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, stadt: e.target.value }
              }))}
              variant="outlined"
              required
              error={!!validationErrors.stadt}
              helperText={validationErrors.stadt}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={user ? "E-Mail (optional)" : "E-Mail *"}
              type="email"
              value={orderData.rechnungsadresse.email || ''}
              onChange={(e) => setOrderData(prev => ({
                ...prev,
                rechnungsadresse: { ...prev.rechnungsadresse, email: e.target.value }
              }))}
              variant="outlined"
              required={!user}
              error={!!validationErrors.email}
              helperText={validationErrors.email || (user ? "Ihre Profil E-Mail wird automatisch verwendet" : "")}
            />
          </Grid>
          <Grid item xs={12}>
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
          </Grid>
        </Grid>
      </Paper>

      {/* Notes */}
      <Box sx={{ mt: 3 }}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
          <TextField
            fullWidth
            label="Anmerkungen (optional)"
            multiline
            rows={3}
            value={orderData.notizen}
            onChange={(e) => setOrderData(prev => ({ ...prev, notizen: e.target.value }))}
            variant="outlined"
          />
        </Paper>
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
        label={
          <Typography variant="body2">
            Ich akzeptiere die{' '}
            <Button 
              size="small" 
              onClick={() => window.open('/agb', '_blank')}
              sx={{ p: 0, minWidth: 'auto', textDecoration: 'underline' }}
            >
              AGB
            </Button>{' '}
            und Widerrufsbelehrung *
          </Typography>
        }
      />
      
      <FormControlLabel
        control={
          <Checkbox
            checked={orderData.datenschutzAkzeptiert}
            onChange={(e) => setOrderData(prev => ({ ...prev, datenschutzAkzeptiert: e.target.checked }))}
          />
        }
        label={
          <Typography variant="body2">
            Ich akzeptiere die{' '}
            <Button 
              size="small" 
              onClick={() => window.open('/datenschutz', '_blank')}
              sx={{ p: 0, minWidth: 'auto', textDecoration: 'underline' }}
            >
              Datenschutzerklärung
            </Button>{' '}
            *
          </Typography>
        }
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
        zIndex: 1200
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Gesamt: <strong>€{availableTotal.toFixed(2)}</strong>
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Zurück-Button - immer anzeigen außer bei Schritt 0 */}
        {activeStep > 0 && (
          <Button
            variant="outlined"
            onClick={() => setActiveStep(prev => prev - 1)}
            sx={{ 
              minHeight: 56, 
              flex: '0 0 calc(33.333% - 4px)', // 1/3 der Breite minus gap
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Zurück
          </Button>
        )}
        
        {/* Weiter/Bestellen-Button */}
        {activeStep < checkoutSteps.length - 1 ? (
        <Button
          variant="contained"
          size="large"
          onClick={() => setActiveStep(prev => prev + 1)}
          disabled={!canProceedToNextStep()}
          endIcon={<ArrowForward />}
          sx={{ 
            minHeight: 56, 
            fontSize: '1.1rem', 
            fontWeight: 600,
            flex: activeStep > 0 ? '0 0 calc(66.667% - 4px)' : '1' // 2/3 wenn Zurück-Button da ist, sonst volle Breite
          }}
        >
          Weiter
        </Button>
      ) : (
        <Button
          variant="contained"
          size="large"
          onClick={handlePayPalCheckout}
          disabled={loading || !orderData.agbAkzeptiert || !orderData.datenschutzAkzeptiert}
          startIcon={loading ? <CircularProgress size={20} /> : (shopSettings?.checkoutMode === 'inquiry' ? <CheckCircle /> : <Payment />)}
          sx={{ 
            minHeight: 56,
            flex: activeStep > 0 ? '0 0 calc(66.667% - 4px)' : '1' // 2/3 wenn Zurück-Button da ist, sonst volle Breite
          }}
        >
          {loading 
            ? (shopSettings?.checkoutMode === 'inquiry' ? 'Anfrage wird gesendet...' : 'Wird verarbeitet...') 
            : (shopSettings?.checkoutMode === 'inquiry' 
                ? 'Anfrage senden'
                : 'Mit PayPal bezahlen'
              )
          }
        </Button>
      )}
      </Box>
    </Paper>
  );

  // Render Current Step
  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        // Schritt 1: Produkte anzeigen
        return (
          <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '60vh' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
              Ihre Bestellung
            </Typography>
            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <List sx={{ p: 0 }}>
                {availableItems.map((item, index) => (
                  <ListItem key={index} sx={{ 
                    py: 2, 
                    px: 2,
                    borderBottom: index < availableItems.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}>
                    <ListItemAvatar>
                      <Avatar 
                        src={item.hauptbild || item.images?.[0]} 
                        variant="rounded"
                        sx={{ width: 70, height: 70, mr: 2 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 500 }}>
                            {item.name || item.title}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1976d2' }}>
                            €{((item.preis || item.price) * item.quantity).toFixed(2)}
                          </span>
                        </span>
                      }
                      secondary={
                        <>
                          <span style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>
                            {item.quantity} Stück × €{(item.preis || item.price).toFixed(2)}
                          </span>
                          {item.hasEnoughStock && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              backgroundColor: '#c8e6c9', 
                              color: '#2e7d32',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}>
                              ✓ Verfügbar
                            </span>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 3,
              p: 2,
              bgcolor: 'primary.light',
              borderRadius: 2
            }}>
              <Typography variant="h6" color="primary.dark">Gesamt:</Typography>
              <Typography variant="h5" color="primary.dark" fontWeight="bold">
                €{availableTotal.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        );
      case 1:
        // Schritt 2: Lieferadresse
        return <MobileAddressForm />;
      case 2:
        // Schritt 3: Datenschutzerklärung
        return <MobileTermsSection />;
      case 3:
        // Schritt 4: Bezahlung
        const subtotal = availableItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
        const versandkosten = subtotal >= 30 ? 0 : 5.99; // Versandkostenfrei ab 30€
        const total = subtotal + versandkosten;
        const mwst = total - (total / 1.19); // MwSt aus Gesamtbetrag herausrechnen
        
        return (
          <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '60vh' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
              {shopSettings?.checkoutMode === 'inquiry' ? 'Anfrage-Übersicht' : 'Zahlungsübersicht'}
            </Typography>
            
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Kostenaufstellung
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Zwischensumme:</Typography>
                <Typography>€{subtotal.toFixed(2)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Versandkosten:</Typography>
                <Typography>€{versandkosten.toFixed(2)}</Typography>
              </Box>
              
              {/* Versandkostenfrei-Anzeige */}
              {subtotal < 30 && (
                <Box sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'info.light', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'info.main'
                }}>
                  <Typography variant="body2" color="info.dark" sx={{ textAlign: 'center' }}>
                    💸 Versandkostenfrei ab 30€! Noch €{(30 - subtotal).toFixed(2)} bis zum kostenlosen Versand.
                  </Typography>
                </Box>
              )}
              
              {versandkosten === 0 && (
                <Box sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'success.light', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'success.main'
                }}>
                  <Typography variant="body2" color="success.dark" sx={{ textAlign: 'center' }}>
                    🎉 Versandkostenfrei!
                  </Typography>
                </Box>
              )}
              
              {/* MwSt nur anzeigen wenn NICHT Kleinunternehmer */}
              {(() => {
                const shouldShowMwSt = !invoiceSettings?.companyInfo?.isSmallBusiness;
                console.log('🔍 MWST-Entscheidung:', {
                  invoiceSettings: !!invoiceSettings,
                  companyInfo: !!invoiceSettings?.companyInfo,
                  isSmallBusiness: invoiceSettings?.companyInfo?.isSmallBusiness,
                  shouldShowMwSt: shouldShowMwSt,
                  fullInvoiceSettings: invoiceSettings
                });
                return shouldShowMwSt;
              })() && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>MwSt. (19%):</Typography>
                  <Typography>€{mwst.toFixed(2)}</Typography>
                </Box>
              )}
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                pt: 2, 
                mt: 2, 
                borderTop: '1px solid',
                borderColor: 'divider',
                fontWeight: 'bold' 
              }}>
                <Typography variant="h6">Gesamtbetrag:</Typography>
                <Typography variant="h6" color="primary">€{total.toFixed(2)}</Typography>
              </Box>
            </Paper>
            
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {shopSettings?.checkoutMode === 'inquiry' 
                ? 'Klicken Sie unten, um Ihre Anfrage zu senden'
                : 'Klicken Sie unten, um mit PayPal zu bezahlen'
              }
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