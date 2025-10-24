import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Assignment,
  Visibility,
  Refresh,
  AccessTime,
  CheckCircle,
  Cancel,
  ShoppingCart,
  Close,
  Warning
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CustomerInquiries = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);

  // Anfragen laden
  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inquiries/customer/my-inquiries');
      
      if (response.data.success) {
        // Füge Status-Labels und -Farben hinzu
        const mappedInquiries = response.data.inquiries.map(inquiry => ({
          ...inquiry,
          statusLabel: getStatusLabel(inquiry.status),
          statusColor: getStatusColor(inquiry.status)
        }));
        setInquiries(mappedInquiries);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Anfragen:', error);
    } finally {
      setLoading(false);
    }
  };

  // PayPal-Status laden
  const loadPayPalStatus = async () => {
    try {
      const response = await api.get('/inquiries/paypal-status');
      if (response.data.success) {
        setPaypalEnabled(response.data.paypalEnabled);
        console.log('💳 PayPal Status:', response.data.paypalEnabled ? 'Aktiviert' : 'Deaktiviert');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des PayPal-Status:', error);
      setPaypalEnabled(false);
    }
  };

  useEffect(() => {
    loadInquiries();
    loadPayPalStatus();
    
    // Markiere als "gesehen" - speichere Zeitstempel für Benachrichtigungen
    if (user?.id || user?.userId) {
      const lastViewedKey = `inquiries_last_viewed_${user.id || user.userId}`;
      localStorage.setItem(lastViewedKey, new Date().toISOString());
      
      // Event senden um Navbar zu benachrichtigen
      window.dispatchEvent(new CustomEvent('inquiriesViewed'));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📅 Anfragen-Seite besucht - lastViewed aktualisiert');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Anfrage-Details anzeigen
  const showInquiryDetails = async (inquiryId) => {
    try {
      const response = await api.get(`/inquiries/customer/${inquiryId}`);
      if (response.data.success) {
        const inquiry = response.data.inquiry;
        // Füge Status-Labels und -Farben hinzu
        const mappedInquiry = {
          ...inquiry,
          statusLabel: getStatusLabel(inquiry.status),
          statusColor: getStatusColor(inquiry.status)
        };
        setSelectedInquiry(mappedInquiry);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Anfrage-Details:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('de-DE');
  };

  const formatPrice = (price) => {
    // Sichere Konvertierung zu Number, falls undefined/null
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <AccessTime color="warning" />;
      case 'accepted': return <CheckCircle color="success" />;
      case 'rejected': return <Cancel color="error" />;
      case 'converted_to_order': return <ShoppingCart color="primary" />;
      default: return <Assignment />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'accepted': return 'Angenommen';
      case 'rejected': return 'Abgelehnt';
      case 'converted_to_order': return 'Als Bestellung umgewandelt';
      case 'payment_pending': return 'Zahlung ausstehend';
      case 'paid': return 'Bezahlt';
      default: return 'Unbekannt';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'converted_to_order': return 'primary';
      case 'payment_pending': return 'info';
      case 'paid': return 'success';
      default: return 'default';
    }
  };

  // PayPal-Zahlung erstellen
  const handlePayment = async (inquiry) => {
    try {
      setLoading(true);
      
      // Unterscheide zwischen normalen Anfragen und konvertierten Bestellungen
      const endpoint = inquiry.status === 'converted_to_order' 
        ? `/inquiries/${inquiry.inquiryId}/create-order-payment`
        : `/inquiries/${inquiry.inquiryId}/create-payment`;
      
      const response = await api.post(endpoint);
      
      if (response.data.success && response.data.approvalUrl) {
        // Weiterleitung zu PayPal
        window.location.href = response.data.approvalUrl;
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der PayPal-Zahlung:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kann zahlen prüfen
  const canPay = (inquiry) => {
    console.log('🔍 PayPal Prüfung für Anfrage:', inquiry._id, {
      status: inquiry.status,
      paymentStatus: inquiry.payment?.status,
      paypalEnabled: paypalEnabled
    });

    // Prüfe grundsätzliche Zahlungsberechtigung
    const isValidForPayment = 
      (inquiry.status === 'accepted' && inquiry.payment?.status !== 'completed') ||
      (inquiry.status === 'converted_to_order' && inquiry.payment?.status !== 'completed') ||
      (inquiry.status === 'payment_pending' && inquiry.payment?.status !== 'completed');

    if (!isValidForPayment) {
      console.log('❌ Anfrage nicht zahlungsberechtigt');
      return { canPay: false, reason: 'not_payable' };
    }

    // Prüfe PayPal-Verfügbarkeit
    if (!paypalEnabled) {
      console.log('❌ PayPal ist deaktiviert');
      return { canPay: false, reason: 'paypal_disabled' };
    }

    console.log('✅ PayPal Button kann angezeigt werden');
    return { canPay: true, reason: 'available' };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Anfragen werden geladen...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          <Assignment sx={{ mr: 2, verticalAlign: 'middle' }} />
          Meine Anfragen
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadInquiries}
        >
          Aktualisieren
        </Button>
      </Box>

      {inquiries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine Anfragen vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sie haben noch keine Anfragen gestellt.
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile Karten-Ansicht
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inquiries.map((inquiry) => (
            <Card key={inquiry._id} sx={{ p: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {inquiry.inquiryId}
                    </Typography>
                    {/* Warnsymbol für unbezahlte umgewandelte Bestellungen */}
                    {canPay(inquiry).canPay && (
                      <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                    )}
                  </Box>
                  <Chip
                    icon={getStatusIcon(inquiry.status)}
                    label={inquiry.statusLabel}
                    color={inquiry.statusColor}
                    variant="outlined"
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {formatDate(inquiry.createdAt)}
                </Typography>
                
                {/* Artikel-Details erweitert */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>{inquiry.items.length} Artikel:</strong>
                  </Typography>
                  {inquiry.items.slice(0, 3).map((item, index) => (
                    <Typography key={index} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      • {item.quantity}x {item.name}
                    </Typography>
                  ))}
                  {inquiry.items.length > 3 && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      ... und {inquiry.items.length - 3} weitere
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Gesamtsumme:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary.main">
                    {formatPrice(inquiry.total)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => showInquiryDetails(inquiry.inquiryId)}
                    startIcon={<Visibility />}
                    fullWidth={!canPay(inquiry).canPay}
                  >
                    Details
                  </Button>
                  {(() => {
                    const payResult = canPay(inquiry);
                    
                    if (payResult.canPay) {
                      // PayPal verfügbar - zeige Button
                      return (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handlePayment(inquiry)}
                          startIcon={<ShoppingCart />}
                          fullWidth
                          sx={{ 
                            mt: 1,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(1)' },
                              '50%': { transform: 'scale(1.02)' },
                              '100%': { transform: 'scale(1)' }
                            }
                          }}
                        >
                          {inquiry.status === 'converted_to_order' ? 'Bestellung bezahlen' : 
                           inquiry.status === 'payment_pending' ? 'Zahlung wiederholen' : 
                           'Jetzt bezahlen'}
                        </Button>
                      );
                    } else if (payResult.reason === 'paypal_disabled') {
                      // PayPal deaktiviert - zeige Info
                      return (
                        <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                          PayPal steht derzeit nicht zur Verfügung. Bitte versuchen Sie es später noch einmal.
                        </Alert>
                      );
                    }
                    // Keine Zahlung möglich - zeige nichts
                    return null;
                  })()}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Desktop Tabellen-Ansicht
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Anfrage-ID</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Artikel</TableCell>
                <TableCell>Gesamtsumme</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {inquiry.inquiryId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(inquiry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(inquiry.status)}
                      label={inquiry.statusLabel}
                      color={inquiry.statusColor}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {inquiry.items.length} Artikel
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatPrice(inquiry.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => showInquiryDetails(inquiry.inquiryId)}
                        title="Details anzeigen"
                      >
                        <Visibility />
                      </IconButton>
                      {(() => {
                        const payResult = canPay(inquiry);
                        
                        if (payResult.canPay) {
                          // PayPal verfügbar - zeige Button
                          return (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handlePayment(inquiry)}
                              startIcon={<ShoppingCart />}
                              sx={{ ml: 1 }}
                            >
                              {inquiry.status === 'converted_to_order' ? 'Bestellung bezahlen' : 
                               inquiry.status === 'payment_pending' ? 'Zahlung wiederholen' : 
                               'Jetzt bezahlen'}
                            </Button>
                          );
                        } else if (payResult.reason === 'paypal_disabled') {
                          // PayPal deaktiviert - zeige kompakte Info
                          return (
                            <Box sx={{ ml: 1 }}>
                              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                PayPal nicht verfügbar
                              </Alert>
                            </Box>
                          );
                        }
                        // Keine Zahlung möglich - zeige nichts
                        return null;
                      })()}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Anfrage-Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1 }} />
            Anfrage {selectedInquiry?.inquiryId}
          </Box>
          <IconButton onClick={() => setDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedInquiry && (
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
                          icon={getStatusIcon(selectedInquiry.status)}
                          label={selectedInquiry.statusLabel}
                          color={selectedInquiry.statusColor}
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Erstellt am
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedInquiry.createdAt)}
                        </Typography>
                      </Grid>
                      
                      {/* Status-Beschreibung */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Was passiert als nächstes?
                        </Typography>
                        {selectedInquiry.status === 'pending' && (
                          <Alert severity="info" variant="outlined">
                            Ihre Anfrage wird derzeit geprüft. Sie erhalten eine Benachrichtigung, sobald eine Entscheidung getroffen wurde.
                          </Alert>
                        )}
                        {selectedInquiry.status === 'accepted' && (
                          <Alert severity="success" variant="outlined">
                            Ihre Anfrage wurde angenommen! Sie erhalten in Kürze eine E-Mail mit den Zahlungsdetails über PayPal.
                          </Alert>
                        )}
                        {selectedInquiry.status === 'rejected' && (
                          <Alert severity="warning" variant="outlined">
                            Es tut uns leid, dass wir Ihre Anfrage aktuell nicht bearbeiten konnten. 
                            Wir würden uns aber freuen, wenn Sie uns wieder besuchen! 
                            Gerne können Sie eine neue Anfrage stellen oder schauen Sie in unsere aktuellen Angebote.
                          </Alert>
                        )}
                        {selectedInquiry.status === 'converted_to_order' && (
                          <Alert severity="primary" variant="outlined">
                            {selectedInquiry.payment?.status === 'completed' ? (
                              <>Ihre Anfrage wurde in eine Bestellung umgewandelt und ist bezahlt. Die Bearbeitung hat begonnen.</>
                            ) : (
                              <>Ihre Anfrage wurde in eine Bestellung umgewandelt. Bitte bezahlen Sie, damit wir mit der Bearbeitung beginnen können.</>
                            )}
                          </Alert>
                        )}
                        {selectedInquiry.status === 'payment_pending' && (
                          <Alert severity="warning" variant="outlined">
                            Die Zahlung steht noch aus. Bitte schließen Sie die PayPal-Zahlung ab, damit wir Ihre Bestellung bearbeiten können.
                          </Alert>
                        )}
                        {selectedInquiry.status === 'paid' && (
                          <Alert severity="success" variant="outlined">
                            Vielen Dank! Ihre Zahlung ist eingegangen und wir bearbeiten Ihre Bestellung umgehend.
                          </Alert>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Artikel-Liste */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Angefragte Artikel
                </Typography>
                <List>
                  {selectedInquiry.items.map((item, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`${item.name} (${item.quantity}x)`}
                        secondary={formatPrice(item.price * item.quantity)}
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">
                    Gesamtsumme: {formatPrice(selectedInquiry.total)}
                  </Typography>
                </Box>
              </Grid>

              {/* Adressen */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Rechnungsadresse
                </Typography>
                <Typography variant="body2">
                  {selectedInquiry.rechnungsadresse.vorname} {selectedInquiry.rechnungsadresse.nachname}<br />
                  {selectedInquiry.rechnungsadresse.strasse} {selectedInquiry.rechnungsadresse.hausnummer}<br />
                  {selectedInquiry.rechnungsadresse.zusatz && (
                    <>{selectedInquiry.rechnungsadresse.zusatz}<br /></>
                  )}
                  {selectedInquiry.rechnungsadresse.plz} {selectedInquiry.rechnungsadresse.stadt}<br />
                  {selectedInquiry.rechnungsadresse.land || 'Deutschland'}
                </Typography>
              </Grid>

              {selectedInquiry.lieferadresse && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Lieferadresse
                  </Typography>
                  <Typography variant="body2">
                    {selectedInquiry.lieferadresse.vorname} {selectedInquiry.lieferadresse.nachname}<br />
                    {selectedInquiry.lieferadresse.strasse} {selectedInquiry.lieferadresse.hausnummer}<br />
                    {selectedInquiry.lieferadresse.zusatz && (
                      <>{selectedInquiry.lieferadresse.zusatz}<br /></>
                    )}
                    {selectedInquiry.lieferadresse.plz} {selectedInquiry.lieferadresse.stadt}<br />
                    {selectedInquiry.lieferadresse.land || 'Deutschland'}
                  </Typography>
                </Grid>
              )}

              {/* Kunden-Notiz */}
              {selectedInquiry.customerNote && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Ihre Notiz
                  </Typography>
                  <Alert severity="info">
                    {typeof selectedInquiry.customerNote === 'string' 
                      ? selectedInquiry.customerNote 
                      : 'Notiz vorhanden'}
                  </Alert>
                </Grid>
              )}

              {/* Admin-Antwort */}
              {selectedInquiry.adminResponse && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedInquiry.status === 'rejected' ? 'Nachricht vom Shop' : 'Antwort des Shops'}
                  </Typography>
                  <Alert 
                    severity={selectedInquiry.status === 'rejected' ? 'warning' : 'info'}
                  >
                    {selectedInquiry.status === 'rejected' ? (
                      <>
                        <Typography variant="body2" gutterBottom>
                          Vielen Dank für Ihr Interesse an unseren Produkten!
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          {typeof selectedInquiry.adminResponse === 'string' 
                            ? selectedInquiry.adminResponse 
                            : selectedInquiry.adminResponse.message || 'Leider können wir Ihre Anfrage aktuell nicht bearbeiten.'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
                          Wir würden uns freuen, Sie bald wieder als Kunden begrüßen zu dürfen. 
                          Schauen Sie gerne in unser aktuelles Sortiment oder stellen Sie eine neue Anfrage!
                        </Typography>
                      </>
                    ) : (
                      <>
                        {typeof selectedInquiry.adminResponse === 'string' 
                          ? selectedInquiry.adminResponse 
                          : selectedInquiry.adminResponse.message || 'Antwort erhalten'}
                        {selectedInquiry.adminResponse.respondedBy && (
                          <div style={{ fontSize: '0.85em', marginTop: '8px', opacity: 0.8 }}>
                            Bitte schauen Sie unter Bestellungen und Zahlen dort Ihre Bestellung via Paypal über den Link
                          </div>
                        )}
                      </>
                    )}
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomerInquiries;