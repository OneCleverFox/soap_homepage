import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
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
  LocalShipping,
  CheckCircle,
  AccessTime,
  ShoppingCart
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import BestellungenAPI from '../services/bestellungenAPI';
import BestellStatusBar from './BestellStatusBar';

const OrderHistory = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) {
        setError('Benutzer nicht angemeldet');
        setLoading(false);
        return;
      }

      try {
        const result = await BestellungenAPI.getBestellungen({
          limit: 50,
          sortBy: 'bestelldatum',
          sortOrder: 'desc'
        });

        if (result.success) {
          // Backend gibt data.bestellungen zurück, nicht nur data
          setOrders(result.data.bestellungen || []);
        } else {
          setError(result.message || 'Fehler beim Laden der Bestellungen');
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Bestellhistorie:', error);
        setError('Ein unerwarteter Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]); // Abhängigkeit von user statt user.kundennummer

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
                <BestellStatusBar status={order.status} compact={true} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body1" fontWeight="bold">
                  {formatPrice(order.preise?.gesamtsumme || 0)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  {order.artikel?.length || 0} Artikel
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
                  {order.artikel?.map((artikel, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar src={artikel.produktSnapshot?.bild} variant="square">
                          <ShoppingCart />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={artikel.produktSnapshot?.name || 'Unbekanntes Produkt'}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Menge: {artikel.menge} × {formatPrice(artikel.einzelpreis)}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              Gesamt: {formatPrice(artikel.gesamtpreis)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
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
                      primary={
                        <Typography component="span" variant="subtitle1" fontWeight="bold">
                          Gesamtsumme
                        </Typography>
                      }
                      secondary={
                        <Typography component="span" variant="h6" color="primary">
                          {formatPrice(order.preise?.gesamtsumme || 0)}
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
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