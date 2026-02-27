import React, { useState, useEffect, useCallback } from 'react';
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
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import ProductCatalog from './ProductCatalog';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2)
}));

const InvoiceList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State Management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter State - initialisiere mit URL-Parametern
  const [filters, setFilters] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return {
      status: urlParams.get('status') || 'all',
      dateFrom: urlParams.get('dateFrom') || '',
      dateTo: urlParams.get('dateTo') || '',
      search: urlParams.get('search') || ''
    };
  });
  
  // UI State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    productData: { name: '', description: '', sku: '' },
    quantity: 1,
    unitPrice: 0
  });
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuInvoice, setActionMenuInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [productSearchDialogOpen, setProductSearchDialogOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0
  });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 [INVOICE LIST] Lade Rechnungen...');
      
      // Prepare filters and remove empty values
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '' && filters[key] !== 'all') {
          if (key === 'search') {
            // Suchbegriff als customer-Parameter senden
            cleanFilters.customer = filters[key];
          } else if (key === 'dateFrom') {
            // Frontend sendet dateFrom, Backend erwartet from
            cleanFilters.from = filters[key];
          } else if (key === 'dateTo') {
            // Frontend sendet dateTo, Backend erwartet to
            cleanFilters.to = filters[key];
          } else {
            cleanFilters[key] = filters[key];
          }
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
  }, [filters, page, rowsPerPage, setLoading, showSnackbar]);

  // Lade Rechnungen
  useEffect(() => {
    loadInvoices();
    loadStats();
    loadProducts(); // Produkte beim Start laden für Edit-Dialog
  }, [page, rowsPerPage, filters, loadInvoices]);

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

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      console.log('🔍 [INVOICELIST] Lade Produkte...');
      const response = await fetch(`${API_BASE_URL}/portfolio?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      console.log('🔍 [INVOICELIST] API Response:', data);
      
      // API gibt {success, data: [...]} oder direkt [...] zurück
      if (data && data.data && Array.isArray(data.data)) {
        console.log('🔍 [INVOICELIST] Setze Produkte:', data.data.length);
        setProducts(data.data);
      } else if (Array.isArray(data)) {
        console.log('🔍 [INVOICELIST] Setze Produkte direkt:', data.length);
        setProducts(data);
      } else {
        console.error('🔍 [INVOICELIST] Unerwartetes Datenformat:', data);
        setProducts([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Produkte:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
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

  const getStatusColor = (invoice) => {
    // Farblogik basierend auf tatsächlichem Zahlungsstatus
    if (invoice.payment && (invoice.payment.status === 'paid' || invoice.payment.paidDate)) {
      return 'success'; // Grün für bezahlt
    }
    
    if (invoice.status === 'paid') {
      return 'success'; // Grün für bezahlt
    }
    
    if (invoice.status === 'sent' && invoice.isOverdue) {
      return 'error'; // Rot für überfällig
    }
    
    switch (invoice.status) {
      case 'draft': return 'default';
      case 'sent': return 'warning'; // Orange für ausstehende Zahlung
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'cancelled': return 'secondary';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (invoice) => {
    // NEUER WORKFLOW: Zahlungsstatus = Rechnungsstatus
    // 1. Prüfe echte Bezahlung (payment.status oder paidDate)
    if (invoice.payment && (invoice.payment.status === 'paid' || invoice.payment.paidDate)) {
      return 'Bezahlt';
    }
    
    // 2. Prüfe wenn Rechnung als paid markiert ist (für manuelle Bezahlung)
    if (invoice.status === 'paid') {
      return 'Bezahlt';
    }
    
    // 3. Prüfe Überfälligkeit für versendete Rechnungen
    if (invoice.status === 'sent' && invoice.isOverdue) {
      return 'Überfällig';
    }
    
    // 4. Standard Status-Mapping
    switch (invoice.status) {
      case 'draft': return 'Entwurf';
      case 'sent': return 'Versendet - Zahlung ausstehend';
      case 'paid': return 'Bezahlt';
      case 'overdue': return 'Überfällig';  
      case 'cancelled': return 'Storniert';
      case 'pending': return 'Zum Versenden bereit';
      default: return invoice.status;
    }
  };

  const _updateInvoiceStatus = async (invoiceId, newStatus) => {
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
        showSnackbar(`Status erfolgreich geändert`, 'success');
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

  const markAsPaid = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status: 'paid',
          paidDate: new Date().toISOString(),
          paymentReference: 'Manuell als bezahlt markiert'
        })
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('Rechnung erfolgreich als bezahlt markiert', 'success');
        loadInvoices();
        loadStats();
        if (viewDialogOpen) setViewDialogOpen(false);
      } else {
        showSnackbar(data.message || 'Fehler beim Markieren als bezahlt', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Markieren als bezahlt:', error);
      showSnackbar('Fehler beim Markieren als bezahlt', 'error');
    }
  };

  const markAsUnpaid = async (invoiceId) => {
    try {
      console.log('🔄 [MARK UNPAID] Markiere Rechnung als unbezahlt:', invoiceId);
      
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status: 'sent'
        })
      });

      const data = await response.json();
      console.log('🔄 [MARK UNPAID] Response:', data);
      
      if (data.success) {
        showSnackbar('Rechnung und zugehörige Bestellung erfolgreich als unbezahlt markiert', 'success');
        // Aktualisiere den State sofort wenn Dialog offen ist
        if (selectedInvoice && selectedInvoice._id === invoiceId) {
          setSelectedInvoice(prev => ({
            ...prev,
            status: 'sent',
            payment: {
              ...prev.payment,
              status: 'pending',
              paidDate: null,
              paymentReference: null
            }
          }));
        }
        // Neu laden
        loadInvoices();
        loadStats();
        if (viewDialogOpen) setViewDialogOpen(false);
      } else {
        console.error('API Fehler:', data.message);
        showSnackbar(data.message || 'Fehler beim Markieren als unbezahlt', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Markieren als unbezahlt:', error);
      showSnackbar('Fehler beim Markieren als unbezahlt', 'error');
    }
  };

  const deleteInvoice = async (invoiceId) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar(data.message || 'Rechnung erfolgreich gelöscht', 'success');
        loadInvoices(); // Reload list
        loadStats(); // Reload stats
      } else {
        showSnackbar(data.message || 'Fehler beim Löschen der Rechnung', 'error');
      }
    } catch (error) {
      console.error('Löschen Fehler:', error);
      showSnackbar('Fehler beim Löschen der Rechnung', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setInvoiceToDelete(null);
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
  const _downloadStoredInvoice = async (invoiceId) => {
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

  // Bezahlstatus-Hilfsfunktionen
  const getPaymentStatusText = (invoice) => {
    // Prüfe tatsächlichen Bezahlstatus
    const isPaid = invoice.payment && 
                   (invoice.payment.status === 'paid' || 
                    invoice.payment.paidDate || 
                    invoice.status === 'paid');
    
    if (!isPaid) return 'Unbezahlt';
    
    // Wenn bezahlt, zeige Zahlungsmethode an
    const paymentMethod = invoice.payment?.method;
    const methodMap = {
      'paypal': 'PayPal',
      'stripe': 'Kreditkarte',
      'bank_transfer': 'Überweisung',
      'invoice': 'Rechnung'
    };
    
    return methodMap[paymentMethod] || 'Bezahlt';
  };

  // Zusätzliche Hilfsfunktionen aus AdminInvoiceManagement
  const getPaymentStatusColor = (invoice) => {
    // Prüfe tatsächlichen Bezahlstatus
    const isPaid = invoice.payment && 
                   (invoice.payment.status === 'paid' || 
                    invoice.payment.paidDate || 
                    invoice.status === 'paid');
    
    if (!isPaid) return 'warning';
    return 'success';
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

  const viewInvoice = async (invoice) => {
    try {
      // Lade vollständige Rechnungsdetails
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoice._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedInvoice(data.data);
        } else {
          console.error('Fehler beim Laden der Rechnungsdetails:', data.message);
          setSelectedInvoice(invoice); // Fallback zu Listenansicht
        }
      } else {
        console.error('API-Fehler beim Laden der Rechnungsdetails');
        setSelectedInvoice(invoice); // Fallback zu Listenansicht
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      setSelectedInvoice(invoice); // Fallback zu Listenansicht
    }
    
    setViewDialogOpen(true);
  };

  const openEditDialog = async (invoice) => {
    try {
      // Lade vollständige Rechnungsdetails
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoice._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEditInvoice(data.data);
        } else {
          console.error('Fehler beim Laden der Rechnungsdetails:', data.message);
          showSnackbar('Fehler beim Laden der Rechnung', 'error');
          return;
        }
      } else {
        console.error('API-Fehler beim Laden der Rechnungsdetails');
        showSnackbar('Fehler beim Laden der Rechnung', 'error');
        return;
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      showSnackbar('Fehler beim Laden der Rechnung', 'error');
      return;
    }
    
    // Lade Produkte sofort für den Edit-Dialog
    loadProducts();
    setEditDialogOpen(true);
  };

  const saveInvoiceChanges = async () => {
    if (!editInvoice) return;

    setEditSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoices/${editInvoice._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editInvoice)
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar('Rechnung erfolgreich aktualisiert', 'success');
        setEditDialogOpen(false);
        setEditInvoice(null);
        loadInvoices();
        loadStats();
      } else {
        showSnackbar(data.message || 'Fehler beim Speichern', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Rechnung:', error);
      showSnackbar('Fehler beim Speichern der Rechnung', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const addItemToEditInvoice = () => {
    if (!newItem.productData?.name || newItem.unitPrice <= 0 || newItem.quantity <= 0) {
      showSnackbar('Bitte alle erforderlichen Felder ausfüllen', 'error');
      return;
    }

    setEditInvoice(prev => ({
      ...prev,
      items: [...(prev.items || []), { ...newItem }]
    }));

    setNewItem({
      productData: { name: '', description: '', sku: '' },
      quantity: 1,
      unitPrice: 0
    });
    showSnackbar('Artikel hinzugefügt', 'success');
  };

  const removeItemFromEditInvoice = (index) => {
    setEditInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemInEditInvoice = (index, field, value) => {
    setEditInvoice(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = field.split('.');
      let obj = updated.items[index];

      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }

      obj[keys[keys.length - 1]] = field.includes('quantity') || field.includes('Price') 
        ? parseFloat(value) 
        : value;

      return updated;
    });
  };

  const handleEditFieldChange = (path, value) => {
    setEditInvoice(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditInvoice(null);
    setNewItem({
      productData: { name: '', description: '', sku: '' },
      quantity: 1,
      unitPrice: 0
    });
    setEditingItemIndex(null);
  };

  const addProductFromDialog = (product) => {
    // Prüfe ob Produkt bereits existiert
    const existingItem = editInvoice?.items?.find(item => 
      item.productId === product._id
    );

    if (existingItem) {
      // Erhöhe die Menge um 1
      setEditInvoice(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.productId === product._id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      }));
    } else {
      // Füge neues Produkt hinzu
      const newProductItem = {
        productId: product._id,
        productData: {
          name: product.name,
          description: product.beschreibung?.kurz || product.beschreibung?.lang || product.beschreibung || '',
          sku: product.sku || ''
        },
        quantity: 1,
        unitPrice: product.preis || 0
      };
      setEditInvoice(prev => ({
        ...prev,
        items: [...prev.items, newProductItem]
      }));
    }

    showSnackbar(`${product.name} hinzugefügt`, 'success');
  };

  const openActionMenu = (event, invoice) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuInvoice(invoice);
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    setActionMenuInvoice(null);
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
                {invoices.map((invoice, _index) => (
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
                          label={getStatusText(invoice)}
                          color={getStatusColor(invoice)}
                        />
                      </Box>
                      
                      {/* Kunde */}
                      <Typography variant="body2" color="textSecondary" mb={1}>
                        {invoice.customerName || 'Unbekannt'}
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
                    <TableCell>Bezahlstatus</TableCell>
                    <TableCell>Fälligkeitsdatum</TableCell>
                    <TableCell align="center">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography>Lade Rechnungen...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
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
                            {invoice.customerName || 'Unbekannt'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {invoice.customerEmail || ''}
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
                            label={getStatusText(invoice)}
                            color={getStatusColor(invoice)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getPaymentStatusText(invoice)}
                            color={getPaymentStatusColor(invoice)}
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
          openEditDialog(actionMenuInvoice);
          closeActionMenu();
        }}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          Bearbeiten
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
        {actionMenuInvoice && 
         !(actionMenuInvoice.payment && (actionMenuInvoice.payment.status === 'paid' || actionMenuInvoice.payment.paidDate)) && 
         actionMenuInvoice.status !== 'paid' && (
          <MenuItem onClick={() => {
            markAsPaid(actionMenuInvoice._id);
            closeActionMenu();
          }} sx={{ color: 'success.main' }}>
            <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
            Als bezahlt markieren
          </MenuItem>
        )}
        {actionMenuInvoice && 
         (actionMenuInvoice.payment && (actionMenuInvoice.payment.status === 'paid' || actionMenuInvoice.payment.paidDate) || 
         actionMenuInvoice.status === 'paid') && (
          <MenuItem onClick={() => {
            markAsUnpaid(actionMenuInvoice._id);
            closeActionMenu();
          }} sx={{ color: 'warning.main' }}>
            <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
            Als unbezahlt markieren
          </MenuItem>
        )}
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
          pb: isMobile ? 1 : 2,
          fontSize: isMobile ? '1.25rem' : '1.5rem'
        }}>
          Rechnung {selectedInvoice?.invoiceNumber}
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
                  {selectedInvoice.customerName || 'Unbekannt'}
                </Typography>
                <Typography variant="body2">
                  {selectedInvoice.customer?.customerData?.street || ''}
                </Typography>
                <Typography variant="body2">
                  {selectedInvoice.customer?.customerData?.postalCode || ''} {selectedInvoice.customer?.customerData?.city || ''}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Details:</Typography>
                <Typography variant="body2">
                  Datum: {selectedInvoice.dates?.invoiceDate ? 
                    formatDate(selectedInvoice.dates.invoiceDate) : 
                    (selectedInvoice.invoiceDate ? formatDate(selectedInvoice.invoiceDate) : 'Kein Datum')
                  }
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2">Status:</Typography>
                  <Chip
                    size="small"
                    label={getStatusText(selectedInvoice)}
                    color={getStatusColor(selectedInvoice)}
                  />
                </Box>
                <Typography variant="body2">
                  Betrag: {(selectedInvoice.amounts?.total || selectedInvoice.totalAmount)?.toFixed(2)}€
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
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.productData?.name || item.name || 'Unbekannt'}
                            {item.productData?.description && (
                              <Typography variant="caption" display="block" color="textSecondary">
                                {item.productData.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity || '-'}</TableCell>
                          <TableCell>{(item.unitPrice || 0)?.toFixed(2)}€</TableCell>
                          <TableCell>{(item.total || (item.quantity * item.unitPrice) || 0)?.toFixed(2)}€</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="textSecondary">Keine Artikel verfügbar</Typography>
                        </TableCell>
                      </TableRow>
                    )}
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
          {selectedInvoice && 
           !(selectedInvoice.payment && (selectedInvoice.payment.status === 'paid' || selectedInvoice.payment.paidDate)) && 
           selectedInvoice.status !== 'paid' && (
            <Button 
              variant="contained"
              color="success"
              size={isMobile ? "large" : "medium"}
              fullWidth={isMobile}
              startIcon={<CheckCircleIcon />}
              onClick={() => markAsPaid(selectedInvoice._id)}
              sx={{ mr: isMobile ? 0 : 1 }}
            >
              Als bezahlt markieren
            </Button>
          )}
          {selectedInvoice && 
           (selectedInvoice.payment && (selectedInvoice.payment.status === 'paid' || selectedInvoice.payment.paidDate) || 
           selectedInvoice.status === 'paid') && (
            <Button 
              variant="contained"
              color="warning"
              size={isMobile ? "large" : "medium"}
              fullWidth={isMobile}
              startIcon={<CheckCircleIcon />}
              onClick={() => markAsUnpaid(selectedInvoice._id)}
              sx={{ mr: isMobile ? 0 : 1 }}
            >
              Als unbezahlt markieren
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

      {/* Bearbeitungs-Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={closeEditDialog}
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
          pb: isMobile ? 1 : 2,
          fontSize: isMobile ? '1.25rem' : '1.5rem'
        }}>
          Rechnung {editInvoice?.invoiceNumber} bearbeiten
          {isMobile && (
            <IconButton 
              onClick={closeEditDialog}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
          {editInvoice && (
            <Grid container spacing={isMobile ? 2 : 3} sx={{ mt: 0.5 }}>
              {/* Kundendaten */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Kundendaten</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vorname"
                  size="small"
                  value={editInvoice.customer?.customerData?.firstName || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.firstName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nachname"
                  size="small"
                  value={editInvoice.customer?.customerData?.lastName || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.lastName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Firma"
                  size="small"
                  value={editInvoice.customer?.customerData?.company || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.company', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Straße"
                  size="small"
                  value={editInvoice.customer?.customerData?.street || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.street', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postleitzahl"
                  size="small"
                  value={editInvoice.customer?.customerData?.postalCode || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.postalCode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stadt"
                  size="small"
                  value={editInvoice.customer?.customerData?.city || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="E-Mail"
                  size="small"
                  type="email"
                  value={editInvoice.customer?.customerData?.email || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  size="small"
                  value={editInvoice.customer?.customerData?.phone || ''}
                  onChange={(e) => handleEditFieldChange('customer.customerData.phone', e.target.value)}
                />
              </Grid>

              {/* Rechnungsdaten */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Rechnungsdaten</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Rechnungsdatum"
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editInvoice.dates?.invoiceDate ? new Date(editInvoice.dates.invoiceDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleEditFieldChange('dates.invoiceDate', new Date(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fälligkeitsdatum"
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editInvoice.dates?.dueDate ? new Date(editInvoice.dates.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleEditFieldChange('dates.dueDate', new Date(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Lieferdatum"
                  size="small"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editInvoice.dates?.deliveryDate ? new Date(editInvoice.dates.deliveryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleEditFieldChange('dates.deliveryDate', new Date(e.target.value))}
                />
              </Grid>

              {/* Artikel/Produkte */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Bestellte Artikel</Typography>
              </Grid>

              {/* Artikel-Tabelle */}
              <Grid item xs={12}>
                <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
                  <Table size="small" sx={{ minWidth: 500 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                        <TableCell sx={{ fontWeight: 700, width: '35%' }}><strong>Produktname</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}><strong>Menge</strong></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: '20%' }}><strong>Einzelpreis</strong></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: '20%' }}><strong>Gesamt</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: '10%' }}><strong>Aktion</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editInvoice.items && editInvoice.items.length > 0 ? (
                        editInvoice.items.map((item, index) => (
                          <TableRow key={index} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell>
                              <Box sx={{ py: 1 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Produktname"
                                  value={item.productData?.name || ''}
                                  onChange={(e) => updateItemInEditInvoice(index, 'productData.name', e.target.value)}
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Beschreibung"
                                  value={item.productData?.description || ''}
                                  onChange={(e) => updateItemInEditInvoice(index, 'productData.description', e.target.value)}
                                  variant="outlined"
                                  multiline
                                  rows={2}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ step: '1', min: '1' }}
                                value={item.quantity || 1}
                                onChange={(e) => updateItemInEditInvoice(index, 'quantity', e.target.value)}
                                variant="outlined"
                                sx={{ width: '70px' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ step: '0.01', min: '0' }}
                                value={item.unitPrice || 0}
                                onChange={(e) => updateItemInEditInvoice(index, 'unitPrice', e.target.value)}
                                variant="outlined"
                                sx={{ width: '100px' }}
                                InputProps={{ endAdornment: '€' }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: '#1976d2' }}>
                              {((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}€
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeItemFromEditInvoice(index)}
                                title="Artikel entfernen"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography color="textSecondary">Keine Artikel vorhanden</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Artikel hinzufügen */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, backgroundColor: '#e8f5e9', border: '2px solid #81c784' }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, mb: 3, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                    📦 <span>Neuen Artikel hinzufügen</span>
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Produktauswahl via Katalog */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          🔍 <span>Option 1: Aus Katalog wählen (Empfohlen)</span>
                        </Typography>
                      </Box>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<SearchIcon />}
                        onClick={() => {
                          setProductSearchDialogOpen(true);
                          if (products.length === 0) {
                            loadProducts();
                          }
                        }}
                        sx={{
                          py: 1.5,
                          fontWeight: 600,
                          backgroundColor: '#ffffff'
                        }}
                      >
                        Produktkatalog durchsuchen
                      </Button>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#1976d2', fontWeight: 500 }}>
                        ✓ Kategorien, Suche und inaktive Produkte verfügbar
                      </Typography>
                    </Grid>

                    {/* Oder Trennlinie */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                        <Box sx={{ flex: 1, height: 2, backgroundColor: '#c8e6c9' }} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>ODER</Typography>
                        <Box sx={{ flex: 1, height: 2, backgroundColor: '#c8e6c9' }} />
                      </Box>
                    </Grid>

                    {/* Manuelles Hinzufügen */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          ✏️ <span>Option 2: Manuell eingeben</span>
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Produktname *"
                        placeholder="z.B. Spezial-Seife"
                        value={newItem.productData?.name || ''}
                        onChange={(e) => setNewItem(prev => ({
                          ...prev,
                          productData: { ...prev.productData, name: e.target.value }
                        }))}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Beschreibung (optional)"
                        placeholder="z.B. 100g Bio-Seife"
                        value={newItem.productData?.description || ''}
                        onChange={(e) => setNewItem(prev => ({
                          ...prev,
                          productData: { ...prev.productData, description: e.target.value }
                        }))}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Einzelpreis (€) *"
                        placeholder="0.00"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem(prev => ({
                          ...prev,
                          unitPrice: parseFloat(e.target.value) || 0
                        }))}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        onClick={addItemToEditInvoice}
                        sx={{ fontWeight: 600, py: 1.5 }}
                      >
                        ➕ Hinzufügen
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Beträge */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Beträge</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Versandkosten"
                  size="small"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={editInvoice.amounts?.shippingCost || 0}
                  onChange={(e) => handleEditFieldChange('amounts.shippingCost', parseFloat(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="MwSt-Rate (%)"
                  size="small"
                  type="number"
                  inputProps={{ step: '1', min: '0', max: '100' }}
                  value={editInvoice.amounts?.vatRate !== undefined ? editInvoice.amounts.vatRate : 19}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleEditFieldChange('amounts.vatRate', isNaN(val) ? 0 : val);
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editInvoice.amounts?.displayVat !== false}
                      onChange={(e) => handleEditFieldChange('amounts.displayVat', e.target.checked)}
                    />
                  }
                  label="Steuern auf Rechnung ausweisen"
                />
              </Grid>

              {/* Notizen */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Notizen</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Interne Notizen"
                  size="small"
                  multiline
                  rows={3}
                  value={editInvoice.notes?.internal || ''}
                  onChange={(e) => handleEditFieldChange('notes.internal', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notizen für Kunden"
                  size="small"
                  multiline
                  rows={3}
                  value={editInvoice.notes?.customer || ''}
                  onChange={(e) => handleEditFieldChange('notes.customer', e.target.value)}
                />
              </Grid>

              {/* Zahlungsinformationen */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Zahlungsinformationen</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Zahlungsart</InputLabel>
                  <Select
                    label="Zahlungsart"
                    value={editInvoice.payment?.method || 'pending'}
                    onChange={(e) => handleEditFieldChange('payment.method', e.target.value)}
                  >
                    <MenuItem value="pending">Ausstehend</MenuItem>
                    <MenuItem value="bar">Bar</MenuItem>
                    <MenuItem value="bank_transfer">Banküberweisung</MenuItem>
                    <MenuItem value="paypal">PayPal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Zahlungsreferenz"
                  size="small"
                  value={editInvoice.payment?.paymentReference || ''}
                  onChange={(e) => handleEditFieldChange('payment.paymentReference', e.target.value)}
                />
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
            <Button onClick={closeEditDialog}>
              Abbrechen
            </Button>
          )}
          <Button 
            variant="contained"
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
            onClick={saveInvoiceChanges}
            disabled={editSaving}
          >
            {editSaving ? 'Speichert...' : 'Speichern'}
          </Button>
          {isMobile && (
            <Button 
              onClick={closeEditDialog}
              size="large"
              fullWidth
            >
              Abbrechen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Produktkatalog Dialog */}
      <Dialog
        open={productSearchDialogOpen}
        onClose={() => setProductSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            <Typography variant="h6">📦 Produktkatalog</Typography>
          </Box>
          {isMobile && (
            <IconButton onClick={() => setProductSearchDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <ProductCatalog
            products={products}
            isLoadingProducts={isLoadingProducts}
            onProductSelect={addProductFromDialog}
            isMobile={isMobile}
            isSmallMobile={isMobile}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => setProductSearchDialogOpen(false)} variant="outlined">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Bestätigungsdialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Rechnung löschen
        </DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie die folgende Rechnung löschen möchten?
          </Typography>
          {invoiceToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography><strong>Rechnungsnummer:</strong> {invoiceToDelete.invoiceNumber}</Typography>
              <Typography><strong>Kunde:</strong> {invoiceToDelete.customer.name}</Typography>
              <Typography><strong>Betrag:</strong> {invoiceToDelete.amounts.total.toFixed(2)}€</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography><strong>Status:</strong></Typography>
                <Chip
                  label={getStatusText(invoiceToDelete)}
                  color={getStatusColor(invoiceToDelete)}
                  size="small"
                />
              </Box>
              {invoiceToDelete.status !== 'draft' && (
                <Typography color="warning.main" sx={{ mt: 1 }}>
                  <strong>⚠️ Warnung:</strong> Diese Rechnung ist kein Entwurf mehr. Das Löschen kann rechtliche Auswirkungen haben.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Löschen
          </Button>
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