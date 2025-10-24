import React, { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  AccordionSummary,
  AccordionDetails,
  Accordion,
  useTheme,
  useMediaQuery,
  Snackbar,
  SnackbarContent,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Search,
  FilterList,
  ViewList,
  Sort,
  Dashboard,
  LocalShipping,
  Payment,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Schedule,
  ExpandMore,
  Add,
  Print,
  Email,
  Phone,
  Home,
  Person,
  ShoppingCart,
  Receipt,
  Settings,
  Help,
  Inventory,
  Assessment,
  TrendingUp,
  MonetizationOn,
  AccountBalance
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../services/api';

const AdminOrdersManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Core state
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [hilfeOpen, setHilfeOpen] = useState(false);

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
      actions: ['archive']
    },
    abgelehnt: {
      label: '❌ Abgelehnt',
      color: 'error',
      priority: 0,
      description: 'Bestellung abgelehnt',
      actions: ['refund', 'note']
    },
    storniert: {
      label: '🔄 Storniert',
      color: 'error',
      priority: 0,
      description: 'Bestellung storniert',
      actions: ['refund', 'note']
    }
  };

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
      const response = await api.get('/inquiries/admin/all?status=pending&limit=50');
      
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

  // Tracking validation
  const validateTrackingNumber = (trackingNumber, carrier) => {
    if (!trackingNumber || trackingNumber.trim().length === 0) {
      return { isValid: false, message: 'Sendungsnummer ist erforderlich' };
    }

    const trimmedNumber = trackingNumber.trim().toUpperCase();

    const patterns = {
      dhl: /^[0-9]{10,12}$|^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,
      dpd: /^[0-9]{14}$/,
      ups: /^1Z[A-Z0-9]{16}$/,
      fedex: /^[0-9]{12,14}$/,
      hermes: /^[0-9]{10,16}$/,
      gls: /^[0-9]{11}$/
    };

    const pattern = patterns[carrier];
    if (pattern && !pattern.test(trimmedNumber)) {
      const examples = {
        dhl: '1234567890 oder AB123456789DE',
        dpd: '12345678901234',
        ups: '1Z999AA1234567890',
        fedex: '123456789012',
        hermes: '1234567890123456',
        gls: '12345678901'
      };
      
      return {
        isValid: false,
        message: `Ungültige ${carrier.toUpperCase()} Sendungsnummer. Beispiel: ${examples[carrier]}`
      };
    }

    return { isValid: true, message: 'Gültige Sendungsnummer' };
  };

  // Add tracking handler
  const handleAddTracking = async () => {
    if (!selectedOrder) return;

    if (!trackingData.sendungsnummer || !trackingData.anbieter) {
      setError('Bitte Sendungsnummer und Anbieter angeben');
      return;
    }

    const validation = validateTrackingNumber(trackingData.sendungsnummer, trackingData.anbieter);
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
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      
      const response = await api.put(`/inquiries/${inquiry._id}/${endpoint}`, {
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
      const customerName = `${order.besteller?.vorname || ''} ${order.besteller?.nachname || ''}`.trim();
      
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
    const config = statusConfig[status] || statusConfig.neu;
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        variant="filled"
      />
    );
  };

  const getNextAction = (order) => {
    const config = statusConfig[order.status] || statusConfig.neu;
    return config.description;
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

  // Combined data for display
  const combinedItems = React.useMemo(() => {
    let items = [...orders];
    
    if (filters.showInquiries) {
      const inquiryItems = inquiries.map(inquiry => ({
        ...inquiry,
        isInquiry: true,
        bestellnummer: `INQ-${inquiry._id.slice(-6)}`,
        besteller: {
          vorname: inquiry.vorname,
          nachname: inquiry.nachname,
          email: inquiry.email
        },
        bestelltAm: inquiry.createdAt,
        status: inquiry.status || 'neu',
        preise: { gesamtsumme: 0 }
      }));
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
        items = items.filter(item => 
          ['neu', 'bezahlt', 'bestaetigt', 'verpackt'].includes(item.status)
        );
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
                      📧 {item.besteller?.email}
                    </Typography>
                    
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
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    👤 Kundeninformationen
                  </Typography>
                  <Typography>
                    <strong>Name:</strong> {selectedOrder.besteller?.vorname} {selectedOrder.besteller?.nachname}
                  </Typography>
                  <Typography>
                    <strong>E-Mail:</strong> {selectedOrder.besteller?.email}
                  </Typography>
                  <Typography>
                    <strong>Telefon:</strong> {selectedOrder.besteller?.telefon || 'Nicht angegeben'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    📍 Lieferadresse
                  </Typography>
                  {selectedOrder.lieferadresse && (
                    <>
                      <Typography>{selectedOrder.lieferadresse.strasse}</Typography>
                      <Typography>
                        {selectedOrder.lieferadresse.plz} {selectedOrder.lieferadresse.ort}
                      </Typography>
                      <Typography>{selectedOrder.lieferadresse.land}</Typography>
                    </>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    🛒 Bestellte Artikel
                  </Typography>
                  {selectedOrder.warenkorb && selectedOrder.warenkorb.map((item, index) => (
                    <Box key={index} p={2} border={1} borderColor="grey.300" borderRadius={1} mb={1}>
                      <Typography><strong>{item.name}</strong></Typography>
                      <Typography>Menge: {item.menge}</Typography>
                      <Typography>Preis: {formatCurrency(item.preis || 0)}</Typography>
                    </Box>
                  ))}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    💰 Preisdetails
                  </Typography>
                  <Typography>
                    <strong>Gesamtsumme:</strong> {formatCurrency(selectedOrder.preise?.gesamtsumme || 0)}
                  </Typography>
                  {selectedOrder.preise?.versandkosten > 0 && (
                    <Typography>
                      Versandkosten: {formatCurrency(selectedOrder.preise.versandkosten)}
                    </Typography>
                  )}
                </Grid>
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
                    <strong>E-Mail:</strong> {selectedInquiry.email}
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
                onChange={(e) => setTrackingData({ ...trackingData, sendungsnummer: e.target.value })}
                placeholder="Tracking-Nummer eingeben"
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