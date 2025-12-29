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
  useTheme,
  useMediaQuery,
  IconButton,
  Stack,
  Collapse
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  TrendingUp,
  PendingActions,
  Assignment,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import api from '../services/api';

const AdminInquiries = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Standardisierte Admin-States
  const {
    loading, setLoading,
    error, setError,
    success, setSuccess,
    snackbar, showSnackbar, hideSnackbar,
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
  const [expandedCard, setExpandedCard] = useState(null);

  // Anfragen laden mit React Hook Pattern
  const loadInquiries = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const response = await api.get(`/inquiries/admin/all?status=${statusFilter}&limit=50`);
      
      if (response.data.success) {
        setInquiries(response.data.inquiries);
        setStats(response.data.stats);
        setSuccess('Anfragen erfolgreich geladen');
      }
    }, 'Anfragen werden geladen...');
  }, [statusFilter, handleAsyncOperation, setSuccess]);

  // Statistiken laden mit React Hook Pattern
  const loadStats = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const response = await api.get('/inquiries/admin/stats');
      if (response.data.success) {
        const statsData = response.data.data;
        setStats({
          pendingCount: statsData.pending || 0,
          acceptedCount: statsData.accepted || 0,
          rejectedCount: statsData.rejected || 0,
          convertedCount: statsData.converted || 0,
          totalCount: statsData.total || 0
        });
      }
    }, 'Statistiken werden geladen...');
  }, [handleAsyncOperation]);

  useEffect(() => {
    loadInquiries();
    loadStats();
  }, [loadInquiries, loadStats]);

  // Anfrage-Details anzeigen mit React Hook Pattern
  const showInquiryDetails = useCallback(async (inquiryId) => {
    await handleAsyncOperation(async () => {
      const response = await api.get(`/inquiries/admin/${inquiryId}`);
      if (response.data.success) {
        setSelectedInquiry(response.data.inquiry);
        setDialogOpen(true);
        showSnackbar('Details erfolgreich geladen', 'success');
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
      }
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
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                  <PendingActions color="warning" sx={{ mr: isMobile ? 0 : 1, mb: isMobile ? 0.5 : 0 }} />
                  <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <Typography variant={isMobile ? "h6" : "h5"}>{stats.pendingCount || 0}</Typography>
                    <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                      Ausstehend
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                  <CheckCircle color="success" sx={{ mr: isMobile ? 0 : 1, mb: isMobile ? 0.5 : 0 }} />
                  <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <Typography variant={isMobile ? "h6" : "h5"}>{(stats.acceptedCount || 0) + (stats.convertedCount || 0)}</Typography>
                    <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                      Angenommen
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                  <Assignment color="primary" sx={{ mr: isMobile ? 0 : 1, mb: isMobile ? 0.5 : 0 }} />
                  <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <Typography variant={isMobile ? "h6" : "h5"}>{stats.totalCount || 0}</Typography>
                    <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                      Gesamt
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp color="info" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{formatPrice(stats.totalValue)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gesamtwert
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3 }}>
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