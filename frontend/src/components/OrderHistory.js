import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import {
  ExpandMore,
  Receipt,
  ShoppingCart,
  Payment,
  Warning
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import { ordersAPI } from '../services/api';
import BestellStatusBar from './BestellStatusBar';
import api from '../services/api';

const OrderHistory = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paypalLoading, setPaypalLoading] = useState({});
  const [paypalEnabled, setPaypalEnabled] = useState(false);

  // PayPal-Status laden
  const checkPayPalStatus = useCallback(async () => {
    try {
      const response = await api.get('/inquiries/paypal-status');
      if (response.data.success) {
        setPaypalEnabled(response.data.paypalEnabled);
        console.log('💳 PayPal Status geladen:', response.data.paypalEnabled ? 'Aktiviert' : 'Deaktiviert');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des PayPal-Status:', error);
      setPaypalEnabled(false);
    }
  }, []);

  // Beim Laden der Komponente PayPal-Status prüfen
  useEffect(() => {
    checkPayPalStatus();
  }, [checkPayPalStatus]);

  // PayPal-Zahlung für Bestellung initiieren
  const handlePayment = async (order) => {
    try {
      setPaypalLoading(prev => ({ ...prev, [order._id]: true }));

      const response = await api.post('/orders/payment', {
        orderId: order._id,
        amount: order.preise?.gesamtsumme || 0,
        currency: 'EUR'
      });

      if (response.data.success && response.data.approvalUrl) {
        // Zu PayPal weiterleiten
        window.location.href = response.data.approvalUrl;
      } else {
        throw new Error(response.data.message || 'Fehler beim Erstellen der PayPal-Zahlung');
      }
    } catch (error) {
      console.error('❌ Fehler beim Initiieren der PayPal-Zahlung:', error);
      
      // Spezifische Fehlermeldungen
      let errorMessage = 'Fehler beim Initiieren der Zahlung';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server-Fehler. Diese Bestellung kann möglicherweise nicht über PayPal bezahlt werden. Bitte kontaktieren Sie uns für alternative Zahlungsmöglichkeiten.';
      }
      
      setError(errorMessage);
    } finally {
      setPaypalLoading(prev => ({ ...prev, [order._id]: false }));
    }
  };

  // Prüfen ob PayPal-Button angezeigt werden soll
  const canPay = (order) => {
    const paymentStatus = order.zahlung?.status?.toLowerCase();
    const orderStatus = order.status?.toLowerCase();
    
    console.log('🔍 ERWEITERTE PayPal Prüfung für:', order.bestellnummer || order.orderId);
    console.log('📊 Status Details:', {
      originalStatus: order.status,
      lowerCaseStatus: orderStatus,
      paymentStatus: paymentStatus,
      originalPaymentStatus: order.zahlung?.status,
      source: order.source,
      hasZahlung: !!order.zahlung,
      paypalEnabled: paypalEnabled,
      completeOrder: order
    });
    
    // Prüfung auf abgelehnte Bestellungen - diese können NICHT bezahlt werden
    if (orderStatus === 'abgelehnt' || orderStatus === 'rejected' || orderStatus === 'cancelled') {
      console.log('❌ Bestellung abgelehnt - kein PayPal Button');
      return { canPay: false, reason: 'order_rejected' };
    }

    // Prüfung auf bereits bezahlte Bestellungen - diese können NICHT erneut bezahlt werden
    if (paymentStatus === 'bezahlt' || paymentStatus === 'paid' || paymentStatus === 'completed') {
      console.log('❌ Bestellung bereits bezahlt - kein PayPal Button');
      return { canPay: false, reason: 'already_paid' };
    }
    
    // Prüfung auf versendete/zugestellte/verpackte Bestellungen - diese gelten als automatisch bezahlt
    if (orderStatus === 'verschickt' || orderStatus === 'versendet' || 
        orderStatus === 'zugestellt' || orderStatus === 'delivered' || orderStatus === 'shipped' ||
        orderStatus === 'verpackt' || orderStatus === 'packed') {
      console.log('❌ Bestellung bereits verpackt/verschickt/zugestellt - automatisch als bezahlt betrachtet');
      return { canPay: false, reason: 'already_processed' };
    }
    
    // KLARE PayPal-Logik gemäß Anforderungen:
    // PayPal-Button anzeigen wenn:
    // ✅ Status: neu, bestätigt (NICHT verpackt/verschickt/zugestellt)
    // ✅ Zahlungsstatus: ausstehend
    // ✅ PayPal aktiviert (unabhängig von Urlaub/Wartung)
    // ✅ Bestellung noch nicht bezahlt
    
    const istKonvertierteAnfrage = order.source === 'inquiry' || order.sourceInquiryId;
    
    const isValidForPayment = 
      orderStatus === 'bestätigt' || 
      orderStatus === 'bestaetigt' || 
      orderStatus === 'neu' ||
      orderStatus === 'confirmed'; // Nur neu und bestätigt!
    
    const isNotPaid = 
      !paymentStatus || 
      paymentStatus === 'ausstehend' || 
      paymentStatus === 'pending';

    // Basis-Validierung: Status und Zahlungsstatus
    if (!isValidForPayment || !isNotPaid) {
      // Ausnahme für konvertierte Anfragen: Diese dürfen auch bei anderem Status bezahlt werden,
      // aber NICHT wenn sie verpackt/verschickt/zugestellt sind
      if (istKonvertierteAnfrage && isNotPaid && 
          orderStatus !== 'verpackt' && orderStatus !== 'verschickt' && 
          orderStatus !== 'versendet' && orderStatus !== 'zugestellt') {
        console.log('✅ Konvertierte Anfrage - PayPal erlaubt trotz Status:', orderStatus);
      } else {
        console.log('❌ Bestellung nicht bezahlbar - Status:', orderStatus, 'oder bereits bezahlt:', paymentStatus);
        return { canPay: false, reason: 'not_payable' };
      }
    }

    // PayPal-Verfügbarkeit prüfen (nur explizite Deaktivierung, nicht Urlaub/Wartung)
    if (!paypalEnabled) {
      console.log('❌ PayPal ist explizit deaktiviert in Admin-Einstellungen');
      return { canPay: false, reason: 'paypal_disabled' };
    }
    
    console.log('✅ PayPal Button kann angezeigt werden - alle Bedingungen erfüllt');
    return { canPay: true, reason: 'available' };
  };

  // Bestellungen laden
  const loadOrders = useCallback(async () => {
    if (!user) {
      setError('Benutzer nicht angemeldet');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Markiere als "besucht" für Badge-System - nur für Kunden
      const isAdmin = user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin');
      if (!isAdmin) {
        window.dispatchEvent(new CustomEvent('ordersViewed'));
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Kunden-Bestellungen-Seite besucht - Badge-Reset ausgelöst');
        }
      }
      
      const result = await ordersAPI.getCustomerOrders({
        limit: 50,
        sortBy: 'bestelldatum',
        sortOrder: 'desc'
      });

      if (result.success) {
        console.log('🔍 DEBUG: Rohe Bestellungsdaten vom Backend:', result.data.bestellungen);
        
        // Debug: Detaillierte Analyse jeder Bestellung
        result.data.bestellungen?.forEach((order, index) => {
          console.log(`📦 Bestellung ${index + 1}:`, {
            bestellnummer: order.bestellnummer,
            status: order.status,
            source: order.source,
            preise: order.preise,
            artikel: order.artikel,
            items: order.items,
            hasArtikel: !!order.artikel,
            hasItems: !!order.items,
            artikelLength: order.artikel?.length || 0,
            itemsLength: order.items?.length || 0,
            gesamtsumme: order.preise?.gesamtsumme
          });
        });
        
        setOrders(result.data.bestellungen || []);
        setError(''); // Clear previous errors
      } else {
        setError(result.message || 'Fehler beim Laden der Bestellungen');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellhistorie:', error);
      // Don't auto-logout on API errors
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        setError('Sitzung abgelaufen. Bitte loggen Sie sich erneut ein.');
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin' // CET/CEST für Deutschland
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <ShoppingCart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Noch keine Bestellungen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sie haben noch keine Bestellungen aufgegeben.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Receipt sx={{ mr: 1 }} />
        Meine Bestellungen
      </Typography>
      
      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <Accordion key={order._id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {order.bestellnummer}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(order.bestelldatum || order.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BestellStatusBar status={order.status} compact={true} />
                  {canPay(order).canPay && (
                    <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body1" fontWeight="bold">
                  {formatPrice(order.preise?.gesamtsumme || 0)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    // Flexibler Artikel-Count für verschiedene Datenstrukturen
                    const artikelCount = order.artikel?.length || 0;
                    const itemsCount = order.items?.length || 0;
                    
                    // Wenn beides 0 ist, aber es Anfragen-Items gibt
                    if (artikelCount === 0 && itemsCount === 0 && order.sourceInquiryId) {
                      // Für umgewandelte Anfragen: Fallback-Berechnung
                      const total = order.preise?.gesamtsumme || 0;
                      if (total > 0) {
                        return `Artikel aus Anfrage (${total.toFixed(2)}€)`;
                      }
                    }
                    
                    return `${Math.max(artikelCount, itemsCount)} Artikel`;
                  })()}
                </Typography>
              </Grid>
            </Grid>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Bestellstatus - Vollständige Anzeige */}
              <Grid item xs={12}>
                <BestellStatusBar status={order.status} showDescription={true} />
              </Grid>
              
              {/* Bestelldetails */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Bestelldetails
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Bestellnummer" 
                      secondary={order.bestellnummer}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Bestelldatum" 
                      secondary={formatDate(order.bestelldatum || order.createdAt)}
                    />
                  </ListItem>
                  {order.zahlung?.transactionId && (
                    <ListItem>
                      <ListItemText 
                        primary="Transaktions-ID" 
                        secondary={order.zahlung.transactionId}
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>

              {/* Artikel */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Bestellte Artikel
                </Typography>
                <List dense>
                  {(() => {
                    const artikelListe = order.artikel || order.items || [];
                    
                    // Wenn keine Artikel vorhanden, aber es ist eine umgewandelte Anfrage
                    if (artikelListe.length === 0 && order.sourceInquiryId) {
                      return (
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar variant="square">
                              <ShoppingCart />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Artikel aus ursprünglicher Anfrage"
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.secondary" display="block">
                                  Gesamtsumme: {formatPrice(order.preise?.gesamtsumme || 0)}
                                </Typography>
                                <Typography component="span" variant="body2" color="warning.main" display="block">
                                  Artikeldetails nicht verfügbar (Legacy-Daten)
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      );
                    }
                    
                    return artikelListe.map((artikel, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar src={artikel.produktSnapshot?.bild || artikel.bild || artikel.image} variant="square">
                            <ShoppingCart />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={artikel.produktSnapshot?.name || artikel.name || 'Unbekanntes Produkt'}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                Menge: {artikel.menge || artikel.quantity || 0} × {formatPrice(artikel.einzelpreis || artikel.price || 0)}
                              </Typography>
                              <Typography component="span" variant="body2" fontWeight="bold" display="block">
                                Gesamt: {formatPrice(artikel.gesamtpreis || (artikel.menge || artikel.quantity || 0) * (artikel.einzelpreis || artikel.price || 0))}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ));
                  })()}
                </List>
              </Grid>

              {/* Lieferadresse */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Lieferadresse
                </Typography>
                <Typography variant="body2">
                  {order.besteller?.vorname} {order.besteller?.nachname}
                  <br />
                  {order.lieferadresse?.verwendeRechnungsadresse 
                    ? `${order.rechnungsadresse?.strasse} ${order.rechnungsadresse?.hausnummer}`
                    : `${order.lieferadresse?.strasse} ${order.lieferadresse?.hausnummer}`
                  }
                  <br />
                  {order.lieferadresse?.verwendeRechnungsadresse 
                    ? `${order.rechnungsadresse?.plz} ${order.rechnungsadresse?.stadt}`
                    : `${order.lieferadresse?.plz} ${order.lieferadresse?.stadt}`
                  }
                </Typography>
              </Grid>

              {/* Preisübersicht */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Preisübersicht
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Zwischensumme" 
                      secondary={formatPrice(order.preise?.zwischensumme || 0)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Versandkosten" 
                      secondary={formatPrice(order.preise?.versandkosten || 0)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="MwSt." 
                      secondary={formatPrice(order.preise?.mwst?.betrag || 0)}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText 
                      primary="Gesamtsumme"
                      primaryTypographyProps={{ 
                        component: "span",
                        variant: "subtitle1", 
                        fontWeight: "bold" 
                      }}
                      secondary={formatPrice(order.preise?.gesamtsumme || 0)}
                      secondaryTypographyProps={{ 
                        component: "span",
                        variant: "h6", 
                        color: "primary" 
                      }}
                    />
                  </ListItem>
                </List>
              </Grid>

              {/* PayPal-Zahlung oder Info für ausstehende Bestellungen */}
              {(() => {
                const payResult = canPay(order);
                
                if (payResult.canPay) {
                  // PayPal verfügbar - zeige Button
                  return (
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ backgroundColor: '#fff3e0', borderColor: '#ff9800' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ color: '#f57c00', display: 'flex', alignItems: 'center' }}>
                            <Payment sx={{ mr: 1 }} />
                            Zahlung ausstehend
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Diese Bestellung ist bestätigt und wartet auf die Zahlung. Schließen Sie den Zahlungsvorgang ab, um die Bestellung zu vervollständigen.
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handlePayment(order)}
                            disabled={paypalLoading[order._id]}
                            sx={{ 
                              backgroundColor: '#0070ba',
                              '&:hover': { backgroundColor: '#005ea6' }
                            }}
                          >
                            {paypalLoading[order._id] ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              'Mit PayPal bezahlen'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                } else if (payResult.reason === 'paypal_disabled') {
                  // PayPal deaktiviert - zeige Info
                  return (
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ backgroundColor: '#f5f5f5', borderColor: '#bdbdbd' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ color: '#757575', display: 'flex', alignItems: 'center' }}>
                            <Warning sx={{ mr: 1 }} />
                            PayPal nicht verfügbar
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            PayPal steht derzeit nicht zur Verfügung. Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns für alternative Zahlungsmöglichkeiten.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                }
                // Keine Zahlung möglich/notwendig - zeige nichts
                return null;
              })()}
            </Grid>
          </AccordionDetails>
        </Accordion>
        ))
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              {loading ? 'Bestellungen werden geladen...' : 'Noch keine Bestellungen vorhanden.'}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default OrderHistory;