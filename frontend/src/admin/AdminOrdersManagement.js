import { validateTrackingNumber, detectCarrier, generateTrackingUrl } from '../utils/trackingUtils';
import React, { useState, useEffect, useCallback } from 'react';
import { useAdminState } from '../hooks/useAdminState';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Search,
  ViewList,
  Sort,
  Dashboard
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../services/api';

// Status configuration with enhanced features
const statusConfig = {
  neu: {
    label: '⏳ Neu',
    color: 'warning',
    priority: 1,
    description: 'Neue Bestellung eingegangen',
    actions: ['confirm', 'reject', 'note']
  },
  bezahlt: {
    label: '💰 Bezahlt',
    color: 'info',
    priority: 2,
    description: 'Zahlung eingegangen',
    actions: ['confirm', 'reject', 'note']
  },
  bestaetigt: {
    label: '✅ Bestätigt',
    color: 'success',
    priority: 3,
    description: 'Bestellung bestätigt',
    actions: ['pack', 'note']
  },
  verpackt: {
    label: '📦 Verpackt',
    color: 'primary',
    priority: 4,
    description: 'Bestellung verpackt',
    actions: ['ship', 'note']
  },
  verschickt: {
    label: '🚚 Verschickt',
    color: 'secondary',
    priority: 5,
    description: 'Bestellung verschickt',
    actions: ['deliver', 'track', 'note']
  },
  zugestellt: {
    label: '🏠 Zugestellt',
    color: 'success',
    priority: 6,
    description: 'Bestellung zugestellt',
    actions: ['complete', 'note']
  },
  abgeschlossen: {
    label: '🎉 Abgeschlossen',
    color: 'success',
    priority: 7,
    description: 'Bestellung abgeschlossen',
    actions: ['note']
  },
  storniert: {
    label: '❌ Storniert',
    color: 'error',
    priority: 8,
    description: 'Bestellung storniert',
    actions: ['note']
  }
};

const AdminOrdersManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Standardisierte Admin-States
  const {
    loading, setLoading,
    error, setError,
    success, setSuccess
  } = useAdminState();

  // Core state
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [trackingDialog, setTrackingDialog] = useState(false);

  // Filter and view state
  const [filters, setFilters] = useState({
    status: 'pending',
    sortBy: 'oldest',
    searchTerm: '',
    showInquiries: true
  });
  const [stats, setStats] = useState({});
  const [tabValue, setTabValue] = useState(0);

  // Tracking state
  const [trackingData, setTrackingData] = useState({
    sendungsnummer: '',
    anbieter: 'dhl',
    hinweis: ''
  });

  // Core functionality

  // Carrier options for tracking
  const carrierOptions = [
    { value: 'dhl', label: 'DHL', trackingUrl: 'https://www.dhl.de/de/privatkunden/pakete-verfolgen.html?lang=de&idc=' },
    { value: 'dpd', label: 'DPD', trackingUrl: 'https://tracking.dpd.de/parcelstatus?query=' },
    { value: 'ups', label: 'UPS', trackingUrl: 'https://www.ups.com/track?loc=de_DE&tracknum=' },
    { value: 'fedex', label: 'FedEx', trackingUrl: 'https://www.fedex.com/apps/fedextrack/?tracknumbers=' },
    { value: 'hermes', label: 'Hermes', trackingUrl: 'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#' },
    { value: 'gls', label: 'GLS', trackingUrl: 'https://gls-group.eu/DE/de/paketverfolgung?match=' }
  ];

  const [refreshing, setRefreshing] = useState(false);

  // Load orders with enhanced filtering
  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const queryParams = new URLSearchParams();
      
      if (filters.status !== 'all') {
        if (filters.status === 'pending') {
          queryParams.append('status', 'neu,bezahlt,bestaetigt,verpackt');
        } else {
          queryParams.append('status', filters.status);
        }
      }
      
      if (filters.sortBy) {
        queryParams.append('sort', filters.sortBy);
      }
      
      queryParams.append('limit', '100');

      const endpoint = `/orders/admin?${queryParams.toString()}`;
      const response = await api.get(endpoint);

      if (response.data && response.data.success) {
        let ordersData = response.data.orders || [];
        
        // Calculate stats
        const statusStats = {};
        let totalRevenue = 0;
        ordersData.forEach(order => {
          const status = order.status || 'neu';
          statusStats[status] = (statusStats[status] || 0) + 1;
          if (['bezahlt', 'bestaetigt', 'verschickt', 'zugestellt'].includes(status)) {
            totalRevenue += order.preise?.gesamtsumme || 0;
          }
        });

        setStats({
          ...statusStats,
          totalRevenue,
          totalOrders: ordersData.length
        });

        setOrders(ordersData);
      } else {
        throw new Error(response.data?.message || 'Fehler beim Laden der Bestellungen');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Bestellungen:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Load inquiries
  const loadInquiries = useCallback(async () => {
    try {
      // Lade sowohl pending als auch accepted (unbezahlte) Anfragen
      const response = await api.get('/inquiries/admin/all?status=pending,accepted&limit=50');
      
      if (response.data && response.data.success) {
        const inquiriesData = response.data.inquiries || [];
        setInquiries(inquiriesData);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Anfragen:', err);
    }
  }, []);

  // Pull to refresh handler
  const handlePullToRefresh = useCallback(() => {
    loadOrders(true);
    loadInquiries();
  }, [loadOrders, loadInquiries]);

  useEffect(() => {
    loadOrders();
    if (filters.showInquiries) {
      loadInquiries();
    }
  }, [loadOrders, loadInquiries, filters.showInquiries]);

  // Status update handler
  const handleStatusUpdate = async (orderId, newStatus, note = '', versandData = null) => {
    try {
      setLoading(true);
      
      const updatePayload = {
        status: newStatus,
        adminNote: note
      };

      if (versandData) {
        updatePayload.versand = versandData;
      }

      const response = await api.put(`/orders/${orderId}/status`, updatePayload);
      
      if (response.data && response.data.success) {
        setSuccess(`Status erfolgreich auf "${statusConfig[newStatus]?.label || newStatus}" aktualisiert`);
        await loadOrders();
        setOrderDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error(response.data?.message || 'Fehler beim Aktualisieren des Status');
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Status:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Aktualisieren des Status');
    } finally {
      setLoading(false);
    }
  };

  // Order confirmation handler
  const handleConfirmOrder = async (orderId, note = '') => {
    try {
      const response = await api.post(`/orders/${orderId}/confirm`, {
        adminNote: note
      });
      
      if (response.data && response.data.success) {
        setSuccess('Bestellung erfolgreich bestätigt');
        await loadOrders();
        setOrderDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error(response.data?.message || 'Fehler beim Bestätigen der Bestellung');
      }
    } catch (err) {
      console.error('Fehler beim Bestätigen der Bestellung:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Bestätigen der Bestellung');
    }
  };

  // Order rejection handler
  const handleRejectOrder = async (orderId, note = '', reason = null) => {
    try {
      const response = await api.post(`/orders/${orderId}/reject`, {
        adminNote: note,
        reason: reason
      });
      
      if (response.data && response.data.success) {
        setSuccess('Bestellung erfolgreich abgelehnt');
        await loadOrders();
        setOrderDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error(response.data?.message || 'Fehler beim Ablehnen der Bestellung');
      }
    } catch (err) {
      console.error('Fehler beim Ablehnen der Bestellung:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Ablehnen der Bestellung');
    }
  };

  // Enhanced tracking validation using utils
  const validateTrackingNumberEnhanced = (trackingNumber, carrier) => {
    if (!trackingNumber || trackingNumber.trim().length === 0) {
      return { isValid: false, message: 'Sendungsnummer ist erforderlich' };
    }

    const validation = validateTrackingNumber(carrier, trackingNumber.trim());
    
    return {
      isValid: validation.valid,
      message: validation.message || 'Gültige Sendungsnummer',
      formattedNumber: validation.formattedNumber
    };
  };

  // Auto-detect carrier
  const handleTrackingNumberChange = (value) => {
    setTrackingData(prev => ({ ...prev, sendungsnummer: value }));
    
    // Auto-detect carrier if possible
    const detectedCarrier = detectCarrier(value);
    if (detectedCarrier && detectedCarrier !== trackingData.anbieter) {
      setTrackingData(prev => ({ ...prev, anbieter: detectedCarrier }));
    }
  };

  // Add tracking handler
  const handleAddTracking = async () => {
    if (!selectedOrder) return;

    if (!trackingData.sendungsnummer || !trackingData.anbieter) {
      setError('Bitte Sendungsnummer und Anbieter angeben');
      return;
    }

    const validation = validateTrackingNumberEnhanced(trackingData.sendungsnummer, trackingData.anbieter);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.put(`/orders/${selectedOrder._id}/tracking`, {
        sendungsnummer: trackingData.sendungsnummer.trim(),
        anbieter: trackingData.anbieter,
        hinweis: trackingData.hinweis
      });
      
      if (response.data && response.data.success) {
        setSuccess('Sendungsverfolgung erfolgreich hinzugefügt');
        await loadOrders();
        setTrackingDialog(false);
        setTrackingData({ sendungsnummer: '', anbieter: 'dhl', hinweis: '' });
      } else {
        throw new Error(response.data?.message || 'Fehler beim Hinzufügen der Sendungsverfolgung');
      }
    } catch (err) {
      console.error('Fehler beim Hinzufügen der Sendungsverfolgung:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Hinzufügen der Sendungsverfolgung');
    } finally {
      setLoading(false);
    }
  };

  // Inquiry action handler
  const handleInquiryAction = async (inquiry, action) => {
    try {
      const endpoint = action === 'approve' ? 'accept' : 'reject';
      
      // Verwende inquiryId statt _id für Backend-Kompatibilität
      const inquiryIdentifier = inquiry.inquiryId || inquiry._id;
      
      const response = await api.put(`/inquiries/admin/${inquiryIdentifier}/${endpoint}`, {
        adminNote: `${action === 'approve' ? 'Genehmigt' : 'Abgelehnt'} durch Admin`
      });
      
      if (response.data && response.data.success) {
        setSuccess(`Anfrage erfolgreich ${action === 'approve' ? 'genehmigt' : 'abgelehnt'}`);
        await loadInquiries();
        setInquiryDialogOpen(false);
        setSelectedInquiry(null);
      } else {
        throw new Error(response.data?.message || `Fehler beim ${action === 'approve' ? 'Genehmigen' : 'Ablehnen'} der Anfrage`);
      }
    } catch (err) {
      console.error('Fehler bei Anfrage-Aktion:', err);
      setError(err.response?.data?.message || err.message || `Fehler beim ${action === 'approve' ? 'Genehmigen' : 'Ablehnen'} der Anfrage`);
    }
  };

  // PayPal refund handler
  const handlePayPalRefund = async (order) => {
    if (!order.zahlungsDetails?.paypal?.paymentId) {
      setError('Keine PayPal-Zahlungsdetails gefunden');
      return;
    }

    try {
      setLoading(true);
      
      const refundAmount = order.preise?.gesamtsumme || 0;
      const customerEmail = order.besteller?.email || '';
      
      // Create PayPal Send Money URL
      const paypalUrl = new URL('https://www.paypal.com/myaccount/transfer/send');
      paypalUrl.searchParams.append('recipient', customerEmail);
      paypalUrl.searchParams.append('amount', refundAmount.toFixed(2));
      paypalUrl.searchParams.append('currencyCode', 'EUR');
      paypalUrl.searchParams.append('note', `Rückerstattung für Bestellung #${order.bestellnummer}`);

      // Open PayPal in new window
      window.open(paypalUrl.toString(), '_blank');

      // Show confirmation dialog
      const confirmed = window.confirm(
        `PayPal Send Money wurde geöffnet.\n\n` +
        `Empfänger: ${customerEmail}\n` +
        `Betrag: ${refundAmount.toFixed(2)} EUR\n` +
        `Nachricht: Rückerstattung für Bestellung #${order.bestellnummer}\n\n` +
        `Wurde die Rückerstattung erfolgreich gesendet?`
      );

      if (confirmed) {
        await handleStatusUpdate(order._id, 'storniert', 'PayPal Rückerstattung gesendet');
        setSuccess(`Rückerstattung für Bestellung #${order.bestellnummer} erfolgreich verarbeitet`);
      }
    } catch (err) {
      console.error('Fehler bei PayPal-Rückerstattung:', err);
      setError(err.message || 'Fehler bei der PayPal-Rückerstattung');
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const getStatusChip = (status) => {
    // Sichere Behandlung von status als Objekt oder String
    const statusKey = typeof status === 'object' ? 
      (status.status || 'neu') : 
      (status || 'neu');
    
    const config = statusConfig[statusKey] || statusConfig.neu;
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        variant="filled"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Funktion zur benutzerfreundlichen Darstellung von Objekten
  const formatDisplayValue = (value) => {
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'object' && value !== null) {
      // Spezielle Behandlung für bekannte Objektstrukturen
      if (value.status && value.emailVersendet !== undefined) {
        return `Status: ${value.status}, E-Mail versendet: ${value.emailVersendet ? 'Ja' : 'Nein'}`;
      }
      
      if (value.kunde !== undefined && value.intern !== undefined && value.versand !== undefined) {
        const parts = [];
        if (value.kunde) parts.push(`Kunde: ${value.kunde}`);
        if (value.intern) parts.push(`Intern: ${value.intern}`);
        if (value.versand) parts.push(`Versand: ${value.versand}`);
        return parts.join(', ') || 'Keine Notizen';
      }
      
      // Fallback: Objekt-Eigenschaften lesbar darstellen
      const entries = Object.entries(value)
        .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
        .map(([key, val]) => `${key}: ${val}`);
      
      return entries.length > 0 ? entries.join(', ') : 'Leer';
    }
    
    return String(value || 'Nicht verfügbar');
  };

  // Combined data for display
  const combinedItems = React.useMemo(() => {
    let items = [...orders];
    
    if (filters.showInquiries) {
      const inquiryItems = inquiries.map(inquiry => {
        // Status-Mapping für Anfragen
        let mappedStatus, statusLabel, statusColor;
        switch (inquiry.status) {
          case 'pending':
            mappedStatus = 'neu';
            statusLabel = '❓ Anfrage wartend';
            statusColor = 'warning';
            break;
          case 'accepted':
            mappedStatus = 'bezahlt'; // Verwende bezahlt-Status für das UI, aber sie sind noch nicht bezahlt
            statusLabel = '⏳ Angenommen - Zahlung ausstehend';
            statusColor = 'info';
            break;
          case 'rejected':
            mappedStatus = 'storniert';
            statusLabel = '❌ Abgelehnt';
            statusColor = 'error';
            break;
          default:
            mappedStatus = 'neu';
            statusLabel = '❓ Unbekannt';
            statusColor = 'grey';
        }
        
        return {
          ...inquiry,
          isInquiry: true,
          awaitingPayment: inquiry.status === 'accepted', // Flag für Zahlungsaufforderung
          bestellnummer: `INQ-${inquiry._id.slice(-6)}`,
          besteller: {
            vorname: inquiry.vorname,
            nachname: inquiry.nachname,
            email: inquiry.email
          },
          bestelltAm: inquiry.createdAt,
          status: mappedStatus,
          statusLabel: statusLabel,
          statusColor: statusColor,
          preise: { gesamtsumme: inquiry.total || 0 }
        };
      });
      items = [...items, ...inquiryItems];
    }

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      items = items.filter(item => 
        (item.bestellnummer && item.bestellnummer.toLowerCase().includes(searchTerm)) ||
        (item.besteller?.vorname && item.besteller.vorname.toLowerCase().includes(searchTerm)) ||
        (item.besteller?.nachname && item.besteller.nachname.toLowerCase().includes(searchTerm)) ||
        (item.besteller?.email && item.besteller.email.toLowerCase().includes(searchTerm)) ||
        (item.lieferadresse?.strasse && item.lieferadresse.strasse.toLowerCase().includes(searchTerm)) ||
        (item.warenkorb && item.warenkorb.some(item => 
          item.name && item.name.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      if (filters.status === 'pending') {
        // Nur Admin-handlungsrelevante Items anzeigen
        items = items.filter(item => {
          // Für Anfragen: Nur pending (wartend auf Admin-Genehmigung), nicht accepted (wartet auf Kunde)
          if (item.isInquiry) {
            return item.status === 'neu' && !item.awaitingPayment; // Nur wartende Anfragen, nicht Zahlungs-wartende
          }
          
          // Für Bestellungen: Nur die, wo Admin handeln kann
          // Nicht "neu" (wartet auf Kunde), aber alles ab "bezahlt"
          return ['bezahlt', 'bestaetigt', 'verpackt'].includes(item.status) && 
                 item.zahlung?.status === 'bezahlt'; // Zusätzlich: Zahlung muss abgeschlossen sein
        });
      } else {
        items = items.filter(item => item.status === filters.status);
      }
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.bestelltAm) - new Date(a.bestelltAm);
        case 'oldest':
          return new Date(a.bestelltAm) - new Date(b.bestelltAm);
        case 'value':
          return (b.preise?.gesamtsumme || 0) - (a.preise?.gesamtsumme || 0);
        case 'status':
          const aConfig = statusConfig[a.status] || statusConfig.neu;
          const bConfig = statusConfig[b.status] || statusConfig.neu;
          return aConfig.priority - bConfig.priority;
        default:
          return 0;
      }
    });

    return items;
  }, [orders, inquiries, filters]);

  // Tab content renderer
  const getTabContent = () => {
    switch (tabValue) {
      case 0: // Karten-Ansicht
        return (
          <Grid container spacing={2}>
            {combinedItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: item.isInquiry ? '2px solid #ff9800' : 'none',
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" noWrap>
                        {item.isInquiry ? '💬' : '📦'} {item.bestellnummer}
                      </Typography>
                      {getStatusChip(item.status)}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      👤 {item.besteller?.vorname} {item.besteller?.nachname}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📧 {typeof item.besteller?.email === 'object' 
                        ? JSON.stringify(item.besteller.email) 
                        : item.besteller?.email}
                    </Typography>
                    
                    {/* Zeige Tracking-Nummer für verschickte Bestellungen */}
                    {item.status === 'verschickt' && (item.trackingNumber || item.versand?.sendungsnummer) ? (
                      <Typography 
                        variant="body2" 
                        color="primary.main" 
                        gutterBottom
                        sx={{ 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': { color: 'primary.dark' }
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Verhindert das Öffnen des Detail-Dialogs
                          const trackingNum = item.trackingNumber || item.versand?.sendungsnummer;
                          const carrier = item.carrier || item.versand?.anbieter;
                          const trackingUrl = generateTrackingUrl(carrier, trackingNum);
                          if (trackingUrl) {
                            window.open(trackingUrl, '_blank');
                          }
                        }}
                        title="Klicken um Sendung zu verfolgen"
                      >
                        📦 {item.trackingNumber || item.versand?.sendungsnummer}
                        {(item.carrier || item.versand?.anbieter) && (
                          <Chip 
                            size="small" 
                            label={(item.carrier || item.versand?.anbieter).toUpperCase()} 
                            sx={{ ml: 1, fontSize: '0.6rem', height: '16px' }}
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        📞 {item.besteller?.telefon || 'Telefon nicht verfügbar'}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📅 {formatDate(item.bestelltAm)}
                    </Typography>
                    
                    {!item.isInquiry && (
                      <Typography variant="h6" color="primary" gutterBottom>
                        💰 {formatCurrency(item.preise?.gesamtsumme || 0)}
                      </Typography>
                    )}
                    
                    <Box mt={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          if (item.isInquiry) {
                            setSelectedInquiry(item);
                            setInquiryDialogOpen(true);
                          } else {
                            setSelectedOrder(item);
                            setOrderDialogOpen(true);
                          }
                        }}
                      >
                        Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 1: // Tabellen-Ansicht
        return (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Typ</TableCell>
                    <TableCell>Nummer</TableCell>
                    <TableCell>Kunde</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Summe</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {combinedItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        {item.isInquiry ? '💬 Anfrage' : '📦 Bestellung'}
                      </TableCell>
                      <TableCell>{item.bestellnummer}</TableCell>
                      <TableCell>
                        {item.besteller?.vorname} {item.besteller?.nachname}
                      </TableCell>
                      <TableCell>{formatDate(item.bestelltAm)}</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell>{formatCurrency(item.preise?.gesamtsumme || 0)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => {
                            if (item.isInquiry) {
                              setSelectedInquiry(item);
                              setInquiryDialogOpen(true);
                            } else {
                              setSelectedOrder(item);
                              setOrderDialogOpen(true);
                            }
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );

      case 2: // Dashboard
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    📊 Übersichts-Dashboard
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="primary">
                            📈 Schnelle Statistiken
                          </Typography>
                          <Box display="flex" justifyContent="space-between" py={1}>
                            <Typography>Gesamte Bestellungen:</Typography>
                            <Typography fontWeight="bold">{stats.totalOrders || 0}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" py={1}>
                            <Typography>Offene Anfragen:</Typography>
                            <Typography fontWeight="bold">{inquiries.length}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" py={1}>
                            <Typography>Gesamtumsatz:</Typography>
                            <Typography fontWeight="bold" color="primary">
                              {formatCurrency(stats.totalRevenue || 0)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="secondary">
                            🎯 Status Übersicht
                          </Typography>
                          {Object.entries(statusConfig).map(([status, config]) => {
                            const count = orders.filter(order => order.status === status).length;
                            return (
                              <Box key={status} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip 
                                    label={config.label} 
                                    color={config.color} 
                                    size="small" 
                                  />
                                </Box>
                                <Typography variant="h6">{count}</Typography>
                              </Box>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box p={3}>
      {/* Header mit Stats */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          📦 Bestellungen verwalten
        </Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Badge badgeContent={combinedItems.length} color="primary">
            <Chip
              label={`${combinedItems.length} Bestellungen + Anfragen`}
              color="primary" 
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Badge>
          {loading && (
            <CircularProgress size={20} />
          )}
          <IconButton 
            color="primary" 
            onClick={handlePullToRefresh}
            disabled={loading || refreshing}
            title="Aktualisieren"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Filter-Leiste */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filters.status}
                  label="Status Filter"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="pending">🔄 Zu bearbeiten</MenuItem>
                  <MenuItem value="all">📋 Alle Bestellungen</MenuItem>
                  <MenuItem value="neu">⏳ Neu</MenuItem>
                  <MenuItem value="bezahlt">💰 Bezahlt</MenuItem>
                  <MenuItem value="bestaetigt">✅ Bestätigt</MenuItem>
                  <MenuItem value="abgelehnt">❌ Abgelehnt</MenuItem>
                  <MenuItem value="verpackt">📦 Verpackt</MenuItem>
                  <MenuItem value="verschickt">🚚 Verschickt</MenuItem>
                  <MenuItem value="zugestellt">🏠 Zugestellt</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sortierung</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Sortierung"
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                >
                  <MenuItem value="oldest">⏰ Älteste zuerst</MenuItem>
                  <MenuItem value="newest">🆕 Neueste zuerst</MenuItem>
                  <MenuItem value="value">💰 Höchster Wert</MenuItem>
                  <MenuItem value="status">📊 Nach Status</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Erweiterte Suche"
                placeholder="Bestellnr, Kunde, E-Mail, Adresse, Artikel..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                helperText={filters.searchTerm ? `${combinedItems.length} Treffer` : 'Suche in allen Feldern'}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-end' }} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {combinedItems.length} Einträge gefunden
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          scrollButtons="auto"
        >
          <Tab 
            label={isMobile ? "Karten" : "📱 Karten-Ansicht"} 
            icon={<ViewList />} 
            iconPosition={isMobile ? 'top' : 'start'}
          />
          <Tab 
            label={isMobile ? "Tabelle" : "📊 Tabellen-Ansicht"} 
            icon={<Sort />} 
            iconPosition={isMobile ? 'top' : 'start'}
          />
          <Tab 
            label={isMobile ? "Dashboard" : "📈 Dashboard"} 
            icon={<Dashboard />} 
            iconPosition={isMobile ? 'top' : 'start'}
          />
        </Tabs>
      </Box>

      {/* Alerts */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : error && !success ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        getTabContent()
      )}

      {/* Order Details Dialog */}
      <Dialog 
        open={orderDialogOpen} 
        onClose={() => {
          setOrderDialogOpen(false);
          setSelectedOrder(null);
        }} 
        maxWidth="lg" 
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              Bestellung #{selectedOrder.bestellnummer}
              <Box component="span" ml={2}>
                {getStatusChip(selectedOrder.status)}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Kundeninformationen - Erweitert */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      👤 Kundeninformationen
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Name:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrder.besteller?.vorname} {selectedOrder.besteller?.nachname}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">E-Mail:</Typography>
                        <Typography variant="body1" fontWeight="medium" sx={{ color: 'primary.main' }}>
                          {typeof selectedOrder.besteller?.email === 'object' 
                            ? JSON.stringify(selectedOrder.besteller.email) 
                            : selectedOrder.besteller?.email}
                        </Typography>
                      </Box>
                      
                      {/* Zeige Tracking-Nummer für verschickte Bestellungen oder Telefon für andere */}
                      {(selectedOrder.status === 'verschickt' || selectedOrder.status === 'Verschickt') && 
                       (selectedOrder.trackingNumber || selectedOrder.versand?.sendungsnummer) ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Sendungsnummer:</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="body1" 
                              fontWeight="medium" 
                              fontFamily="monospace"
                              sx={{ 
                                color: 'primary.main', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                '&:hover': { color: 'primary.dark' }
                              }}
                              onClick={() => {
                                const trackingNum = selectedOrder.trackingNumber || selectedOrder.versand?.sendungsnummer;
                                const carrier = selectedOrder.carrier || selectedOrder.versand?.anbieter;
                                const trackingUrl = generateTrackingUrl(carrier, trackingNum);
                                if (trackingUrl) {
                                  window.open(trackingUrl, '_blank');
                                }
                              }}
                              title="Klicken um Sendung zu verfolgen"
                            >
                              {selectedOrder.trackingNumber || selectedOrder.versand?.sendungsnummer}
                            </Typography>
                            {(selectedOrder.carrier || selectedOrder.versand?.anbieter) && (
                              <Chip 
                                label={(selectedOrder.carrier || selectedOrder.versand?.anbieter).toUpperCase()} 
                                size="small" 
                                variant="outlined"
                                color="primary"
                              />
                            )}
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Telefon:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {selectedOrder.besteller?.telefon || 'Nicht angegeben'}
                          </Typography>
                        </Box>
                      )}
                      
                      {selectedOrder.besteller?.kundennummer && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Kundennummer:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {typeof selectedOrder.besteller.kundennummer === 'object' 
                              ? JSON.stringify(selectedOrder.besteller.kundennummer) 
                              : selectedOrder.besteller.kundennummer}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Grid>
                
                {/* Rechnungsadresse */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      🧾 Rechnungsadresse
                    </Typography>
                    {selectedOrder.rechnungsadresse && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrder.besteller?.vorname} {selectedOrder.besteller?.nachname}
                        </Typography>
                        <Typography variant="body1">
                          {selectedOrder.rechnungsadresse.strasse} {selectedOrder.rechnungsadresse.hausnummer}
                        </Typography>
                        {selectedOrder.rechnungsadresse.zusatz && (
                          <Typography variant="body1" color="text.secondary">
                            {selectedOrder.rechnungsadresse.zusatz}
                          </Typography>
                        )}
                        <Typography variant="body1">
                          {selectedOrder.rechnungsadresse.plz} {selectedOrder.rechnungsadresse.stadt}
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrder.rechnungsadresse.land}
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Grid>
                
                {/* Lieferadresse */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      📍 Lieferadresse
                    </Typography>
                    {selectedOrder.lieferadresse && (
                      <>
                        {selectedOrder.lieferadresse.verwendeRechnungsadresse ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body1" color="text.secondary">
                              ✓ Lieferung an Rechnungsadresse
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {selectedOrder.lieferadresse.firma && (
                              <Typography variant="body1" fontWeight="medium">
                                {selectedOrder.lieferadresse.firma}
                              </Typography>
                            )}
                            <Typography variant="body1" fontWeight="medium">
                              {selectedOrder.besteller?.vorname} {selectedOrder.besteller?.nachname}
                            </Typography>
                            <Typography variant="body1">
                              {selectedOrder.lieferadresse.strasse} {selectedOrder.lieferadresse.hausnummer}
                            </Typography>
                            {selectedOrder.lieferadresse.zusatz && (
                              <Typography variant="body1" color="text.secondary">
                                {selectedOrder.lieferadresse.zusatz}
                              </Typography>
                            )}
                            <Typography variant="body1">
                              {selectedOrder.lieferadresse.plz} {selectedOrder.lieferadresse.stadt}
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedOrder.lieferadresse.land}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Card>
                </Grid>
                
                {/* Bestellte Artikel */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      🛒 Bestellte Artikel
                    </Typography>
                    {selectedOrder.warenkorb && selectedOrder.warenkorb.map((item, index) => (
                      <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 1, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Menge: {item.menge} × {formatCurrency(item.preis || 0)}
                            </Typography>
                          </Box>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency((item.menge || 1) * (item.preis || 0))}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Card>
                </Grid>
                
                {/* Preisdetails */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      💰 Preisdetails
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {selectedOrder.preise?.zwischensumme && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">Zwischensumme:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatCurrency(selectedOrder.preise.zwischensumme)}
                          </Typography>
                        </Box>
                      )}
                      {selectedOrder.preise?.versandkosten > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">Versandkosten:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatCurrency(selectedOrder.preise.versandkosten)}
                          </Typography>
                        </Box>
                      )}
                      {selectedOrder.preise?.mwst?.betrag && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">MwSt ({selectedOrder.preise.mwst.satz}%):</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatCurrency(selectedOrder.preise.mwst.betrag)}
                          </Typography>
                        </Box>
                      )}
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight="bold">Gesamtsumme:</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {formatCurrency(selectedOrder.preise?.gesamtsumme || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Bestellstatus und Tracking */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      📦 Bestellstatus & Versand
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">Status:</Typography>
                        <Chip 
                          label={
                            selectedOrder.statusLabel || 
                            (typeof selectedOrder.status === 'object' 
                              ? JSON.stringify(selectedOrder.status) 
                              : selectedOrder.status) || 
                            'Unbekannt'
                          } 
                          color={
                            selectedOrder.statusColor ||
                            (selectedOrder.status === 'delivered' ? 'success' :
                            selectedOrder.status === 'shipped' ? 'info' :
                            selectedOrder.status === 'processing' ? 'warning' :
                            'default')
                          }
                          variant="outlined"
                        />
                      </Box>
                      
                      {selectedOrder.bestelldatum && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">Bestellt am:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {new Date(selectedOrder.bestelldatum).toLocaleDateString('de-DE')}
                          </Typography>
                        </Box>
                      )}

                      {selectedOrder.bestelltAm && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">Bestellt am:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {new Date(selectedOrder.bestelltAm).toLocaleDateString('de-DE')}
                          </Typography>
                        </Box>
                      )}
                      
                      {selectedOrder.versanddatum && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">Versandt am:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {new Date(selectedOrder.versanddatum).toLocaleDateString('de-DE')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Grid>
                
                {/* Zusätzliche Informationen */}
                {((selectedOrder.notizen && typeof selectedOrder.notizen !== 'undefined') || 
                  (selectedOrder.paymentMethod && typeof selectedOrder.paymentMethod !== 'undefined') || 
                  (selectedOrder.rechnung && typeof selectedOrder.rechnung !== 'undefined') || 
                  (selectedOrder.notes && typeof selectedOrder.notes !== 'undefined')) && (
                  <Grid item xs={12}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        ℹ️ Zusätzliche Informationen
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedOrder.paymentMethod && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1">Zahlungsmethode:</Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {formatDisplayValue(selectedOrder.paymentMethod)}
                            </Typography>
                          </Box>
                        )}
                        
                        {selectedOrder.rechnung && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1">Rechnungsnummer:</Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {formatDisplayValue(selectedOrder.rechnung)}
                            </Typography>
                          </Box>
                        )}
                        
                        {(selectedOrder.notizen || selectedOrder.notes) && (
                          <Box>
                            <Typography variant="body1" sx={{ mb: 1 }}>Notizen:</Typography>
                            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                {formatDisplayValue(selectedOrder.notizen || selectedOrder.notes)}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOrderDialogOpen(false)}>
                Schließen
              </Button>
              
              {selectedOrder.status === 'neu' && (
                <>
                  <Button 
                    color="success" 
                    variant="contained"
                    onClick={() => handleConfirmOrder(selectedOrder._id)}
                  >
                    ✅ Bestätigen
                  </Button>
                  <Button 
                    color="error" 
                    variant="outlined"
                    onClick={() => handleRejectOrder(selectedOrder._id)}
                  >
                    ❌ Ablehnen
                  </Button>
                </>
              )}
              
              {selectedOrder.status === 'bestaetigt' && (
                <Button 
                  color="primary" 
                  variant="contained"
                  onClick={() => handleStatusUpdate(selectedOrder._id, 'verpackt')}
                >
                  📦 Als verpackt markieren
                </Button>
              )}
              
              {selectedOrder.status === 'verpackt' && (
                <>
                  <Button 
                    color="primary" 
                    variant="contained"
                    onClick={() => {
                      setTrackingDialog(true);
                    }}
                  >
                    🚚 Versenden
                  </Button>
                </>
              )}
              
              {selectedOrder.status === 'verschickt' && (
                <Button 
                  color="success" 
                  variant="contained"
                  onClick={() => handleStatusUpdate(selectedOrder._id, 'zugestellt')}
                >
                  🏠 Als zugestellt markieren
                </Button>
              )}
              
              {['abgelehnt', 'storniert'].includes(selectedOrder.status) && 
               selectedOrder.zahlungsDetails?.paypal?.paymentId && (
                <Button 
                  color="warning" 
                  variant="contained"
                  onClick={() => handlePayPalRefund(selectedOrder)}
                >
                  💰 PayPal Rückerstattung
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Inquiry Details Dialog */}
      <Dialog 
        open={inquiryDialogOpen} 
        onClose={() => {
          setInquiryDialogOpen(false);
          setSelectedInquiry(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        {selectedInquiry && (
          <>
            <DialogTitle>
              💬 Anfrage #{selectedInquiry.bestellnummer}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    👤 Kontaktinformationen
                  </Typography>
                  <Typography>
                    <strong>Name:</strong> {selectedInquiry.vorname} {selectedInquiry.nachname}
                  </Typography>
                  <Typography>
                    <strong>E-Mail:</strong> {typeof selectedInquiry.email === 'object' 
                      ? JSON.stringify(selectedInquiry.email) 
                      : selectedInquiry.email}
                  </Typography>
                  <Typography>
                    <strong>Telefon:</strong> {selectedInquiry.telefon || 'Nicht angegeben'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    📝 Nachricht
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography>
                      {selectedInquiry.nachricht || 'Keine Nachricht verfügbar'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInquiryDialogOpen(false)}>
                Schließen
              </Button>
              <Button 
                color="success" 
                variant="contained"
                onClick={() => handleInquiryAction(selectedInquiry, 'approve')}
              >
                ✅ Genehmigen
              </Button>
              <Button 
                color="error" 
                variant="outlined"
                onClick={() => handleInquiryAction(selectedInquiry, 'reject')}
              >
                ❌ Ablehnen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog 
        open={trackingDialog} 
        onClose={() => setTrackingDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>🚚 Sendungsverfolgung hinzufügen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Versandanbieter</InputLabel>
                <Select
                  value={trackingData.anbieter}
                  label="Versandanbieter"
                  onChange={(e) => setTrackingData({ ...trackingData, anbieter: e.target.value })}
                >
                  {carrierOptions.map((carrier) => (
                    <MenuItem key={carrier.value} value={carrier.value}>
                      {carrier.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sendungsnummer"
                value={trackingData.sendungsnummer}
                onChange={(e) => handleTrackingNumberChange(e.target.value)}
                placeholder="Tracking-Nummer eingeben (Auto-Erkennung)"
                helperText={
                  trackingData.sendungsnummer 
                    ? (() => {
                        const validation = validateTrackingNumberEnhanced(trackingData.sendungsnummer, trackingData.anbieter);
                        return validation.isValid 
                          ? `✅ ${validation.message}` 
                          : `❌ ${validation.message}`;
                      })()
                    : "Geben Sie eine Tracking-Nummer ein für automatische Anbieter-Erkennung"
                }
                error={
                  trackingData.sendungsnummer 
                    ? !validateTrackingNumberEnhanced(trackingData.sendungsnummer, trackingData.anbieter).isValid
                    : false
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hinweis (optional)"
                value={trackingData.hinweis}
                onChange={(e) => setTrackingData({ ...trackingData, hinweis: e.target.value })}
                multiline
                rows={2}
                placeholder="Zusätzliche Informationen zum Versand"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddTracking}
            disabled={!trackingData.sendungsnummer || !trackingData.anbieter}
          >
            🚚 Versenden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrdersManagement;