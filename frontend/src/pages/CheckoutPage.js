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
  Chip
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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { items, getCartTotal, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
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
      // Kundendaten aus Profil laden
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}/kunden/profil`;
      console.log('🌐 API URL:', fullUrl);
      
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
        console.log('👤 Customer data loaded:', kunde);
        console.log('🏠 Customer address:', kunde.adresse);
        
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
          
          console.log('🏠 Setting rechnungsadresse:', newRechnungsadresse);
          
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
    console.log('🔍 User properties:', user ? Object.keys(user) : 'No user');
    console.log('🔍 User.kundeId:', user?.kundeId);
    console.log('🔍 User.id:', user?.id);
    
    if (user && (user.kundeId || user.id)) {
      const customerId = user.kundeId || user.id;
      console.log('👤 Loading customer data for ID:', customerId);
      // Kurze Verzögerung um sicherzustellen, dass das Backend bereit ist
      setTimeout(() => loadCustomerData(), 500);
    } else {
      console.log('❌ No valid user ID found for loading customer data');
    }
  }, [user, loadCustomerData]);

  // Debug useEffect für Rechnungsadresse
  useEffect(() => {
    console.log('🏠 Rechnungsadresse changed:', orderData.rechnungsadresse);
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
      // Bestellung erstellen
      const gesamtsumme = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const versandkosten = gesamtsumme >= 50 ? 0 : 4.99;
      const zwischensumme = gesamtsumme + versandkosten;
      const mwstBetrag = zwischensumme * 0.19;
      const endpreis = zwischensumme + mwstBetrag;

      const bestellungData = {
        artikel: items.map(item => ({
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
      
    } catch (error) {
      console.error('Fehler beim Bestellen:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (!items || items.length === 0) {
    return null; // Weiterleitung erfolgt durch useEffect
  }

  const subtotal = getCartTotal();
  const versandkosten = subtotal >= 50 ? 0 : 4.99;
  const mwst = (subtotal + versandkosten) * 0.19;
  const total = subtotal + versandkosten + mwst;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        <ShoppingCart sx={{ mr: 2, verticalAlign: 'middle' }} />
        Kasse
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Linke Spalte: Bestellübersicht */}
        <Grid item xs={12} md={8}>
          {/* Warenkorb-Übersicht */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ihre Bestellung
            </Typography>
            <List>
              {items.map((item, index) => (
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
                  {index < items.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          </Paper>

          {/* Rechnungsadresse - Aus Kundenprofil oder manuell */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
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
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vorname *"
                      value={orderData.rechnungsadresse.vorname}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'vorname', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nachname *"
                      value={orderData.rechnungsadresse.nachname}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'nachname', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Straße *"
                      value={orderData.rechnungsadresse.strasse}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'strasse', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Hausnummer *"
                      value={orderData.rechnungsadresse.hausnummer}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'hausnummer', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PLZ *"
                      value={orderData.rechnungsadresse.plz}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'plz', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Stadt *"
                      value={orderData.rechnungsadresse.stadt}
                      onChange={(e) => handleInputChange('rechnungsadresse', 'stadt', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Paper>
          {/* Lieferadresse */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
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
            />
            
            {!orderData.lieferadresse.verwendeRechnungsadresse && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vorname"
                    value={orderData.lieferadresse.vorname}
                    onChange={(e) => handleInputChange('lieferadresse', 'vorname', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nachname"
                    value={orderData.lieferadresse.nachname}
                    onChange={(e) => handleInputChange('lieferadresse', 'nachname', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Straße"
                    value={orderData.lieferadresse.strasse}
                    onChange={(e) => handleInputChange('lieferadresse', 'strasse', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Hausnummer"
                    value={orderData.lieferadresse.hausnummer}
                    onChange={(e) => handleInputChange('lieferadresse', 'hausnummer', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="PLZ"
                    value={orderData.lieferadresse.plz}
                    onChange={(e) => handleInputChange('lieferadresse', 'plz', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Stadt"
                    value={orderData.lieferadresse.stadt}
                    onChange={(e) => handleInputChange('lieferadresse', 'stadt', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>

          {/* Notizen */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Anmerkungen (optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Besondere Wünsche oder Anmerkungen zu Ihrer Bestellung..."
              value={orderData.notizen}
              onChange={(e) => setOrderData(prev => ({ ...prev, notizen: e.target.value }))}
            />
          </Paper>
        </Grid>

        {/* Rechte Spalte: Zusammenfassung */}
        <Grid item xs={12} md={4}>
          {/* Preisübersicht */}
          <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
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
                  Zahlung via PayPal
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Sie werden nach dem Bestellen zu PayPal weitergeleitet, um die Zahlung sicher abzuschließen.
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
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={orderData.agbAkzeptiert}
                    onChange={(e) => handleCheckboxChange('agbAkzeptiert', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
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

            {/* Bestellen Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSubmitOrder}
              disabled={loading || !orderData.agbAkzeptiert || !orderData.datenschutzAkzeptiert}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ py: 2 }}
            >
              {loading ? 'Bestellung wird erstellt...' : `Jetzt bestellen (${formatPrice(total)})`}
            </Button>
            
            <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
              Nach dem Klick werden Sie zu PayPal weitergeleitet
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CheckoutPage;