import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar
} from '@mui/material';
import {
  Inventory,
  LocalShipping,
  Print,
  CheckCircle,
  Schedule,
  Payment,
  Person,
  LocationOn,
  ShoppingCart,
  Euro,
  ExpandMore,
  Edit,
  Visibility,
  Receipt,
  Email,
  Phone
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailDialog, setOrderDetailDialog] = useState(false);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Status-Konfiguration
  const statusConfig = {
    neu: { label: 'Neu', color: 'info', icon: <Schedule /> },
    bezahlt: { label: 'Bezahlt', color: 'success', icon: <Payment /> },
    bestaetigt: { label: 'Bestätigt', color: 'primary', icon: <CheckCircle /> },
    verpackt: { label: 'Verpackt', color: 'warning', icon: <Inventory /> },
    verschickt: { label: 'Versendet', color: 'info', icon: <LocalShipping /> },
    zugestellt: { label: 'Zugestellt', color: 'success', icon: <CheckCircle /> },
    storniert: { label: 'Storniert', color: 'error', icon: <CheckCircle /> }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders/admin/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Bestellungen');
      }

      const data = await response.json();
      // Nach Bestelldatum sortieren (älteste zuerst)
      const sortedOrders = data.orders.sort((a, b) => 
        new Date(a.bestelldatum) - new Date(b.bestelldatum)
      );
      setOrders(sortedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Status');
      }

      setSnackbar({
        open: true,
        message: `Status erfolgreich auf "${statusConfig[newStatus]?.label}" aktualisiert`,
        severity: 'success'
      });

      setStatusUpdateDialog(false);
      loadOrders(); // Neu laden
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error'
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  const renderShippingAddress = (order) => {
    const shipping = order.lieferadresse?.verwendeRechnungsadresse 
      ? order.rechnungsadresse 
      : order.lieferadresse;
    
    const name = `${order.besteller?.vorname} ${order.besteller?.nachname}`;
    
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold">
          {name}
        </Typography>
        <Typography variant="body2">
          {shipping?.strasse} {shipping?.hausnummer}
          {shipping?.zusatz && <><br />{shipping.zusatz}</>}
        </Typography>
        <Typography variant="body2">
          {shipping?.plz} {shipping?.stadt}
        </Typography>
        <Typography variant="body2">
          {shipping?.land || 'Deutschland'}
        </Typography>
      </Box>
    );
  };

  const renderOrderItems = (artikel) => {
    return (
      <List dense>
        {artikel?.map((item, index) => (
          <ListItem key={index} divider={index < artikel.length - 1}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {item.produktSnapshot?.name}
                  </Typography>
                  <Typography variant="body2" color="primary" fontWeight="bold">
                    {formatCurrency(item.gesamtpreis)}
                  </Typography>
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Menge: {item.menge} × {formatCurrency(item.einzelpreis)}
                  </Typography>
                  {item.produktSnapshot?.gewicht && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Gewicht: {item.produktSnapshot.gewicht}g
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Lade Bestellungen...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          📦 Bestellungsverwaltung
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {orders.length} Bestellungen (älteste zuerst)
        </Typography>
      </Box>

      {orders.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Keine Bestellungen vorhanden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Es sind noch keine Bestellungen eingegangen.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} lg={6} xl={4} key={order._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => {
                  setSelectedOrder(order);
                  setOrderDetailDialog(true);
                }}
              >
                <CardContent>
                  {/* Header mit Status und Bestellnummer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {order.bestellnummer}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.bestelldatum)}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusConfig[order.status]?.label}
                      color={statusConfig[order.status]?.color}
                      size="small"
                      icon={statusConfig[order.status]?.icon}
                    />
                  </Box>

                  {/* Kunde */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Person sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {order.besteller?.vorname} {order.besteller?.nachname}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.besteller?.email}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Versandadresse (kompakt) */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                    <Box sx={{ fontSize: '0.875rem' }}>
                      {renderShippingAddress(order)}
                    </Box>
                  </Box>

                  {/* Artikel Übersicht */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ShoppingCart sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {order.artikel?.length} Artikel
                    </Typography>
                  </Box>

                  {/* Gesamtsumme */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Gesamtsumme:
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(order.preise?.gesamtsumme)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Bestelldetails Dialog */}
      <Dialog
        open={orderDetailDialog}
        onClose={() => setOrderDetailDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              📦 Bestellung {selectedOrder?.bestellnummer}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => {
                  setNewStatus(selectedOrder?.status);
                  setStatusUpdateDialog(true);
                }}
              >
                Status ändern
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={() => window.print()}
              >
                Drucken
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              {/* Bestellinformationen */}
              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">📋 Bestellinformationen</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Bestellnummer" secondary={selectedOrder.bestellnummer} />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Bestelldatum" 
                          secondary={formatDate(selectedOrder.bestelldatum)} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Status">
                          <Chip
                            label={statusConfig[selectedOrder.status]?.label}
                            color={statusConfig[selectedOrder.status]?.color}
                            size="small"
                            icon={statusConfig[selectedOrder.status]?.icon}
                          />
                        </ListItemText>
                      </ListItem>
                      {selectedOrder.zahlung?.transactionId && (
                        <ListItem>
                          <ListItemText 
                            primary="PayPal Transaction ID" 
                            secondary={selectedOrder.zahlung.transactionId} 
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Kunde */}
              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">👤 Kundendaten</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Name" 
                          secondary={`${selectedOrder.besteller?.vorname} ${selectedOrder.besteller?.nachname}`} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="E-Mail" secondary={selectedOrder.besteller?.email} />
                      </ListItem>
                      {selectedOrder.besteller?.telefon && (
                        <ListItem>
                          <ListItemText primary="Telefon" secondary={selectedOrder.besteller.telefon} />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Versandadresse */}
              <Grid item xs={12} md={6}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">🚚 Versandadresse</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {renderShippingAddress(selectedOrder)}
                    </Paper>
                    {selectedOrder.lieferadresse?.verwendeRechnungsadresse && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        ℹ️ Verwendet Rechnungsadresse als Lieferadresse
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Rechnungsadresse */}
              <Grid item xs={12} md={6}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">🧾 Rechnungsadresse</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {selectedOrder.besteller?.vorname} {selectedOrder.besteller?.nachname}
                      </Typography>
                      <Typography variant="body2">
                        {selectedOrder.rechnungsadresse?.strasse} {selectedOrder.rechnungsadresse?.hausnummer}
                        {selectedOrder.rechnungsadresse?.zusatz && (
                          <><br />{selectedOrder.rechnungsadresse.zusatz}</>
                        )}
                      </Typography>
                      <Typography variant="body2">
                        {selectedOrder.rechnungsadresse?.plz} {selectedOrder.rechnungsadresse?.stadt}
                      </Typography>
                      <Typography variant="body2">
                        {selectedOrder.rechnungsadresse?.land || 'Deutschland'}
                      </Typography>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Bestellte Artikel */}
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">🛍️ Bestellte Artikel</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderOrderItems(selectedOrder.artikel)}
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Preisübersicht */}
              <Grid item xs={12} md={6}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">💰 Preisübersicht</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Zwischensumme" 
                          secondary={formatCurrency(selectedOrder.preise?.zwischensumme)} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Versandkosten" 
                          secondary={formatCurrency(selectedOrder.preise?.versandkosten)} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary={`MwSt. (${selectedOrder.preise?.mwst?.satz}%)`}
                          secondary={formatCurrency(selectedOrder.preise?.mwst?.betrag)} 
                        />
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText 
                          primary={<Typography variant="h6">Gesamtsumme</Typography>}
                          secondary={
                            <Typography variant="h6" color="primary">
                              {formatCurrency(selectedOrder.preise?.gesamtsumme)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOrderDetailDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusUpdateDialog}
        onClose={() => setStatusUpdateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Status ändern</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Neuer Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Neuer Status"
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {config.icon}
                    <Typography sx={{ ml: 1 }}>{config.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={!newStatus}
          >
            Status aktualisieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminOrders;