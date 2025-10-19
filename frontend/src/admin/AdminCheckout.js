import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Button,
  TextField,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Step,
  Stepper,
  StepLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';

const AdminCheckout = () => {
  const { items, totalPrice, clearCart } = useCart();
  
  // States für Kunden
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerDialog, setCustomerDialog] = useState(false);
  
  // States für neue Kundendaten
  const [newCustomer, setNewCustomer] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    strasse: '',
    hausnummer: '',
    plz: '',
    stadt: '',
    land: 'Deutschland'
  });
  
  // States für Bestellung
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [useExistingCustomer, setUseExistingCustomer] = useState(true);
  
  const steps = ['Warenkorb', 'Kunde auswählen', 'Bestellung bestätigen'];

  useEffect(() => {
    if (items.length === 0) {
      setError('Der Warenkorb ist leer. Bitte fügen Sie Artikel hinzu.');
    } else {
      setError('');
    }
  }, [items]);

  // Kunden suchen
  const searchCustomers = async (searchValue) => {
    if (!searchValue || searchValue.length < 2) {
      setCustomers([]);
      return;
    }

    try {
      const response = await fetch(`/api/kunden/search?query=${encodeURIComponent(searchValue)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Suchen der Kunden:', error);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Bestellung erstellen
  const createOrder = async () => {
    if (!selectedCustomer && useExistingCustomer) {
      setError('Bitte wählen Sie einen Kunden aus oder erstellen Sie einen neuen.');
      return;
    }

    if (!useExistingCustomer && (!newCustomer.vorname || !newCustomer.nachname || !newCustomer.email)) {
      setError('Bitte füllen Sie alle Pflichtfelder für den neuen Kunden aus.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Artikel für die Bestellung vorbereiten
      const orderItems = items.map(item => ({
        produktType: item.type || 'portfolio',
        produktId: item._id || item.id,
        produktSnapshot: {
          name: item.name,
          beschreibung: item.beschreibung || '',
          kategorie: item.kategorie || '',
          bild: item.bild
        },
        menge: item.quantity,
        einzelpreis: item.preis,
        gesamtpreis: item.preis * item.quantity
      }));

      // Besteller-Daten
      const besteller = useExistingCustomer ? {
        kundennummer: selectedCustomer.kundennummer,
        vorname: selectedCustomer.vorname,
        nachname: selectedCustomer.nachname,
        email: selectedCustomer.email,
        telefon: selectedCustomer.telefon
      } : {
        vorname: newCustomer.vorname,
        nachname: newCustomer.nachname,
        email: newCustomer.email,
        telefon: newCustomer.telefon
      };

      // Adressdaten
      const adresse = useExistingCustomer ? {
        strasse: selectedCustomer.adresse?.strasse || '',
        hausnummer: selectedCustomer.adresse?.hausnummer || '',
        plz: selectedCustomer.adresse?.plz || '',
        stadt: selectedCustomer.adresse?.stadt || '',
        land: selectedCustomer.adresse?.land || 'Deutschland'
      } : {
        strasse: newCustomer.strasse,
        hausnummer: newCustomer.hausnummer,
        plz: newCustomer.plz,
        stadt: newCustomer.stadt,
        land: newCustomer.land
      };

      const orderData = {
        besteller,
        rechnungsadresse: adresse,
        lieferadresse: { verwendeRechnungsadresse: true },
        artikel: orderItems,
        zahlung: { methode: 'admin_bestellung' },
        versand: { methode: 'standard' },
        notizen: { admin: 'Admin-Bestellung erstellt' },
        quelle: 'admin'
      };

      const response = await fetch('/api/order/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Bestellung ${result.data.bestellnummer} erfolgreich erstellt!`);
        clearCart();
        setActiveStep(2);
      } else {
        setError(result.message || 'Fehler beim Erstellen der Bestellung');
      }

    } catch (error) {
      console.error('Fehler beim Erstellen der Bestellung:', error);
      setError('Fehler beim Erstellen der Bestellung: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🛒 Warenkorb-Übersicht
              </Typography>
              {items.length === 0 ? (
                <Alert severity="warning">Der Warenkorb ist leer.</Alert>
              ) : (
                <>
                  <List>
                    {items.map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={item.name}
                          secondary={`${item.quantity}x à ${item.preis?.toFixed(2)}€ = ${(item.preis * item.quantity).toFixed(2)}€`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" align="right">
                    Gesamtsumme: {totalPrice.toFixed(2)}€
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👤 Kunde auswählen
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useExistingCustomer}
                    onChange={(e) => setUseExistingCustomer(e.target.checked)}
                  />
                }
                label="Bestehenden Kunden verwenden"
                sx={{ mb: 2 }}
              />

              {useExistingCustomer ? (
                <Box>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(customer) => 
                      `${customer.vorname} ${customer.nachname} (${customer.email})`
                    }
                    value={selectedCustomer}
                    onChange={(event, newValue) => setSelectedCustomer(newValue)}
                    inputValue={searchTerm}
                    onInputChange={(event, newInputValue) => setSearchTerm(newInputValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Kunde suchen..."
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <SearchIcon />,
                        }}
                      />
                    )}
                    renderOption={(props, customer) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="subtitle2">
                            {customer.vorname} {customer.nachname}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.email} | Kd.Nr.: {customer.kundennummer}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Box>
              ) : (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vorname *"
                      value={newCustomer.vorname}
                      onChange={(e) => setNewCustomer({...newCustomer, vorname: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nachname *"
                      value={newCustomer.nachname}
                      onChange={(e) => setNewCustomer({...newCustomer, nachname: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-Mail *"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefon"
                      value={newCustomer.telefon}
                      onChange={(e) => setNewCustomer({...newCustomer, telefon: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Straße"
                      value={newCustomer.strasse}
                      onChange={(e) => setNewCustomer({...newCustomer, strasse: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Nr."
                      value={newCustomer.hausnummer}
                      onChange={(e) => setNewCustomer({...newCustomer, hausnummer: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PLZ"
                      value={newCustomer.plz}
                      onChange={(e) => setNewCustomer({...newCustomer, plz: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Stadt"
                      value={newCustomer.stadt}
                      onChange={(e) => setNewCustomer({...newCustomer, stadt: e.target.value})}
                    />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                <CheckIcon color="success" sx={{ mr: 1 }} />
                Bestellung erfolgreich erstellt!
              </Typography>
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        🛒 Admin-Bestellung erstellen
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {getStepContent()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(activeStep - 1)}
        >
          Zurück
        </Button>

        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => {
              if (activeStep === 0 && items.length === 0) {
                setError('Der Warenkorb ist leer.');
                return;
              }
              if (activeStep === 1) {
                createOrder();
              } else {
                setActiveStep(activeStep + 1);
              }
            }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {activeStep === 1 ? 'Bestellung erstellen' : 'Weiter'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setActiveStep(0);
              setSelectedCustomer(null);
              setNewCustomer({
                vorname: '',
                nachname: '',
                email: '',
                telefon: '',
                strasse: '',
                hausnummer: '',
                plz: '',
                stadt: '',
                land: 'Deutschland'
              });
              setSuccess('');
            }}
          >
            Neue Bestellung
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default AdminCheckout;