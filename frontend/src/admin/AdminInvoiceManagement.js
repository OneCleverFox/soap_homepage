// Admin-Panel Komponente für Rechnungsmanagement
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import apiClient from '../../services/apiClient';

const AdminInvoiceManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    hasInvoice: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/orders', {
        params: filters.status !== 'all' ? { status: filters.status } : {}
      });
      
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Fehler beim Laden der Bestellungen:', err);
      setError('Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (orderId) => {
    try {
      const response = await apiClient.get(`/api/invoices/order/${orderId}/generate`);
      
      // PDF Download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rechnung-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Orders neu laden um Invoice-Status zu aktualisieren
      loadOrders();
      
    } catch (err) {
      console.error('Fehler bei der Rechnungsgenerierung:', err);
      setError('Fehler bei der Rechnungsgenerierung: ' + (err.response?.data?.message || err.message));
    }
  };

  const downloadStoredInvoice = async (orderId) => {
    try {
      const response = await apiClient.get(`/api/invoices/order/${orderId}/stored`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rechnung-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Fehler beim Herunterladen der Rechnung:', err);
      setError('Fehler beim Herunterladen der Rechnung');
    }
  };

  const previewInvoice = async (orderId, isStored = false) => {
    try {
      const url = isStored 
        ? `/api/invoices/order/${orderId}/stored?format=html`
        : `/api/invoices/order/${orderId}/generate?format=html`;
        
      window.open(url, '_blank');
    } catch (err) {
      console.error('Fehler bei der Rechnungsvorschau:', err);
      setError('Fehler bei der Rechnungsvorschau');
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'neu': 'default',
      'bestaetigt': 'primary',
      'bezahlt': 'success',
      'verpackt': 'info',
      'verschickt': 'warning',
      'zugestellt': 'success',
      'storniert': 'error',
      'abgelehnt': 'error'
    };
    return statusMap[status] || 'default';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'neu': 'Neu',
      'bestaetigt': 'Bestätigt',
      'bezahlt': 'Bezahlt',
      'verpackt': 'Verpackt',
      'verschickt': 'Verschickt',
      'zugestellt': 'Zugestellt',
      'storniert': 'Storniert',
      'abgelehnt': 'Abgelehnt'
    };
    return statusMap[status] || status;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Bestellungen werden geladen...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Rechnungsmanagement
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setFilterOpen(true)}
        >
          Filter
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bestellnummer</TableCell>
                <TableCell>Kunde</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Gesamtbetrag</TableCell>
                <TableCell>Rechnung</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {order._id?.slice(-8)?.toUpperCase()}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {order.kunde ? 
                        `${order.kunde.vorname || ''} ${order.kunde.nachname || ''}`.trim() :
                        'Gast'
                      }
                    </Typography>
                    {order.kunde?.email && (
                      <Typography variant="caption" color="textSecondary">
                        {order.kunde.email}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={getStatusText(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(order.gesamtsumme + (order.versandkosten || 0))}
                    </Typography>
                    {order.versandkosten > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        (inkl. {formatCurrency(order.versandkosten)} Versand)
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {order.invoice ? (
                      <Box>
                        <Chip
                          label="Erstellt"
                          color="success"
                          size="small"
                          icon={<ReceiptIcon />}
                        />
                        <Typography variant="caption" display="block">
                          {order.invoice.number}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDate(order.invoice.generatedAt)}
                        </Typography>
                      </Box>
                    ) : (
                      <Chip
                        label="Nicht erstellt"
                        color="default"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {order.invoice ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => downloadStoredInvoice(order._id)}
                          >
                            Download
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => previewInvoice(order._id, true)}
                          >
                            Vorschau
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ReceiptIcon />}
                            onClick={() => generateInvoice(order._id)}
                          >
                            Erstellen
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => previewInvoice(order._id, false)}
                          >
                            Vorschau
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {orders.length === 0 && (
          <Box p={4} textAlign="center">
            <Typography variant="h6" color="textSecondary">
              Keine Bestellungen gefunden
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Es sind noch keine Bestellungen vorhanden oder sie entsprechen nicht den Filterkriterien.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bestellungen filtern</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="all">Alle Status</MenuItem>
                <MenuItem value="neu">Neu</MenuItem>
                <MenuItem value="bestaetigt">Bestätigt</MenuItem>
                <MenuItem value="bezahlt">Bezahlt</MenuItem>
                <MenuItem value="verpackt">Verpackt</MenuItem>
                <MenuItem value="verschickt">Verschickt</MenuItem>
                <MenuItem value="zugestellt">Zugestellt</MenuItem>
                <MenuItem value="storniert">Storniert</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Rechnung</InputLabel>
              <Select
                value={filters.hasInvoice}
                label="Rechnung"
                onChange={(e) => setFilters(prev => ({ ...prev, hasInvoice: e.target.value }))}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="yes">Mit Rechnung</MenuItem>
                <MenuItem value="no">Ohne Rechnung</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Von Datum"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              label="Bis Datum"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterOpen(false)}>Abbrechen</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setFilterOpen(false);
              loadOrders();
            }}
          >
            Filter anwenden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminInvoiceManagement;