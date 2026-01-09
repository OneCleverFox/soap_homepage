import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Autocomplete,
  Snackbar,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  }
}));

const CreateInvoice = () => {
  // Responsive Detection
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State Management
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Rechnung Daten
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    company: '',
    street: '',
    postalCode: '',
    city: '',
    email: '',
    phone: ''
  });
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [notes, setNotes] = useState({ internal: '', customer: '' });
  const [sendEmail, setSendEmail] = useState(true); // Toggle für E-Mail-Versand
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Lade initiale Daten
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [FRONTEND] useEffect wird ausgeführt');
    }
    loadCustomers();
    loadProducts();
    loadTemplates();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/kunden`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    }
  };

  const loadProducts = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [FRONTEND] Lade Produkte...');
    }
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [FRONTEND] Sende Request an /api/admin/products');
      }
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('🔍 [FRONTEND] Response Status:', response.status);
      console.log('🔍 [FRONTEND] Response OK:', response.ok);
      
      if (!response.ok) {
        console.error('🔍 [FRONTEND] Response nicht OK:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('🔍 [FRONTEND] Response Data:', data);
      if (data.success) {
        console.log('🔍 [FRONTEND] Setze Produkte:', data.data?.length || 0);
        setProducts(data.data || []);
      } else {
        console.error('🔍 [FRONTEND] API Fehler:', data);
      }
    } catch (error) {
      console.error('🔍 [FRONTEND] Netzwerk Fehler beim Laden der Produkte:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoice/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
        // Standard-Template auswählen
        const defaultTemplate = data.data.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate._id);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    }
  };

  const addProduct = (product) => {
    const existingItem = invoiceItems.find(item => 
      item.productId === product._id
    );

    // Beschreibung sicher als String extrahieren
    let description = '';
    if (product.beschreibung) {
      if (typeof product.beschreibung === 'string') {
        description = product.beschreibung;
      } else if (typeof product.beschreibung === 'object') {
        // Wenn beschreibung ein Objekt ist, verwende den 'kurz' Text oder kombiniere die Felder
        description = product.beschreibung.kurz || 
                     product.beschreibung.lang || 
                     `${product.beschreibung.kurz || ''} ${product.beschreibung.lang || ''}`.trim() ||
                     'Handgefertigte Seife';
      }
    }
    
    // Beschreibung auf ca. 120 Zeichen begrenzen für professionelle Optik
    if (description.length > 120) {
      description = description.substring(0, 117) + '...';
    }

    if (existingItem) {
      setInvoiceItems(items => 
        items.map(item => 
          item.productId === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem = {
        productId: product._id,
        name: product.name,
        description: description,
        sku: product.sku || '',
        category: product.kategorie || '',
        quantity: 1,
        unitPrice: product.preis || 0
      };
      setInvoiceItems(prev => [...prev, newItem]);
    }
    setProductSearchOpen(false);
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, quantity: parseInt(quantity) } : item
      )
    );
  };

  const updateItemPrice = (index, price) => {
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, unitPrice: parseFloat(price) || 0 } : item
      )
    );
  };

  const removeItem = (index) => {
    setInvoiceItems(items => items.filter((_, i) => i !== index));
  };

  const addCustomProduct = () => {
    const newItem = {
      productId: null,
      name: 'Neues Produkt',
      description: '',
      sku: '',
      category: '',
      quantity: 1,
      unitPrice: 0
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  const updateCustomProduct = (index, field, value) => {
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Berechnungen
  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(shippingCost) || 0;
    
    // Hier könnte VAT-Berechnung basierend auf Template-Einstellungen erfolgen
    return subtotal + shipping;
  };

  const createInvoice = async () => {
    // Validierung
    if (invoiceItems.length === 0) {
      showSnackbar('Mindestens ein Artikel muss hinzugefügt werden', 'error');
      return;
    }

    if (!useNewCustomer && !selectedCustomer) {
      showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
      return;
    }

    // Validierung abhängig von Kundenwahl
    if (useNewCustomer) {
      if (!newCustomer.street || !newCustomer.postalCode || !newCustomer.city) {
        showSnackbar('Bitte füllen Sie alle Pflichtfelder für den neuen Kunden aus', 'error');
        return;
      }
    } else {
      if (!selectedCustomer) {
        showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
        return;
      }
      
      // Prüfung der Kundendaten auf Vollständigkeit
      if (!selectedCustomer.adresse?.strasse || !selectedCustomer.adresse?.plz || !selectedCustomer.adresse?.stadt) {
        showSnackbar('Gewählter Kunde hat unvollständige Adressdaten', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const invoiceData = {
        customerId: useNewCustomer ? null : selectedCustomer?._id,
        customerData: useNewCustomer ? {
          salutation: newCustomer.salutation || 'Herr',
          firstName: newCustomer.firstName || '',
          lastName: newCustomer.lastName || '',
          company: newCustomer.company || '',
          street: newCustomer.street,
          postalCode: newCustomer.postalCode,
          city: newCustomer.city,
          country: newCustomer.country || 'Deutschland',
          email: newCustomer.email || '',
          phone: newCustomer.phone || ''
        } : {
          salutation: selectedCustomer?.anrede || 'Herr',
          firstName: selectedCustomer?.vorname || '',
          lastName: selectedCustomer?.nachname || '',
          company: selectedCustomer?.firma || '',
          street: selectedCustomer?.adresse?.strasse || '',
          postalCode: selectedCustomer?.adresse?.plz || '',
          city: selectedCustomer?.adresse?.stadt || '',
          country: selectedCustomer?.adresse?.land || 'Deutschland',
          email: selectedCustomer?.email || '',
          phone: selectedCustomer?.telefon || ''
        },
        items: invoiceItems.map(item => ({
          productId: item.productId,
          name: item.name,
          description: item.description,
          sku: item.sku,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        shippingCost: parseFloat(shippingCost) || 0,
        templateId: selectedTemplate,
        notes,
        sendEmailToCustomer: sendEmail && (useNewCustomer ? newCustomer.email : selectedCustomer?.email) // E-Mail nur wenn Toggle aktiv und E-Mail vorhanden
      };

      const response = await fetch(`${API_BASE_URL}/admin/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar(`Rechnung ${result.data.invoiceNumber} erfolgreich erstellt!`, 'success');
        // Formular zurücksetzen
        resetForm();
      } else {
        showSnackbar(result.message || 'Fehler beim Erstellen der Rechnung', 'error');
      }

    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      showSnackbar('Fehler beim Erstellen der Rechnung', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setUseNewCustomer(false);
    setNewCustomer({
      salutation: 'Herr',
      firstName: '',
      lastName: '',
      company: '',
      street: '',
      postalCode: '',
      city: '',
      email: '',
      phone: ''
    });
    setInvoiceItems([]);
    setShippingCost(0);
    setNotes({ internal: '', customer: '' });
    setSendEmail(true); // E-Mail-Toggle zurücksetzen
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <Box sx={{ 
      maxWidth: '100vw', 
      margin: 'auto', 
      padding: isMobile ? 1 : 2,
      pb: isMobile ? 4 : 2,
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        gutterBottom
        sx={{ 
          mb: isMobile ? 2 : 3,
          fontSize: isMobile ? '1.5rem' : '2.125rem'
        }}
      >
        <ReceiptIcon sx={{ 
          mr: isMobile ? 1 : 2, 
          verticalAlign: 'middle',
          fontSize: isMobile ? '1.5rem' : '2rem'
        }} />
        Rechnung erstellen
      </Typography>

      {/* Kunde auswählen */}
      <StyledPaper>
        <Box sx={{ p: isMobile ? 2 : 0 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0,
            mb: isMobile ? 2 : 3
          }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h2">
              1. Kunde auswählen
            </Typography>
            <Button
              variant={useNewCustomer ? 'contained' : 'outlined'}
              onClick={() => setUseNewCustomer(!useNewCustomer)}
              startIcon={<PersonIcon />}
              size={isMobile ? "medium" : "small"}
              sx={{ 
                alignSelf: isMobile ? 'flex-end' : 'auto',
                minWidth: isMobile ? 140 : 'auto' 
              }}
            >
              {useNewCustomer ? (isMobile ? 'Bestehend' : 'Bestehender Kunde') : (isMobile ? 'Neu' : 'Neuer Kunde')}
            </Button>
          </Box>
        </Box>
        <CardContent sx={{ pt: isMobile ? 0 : 2 }}>
          {!useNewCustomer ? (
            <Autocomplete
              options={customers}
              getOptionLabel={(customer) => 
                `${customer.firma || `${customer.vorname} ${customer.nachname}`} (${customer.adresse?.ort || 'Unbekannt'})`
              }
              isOptionEqualToValue={(option, value) => option._id === value._id}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Kunde suchen..."
                  placeholder="Name, Firma oder Ort eingeben"
                  variant="outlined"
                />
              )}
            />
          ) : (
            <Grid container spacing={isSmallMobile ? 1 : 2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Anrede</InputLabel>
                  <Select
                    value={newCustomer.salutation}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, salutation: e.target.value }))}
                  >
                    <MenuItem value="Herr">Herr</MenuItem>
                    <MenuItem value="Frau">Frau</MenuItem>
                    <MenuItem value="Firma">Firma</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  fullWidth
                  label="Vorname"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Nachname"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Firma (optional)"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Straße und Hausnummer"
                  value={newCustomer.street}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, street: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  fullWidth
                  required
                  label="PLZ"
                  value={newCustomer.postalCode}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, postalCode: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={8} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Ort"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="E-Mail"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </StyledPaper>

      {/* Artikel hinzufügen */}
      <StyledPaper>
        <Box sx={{ p: isMobile ? 2 : 0 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexDirection: 'column',
            gap: isMobile ? 2 : 3,
            mb: isMobile ? 2 : 3
          }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h2">
              2. Artikel hinzufügen
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              width: '100%',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setProductSearchOpen(true)}
                size="medium"
                fullWidth={isMobile}
                sx={{ fontSize: '0.9rem' }}
              >
                Produkt suchen
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addCustomProduct}
                size="medium"
                fullWidth={isMobile}
                sx={{ fontSize: '0.9rem' }}
              >
                Eigenes Produkt
              </Button>
            </Box>
          </Box>
        </Box>
        <CardContent sx={{ pt: 0 }}>
          {!isMobile ? (
            // Desktop Tabellen-Ansicht
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Artikel</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell width={100}>Menge</TableCell>
                    <TableCell width={120}>Einzelpreis</TableCell>
                    <TableCell width={120}>Gesamtpreis</TableCell>
                    <TableCell width={60}>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.productId ? (
                          <Box>
                            <Typography variant="subtitle2">{item.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              SKU: {item.sku}
                            </Typography>
                          </Box>
                        ) : (
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={(e) => updateCustomProduct(index, 'name', e.target.value)}
                            placeholder="Produktname"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.productId ? (
                          <Typography variant="body2">{item.description}</Typography>
                        ) : (
                          <TextField
                            size="small"
                            multiline
                            rows={2}
                            value={item.description}
                            onChange={(e) => updateCustomProduct(index, 'description', e.target.value)}
                            placeholder="Beschreibung"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, e.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          inputProps={{ step: 0.01, min: 0 }}
                          InputProps={{ endAdornment: '€' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {(item.quantity * item.unitPrice).toFixed(2)}€
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoiceItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Noch keine Artikel hinzugefügt
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // Mobile Karten-Ansicht
            <Box>
              {invoiceItems.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  Noch keine Artikel hinzugefügt
                </Typography>
              ) : (
                invoiceItems.map((item, index) => (
                  <Card 
                    key={index} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      background: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          {item.productId ? (
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                SKU: {item.sku}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              value={item.name}
                              onChange={(e) => updateCustomProduct(index, 'name', e.target.value)}
                              placeholder="Produktname"
                              sx={{ mb: 1 }}
                            />
                          )}
                        </Box>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(index)}
                          size="large"
                          sx={{ 
                            minWidth: 44,
                            minHeight: 44
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      {item.productId ? (
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          {item.description}
                        </Typography>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateCustomProduct(index, 'description', e.target.value)}
                          placeholder="Beschreibung"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Menge
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, e.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Einzelpreis
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          inputProps={{ step: 0.01, min: 0 }}
                          InputProps={{ endAdornment: '€' }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Gesamtpreis
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {(item.quantity * item.unitPrice).toFixed(2)}€
                        </Typography>
                      </Grid>
                    </Grid>
                  </Card>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </StyledPaper>

      {/* Summen und Optionen */}
      <Grid container spacing={2}>
        {/* Mobile: Zusammenfassung zuerst */}
        <Grid item xs={12} md={4} order={{ xs: 1, md: 2 }}>
          <StyledPaper>
            <CardHeader title="Zusammenfassung" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Zwischensumme: {calculateSubtotal().toFixed(2)}€
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Versandkosten: {parseFloat(shippingCost || 0).toFixed(2)}€
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  Gesamtsumme: {calculateTotal().toFixed(2)}€
                </Typography>
              </Box>
              
              {/* E-Mail Versand Toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: isMobile ? 'wrap' : 'nowrap'
                    }}>
                      <span>📧 E-Mail an Kunde senden</span>
                      {(useNewCustomer ? newCustomer.email : selectedCustomer?.email) && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            wordBreak: isMobile ? 'break-all' : 'normal',
                            fontSize: isMobile ? '0.7rem' : '0.75rem'
                          }}
                        >
                          ({useNewCustomer ? newCustomer.email : selectedCustomer?.email})
                        </Typography>
                      )}
                    </Box>
                  }
                  disabled={!(useNewCustomer ? newCustomer.email : selectedCustomer?.email)}
                />
                {!(useNewCustomer ? newCustomer.email : selectedCustomer?.email) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Keine E-Mail-Adresse für den ausgewählten Kunden vorhanden
                  </Typography>
                )}
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={createInvoice}
                disabled={saving || invoiceItems.length === 0}
                startIcon={<ReceiptIcon />}
                sx={{ 
                  minHeight: isMobile ? 56 : 'auto',
                  fontSize: isMobile ? '1.1rem' : '1rem'
                }}
              >
                {saving ? 'Erstelle Rechnung...' : 'Rechnung erstellen'}
              </Button>
            </CardContent>
          </StyledPaper>
        </Grid>

        {/* Mobile: Optionen danach */}
        <Grid item xs={12} md={8} order={{ xs: 2, md: 1 }}>
          <StyledPaper>
            <CardHeader title="3. Zusätzliche Optionen" />
            <CardContent>
              <Grid container spacing={isSmallMobile ? 1 : 2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Versandkosten"
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    inputProps={{ step: 0.01, min: 0 }}
                    InputProps={{ endAdornment: '€' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rechnungsvorlage</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      {templates.map(template => (
                        <MenuItem key={template._id} value={template._id}>
                          {template.name} {template.isDefault && '(Standard)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 3}
                    label="Notizen für Kunde (erscheint auf der Rechnung)"
                    value={notes.customer}
                    onChange={(e) => setNotes(prev => ({ ...prev, customer: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 2}
                    label="Interne Notizen (nicht sichtbar für Kunde)"
                    value={notes.internal}
                    onChange={(e) => setNotes(prev => ({ ...prev, internal: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Produkt-Auswahl Dialog */}
      <Dialog 
        open={productSearchOpen} 
        onClose={() => setProductSearchOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Produkt auswählen</Typography>
            {isSmallMobile && (
              <IconButton onClick={() => setProductSearchOpen(false)}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {console.log('🔍 [FRONTEND] Dialog Content - Produkte:', products.length)}
          <Grid container spacing={isSmallMobile ? 1 : 2}>
            {products.length === 0 ? (
              <Grid item xs={12}>
                <Typography align="center" sx={{ py: 4 }}>
                  Keine Produkte verfügbar
                </Typography>
              </Grid>
            ) : products.map(product => (
              <Grid item xs={12} sm={6} md={4} key={product._id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer', 
                    '&:hover': { boxShadow: 4 },
                    minHeight: isMobile ? 'auto' : 120
                  }}
                  onClick={() => addProduct(product)}
                >
                  <CardContent sx={{ p: isSmallMobile ? 2 : 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      gutterBottom
                      sx={{ 
                        fontSize: isSmallMobile ? '1rem' : '0.875rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="primary"
                      sx={{ 
                        fontSize: isSmallMobile ? '1.1rem' : '0.875rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {product.preis?.toFixed(2)}€
                    </Typography>
                    <Typography 
                      variant="caption" 
                      display="block"
                      color="textSecondary"
                      sx={{ fontSize: isSmallMobile ? '0.8rem' : '0.75rem' }}
                    >
                      {product.kategorie}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductSearchOpen(false)}>
            Schließen
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

export default CreateInvoice;