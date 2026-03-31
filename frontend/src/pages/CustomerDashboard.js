import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  ShoppingCart,
  Assignment,
  Visibility,
  Close,
  CheckCircle,
  Warning,
  AccessTime,
  LocalShipping,
  Inventory2,
  Refresh
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CustomerDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemType, setItemType] = useState(null); // 'order' oder 'inquiry'
  const [paypalEnabled, setPaypalEnabled] = useState(false);

  // Alle Daten laden
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Bestellungen laden
      const ordersResponse = await api.get('/orders/meine-bestellungen?limit=100');
      if (ordersResponse.data.success) {
        setOrders(ordersResponse.data.data?.bestellungen || ordersResponse.data.bestellungen || []);
      }
      
      // Anfragen laden
      const inquiriesResponse = await api.get('/inquiries/customer/my-inquiries');
      if (inquiriesResponse.success || inquiriesResponse.data?.success) {
        setInquiries(inquiriesResponse.data?.inquiries || []);
      }
      
      // PayPal-Status laden
      const paypalResponse = await api.get('/inquiries/paypal-status');
      if (paypalResponse.data?.success) {
        setPaypalEnabled(paypalResponse.data.paypalEnabled);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE');
  };

  const formatPrice = (price) => {
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice);
  };

  const getStatusIcon = (status, type) => {
    const statusLower = String(status || '').toLowerCase();
    if (type === 'order') {
      switch (statusLower) {
        case 'neu': return <AccessTime color="warning" />;
        case 'bestaetigt': return <CheckCircle color="info" />;
        case 'bezahlt': return <CheckCircle color="success" />;
        case 'verpackt': return <Inventory2 color="info" />;
        case 'verschickt': return <LocalShipping color="secondary" />;
        case 'zugestellt': return <CheckCircle color="success" />;
        case 'storniert': return <Warning color="error" />;
        default: return <ShoppingCart />;
      }
    } else {
      switch (statusLower) {
        case 'pending': return <AccessTime color="warning" />;
        case 'accepted': return <CheckCircle color="success" />;
        case 'converted_to_order': return <ShoppingCart color="primary" />;
        case 'paid': return <CheckCircle color="success" />;
        case 'verpackt': return <Inventory2 color="info" />;
        case 'verschickt': return <LocalShipping color="secondary" />;
        case 'zugestellt': return <CheckCircle color="success" />;
        default: return <Assignment />;
      }
    }
  };

  const getStatusLabel = (status) => {
    const statusLower = String(status || '').toLowerCase();
    const labels = {
      'pending': 'Ausstehend',
      'accepted': 'Angenommen',
      'rejected': 'Abgelehnte Anfrage',
      'converted_to_order': 'Umgewandelt',
      'payment_pending': 'Zahlung ausstehend',
      'paid': 'Bezahlt',
      'neu': 'Neu',
      'bestaetigt': 'Bestätigt',
      'bezahlt': 'Bezahlt',
      'verpackt': 'Verpackt',
      'verschickt': 'Verschickt',
      'versendet': 'Versendet',
      'zugestellt': 'Zugestellt',
      'storniert': 'Storniert'
    };
    return labels[statusLower] || status;
  };

  const getStatusColor = (status) => {
    const statusLower = String(status || '').toLowerCase();
    const colors = {
      'pending': 'warning',
      'accepted': 'success',
      'rejected': 'error',
      'converted_to_order': 'primary',
      'payment_pending': 'warning',
      'paid': 'success',
      'neu': 'info',
      'bestaetigt': 'info',
      'bezahlt': 'success',
      'verpackt': 'info',
      'verschickt': 'secondary',
      'versendet': 'secondary',
      'zugestellt': 'success',
      'storniert': 'error'
    };
    return colors[statusLower] || 'default';
  };

  const isInquiryConvertedToOrder = (inquiry) => {
    const statusLower = String(inquiry?.status || '').toLowerCase();
    return Boolean(
      inquiry?.convertedOrderId ||
      inquiry?.orderStatus ||
      inquiry?.orderId ||
      statusLower === 'converted_to_order'
    );
  };

  const visibleInquiries = inquiries.filter((inquiry) => !isInquiryConvertedToOrder(inquiry));

  const showDetails = (item, type) => {
    setSelectedItem(item);
    setItemType(type);
    setDialogOpen(true);

    // Als gesehen markieren → Badge im Header zurücksetzen
    const userId = user?.id || user?.userId;
    if (userId && item._id) {
      const seenKey = type === 'order'
        ? `seen_orders_${userId}`
        : `seen_inquiries_${userId}`;
      try {
        const seen = JSON.parse(localStorage.getItem(seenKey) || '{}');
        seen[item._id] = (item.status || '').toLowerCase();
        localStorage.setItem(seenKey, JSON.stringify(seen));
      } catch {}
      window.dispatchEvent(new CustomEvent('itemViewed'));
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Daten werden geladen...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCart sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Meine Bestellungen & Anfragen
            </Typography>
          </Box>
          <IconButton onClick={loadData} size="small" title="Aktualisieren">
            <Refresh />
          </IconButton>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Hier sehen Sie alle Ihre Bestellungen und Anfragen. Sie können den Status verfolgen, Rechnungen herunterladen und Zahlungen durchführen.
        </Typography>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="Bestellungen und Anfragen">
            <Tab 
              icon={<ShoppingCart />} 
              iconPosition="start"
              label={`Übersicht (${orders.length + visibleInquiries.length})`}
            />
            <Tab 
              icon={<Assignment />} 
              iconPosition="start"
              label={`Anfragen (${visibleInquiries.length})`}
            />
          </Tabs>
        </Box>

        {/* Übersicht Tab */}
        {currentTab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Bestellungen
            </Typography>
            {orders.length === 0 ? (
              <Alert severity="info">
                Sie haben noch keine Bestellungen. Entdecken Sie unsere Produkte!
              </Alert>
            ) : isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {orders.map((order) => (
                  <Card
                    key={order._id}
                    variant="outlined"
                    onClick={() => showDetails(order, 'order')}
                    sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
                  >
                    <CardContent sx={{ pb: '12px !important', pt: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-all', flex: 1, mr: 1, fontSize: '0.78rem' }}>
                          {order.bestellnummer || order.orderId}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(order.status, 'order')}
                          label={getStatusLabel(order.status)}
                          color={getStatusColor(order.status)}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 0.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDate(order.createdAt || order.bestelldatum)}
                          </Typography>
                          {order.versand?.sendungsnummer && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📦 {order.versand.sendungsnummer}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {formatPrice(order.preise?.gesamtsumme || order.gesamtsumme || 0)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableRow>
                      <TableCell>Bestellnummer</TableCell>
                      <TableCell>Datum</TableCell>
                      <TableCell>Betrag</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order._id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {order.bestellnummer || order.orderId}
                        </TableCell>
                        <TableCell>
                          {formatDate(order.createdAt || order.bestelldatum)}
                        </TableCell>
                        <TableCell>
                          {formatPrice(order.preise?.gesamtsumme || order.gesamtsumme || 0)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(order.status, 'order')}
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => showDetails(order, 'order')}
                            title="Details anzeigen"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
              Anfragen
            </Typography>
            {visibleInquiries.length === 0 ? (
              <Alert severity="info">
                Sie haben aktuell keine offenen oder abgelehnten Anfragen.
              </Alert>
            ) : isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {visibleInquiries.map((inquiry) => (
                  <Card
                    key={inquiry._id}
                    variant="outlined"
                    onClick={() => showDetails(inquiry, 'inquiry')}
                    sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
                  >
                    <CardContent sx={{ pb: '12px !important', pt: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.78rem' }}>
                          {inquiry.inquiryId}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(inquiry.status, 'inquiry')}
                          label={getStatusLabel(inquiry.status)}
                          color={getStatusColor(inquiry.status)}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(inquiry.createdAt)} · {inquiry.items?.length || 0} Artikel
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatPrice(inquiry.total || 0)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableRow>
                      <TableCell>Anfrage-ID</TableCell>
                      <TableCell>Datum</TableCell>
                      <TableCell>Artikel</TableCell>
                      <TableCell>Betrag</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleInquiries.map((inquiry) => (
                      <TableRow key={inquiry._id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {inquiry.inquiryId}
                        </TableCell>
                        <TableCell>
                          {formatDate(inquiry.createdAt)}
                        </TableCell>
                        <TableCell>
                          {inquiry.items?.length || 0}x
                        </TableCell>
                        <TableCell>
                          {formatPrice(inquiry.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(inquiry.status, 'inquiry')}
                            label={getStatusLabel(inquiry.status)}
                            color={getStatusColor(inquiry.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => showDetails(inquiry, 'inquiry')}
                            title="Details anzeigen"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Anfragen Tab */}
        {currentTab === 1 && (
          <Box>
            {visibleInquiries.length === 0 ? (
              <Alert severity="info">
                Sie haben aktuell keine offenen oder abgelehnten Anfragen.
              </Alert>
            ) : isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {visibleInquiries.map((inquiry) => (
                  <Card
                    key={inquiry._id}
                    variant="outlined"
                    onClick={() => showDetails(inquiry, 'inquiry')}
                    sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
                  >
                    <CardContent sx={{ pb: '12px !important', pt: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.78rem' }}>
                          {inquiry.inquiryId}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(inquiry.status, 'inquiry')}
                          label={getStatusLabel(inquiry.status)}
                          color={getStatusColor(inquiry.status)}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(inquiry.createdAt)} · {inquiry.items?.length || 0} Artikel
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatPrice(inquiry.total || 0)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableRow>
                      <TableCell>Anfrage-ID</TableCell>
                      <TableCell>Datum</TableCell>
                      <TableCell>Artikel</TableCell>
                      <TableCell>Betrag</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleInquiries.map((inquiry) => (
                      <TableRow key={inquiry._id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {inquiry.inquiryId}
                        </TableCell>
                        <TableCell>
                          {formatDate(inquiry.createdAt)}
                        </TableCell>
                        <TableCell>
                          {inquiry.items?.length || 0}x
                        </TableCell>
                        <TableCell>
                          {formatPrice(inquiry.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(inquiry.status, 'inquiry')}
                            label={getStatusLabel(inquiry.status)}
                            color={getStatusColor(inquiry.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => showDetails(inquiry, 'inquiry')}
                            title="Details anzeigen"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {itemType === 'order' ? 'Bestelldetails' : 'Anfrage-Details'}
          </span>
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedItem && (
            <Grid container spacing={3}>
              {/* Status und Datum */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          icon={getStatusIcon(selectedItem.status || selectedItem.inquiryId, itemType)}
                          label={getStatusLabel(selectedItem.status || selectedItem.inquiryId)}
                          color={getStatusColor(selectedItem.status || selectedItem.inquiryId)}
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {itemType === 'order' ? 'Bestelldatum' : 'Erstellungsdatum'}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedItem.createdAt || selectedItem.bestelldatum)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Artikel */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {itemType === 'order' ? 'Artikel in dieser Bestellung' : 'Angefragte Artikel'}
                </Typography>
                <List>
                  {(selectedItem.artikel || selectedItem.items || []).map((item, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`${item.name || item.produktSnapshot?.name || 'Produkt'} (${item.menge || item.quantity}x)`}
                        secondary={formatPrice((item.gesamtpreis || item.einzelpreis * (item.menge || item.quantity)) || 0)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              {/* Versand/Tracking */}
              {selectedItem.versand?.sendungsnummer && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Versandinformation
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Sendungsnummer
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 1 }}>
                        {selectedItem.versand.sendungsnummer}
                      </Typography>
                      {selectedItem.versand.trackingUrl && (
                        <Button
                          href={selectedItem.versand.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          size="small"
                          startIcon={<LocalShipping />}
                        >
                          Sendung verfolgen
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Gesamtsumme */}
              <Grid item xs={12}>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2 }}>
                  <Typography variant="h6">
                    Gesamtsumme:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatPrice(selectedItem.preise?.gesamtsumme || selectedItem.total || 0)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CustomerDashboard;
