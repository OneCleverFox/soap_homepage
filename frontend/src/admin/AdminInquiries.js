import React, { useState, useEffect, useCallback } from 'react';
import { useAdminState } from '../hooks/useAdminState';
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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  TrendingUp,
  PendingActions,
  Assignment
} from '@mui/icons-material';
import api from '../services/api';
import stockEventService from '../services/stockEventService';

const AdminInquiries = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Standardisierte Admin-States
  const {
    loading,
    error,
    setSuccess,
    showSnackbar,
    handleAsyncOperation
  } = useAdminState();
  
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({
    totalInquiries: 0,
    pendingCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    convertedCount: 0,
    totalValue: 0
  });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [responseMessage, setResponseMessage] = useState('');
  const [convertToOrder, setConvertToOrder] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [_expandedCard, _setExpandedCard] = useState(null);

  // Anfragen laden mit React Hook Pattern
  const loadInquiries = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const response = await api.get(`/inquiries/admin/all?status=${statusFilter}&limit=50`);
      
      if (response.data.success) {
        setInquiries(response.data.inquiries);
        // ⚠️ ENTFERNT: setStats(response.data.stats) - Das überschreibt die echten Stats!
        // Stats werden nur von loadStats() gesetzt
        setSuccess('Anfragen erfolgreich geladen');
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Anfragen geladen:', response.data.inquiries.length);
        }
      }
    }, 'Anfragen werden geladen...');
  }, [statusFilter, handleAsyncOperation, setSuccess]);

  // Statistiken laden mit Anti-Race-Condition Pattern
  const loadStats = useCallback(async () => {
    // Verhindere mehrfache gleichzeitige Ausführung
    if (loadStats._isLoading) {
      console.log('🚫 Stats Loading bereits aktiv, überspringe...');
      return;
    }
    
    loadStats._isLoading = true;
    
    try {
      const response = await api.get('/inquiries/admin/stats');
      if (response.data.success) {
        const statsData = response.data.data;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Backend Stats erhalten:', statsData);
        }
        
        // Fallback: Berechne totalValue aus allen Anfragen wenn Backend 0 zurückgibt
        let totalValue = statsData.totalValue || 0;
        if (totalValue === 0) {
          try {
            const inquiriesResponse = await api.get('/inquiries/admin/all?limit=1000');
            if (inquiriesResponse.data.success && inquiriesResponse.data.inquiries) {
              totalValue = inquiriesResponse.data.inquiries.reduce((sum, inquiry) => {
                return sum + (inquiry.total || 0);
              }, 0);
              
              if (process.env.NODE_ENV === 'development') {
                console.log('💰 Frontend TotalValue Fallback berechnet:', {
                  anzahlAnfragen: inquiriesResponse.data.inquiries.length,
                  calculatedTotalValue: totalValue,
                  backendTotalValue: statsData.totalValue
                });
              }
            }
          } catch (error) {
            console.warn('⚠️ Fallback totalValue Berechnung fehlgeschlagen:', error);
          }
        }
        
        const newStats = {
          pendingCount: statsData.pending || 0,
          acceptedCount: statsData.accepted || 0,
          rejectedCount: statsData.rejected || 0,
          convertedCount: statsData.converted || 0,
          totalCount: statsData.total || 0,
          totalValue: totalValue
        };
        
        setStats(newStats);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Frontend-Statistiken FINAL gesetzt:', {
            ...newStats,
            usedFallback: (statsData.totalValue === 0 && totalValue > 0)
          });
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Statistiken:', error);
    } finally {
      loadStats._isLoading = false;
    }
  }, []);

  useEffect(() => {
    loadInquiries();
    // loadStats wird separat aufgerufen, um Race Conditions zu vermeiden
    const timer = setTimeout(() => loadStats(), 100);
    return () => clearTimeout(timer);
  }, [loadInquiries, loadStats]);
  
  // Separater Effect für Badge-Reset nur wenn wirklich Aktionen durchgeführt wurden
  useEffect(() => {
    const handleInquiryAction = () => {
      // Badge erst nach tatsächlicher Aktion (Ansehen, Bearbeiten) zurücksetzen
      window.dispatchEvent(new CustomEvent('adminInquiriesViewed'));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('👑 Admin-Anfrage bearbeitet - Badge-Reset ausgelöst');
      }
    };
    
    // Event-Listener für Anfragen-Aktionen
    window.addEventListener('inquiryViewed', handleInquiryAction);
    window.addEventListener('inquiryActioned', handleInquiryAction);
    
    return () => {
      window.removeEventListener('inquiryViewed', handleInquiryAction);
      window.removeEventListener('inquiryActioned', handleInquiryAction);
    };
  }, []);

  // Anfrage-Details anzeigen mit React Hook Pattern
  const showInquiryDetails = useCallback(async (inquiryId) => {
    await handleAsyncOperation(async () => {
      const response = await api.get(`/inquiries/admin/${inquiryId}`);
      if (response.data.success) {
        setSelectedInquiry(response.data.inquiry);
        setDialogOpen(true);
        showSnackbar('Details erfolgreich geladen', 'success');
        
        // Event senden - Anfrage wurde angesehen
        window.dispatchEvent(new CustomEvent('inquiryViewed', {
          detail: { inquiryId }
        }));
      }
    }, 'Details werden geladen...');
  }, [handleAsyncOperation, showSnackbar]);

  // Anfrage annehmen mit React Hook Pattern
  const acceptInquiry = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const response = await api.put(`/inquiries/admin/${selectedInquiry.inquiryId}/accept`, {
        message: responseMessage,
        convertToOrder
      });
      
      if (response.data.success) {
        setActionDialog({ open: false, type: null });
        setDialogOpen(false);
        setResponseMessage('');
        await loadInquiries();
        await loadStats();
        showSnackbar('Anfrage erfolgreich angenommen', 'success');
        
        // Event senden - Anfrage wurde bearbeitet
        window.dispatchEvent(new CustomEvent('inquiryActioned', {
          detail: { action: 'accept', inquiryId: selectedInquiry.inquiryId }
        }));
        
        // ✅ BESTAND-UPDATE: Benachrichtige über Bestandsänderungen
        window.dispatchEvent(new CustomEvent('inventoryUpdated'));
        stockEventService.notifyGlobalStockUpdate();
        
        console.log('📦 Bestandsänderung durch Anfrage-Annahme - Events ausgelöst');
      }
    }, 'Anfrage wird angenommen...');
  }, [handleAsyncOperation, selectedInquiry, responseMessage, convertToOrder, loadInquiries, loadStats, showSnackbar]);

  // Anfrage ablehnen mit React Hook Pattern
  const rejectInquiry = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const response = await api.put(`/inquiries/admin/${selectedInquiry.inquiryId}/reject`, {
        message: responseMessage
      });
      
      if (response.data.success) {
        setActionDialog({ open: false, type: null });
        setDialogOpen(false);
        setResponseMessage('');
        await loadInquiries();
        await loadStats();
        showSnackbar('Anfrage wurde abgelehnt', 'info');        
        // Event senden - Anfrage wurde bearbeitet
        window.dispatchEvent(new CustomEvent('inquiryActioned', {
          detail: { action: 'reject', inquiryId: selectedInquiry.inquiryId }
        }));      }
    }, 'Anfrage wird abgelehnt...');
  }, [handleAsyncOperation, selectedInquiry, responseMessage, loadInquiries, loadStats, showSnackbar]);

  const formatPrice = (price) => {
    // Sichere Konvertierung zu Number, falls undefined/null
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('de-DE');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'converted_to_order': return 'primary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'accepted': return 'Angenommen';
      case 'rejected': return 'Abgelehnt';
      case 'converted_to_order': return 'Zu Bestellung';
      default: return status;
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    if (statusFilter === 'all') return true;
    return inquiry.status === statusFilter;
  });

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: isMobile ? 2 : 4, 
        mb: isMobile ? 2 : 4, 
        px: isMobile ? 1 : 3 
      }}
    >
      {/* Header - Mobile optimiert */}
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: isMobile ? '1.5rem' : '2.125rem',
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Email sx={{ mr: isMobile ? 1 : 2, verticalAlign: 'middle' }} />
        Anfragen-Verwaltung
      </Typography>

      {/* Loading und Error States */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiken - Mobile responsive */}
      {stats && (
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: isMobile ? 3 : 4 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.8) 0%, rgba(245, 124, 0, 0.8) 100%)',
                color: 'white',
                height: isMobile ? 'auto' : '100px'
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                '&:last-child': { pb: isMobile ? 1.5 : 2 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                minHeight: isMobile ? '80px' : 'auto'
              }}>
                {!isMobile && (
                  <PendingActions sx={{ mb: 0.5, fontSize: 24, opacity: 0.9 }} />
                )}
                <Typography 
                  variant={isMobile ? "h4" : "h5"}
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: isMobile ? '2rem' : '1.75rem',
                    lineHeight: 1
                  }}
                >
                  {stats.pendingCount || 0}
                </Typography>
                <Typography 
                  variant={isMobile ? "body2" : "caption"}
                  sx={{ 
                    fontSize: isMobile ? '0.75rem' : '0.7rem',
                    opacity: 0.9,
                    fontWeight: 500
                  }}
                >
                  Ausstehend
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(46, 125, 50, 0.8) 100%)',
                color: 'white',
                height: isMobile ? 'auto' : '100px'
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                '&:last-child': { pb: isMobile ? 1.5 : 2 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                minHeight: isMobile ? '80px' : 'auto'
              }}>
                {!isMobile && (
                  <CheckCircle sx={{ mb: 0.5, fontSize: 24, opacity: 0.9 }} />
                )}
                <Typography 
                  variant={isMobile ? "h4" : "h5"}
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: isMobile ? '2rem' : '1.75rem',
                    lineHeight: 1
                  }}
                >
                  {(stats.acceptedCount || 0) + (stats.convertedCount || 0)}
                </Typography>
                <Typography 
                  variant={isMobile ? "body2" : "caption"}
                  sx={{ 
                    fontSize: isMobile ? '0.75rem' : '0.7rem',
                    opacity: 0.9,
                    fontWeight: 500
                  }}
                >
                  Angenommen
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={12} md={6}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.8) 0%, rgba(21, 101, 192, 0.8) 100%)',
                color: 'white',
                height: isMobile ? 'auto' : '100px'
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1.5 : 2, 
                '&:last-child': { pb: isMobile ? 1.5 : 2 },
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  pr: isMobile ? 1 : 1
                }}>
                  {!isMobile && (
                    <Assignment sx={{ mb: 0.5, fontSize: 20, opacity: 0.9 }} />
                  )}
                  <Typography 
                    variant={isMobile ? "h5" : "h6"}
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: isMobile ? '1.5rem' : '1.25rem'
                    }}
                  >
                    {stats.totalCount || 0}
                  </Typography>
                  <Typography 
                    variant="caption"
                    sx={{ 
                      fontSize: isMobile ? '0.7rem' : '0.65rem',
                      opacity: 0.9,
                      fontWeight: 500
                    }}
                  >
                    Anfragen
                  </Typography>
                </Box>
                
                <Divider 
                  orientation="vertical" 
                  flexItem 
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.3)',
                    mx: 1
                  }} 
                />
                
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  pl: isMobile ? 1 : 1
                }}>
                  {!isMobile && (
                    <TrendingUp sx={{ mb: 0.5, fontSize: 20, opacity: 0.9 }} />
                  )}
                  <Typography 
                    variant={isMobile ? "h5" : "h6"}
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: isMobile ? '1.5rem' : '1.25rem'
                    }}
                  >
                    {formatPrice(stats.totalValue)}
                  </Typography>
                  <Typography 
                    variant="caption"
                    sx={{ 
                      fontSize: isMobile ? '0.7rem' : '0.65rem',
                      opacity: 0.9,
                      fontWeight: 500
                    }}
                  >
                    Gesamtwert
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Tabs - Responsive */}
      <Paper sx={{ mb: 3 }}>
        {isMobile ? (
          // Mobile Dropdown
          <Box sx={{ p: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-select-label">Status Filter</InputLabel>
              <Select
                labelId="filter-select-label"
                value={currentTab}
                label="Status Filter"
                onChange={(e) => {
                  const newValue = e.target.value;
                  setCurrentTab(newValue);
                  const filters = ['all', 'pending', 'accepted', 'rejected', 'converted_to_order'];
                  setStatusFilter(filters[newValue]);
                }}
              >
                <MenuItem value={0}>📋 Alle</MenuItem>
                <MenuItem value={1}>⏳ Ausstehend</MenuItem>
                <MenuItem value={2}>✅ Angenommen</MenuItem>
                <MenuItem value={3}>❌ Abgelehnt</MenuItem>
                <MenuItem value={4}>🛒 Zu Bestellung</MenuItem>
              </Select>
            </FormControl>
          </Box>
        ) : (
          // Desktop Tabs
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => {
              setCurrentTab(newValue);
              const filters = ['all', 'pending', 'accepted', 'rejected', 'converted_to_order'];
              setStatusFilter(filters[newValue]);
            }}
          >
            <Tab label="Alle" />
            <Tab label="Ausstehend" />
            <Tab label="Angenommen" />
            <Tab label="Abgelehnt" />
            <Tab label="Zu Bestellung" />
          </Tabs>
        )}
      </Paper>

      {/* Aktionen */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {
            loadInquiries();
            loadStats();
          }}
        >
          Aktualisieren
        </Button>
      </Box>

      {/* Anfragen-Tabelle */}
      <Paper>
        {isMobile ? (
          // Mobile Card Layout
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredInquiries.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography color="text.secondary">
                  Keine Anfragen gefunden
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {filteredInquiries.map((inquiry) => (
                  <Card 
                    key={inquiry._id} 
                    variant="outlined"
                    sx={{ 
                      p: 2,
                      borderRadius: 2,
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {/* Header mit ID und Status */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        #{inquiry.inquiryId}
                      </Typography>
                      <Chip
                        label={getStatusLabel(inquiry.status)}
                        color={getStatusColor(inquiry.status)}
                        size="small"
                      />
                    </Box>

                    {/* Kundendaten */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {inquiry.customer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        {inquiry.customer.email}
                      </Typography>
                    </Box>

                    {/* Bestelldetails */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Assignment color="primary" sx={{ fontSize: 18 }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Artikel
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {inquiry.items.length} Stk.
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUp color="success" sx={{ fontSize: 18 }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Wert
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                              {formatPrice(inquiry.total)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Footer mit Datum und Aktionen */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(inquiry.createdAt)}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => showInquiryDetails(inquiry.inquiryId)}
                        sx={{ minWidth: 'auto' }}
                      >
                        Details
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          // Desktop Table Layout
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Anfrage-ID</TableCell>
                  <TableCell>Kunde</TableCell>
                  <TableCell>Artikel</TableCell>
                  <TableCell>Wert</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Datum</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredInquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Keine Anfragen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInquiries.map((inquiry) => (
                    <TableRow key={inquiry._id}>
                      <TableCell>{inquiry.inquiryId}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {inquiry.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inquiry.customer.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {inquiry.items.length} Artikel
                      </TableCell>
                      <TableCell>{formatPrice(inquiry.total)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(inquiry.status)}
                          color={getStatusColor(inquiry.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => showInquiryDetails(inquiry.inquiryId)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Anfrage-Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedInquiry && (
          <>
            <DialogTitle>
              Anfrage {selectedInquiry.inquiryId}
              <Chip
                label={getStatusLabel(selectedInquiry.status)}
                color={getStatusColor(selectedInquiry.status)}
                size="small"
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Kundendaten */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Kunde</Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedInquiry.customer.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>E-Mail:</strong> {selectedInquiry.customer.email}
                  </Typography>
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Rechnungsadresse
                  </Typography>
                  <Typography variant="body2">
                    {selectedInquiry.rechnungsadresse.vorname} {selectedInquiry.rechnungsadresse.nachname}<br />
                    {selectedInquiry.rechnungsadresse.strasse} {selectedInquiry.rechnungsadresse.hausnummer}<br />
                    {selectedInquiry.rechnungsadresse.plz} {selectedInquiry.rechnungsadresse.stadt}
                  </Typography>
                </Grid>

                {/* Bestelldaten */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Artikel</Typography>
                  <List dense>
                    {selectedInquiry.items.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${item.quantity}x ${item.name}`}
                          secondary={formatPrice(item.price * item.quantity)}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Divider />
                  <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Gesamtwert: {formatPrice(selectedInquiry.total)}
                  </Typography>
                </Grid>

                {/* Notizen */}
                {selectedInquiry.customerNote && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Kundennotiz</Typography>
                    <Typography variant="body2">
                      {selectedInquiry.customerNote}
                    </Typography>
                  </Grid>
                )}

                {/* Admin-Antwort */}
                {selectedInquiry.adminResponse && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Admin-Antwort:</strong> {selectedInquiry.adminResponse.message}
                        <br />
                        <em>Bearbeitet von {selectedInquiry.adminResponse.respondedBy} am {formatDate(selectedInquiry.adminResponse.respondedAt)}</em>
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedInquiry.status === 'pending' && (
                <>
                  <Button
                    startIcon={<CheckCircle />}
                    color="success"
                    onClick={() => setActionDialog({ open: true, type: 'accept' })}
                  >
                    Annehmen
                  </Button>
                  <Button
                    startIcon={<Cancel />}
                    color="error"
                    onClick={() => setActionDialog({ open: true, type: 'reject' })}
                  >
                    Ablehnen
                  </Button>
                </>
              )}
              <Button onClick={() => setDialogOpen(false)}>
                Schließen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Aktions-Dialog (Annehmen/Ablehnen) */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'accept' ? 'Anfrage annehmen' : 'Anfrage ablehnen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nachricht an den Kunden"
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder={actionDialog.type === 'accept' 
              ? 'Gerne können wir Ihre Anfrage bearbeiten...' 
              : 'Leider können wir Ihre Anfrage nicht bearbeiten...'
            }
            sx={{ mt: 2 }}
          />
          
          {actionDialog.type === 'accept' && (
            <FormControlLabel
              control={
                <Switch
                  checked={convertToOrder}
                  onChange={(e) => setConvertToOrder(e.target.checked)}
                />
              }
              label="Direkt in Bestellung umwandeln"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: null })}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color={actionDialog.type === 'accept' ? 'success' : 'error'}
            onClick={actionDialog.type === 'accept' ? acceptInquiry : rejectInquiry}
          >
            {actionDialog.type === 'accept' ? 'Annehmen' : 'Ablehnen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminInquiries;