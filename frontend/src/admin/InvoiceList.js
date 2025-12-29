import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  Snackbar,
  Alert,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2)
}));

const InvoiceList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State Management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter State
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  
  // UI State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuInvoice, setActionMenuInvoice] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Stats State
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0
  });

  // Lade Rechnungen
  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [page, rowsPerPage, filters]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      console.log('🔍 [INVOICE LIST] Lade Rechnungen...');
      
      // Prepare filters and remove empty values
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '' && filters[key] !== 'all') {
          cleanFilters[key] = filters[key];
        }
      });
      
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...cleanFilters
      });

      console.log('🔍 [INVOICE LIST] URL:', `/api/admin/invoices?${queryParams}`);
      console.log('🔍 [INVOICE LIST] Filters:', cleanFilters);
      
      const response = await fetch(`${API_BASE_URL}/admin/invoices?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('🔍 [INVOICE LIST] Response Status:', response.status);
      const data = await response.json();
      console.log('🔍 [INVOICE LIST] Response Data:', data);
      
      if (data.success) {
        console.log('🔍 [INVOICE LIST] Rechnungen:', data.data.invoices);
        console.log('🔍 [INVOICE LIST] Anzahl Rechnungen:', data.data.invoices?.length || 0);
        setInvoices(data.data.invoices || []);
        setTotalCount(data.data.totalCount || 0);
      } else {
        console.error('🔍 [INVOICE LIST] Fehler:', data.message);
        showSnackbar(data.message || 'Fehler beim Laden der Rechnungen', 'error');
      }
    } catch (error) {
      console.error('🔍 [INVOICE LIST] Exception:', error);
      showSnackbar('Fehler beim Laden der Rechnungen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'cancelled': return 'secondary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'sent': return 'Versendet';
      case 'paid': return 'Bezahlt';
      case 'overdue': return 'Überfällig';
      case 'cancelled': return 'Storniert';
      case 'pending': return 'Ausstehend';
      default: return status;
    }
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar(`Status erfolgreich auf "${getStatusText(newStatus)}" geändert`, 'success');
        loadInvoices();
        loadStats();
      } else {
        showSnackbar(data.message || 'Fehler beim Aktualisieren des Status', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      showSnackbar('Fehler beim Aktualisieren des Status', 'error');
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('Rechnung erfolgreich gelöscht', 'success');
        loadInvoices(); // Reload list
        loadStats(); // Reload stats
      } else {
        showSnackbar(data.message || 'Fehler beim Löschen der Rechnung', 'error');
      }
    } catch (error) {
      console.error('Löschen Fehler:', error);
      showSnackbar('Fehler beim Löschen der Rechnung', 'error');
    }
  };

  const generatePDF = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Rechnung-${invoices.find(i => i._id === invoiceId)?.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSnackbar('PDF erfolgreich heruntergeladen', 'success');
      } else {
        const error = await response.json();
        showSnackbar(error.message || 'Fehler beim PDF-Download', 'error');
      }
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error);
      showSnackbar('Fehler beim PDF-Download', 'error');
    }
  };

  // Vorschau-Funktion - lädt PDF und öffnet es im Browser
  const previewInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // PDF als Blob laden
      const blob = await response.blob();
      
      // Temporäre URL erstellen und im neuen Tab öffnen
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      // URL nach kurzer Zeit wieder freigeben
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      if (!newWindow) {
        showSnackbar('Pop-up wurde blockiert. Bitte Pop-ups für diese Seite erlauben.', 'warning');
      }
    } catch (err) {
      console.error('Fehler bei der Rechnungsvorschau:', err);
      showSnackbar('Fehler bei der Rechnungsvorschau: ' + err.message, 'error');
    }
  };

  // Verbesserte PDF-Download-Funktion mit Fehlerbehandlung
  const downloadStoredInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = new Blob([await response.arrayBuffer()], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rechnung-${invoices.find(i => i._id === invoiceId)?.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSnackbar('PDF erfolgreich heruntergeladen', 'success');
    } catch (err) {
      console.error('Fehler beim Herunterladen der Rechnung:', err);
      showSnackbar('Fehler beim Herunterladen der Rechnung: ' + err.message, 'error');
    }
  };

  // Zusätzliche Hilfsfunktionen aus AdminInvoiceManagement
  const getPaymentStatusColor = (paymentStatus) => {
    const statusMap = {
      'pending': 'warning',
      'paid': 'success',
      'failed': 'error',
      'cancelled': 'default'
    };
    return statusMap[paymentStatus] || 'default';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const openActionMenu = (event, invoice) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuInvoice(invoice);
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    setActionMenuInvoice(null);
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: isMobile ? 1 : 2 }}>
      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'} 
        mb={3}
        gap={isMobile ? 2 : 0}
      >
        <Typography variant={isMobile ? "h5" : "h4"}>
          <ReceiptIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Rechnungen verwalten
        </Typography>
        <Button
          variant="contained"
          size={isMobile ? "large" : "medium"}
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/create-invoice')}
          fullWidth={isMobile}
        >
          Neue Rechnung
        </Button>
      </Box>

      {/* Statistik Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gesamte Rechnungen
              </Typography>
              <Typography variant="h5" component="h2">
                {stats.totalInvoices}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gesamtumsatz
              </Typography>
              <Typography variant="h5" component="h2">
                {stats.totalAmount?.toFixed(2)}€
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Offene Beträge
              </Typography>
              <Typography variant="h5" component="h2" color="warning.main">
                {stats.pendingAmount?.toFixed(2)}€
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Bezahlt
              </Typography>
              <Typography variant="h5" component="h2" color="success.main">
                {stats.paidAmount?.toFixed(2)}€
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <StyledPaper>
        <Grid container spacing={isMobile ? 1 : 2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Suche (Rechnungsnummer, Kunde)"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="draft">Entwurf</MenuItem>
                <MenuItem value="sent">Versendet</MenuItem>
                <MenuItem value="paid">Bezahlt</MenuItem>
                <MenuItem value="overdue">Überfällig</MenuItem>
                <MenuItem value="cancelled">Storniert</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              type="date"
              label="Von Datum"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              type="date"
              label="Bis Datum"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              startIcon={<FilterIcon />}
              onClick={() => setFilters({ status: 'all', dateFrom: '', dateTo: '', search: '' })}
              fullWidth={isMobile}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </StyledPaper>

      {/* Rechnungsliste - Mobile Card View */}
      <StyledPaper>
        {isMobile ? (
          // Mobile Card Layout
          <Box>
            {loading ? (
              <Box textAlign="center" py={4}>
                <Typography>Lade Rechnungen...</Typography>
              </Box>
            ) : invoices.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary">
                  Keine Rechnungen gefunden
                </Typography>
              </Box>
            ) : (
              <Box spacing={2}>
                {invoices.map((invoice, index) => (
                  <Card 
                    key={invoice._id} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2,
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-1px)',
                        transition: 'all 0.2s ease'
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Header mit Rechnungsnummer und Status */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {invoice.invoiceNumber}
                        </Typography>
                        <Chip
                          size="small"
                          label={getStatusText(invoice.status)}
                          color={getStatusColor(invoice.status)}
                        />
                      </Box>
                      
                      {/* Kunde */}
                      <Typography variant="body2" color="textSecondary" mb={1}>
                        {invoice.customerData?.company || 
                         `${invoice.customerData?.firstName || ''} ${invoice.customerData?.lastName || ''}`.trim() ||
                         'Unbekannt'}
                      </Typography>
                      
                      {/* Betragszeile mit Datum */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(invoice.amounts?.total || invoice.totalAmount)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(invoice.dates?.invoiceDate || invoice.invoiceDate)}
                        </Typography>
                      </Box>
                      
                      {/* Fälligkeitsdatum wenn vorhanden */}
                      {(invoice.dates?.dueDate || invoice.dueDate) && (
                        <Typography variant="caption" color="textSecondary">
                          Fällig: {formatDate(invoice.dates?.dueDate || invoice.dueDate)}
                        </Typography>
                      )}
                    </CardContent>
                    
                    {/* Action Button */}
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        onClick={(e) => openActionMenu(e, invoice)}
                        endIcon={<MoreVertIcon />}
                      >
                        Aktionen
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
            
            {/* Mobile Pagination */}
            <Box mt={2}>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Zeilen:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}–${to} von ${count !== -1 ? count : `${to}+`}`
                }
              />
            </Box>
          </Box>
        ) : (
          // Desktop Table Layout
          <Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rechnungsnummer</TableCell>
                    <TableCell>Kunde</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell>Betrag</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Fälligkeitsdatum</TableCell>
                    <TableCell align="center">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography>Lade Rechnungen...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">
                          Keine Rechnungen gefunden
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice._id} hover>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {invoice.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {invoice.customerData?.company || 
                             `${invoice.customerData?.firstName || ''} ${invoice.customerData?.lastName || ''}`.trim() ||
                             'Unbekannt'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {invoice.customerData?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(invoice.dates?.invoiceDate || invoice.invoiceDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {formatCurrency(invoice.amounts?.total || invoice.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getStatusText(invoice.status)}
                            color={getStatusColor(invoice.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {invoice.dates?.dueDate || invoice.dueDate ? 
                              formatDate(invoice.dates?.dueDate || invoice.dueDate) : 
                              '-'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => openActionMenu(e, invoice)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Zeilen pro Seite:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}–${to} von ${count !== -1 ? count : `mehr als ${to}`}`
              }
            />
          </Box>
        )}
      </StyledPaper>

      {/* Aktions-Menü */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={closeActionMenu}
      >
        <MenuItem onClick={() => {
          viewInvoice(actionMenuInvoice);
          closeActionMenu();
        }}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          Anzeigen
        </MenuItem>
        <MenuItem onClick={() => {
          previewInvoice(actionMenuInvoice._id);
          closeActionMenu();
        }}>
          <ReceiptIcon sx={{ mr: 1 }} fontSize="small" />
          Vorschau
        </MenuItem>
        <MenuItem onClick={() => {
          generatePDF(actionMenuInvoice._id);
          closeActionMenu();
        }}>
          <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
          PDF herunterladen
        </MenuItem>
        <MenuItem onClick={() => {
          deleteInvoice(actionMenuInvoice._id);
          closeActionMenu();
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Löschen
        </MenuItem>
      </Menu>

      {/* Rechnungsdetails Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? 'none' : '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: isMobile ? 1 : 2
        }}>
          <Typography variant={isMobile ? "h6" : "h5"}>
            Rechnung {selectedInvoice?.invoiceNumber}
          </Typography>
          {isMobile && (
            <IconButton 
              onClick={() => setViewDialogOpen(false)}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
          {selectedInvoice && (
            <Grid container spacing={isMobile ? 2 : 3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Kunde:</Typography>
                <Typography variant="body2">
                  {selectedInvoice.customerData?.company || 
                   `${selectedInvoice.customerData?.firstName || ''} ${selectedInvoice.customerData?.lastName || ''}`.trim()}
                </Typography>
                <Typography variant="body2">
                  {selectedInvoice.customerData?.street}
                </Typography>
                <Typography variant="body2">
                  {selectedInvoice.customerData?.postalCode} {selectedInvoice.customerData?.city}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Details:</Typography>
                <Typography variant="body2">
                  Datum: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('de-DE')}
                </Typography>
                <Typography variant="body2">
                  Status: <Chip
                    size="small"
                    label={getStatusText(selectedInvoice.status)}
                    color={getStatusColor(selectedInvoice.status)}
                  />
                </Typography>
                <Typography variant="body2">
                  Betrag: {selectedInvoice.totalAmount?.toFixed(2)}€
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Artikel:</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Artikel</TableCell>
                      <TableCell>Menge</TableCell>
                      <TableCell>Einzelpreis</TableCell>
                      <TableCell>Gesamt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitPrice?.toFixed(2)}€</TableCell>
                        <TableCell>{(item.quantity * item.unitPrice)?.toFixed(2)}€</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 2 : 1,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0
        }}>
          {!isMobile && (
            <Button onClick={() => setViewDialogOpen(false)}>
              Schließen
            </Button>
          )}
          <Button 
            variant="contained"
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
            onClick={() => generatePDF(selectedInvoice._id)}
          >
            PDF herunterladen
          </Button>
          {isMobile && (
            <Button 
              onClick={() => setViewDialogOpen(false)}
              size="large"
              fullWidth
            >
              Schließen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InvoiceList;