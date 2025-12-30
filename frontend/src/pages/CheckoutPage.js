import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
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
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ShoppingCart,
  Payment,
  LocalShipping,
  Security,
  ExpandMore,
  CheckCircle,
  Receipt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../services/api';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { items } = useCart();
  // clearAvailableItems wird in CheckoutSuccessPage verwendet
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Nur verfügbare Artikel für Checkout verwenden
  const availableItems = items.filter(item => item.isAvailable === true && item.hasEnoughStock === true);
  const availableTotal = availableItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
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

  // Prüfen ob Warenkorb leer ist oder keine verfügbaren Artikel
  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/cart');
      return;
    }
    
    // Prüfen ob verfügbare Artikel vorhanden sind
    const availableCount = items.filter(item => item.isAvailable === true && item.hasEnoughStock === true).length;
    if (availableCount === 0) {
      console.warn('⚠️ Keine verfügbaren Artikel im Checkout - Weiterleitung zum Warenkorb');
      navigate('/cart');
      return;
    }
    
    // Warnung wenn nicht alle Artikel verfügbar sind
    if (availableCount < items.length) {
      console.warn(`⚠️ Nur ${availableCount}/${items.length} Artikel sind verfügbar`);
    }
  }, [items, navigate]);

  // Shop-Einstellungen laden
  const loadShopSettings = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin-settings/shop-status`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🛒 Shop settings loaded:', data.status);
        setShopSettings(data.status);
      } else {
        console.error('❌ Failed to load shop settings');
        // Fallback zu normaler Bestellung wenn Einstellungen nicht ladbar
        setShopSettings({
          shop: 'active',
          checkout: true,
          checkoutMode: 'full',
          paypal: { available: true, mode: 'sandbox' }
        });
      }
    } catch (error) {
      console.error('❌ Error loading shop settings:', error);
      // Fallback zu normaler Bestellung
      setShopSettings({
        shop: 'active',
        checkout: true,
        checkoutMode: 'full',
        paypal: { available: true, mode: 'sandbox' }
      });
    }
  }, []);

  // Kundendaten laden falls angemeldet
  const loadCustomerData = useCallback(async (retryCount = 0) => {
    console.log('📡 Loading customer data... (Retry:', retryCount, ')');
    try {
      // Kundendaten aus Profil laden
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}/kunden/profil`;
      console.log('🌐 Lade Kundendaten...');
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Customer data response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const kunde = data.data;
        console.log('👤 Kundendaten erfolgreich geladen');
        console.log('🏠 Kundenadresse aktualisiert');
        
        // Kundendaten speichern
        setCustomerData(kunde);
        
        // Prüfen ob Adressdaten vorhanden sind
        if (kunde.adresse && (kunde.adresse.strasse || kunde.adresse.plz)) {
          const newRechnungsadresse = {
            vorname: kunde.vorname || '',
            nachname: kunde.nachname || '',
            strasse: kunde.adresse?.strasse || '',
            hausnummer: kunde.adresse?.hausnummer || '',
            plz: kunde.adresse?.plz || '',
            stadt: kunde.adresse?.stadt || '',
            land: kunde.adresse?.land || 'Deutschland'
          };
          
          console.log('🏠 Rechnungsadresse gesetzt');
          
          setOrderData(prev => ({
            ...prev,
            rechnungsadresse: newRechnungsadresse
          }));
          console.log('✅ Rechnungsadresse updated from customer data');
        } else {
          console.log('⚠️ No address data found in customer profile');
        }
      } else {
        console.error('❌ Failed to load customer data:', response.status);
        // Retry bei Netzwerkfehlern
        if (retryCount < 2 && (response.status >= 500 || response.status === 0)) {
          console.log('🔄 Retrying in 1 second...');
          setTimeout(() => loadCustomerData(retryCount + 1), 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error loading customer data:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 CheckoutPage: useEffect triggered, user:', user);
    console.log('🔍 CheckoutPage: useEffect triggered');
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 User.kundeId:', user?.kundeId);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 User.id:', user?.id);
    }
    
    if (user && (user.kundeId || user.id)) {
      const customerId = user.kundeId || user.id;
      console.log('👤 Loading customer data for ID:', customerId);
      // Kurze Verzögerung um sicherzustellen, dass das Backend bereit ist
      setTimeout(() => loadCustomerData(), 500);
    } else {
      console.log('❌ No valid user ID found for loading customer data');
    }
  }, [user, loadCustomerData]);

  // Shop-Einstellungen beim Laden abrufen
  useEffect(() => {
    loadShopSettings();
  }, [loadShopSettings]);

  // Debug useEffect für Rechnungsadresse
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 Rechnungsadresse changed');
    }
  }, [orderData.rechnungsadresse]);

  const handleInputChange = (section, field, value) => {
    setOrderData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleCheckboxChange = (field, checked) => {
    // Handle nested fields (like 'lieferadresse.verwendeRechnungsadresse')
    if (field.includes('.')) {
      const [section, subField] = field.split('.');
      
      setOrderData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subField]: checked
        }
      }));
      
      // Lieferadresse automatisch kopieren wenn Checkbox aktiviert wird
      if (field === 'lieferadresse.verwendeRechnungsadresse' && checked) {
        setOrderData(prev => ({
          ...prev,
          lieferadresse: {
            ...prev.lieferadresse,
            verwendeRechnungsadresse: true,
            vorname: prev.rechnungsadresse.vorname,
            nachname: prev.rechnungsadresse.nachname,
            strasse: prev.rechnungsadresse.strasse,
            hausnummer: prev.rechnungsadresse.hausnummer,
            plz: prev.rechnungsadresse.plz,
            stadt: prev.rechnungsadresse.stadt,
            land: prev.rechnungsadresse.land
          }
        }));
      }
    } else {
      // Handle flat fields
      setOrderData(prev => ({
        ...prev,
        [field]: checked
      }));
    }
  };

  const validateForm = () => {
    const { rechnungsadresse, agbAkzeptiert, datenschutzAkzeptiert } = orderData;
    
    // Prüfe Pflichtfelder der Rechnungsadresse (für alle Benutzer)
    if (!rechnungsadresse.vorname || !rechnungsadresse.nachname || 
        !rechnungsadresse.strasse || !rechnungsadresse.plz || !rechnungsadresse.stadt) {
      setError('Bitte füllen Sie alle Pflichtfelder der Rechnungsadresse aus.');
      return false;
    }
    
    if (!agbAkzeptiert) {
      setError('Bitte akzeptieren Sie die Allgemeinen Geschäftsbedingungen.');
      return false;
    }
    
    if (!datenschutzAkzeptiert) {
      setError('Bitte akzeptieren Sie die Datenschutzerklärung.');
      return false;
    }
    
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prüfen ob Anfrage-Modus aktiviert ist
      const isInquiryMode = shopSettings?.checkoutMode === 'inquiry';
      
      if (isInquiryMode) {
        // Anfrage erstellen
        await handleCreateInquiry();
      } else {
        // Normale Bestellung erstellen
        await handleCreateOrder();
      }
    } catch (error) {
      console.error('❌ Fehler bei Bestellung/Anfrage:', error);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInquiry = async () => {
    const inquiryData = {
      items: availableItems.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image || ''
      })),
      total: availableTotal,
      rechnungsadresse: {
        vorname: orderData.rechnungsadresse.vorname,
        nachname: orderData.rechnungsadresse.nachname,
        strasse: orderData.rechnungsadresse.strasse,
        hausnummer: orderData.rechnungsadresse.hausnummer,
        zusatz: orderData.rechnungsadresse.zusatz || '',
        plz: orderData.rechnungsadresse.plz,
        stadt: orderData.rechnungsadresse.stadt,
        land: orderData.rechnungsadresse.land || 'Deutschland'
      },
      lieferadresse: orderData.lieferadresse.verwendeRechnungsadresse ? null : {
        anders: true,
        vorname: orderData.lieferadresse.vorname,
        nachname: orderData.lieferadresse.nachname,
        strasse: orderData.lieferadresse.strasse,
        hausnummer: orderData.lieferadresse.hausnummer,
        zusatz: orderData.lieferadresse.zusatz || '',
        plz: orderData.lieferadresse.plz,
        stadt: orderData.lieferadresse.stadt,
        land: orderData.lieferadresse.land || 'Deutschland'
      },
      customerNote: orderData.notizen || ''
    };

    const response = await api.post('/inquiries/create', inquiryData);
    const result = response.data;

    if (result.success) {
      // Zur Erfolgsseite navigieren - Warenkorb wird dort geleert
      navigate('/inquiry-success', { 
        state: { 
          inquiryId: result.inquiry.inquiryId,
          total: result.inquiry.total 
        } 
      });
    } else {
      throw new Error(result.message || 'Anfrage konnte nicht erstellt werden');
    }
  };

  const handleCreateOrder = async () => {
      // Bestellung erstellen (KORREKTE Steuerberechnung) - nur verfügbare Artikel
      const gesamtsumme = availableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const versandkosten = gesamtsumme >= 50 ? 0 : 4.99;
      
      // In Deutschland sind Preise INKLUSIVE MwSt.
      // Endpreis = Artikelsumme (inkl. MwSt.) + Versandkosten (inkl. MwSt.)
      const endpreis = gesamtsumme + versandkosten;
      
      // MwSt.-Betrag aus dem Gesamtbetrag herausrechnen (nicht hinzufügen!)
      const mwstBetrag = endpreis - (endpreis / 1.19);

      const bestellungData = {
        artikel: availableItems.map(item => ({
          produktType: 'portfolio', // Standardwert für Portfolio-Produkte
          produktId: item.id,
          produktSnapshot: {
            name: item.name,
            beschreibung: item.beschreibung || '',
            bild: item.image || ''
          },
          menge: item.quantity,
          einzelpreis: item.price,
          gesamtpreis: item.price * item.quantity
        })),
        besteller: {
          email: customerData?.email || orderData.rechnungsadresse.email || '',
          vorname: orderData.rechnungsadresse.vorname,
          nachname: orderData.rechnungsadresse.nachname,
          telefon: orderData.rechnungsadresse.telefon || '',
          kundennummer: customerData?.kundennummer || ''
        },
        rechnungsadresse: {
          strasse: orderData.rechnungsadresse.strasse,
          hausnummer: orderData.rechnungsadresse.hausnummer,
          zusatz: orderData.rechnungsadresse.zusatz || '',
          plz: orderData.rechnungsadresse.plz,
          stadt: orderData.rechnungsadresse.stadt,
          land: orderData.rechnungsadresse.land || 'Deutschland'
        },
        lieferadresse: orderData.lieferadresse.verwendeRechnungsadresse ? {
          verwendeRechnungsadresse: true
        } : {
          verwendeRechnungsadresse: false,
          strasse: orderData.lieferadresse.strasse,
          hausnummer: orderData.lieferadresse.hausnummer,
          zusatz: orderData.lieferadresse.zusatz || '',
          plz: orderData.lieferadresse.plz,
          stadt: orderData.lieferadresse.stadt,
          land: orderData.lieferadresse.land || 'Deutschland'
        },
        preise: {
          zwischensumme: gesamtsumme,
          versandkosten: versandkosten,
          mwst: {
            satz: 19,
            betrag: mwstBetrag
          },
          gesamtsumme: endpreis
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
      
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
        },
        body: JSON.stringify(bestellungData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Bestelldaten für später speichern
        if (result.data?.bestellungData) {
          localStorage.setItem('pendingOrder', JSON.stringify(result.data.bestellungData));
        }
        
        // WICHTIG: Warenkorb NICHT hier leeren! 
        // Er wird erst nach erfolgreicher PayPal-Zahlung in CheckoutSuccessPage geleert
        
        // Zur PayPal-Zahlung weiterleiten
        if (result.data?.paypalUrl) {
          console.log('🔗 Weiterleitung zu PayPal:', result.data.paypalUrl);
          window.location.href = result.data.paypalUrl;
        } else {
          setError('PayPal-URL wurde nicht erhalten');
        }
      } else {
        setError(result.message || 'Fehler beim Erstellen der Bestellung');
      }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (!items || items.length === 0 || availableItems.length === 0) {
    return null; // Weiterleitung erfolgt durch useEffect
  }

  const subtotal = availableTotal;
  const versandkosten = subtotal >= 50 ? 0 : 4.99;
  
  // KORREKTE Steuerberechnung: In Deutschland sind Preise INKLUSIVE MwSt.
  // Gesamtsumme = Subtotal (inkl. MwSt.) + Versandkosten (inkl. MwSt.)
  const total = subtotal + versandkosten;
  
  // MwSt.-Betrag aus dem Gesamtbetrag herausrechnen (nicht hinzufügen!)
  const mwst = total - (total / 1.19);

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom 
        sx={{ mb: isMobile ? 2 : 4 }}
      >
        <ShoppingCart sx={{ mr: 2, verticalAlign: 'middle' }} />
        Kasse
      </Typography>
      
      {/* Urlaubs-/Wartungsmodus Benachrichtigung */}
      {/* Warnung für nicht verfügbare Artikel */}
      {availableItems.length < items.length && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: isMobile ? 2 : 3,
            backgroundColor: '#ffebee',
            '& .MuiAlert-icon': { color: '#d32f2f' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
        >
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1 }}>
            ⚠️ Nicht verfügbare Artikel
          </Typography>
          <Typography variant={isMobile ? "body2" : "body2"}>
            {items.length - availableItems.length} Artikel in Ihrem Warenkorb sind derzeit nicht verfügbar 
            und werden <strong>nicht bestellt</strong>. Diese Artikel verbleiben im Warenkorb für eine spätere Bestellung.
          </Typography>
          <Typography variant={isMobile ? "body2" : "body2"} sx={{ mt: 1, fontWeight: 'bold' }}>
            Nur {availableItems.length} von {items.length} Artikeln werden bestellt.
          </Typography>
        </Alert>
      )}

      {/* Shop-Status Warnungen */}
      {shopSettings?.shop === 'vacation' && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            backgroundColor: '#e3f2fd',
            '& .MuiAlert-icon': { color: '#1976d2' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
          icon={<LocalShipping />}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            🏖️ Wir sind derzeit im Urlaub
          </Typography>
          <Typography variant="body2" sx={{ mb: shopSettings?.vacation?.startDate ? 1 : 0 }}>
            Ihre Anfrage wird nach unserer Rückkehr bearbeitet. Vielen Dank für Ihr Verständnis!
            {shopSettings?.checkoutMode === 'inquiry' && 
              ' Sie können trotzdem eine Anfrage stellen.'
            }
          </Typography>
          {shopSettings?.vacation?.startDate && shopSettings?.vacation?.endDate && (
            <Typography variant="body2" sx={{ 
              fontWeight: 'bold', 
              color: '#1976d2',
              fontSize: '0.95rem' 
            }}>
              📅 Urlaubszeit: {new Date(shopSettings.vacation.startDate).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric'
              })} - {new Date(shopSettings.vacation.endDate).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric'
              })}
            </Typography>
          )}
        </Alert>
      )}
      
      {shopSettings?.shop === 'maintenance' && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            backgroundColor: '#fff3e0',
            '& .MuiAlert-icon': { color: '#f57c00' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            🔧 Wartungsarbeiten
          </Typography>
          <Typography variant="body2">
            Wir führen derzeit Wartungsarbeiten durch. Der Service kann eingeschränkt sein.
            {shopSettings?.checkoutMode === 'inquiry' && 
              ' Sie können trotzdem eine Anfrage stellen.'
            }
          </Typography>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={isMobile ? 2 : 4}>
        {/* Linke Spalte: Bestellübersicht */}
        <Grid item xs={12} md={8}>
          {/* Warenkorb-Übersicht */}
          <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Ihre Bestellung
            </Typography>
            <List>
              {/* Warnung bei nicht verfügbaren Artikeln */}
              {availableItems.length < items.length && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {items.length - availableItems.length} Artikel sind nicht verfügbar und werden nicht bestellt.
                </Alert>
              )}
              
              {availableItems.map((item, index) => (
                <div key={item._id || index}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar src={item.images?.[0]} alt={item.name}>
                        <Receipt />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity}x ${formatPrice(item.preis || item.price || 0)}`}
                    />
                    <Typography variant="subtitle1">
                      {formatPrice(item.quantity * (item.preis || item.price || 0))}
                    </Typography>
                  </ListItem>
                  {index < availableItems.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          </Paper>

          {/* Rechnungsadresse - Aus Kundenprofil oder manuell */}
          <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Rechnungsadresse
            </Typography>
            
            {user && orderData.rechnungsadresse.vorname ? (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Diese Adresse wurde aus Ihrem Kundenprofil übernommen
                </Typography>
                <Box sx={{ 
                  backgroundColor: 'grey.50', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  mb: 2
                }}>
                  <Typography variant="body1">
                    <strong>{orderData.rechnungsadresse.vorname} {orderData.rechnungsadresse.nachname}</strong>
                  </Typography>
                  <Typography variant="body2">
                    {orderData.rechnungsadresse.strasse} {orderData.rechnungsadresse.hausnummer}
                  </Typography>
                  <Typography variant="body2">
                    {orderData.rechnungsadresse.plz} {orderData.rechnungsadresse.stadt}
                  </Typography>
                  <Typography variant="body2">
                    {orderData.rechnungsadresse.land}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Falls diese Adresse nicht korrekt ist, aktualisieren Sie bitte Ihr Profil in den Kontoeinstellungen.
                </Typography>
              </>
            ) : (
              <>
                {user && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Ihre Rechnungsadresse konnte nicht aus dem Profil geladen werden. 
                      Bitte füllen Sie die Adresse manuell aus.
                    </Typography>
                  </Alert>
                )}
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vorname *"
                      value={orderData.rechnungsadresse.vorname}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'vorname', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nachname *"
                      value={orderData.rechnungsadresse.nachname}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'nachname', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Straße *"
                      value={orderData.rechnungsadresse.strasse}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'strasse', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Hausnummer *"
                      value={orderData.rechnungsadresse.hausnummer}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'hausnummer', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PLZ *"
                      value={orderData.rechnungsadresse.plz}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'plz', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Stadt *"
                      value={orderData.rechnungsadresse.stadt}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'stadt', e.target.value)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Paper>
          {/* Lieferadresse */}
          <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Lieferadresse
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={orderData.lieferadresse.verwendeRechnungsadresse}
                  onChange={(e) => handleCheckboxChange('lieferadresse.verwendeRechnungsadresse', e.target.checked)}
                />
              }
              label="Lieferadresse = Rechnungsadresse (Haken entfernen für abweichende Lieferadresse)"
              sx={{ 
                '& .MuiFormControlLabel-label': { 
                  fontSize: isMobile ? '0.875rem' : '1rem' 
                } 
              }}
            />
            
            {!orderData.lieferadresse.verwendeRechnungsadresse && (
              <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vorname"
                    value={orderData.lieferadresse.vorname}
                    onChange={(e) => handleInputChange('lieferadresse', 'vorname', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nachname"
                    value={orderData.lieferadresse.nachname}
                    onChange={(e) => handleInputChange('lieferadresse', 'nachname', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Straße"
                    value={orderData.lieferadresse.strasse}
                    onChange={(e) => handleInputChange('lieferadresse', 'strasse', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Hausnummer"
                    value={orderData.lieferadresse.hausnummer}
                    onChange={(e) => handleInputChange('lieferadresse', 'hausnummer', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="PLZ"
                    value={orderData.lieferadresse.plz}
                    onChange={(e) => handleInputChange('lieferadresse', 'plz', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Stadt"
                    value={orderData.lieferadresse.stadt}
                    onChange={(e) => handleInputChange('lieferadresse', 'stadt', e.target.value)}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>

          {/* Notizen */}
          <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Anmerkungen (optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              placeholder="Besondere Wünsche oder Anmerkungen zu Ihrer Bestellung..."
              value={orderData.notizen}
              onChange={(e) => setOrderData(prev => ({ ...prev, notizen: e.target.value }))}
              size={isMobile ? "small" : "medium"}
            />
          </Paper>
        </Grid>

        {/* Rechte Spalte: Zusammenfassung */}
        <Grid item xs={12} md={4}>
          {/* Preisübersicht */}
          <Paper sx={{ 
            p: isMobile ? 2 : 3, 
            mb: isMobile ? 2 : 3, 
            position: isMobile ? 'static' : 'sticky', 
            top: 20 
          }}>
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Bestellzusammenfassung
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Zwischensumme:</Typography>
                <Typography>{formatPrice(subtotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>
                  Versandkosten:
                  {versandkosten === 0 && (
                    <Chip size="small" label="GRATIS" color="success" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography>{formatPrice(versandkosten)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>MwSt. (19%):</Typography>
                <Typography>{formatPrice(mwst)}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Gesamtsumme:</Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(total)}
                </Typography>
              </Box>
            </Box>

            {subtotal < 50 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Versandkostenfrei ab 50€! Noch {formatPrice(50 - subtotal)} bis zum kostenlosen Versand.
                </Typography>
              </Alert>
            )}

            {/* Zahlungshinweis */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Payment color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="primary">
                  {shopSettings?.checkoutMode === 'inquiry' ? 'Anfrage senden' : 'Zahlung via PayPal'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {shopSettings?.checkoutMode === 'inquiry' 
                  ? 'Ihre Anfrage wird an uns gesendet. Wir melden uns schnellstmöglich bei Ihnen.'
                  : 'Sie werden nach dem Bestellen zu PayPal weitergeleitet, um die Zahlung sicher abzuschließen.'
                }
              </Typography>
            </Box>

            {/* Rechtliche Hinweise */}
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Ihre Rechte
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  <strong>Widerrufsrecht:</strong> Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Rückgaberecht:</strong> Ungebrauchte Artikel können innerhalb von 14 Tagen zurückgegeben werden.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Datenschutz:</strong> Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
                </Typography>
                <Typography variant="body2">
                  <strong>Lieferzeit:</strong> Die Lieferung erfolgt innerhalb von 3-5 Werktagen nach Zahlungseingang.
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* Zustimmungen */}
            <Box sx={{ mb: isMobile ? 2 : 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={orderData.agbAkzeptiert}
                    onChange={(e) => handleCheckboxChange('agbAkzeptiert', e.target.checked)}
                  />
                }
                sx={{ 
                  '& .MuiFormControlLabel-label': { 
                    fontSize: isMobile ? '0.875rem' : '1rem' 
                  } 
                }}
                label={
                  <Typography variant={isMobile ? "body2" : "body2"}>
                    Ich akzeptiere die{' '}
                    <Button size="small" onClick={() => window.open('/agb', '_blank')}>
                      AGB
                    </Button>{' '}
                    *
                  </Typography>
                }
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={orderData.datenschutzAkzeptiert}
                    onChange={(e) => handleCheckboxChange('datenschutzAkzeptiert', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Ich akzeptiere die{' '}
                    <Button size="small" onClick={() => window.open('/datenschutz', '_blank')}>
                      Datenschutzerklärung
                    </Button>{' '}
                    *
                  </Typography>
                }
              />
            </Box>

            {/* Bestellen/Anfrage Button */}
            <Button
              fullWidth
              variant="contained"
              size={isMobile ? "large" : "large"}
              onClick={handleSubmitOrder}
              disabled={loading || !orderData.agbAkzeptiert || !orderData.datenschutzAkzeptiert}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ 
                py: isMobile ? 1.5 : 2,
                fontSize: isMobile ? '1rem' : '1.125rem'
              }}
            >
              {loading 
                ? (shopSettings?.checkoutMode === 'inquiry' ? 'Anfrage wird gesendet...' : 'Bestellung wird erstellt...') 
                : (shopSettings?.checkoutMode === 'inquiry' 
                    ? `Anfrage senden (${formatPrice(total)})` 
                    : `Jetzt bestellen (${formatPrice(total)})`
                  )
              }
            </Button>
            
            <Typography 
              variant="caption" 
              display="block" 
              sx={{ 
                mt: 2, 
                textAlign: 'center',
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            >
              {shopSettings?.checkoutMode === 'inquiry' 
                ? 'Ihre Anfrage wird an unser Team gesendet'
                : 'Nach dem Klick werden Sie zu PayPal weitergeleitet'
              }
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CheckoutPage;