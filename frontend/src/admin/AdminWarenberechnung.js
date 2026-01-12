import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import api from '../services/api';

// Hilfsfunktion: Rundungsoption zu Label
const getRundungsLabel = (option) => {
  switch (option) {
    case 'keine': return 'Keine Rundung';
    case '0.10': return 'Auf 0,10 €';
    case '0.50': return 'Auf 0,50 €';
    case '1.00': return 'Auf 1,00 €';
    case '0.99': return 'Psycho (x,99 €)';
    default: return 'Auf 0,50 €';
  }
};

const AdminWarenberechnung = () => {
  const [portfolioProducts, setPortfolioProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});
  
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState('alle'); // 'alle', 'seife', 'werkstuck'
  const [statusFilter, setStatusFilter] = useState('alle'); // 'alle', 'aktiv', 'inaktiv'
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    loadPortfolioProducts();
  }, []);

  const calculateProductCosts = useCallback(async () => {
    if (!selectedProduct || !selectedProduct._id) {
      console.warn('⚠️ calculateProductCosts: selectedProduct oder _id ist undefined');
      return;
    }

    try {
      console.log('Lade Warenberechnung für Produkt:', selectedProduct.name, 'ID:', selectedProduct._id);
      
      // Lade gespeicherte Berechnung aus Datenbank
      const response = await api.get(`/warenberechnung/portfolio/${selectedProduct._id}`);
      const berechnung = response.data;
      
      console.log('Warenberechnung geladen:', berechnung);
      setCalculation(berechnung);
      setError(null);

    } catch (err) {
      console.error('Fehler bei der Berechnung:', err);
      setError(`Fehler beim Laden der Berechnung: ${err.message}`);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      calculateProductCosts();
    }
  }, [selectedProduct, calculateProductCosts]);

  // Filter-Logik für Produkte
  useEffect(() => {
    let filtered = [...portfolioProducts];

    // Kategorie-Filter
    if (categoryFilter === 'seife') {
      filtered = filtered.filter(product => product.kategorie !== 'werkstuck');
    } else if (categoryFilter === 'werkstuck') {
      filtered = filtered.filter(product => product.kategorie === 'werkstuck');
    }

    // Status-Filter
    if (statusFilter === 'aktiv') {
      filtered = filtered.filter(product => product.aktiv === true);
    } else if (statusFilter === 'inaktiv') {
      filtered = filtered.filter(product => product.aktiv !== true);
    }

    setFilteredProducts(filtered);

    // Wenn das aktuelle Produkt herausgefiltert wurde, wähle das erste verfügbare
    if (selectedProduct && !filtered.find(p => p._id === selectedProduct._id)) {
      setSelectedProduct(filtered.length > 0 ? filtered[0] : null);
    }
  }, [portfolioProducts, categoryFilter, statusFilter, selectedProduct]);

  const loadPortfolioProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Lade Portfolio-Produkte (inklusive inaktive)...');
      
      // Lade ALLE Produkte (aktiv + inaktiv) für Admin-Warenberechnung
      const response = await api.get('/portfolio?includeInactive=true');
      console.log('Portfolio-Produkte geladen:', response.data);
      
      // API gibt { success: true, count: X, data: [...] } zurück
      const products = response.data.data || response.data;
      setPortfolioProducts(products);
      
      if (products.length > 0) {
        setSelectedProduct(products[0]);
      } else {
        setError('Keine Portfolio-Produkte gefunden. Bitte legen Sie zuerst Produkte in der Portfolio-Verwaltung an.');
      }
      setLoading(false);
    } catch (err) {
      console.error('Fehler beim Laden der Portfolio-Produkte:', err);
      setError(`Fehler beim Laden der Produkte: ${err.message}`);
      setLoading(false);
    }
  };

  const handleProductChange = (event) => {
    const product = filteredProducts.find(p => p._id === event.target.value);
    setSelectedProduct(product);
  };

  const handleEditClick = () => {
    if (calculation) {
      setEditValues({
        energieKosten: calculation.energieKosten || 0,
        zusatzKosten: calculation.zusatzKosten || 0,
        gewinnProzent: calculation.gewinnProzent || 0,
        rabattProzent: calculation.rabattProzent || 0,
        pauschaleFaktor: calculation.pauschaleFaktor || 3,
        rundungsOption: calculation.rundungsOption || '0.50',
        notizen: calculation.notizen || ''
      });
      setEditDialogOpen(true);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditSave = async () => {
    try {
      const response = await api.put(`/warenberechnung/${calculation._id}`, editValues);
      setCalculation(response.data);
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError(`Fehler beim Speichern: ${err.message}`);
    }
  };

  const handleNeuberechnen = async () => {
    if (!selectedProduct || !selectedProduct._id) {
      console.warn('⚠️ handleNeuberechnen: selectedProduct oder _id ist undefined');
      return;
    }
    
    try {
      console.log('🔄 Lösche bestehende Warenberechnung für Neuberechnung:', selectedProduct.name);
      
      // Lösche bestehende Warenberechnung
      await api.delete(`/warenberechnung/portfolio/${selectedProduct._id}`);
      
      // Lade Portfolio-Produkt neu um aktuelle Rohseifen-Konfiguration zu erhalten
      const portfolioResponse = await api.get(`/admin/portfolio/${selectedProduct._id}`);
      setSelectedProduct(portfolioResponse.data);
      
      // Triggere Neuberechnung durch erneuten Aufruf
      await calculateProductCosts();
      
      console.log('✅ Warenberechnung erfolgreich neu erstellt');
    } catch (err) {
      console.error('Fehler bei Neuberechnung:', err);
      setError(`Fehler bei Neuberechnung: ${err.message}`);
    }
  };

  const handlePreisUebernehmen = async () => {
    if (!calculation || !selectedProduct) return;
    
    try {
      // Aktualisiere Portfolio-Produkt mit gerundeten VK-Preis
      await api.put(`/admin/portfolio/${selectedProduct._id}`, {
        ...selectedProduct,
        preis: calculation.vkPreisGerundet
      });
      
      // Aktualisiere lokalen State
      setSelectedProduct({
        ...selectedProduct,
        preis: calculation.vkPreisGerundet
      });
      
      // Aktualisiere Portfolio-Liste
      const updatedProducts = portfolioProducts.map(p => 
        p._id === selectedProduct._id 
          ? { ...p, preis: calculation.vkPreisGerundet }
          : p
      );
      setPortfolioProducts(updatedProducts);
      
      setError(null);
      console.log(`Preis übernommen: ${calculation.vkPreisGerundet.toFixed(2)} € für ${selectedProduct.name}`);
    } catch (err) {
      console.error('Fehler beim Preis übernehmen:', err);
      setError(`Fehler beim Preis übernehmen: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: isMobile ? 2 : 4 }}>
        <Typography>Lade Daten...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          📊 Warenberechnung
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        {portfolioProducts.length > 0 && (
          <Paper sx={{ p: isMobile ? 2 : 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Andere Produkte auswählen:</Typography>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Produkt auswählen</InputLabel>
              <Select
                value={selectedProduct?._id || ''}
                onChange={handleProductChange}
                label="Produkt auswählen"
              >
                {portfolioProducts.map((product) => (
                  <MenuItem 
                    key={product._id} 
                    value={product._id}
                    sx={{
                      opacity: product.aktiv ? 1 : 0.6,
                      fontStyle: product.aktiv ? 'normal' : 'italic'
                    }}
                  >
                    {!product.aktiv && '🚫 '}
                    {product.name} 
                    {!product.aktiv && ' (INAKTIV)'}
                    {!product.seife && ' ⚠️ Keine Rohseife'} 
                    {!product.verpackung && ' ⚠️ Keine Verpackung'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        )}
      </Container>
    );
  }

  if (filteredProducts.length === 0 && portfolioProducts.length > 0) {
    return (
      <Container sx={{ mt: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          📊 Warenberechnung
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Filter & Produktauswahl</Typography>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Kategorie:
              </Typography>
              <ToggleButtonGroup
                value={categoryFilter}
                exclusive
                onChange={(event, newValue) => newValue && setCategoryFilter(newValue)}
                size="small"
              >
                <ToggleButton value="alle">Alle</ToggleButton>
                <ToggleButton value="seife">🧼 Seifen</ToggleButton>
                <ToggleButton value="werkstuck">🏺 Werkstücke</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Status:
              </Typography>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(event, newValue) => newValue && setStatusFilter(newValue)}
                size="small"
              >
                <ToggleButton value="alle">Alle</ToggleButton>
                <ToggleButton value="aktiv">✅ Aktiv</ToggleButton>
                <ToggleButton value="inaktiv">🚫 Inaktiv</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
          <Alert severity="info">
            Keine Produkte entsprechen den ausgewählten Filtern. 
            ({portfolioProducts.length} Produkte insgesamt verfügbar)
            <br />
            Ändern Sie die Filter-Einstellungen, um Produkte anzuzeigen.
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (portfolioProducts.length === 0) {
    return (
      <Container sx={{ mt: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
        <Alert severity="info">
          Keine Portfolio-Produkte gefunden. Bitte legen Sie zuerst Produkte in der Portfolio-Verwaltung an.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
        📊 Warenberechnung
      </Typography>
      <Typography variant={isMobile ? "caption" : "body1"} color="text.secondary" sx={{ mb: isMobile ? 2 : 3, display: 'block' }}>
        Detaillierte Kostenberechnung für Portfolio-Produkte
      </Typography>

      <Paper sx={{ p: isMobile ? 1.5 : 3, mb: isMobile ? 2 : 3 }}>
        <Grid container spacing={2}>
          {/* Filter Buttons */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Filter & Produktauswahl
            </Typography>
            <Stack direction={isMobile ? "column" : "row"} spacing={2} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Kategorie:
                </Typography>
                <ToggleButtonGroup
                  value={categoryFilter}
                  exclusive
                  onChange={(event, newValue) => newValue && setCategoryFilter(newValue)}
                  size="small"
                >
                  <ToggleButton value="alle">Alle</ToggleButton>
                  <ToggleButton value="seife">🧼 Seifen</ToggleButton>
                  <ToggleButton value="werkstuck">🏺 Werkstücke</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Status:
                </Typography>
                <ToggleButtonGroup
                  value={statusFilter}
                  exclusive
                  onChange={(event, newValue) => newValue && setStatusFilter(newValue)}
                  size="small"
                >
                  <ToggleButton value="alle">Alle</ToggleButton>
                  <ToggleButton value="aktiv">✅ Aktiv</ToggleButton>
                  <ToggleButton value="inaktiv">🚫 Inaktiv</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </Grid>
          
          {/* Produktauswahl */}
          <Grid item xs={12}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>
                Produkt auswählen ({filteredProducts.length} von {portfolioProducts.length})
              </InputLabel>
              <Select
                value={selectedProduct?._id || ''}
                onChange={handleProductChange}
                label={`Produkt auswählen (${filteredProducts.length} von ${portfolioProducts.length})`}
              >
                {filteredProducts.map((product) => (
                  <MenuItem 
                    key={product._id} 
                    value={product._id}
                    sx={{
                      opacity: product.aktiv ? 1 : 0.6,
                      fontStyle: product.aktiv ? 'normal' : 'italic'
                    }}
                  >
                    {product.kategorie === 'werkstuck' ? '🏺' : '🧼'} 
                    {product.name}
                    {!product.aktiv && ' (INAKTIV)'}
                    <Chip 
                      label={product.kategorie === 'werkstuck' ? 'Werkstück' : 'Seife'}
                      size="small"
                      color={product.kategorie === 'werkstuck' ? 'secondary' : 'primary'}
                      sx={{ ml: 1, fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {calculation && (
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
          <Grid container spacing={isMobile ? 2 : 3}>
            {/* Header */}
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 1.5 : 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant={isMobile ? "h6" : "h5"}>{selectedProduct.name}</Typography>
                  {!selectedProduct.aktiv && (
                    <Chip 
                      label="🚫 INAKTIV" 
                      color="warning" 
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  )}
                </Box>
                <Stack 
                  direction={isMobile ? "column" : "row"} 
                  spacing={isMobile ? 1 : 2} 
                  alignItems={isMobile ? 'stretch' : 'center'}
                >
                  <Chip 
                    label={`VK: ${calculation.vkPreis.toFixed(2)} €`} 
                    color="primary" 
                    sx={{ 
                      fontSize: isMobile ? '1rem' : '1.2rem', 
                      p: isMobile ? 1.5 : 2,
                      width: isMobile ? '100%' : 'auto'
                    }}
                  />
                  <Button 
                    variant="outlined" 
                    color="warning"
                    onClick={handleNeuberechnen}
                    size={isMobile ? "small" : "medium"}
                    startIcon={<span>🔄</span>}
                  >
                    {isMobile ? '🔄 Neu' : '🔄 Neuberechnen'}
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleEditClick}
                    size={isMobile ? "medium" : "large"}
                    fullWidth={isMobile}
                    startIcon={isMobile ? null : <span>✏️</span>}
                  >
                    {isMobile ? '✏️ Bearbeiten' : 'Bearbeiten'}
                  </Button>
                </Stack>
              </Box>
            </Grid>

            {/* Hauptbestandteile */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Rohstoffe</Typography>
              
              {isMobile ? (
                // Mobile Card View
                <Stack spacing={1.5}>
                  {/* Komponenten je nach Kategorie */}
                  {selectedProduct.kategorie === 'seife' ? (
                    <>
                      {/* Rohseifen */}
                      <Card variant="outlined">
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen ? 'Rohseifen-Mischung' : 'Seife'}
                          </Typography>
                          <Stack spacing={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">{calculation.rohseifeName}</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {calculation.rohseifeKosten?.toFixed(2)} €
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Menge: {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen ? 
                                `${calculation.rohseifenKonfiguration.gewichtVerteilung?.rohseife1Gramm || 0}g` : 
                                `${calculation.gewichtInGramm}g`}
                            </Typography>
                            {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen && (
                              <>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2">{calculation.rohseifenKonfiguration.rohseife2Name}</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {calculation.rohseife2Kosten?.toFixed(2)} €
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Menge: {calculation.rohseifenKonfiguration.gewichtVerteilung?.rohseife2Gramm || 0}g
                                </Typography>
                              </>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Duftstoff */}
                      {calculation.duftoelName && calculation.duftoelName !== '' && (
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Duftstoff
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">{calculation.duftoelName}</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {calculation.duftoelKosten?.toFixed(2)} €
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Tropfen/Seife: {Math.round(calculation.gewichtInGramm / 50)}
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                      {/* Zusatzinhaltsstoffe */}
                      {calculation.zusatzinhaltsstoffeKostenGesamt > 0 && (
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" color="secondary" gutterBottom>
                              ⚗️ Zusatzinhaltsstoffe
                            </Typography>
                            {calculation.zusatzinhaltsstoffeKonfiguration && calculation.zusatzinhaltsstoffeKonfiguration.length > 0 ? (
                              <Stack spacing={0.5}>
                                {calculation.zusatzinhaltsstoffeKonfiguration.map((zutat, index) => (
                                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2">
                                      {zutat.inhaltsstoffName} ({zutat.menge?.toFixed(1)}g)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                      {zutat.gesamtKosten?.toFixed(4)} €
                                    </Typography>
                                  </Box>
                                ))}
                                {calculation.zusatzinhaltsstoffeKonfiguration.length > 1 && (
                                  <>
                                    <Divider sx={{ my: 0.5 }} />
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="body2" fontWeight="bold">Gesamt:</Typography>
                                      <Typography variant="body2" fontWeight="bold">
                                        {calculation.zusatzinhaltsstoffeKostenGesamt?.toFixed(4)} €
                                      </Typography>
                                    </Box>
                                  </>
                                )}
                              </Stack>
                            ) : (
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">Zusatzinhaltsstoffe</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {calculation.zusatzinhaltsstoffeKostenGesamt?.toFixed(4)} €
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Gießwerkstoff für Werkstücke */}
                      <Card variant="outlined">
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            🏺 Gießwerkstoff
                          </Typography>
                          <Stack spacing={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">{calculation.giesswerkstoffName || 'Standard'}</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {calculation.giesswerkstoffKosten?.toFixed(2)} €
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Volumen: {selectedProduct.volumenInMl || 0} ml
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Gießzusatzstoffe */}
                      {calculation.giesszusatzstoffeKostenGesamt > 0 && (
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" color="secondary" gutterBottom>
                              🧪 Gießzusatzstoffe
                            </Typography>
                            {calculation.giesszusatzstoffeKonfiguration && calculation.giesszusatzstoffeKonfiguration.length > 0 ? (
                              <Stack spacing={0.5}>
                                {calculation.giesszusatzstoffeKonfiguration.map((zutat, index) => (
                                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2">
                                      {zutat.giesszusatzstoffName} ({zutat.menge?.toFixed(1)}ml)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                      {zutat.gesamtKosten?.toFixed(4)} €
                                    </Typography>
                                  </Box>
                                ))}
                                {calculation.giesszusatzstoffeKonfiguration.length > 1 && (
                                  <>
                                    <Divider sx={{ my: 0.5 }} />
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="body2" fontWeight="bold">Gesamt:</Typography>
                                      <Typography variant="body2" fontWeight="bold">
                                        {calculation.giesszusatzstoffeKostenGesamt?.toFixed(4)} €
                                      </Typography>
                                    </Box>
                                  </>
                                )}
                              </Stack>
                            ) : (
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">Gießzusatzstoffe</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {calculation.giesszusatzstoffeKostenGesamt?.toFixed(4)} €
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {/* Verpackung & Energie */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        {selectedProduct.kategorie === 'seife' ? 'Verpackung & Extras' : 'Form & Extras'}
                      </Typography>
                      <Stack spacing={0.5}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">
                            {selectedProduct.kategorie === 'seife' ? 'Seifenform:' : 'Gießform:'}
                          </Typography>
                          <Typography variant="caption">
                            {selectedProduct.kategorie === 'seife' 
                              ? `${selectedProduct.seifenform || 'Standard'} (0,10 €)`
                              : `${selectedProduct.giessform || calculation.giessformName || 'Standard'} (${calculation.giessformKosten?.toFixed(2) || '0.10'} €)`
                            }
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">Zusatz:</Typography>
                          <Typography variant="caption">{selectedProduct.zusatz || 0}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">Optional:</Typography>
                          <Typography variant="caption">{selectedProduct.optional || 0}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Verpackung:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {calculation.verpackungKosten?.toFixed(2)} €
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Energie:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {calculation.energieKosten?.toFixed(2)} €
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Zwischensumme EK */}
                  <Card sx={{ bgcolor: '#f5f5f5' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="bold">Zwischensumme</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {calculation.zwischensummeEK?.toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Pauschale */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">Pauschale</Typography>
                          <Typography variant="caption" color="text.secondary">
                            EK × {calculation.pauschaleFaktor || 3}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {calculation.pauschale?.toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Gewinn */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">Gewinn</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {calculation.gewinnProzent || 0}%
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {calculation.gewinnBetrag?.toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Zwischensumme vor Rabatt */}
                  <Card sx={{ bgcolor: '#f5f5f5' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="bold">Zwischensumme</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {calculation.zwischensummeVorRabatt?.toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Rabatt & Zusatz */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2">Rabatt</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {calculation.rabattProzent || 0}%
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="error" fontWeight="bold">
                            - {calculation.rabattBetrag?.toFixed(2)} €
                          </Typography>
                        </Box>
                        {calculation.zusatzKosten > 0 && (
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2">Zusatz</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {calculation.notizen || ''}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              {calculation.zusatzKosten?.toFixed(2)} €
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* VK Preis (exakt) */}
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">VK Preis (exakt)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {calculation.vkPreis?.toFixed(2)} €
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* VK Preis (gerundet) - Highlight */}
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">VK Preis (gerundet)</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {calculation.vkPreisGerundet?.toFixed(2)} €
                        </Typography>
                      </Box>
                      <Chip 
                        label={getRundungsLabel(calculation.rundungsOption)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ width: '100%' }}
                      />
                    </CardContent>
                  </Card>
                </Stack>
              ) : (
                // Desktop Table View
                <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Komponente</strong></TableCell>
                      <TableCell><strong>Details</strong></TableCell>
                      <TableCell align="right"><strong>Preis</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Komponenten je nach Kategorie */}
                    {selectedProduct.kategorie === 'seife' ? (
                      <>
                        {/* Rohseifen */}
                        <TableRow>
                          <TableCell rowSpan={calculation.rohseifenKonfiguration?.verwendeZweiRohseifen ? 4 : 2}>
                            {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen ? 'Rohseifen-Mischung' : 'Seife'}
                          </TableCell>
                          <TableCell>{calculation.rohseifeName}</TableCell>
                          <TableCell align="right">{calculation.rohseifeKosten?.toFixed(2)} €</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            Menge: {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen ? 
                              `${calculation.rohseifenKonfiguration.gewichtVerteilung?.rohseife1Gramm || 0}g` : 
                              `${calculation.gewichtInGramm}g`}
                          </TableCell>
                          <TableCell align="right"></TableCell>
                        </TableRow>
                        {calculation.rohseifenKonfiguration?.verwendeZweiRohseifen && (
                          <>
                            <TableRow>
                              <TableCell>{calculation.rohseifenKonfiguration.rohseife2Name}</TableCell>
                              <TableCell align="right">{calculation.rohseife2Kosten?.toFixed(2)} €</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                Menge: {calculation.rohseifenKonfiguration.gewichtVerteilung?.rohseife2Gramm || 0}g
                              </TableCell>
                              <TableCell align="right"></TableCell>
                            </TableRow>
                          </>
                        )}

                        {/* Duftstoff */}
                        {calculation.duftoelName && calculation.duftoelName !== '' && (
                          <>
                            <TableRow>
                              <TableCell>Duftstoff</TableCell>
                              <TableCell>{calculation.duftoelName}</TableCell>
                              <TableCell align="right">{calculation.duftoelKosten?.toFixed(2)} €</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Tropfen / Seife</TableCell>
                              <TableCell>{Math.round(calculation.gewichtInGramm / 50)}</TableCell>
                              <TableCell align="right"></TableCell>
                            </TableRow>
                          </>
                        )}

                        {/* Zusatzinhaltsstoffe */}
                        {calculation.zusatzinhaltsstoffeKostenGesamt > 0 && (
                          <>
                            <TableRow>
                              <TableCell rowSpan={calculation.zusatzinhaltsstoffeKonfiguration?.length + 1 || 2}>
                                ⚗️ Zusatzinhaltsstoffe
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell align="right"></TableCell>
                            </TableRow>
                            {calculation.zusatzinhaltsstoffeKonfiguration && calculation.zusatzinhaltsstoffeKonfiguration.length > 0 ? (
                              calculation.zusatzinhaltsstoffeKonfiguration.map((zutat, index) => (
                                <TableRow key={index}>
                                  <TableCell>{zutat.inhaltsstoffName} ({zutat.menge?.toFixed(1)}g)</TableCell>
                                  <TableCell align="right">{zutat.gesamtKosten?.toFixed(4)} €</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell>Zusatzinhaltsstoffe</TableCell>
                                <TableCell align="right">{calculation.zusatzinhaltsstoffeKostenGesamt?.toFixed(4)} €</TableCell>
                              </TableRow>
                            )}
                          </>
                        )}

                        {/* Leere Zeile */}
                        <TableRow>
                          <TableCell colSpan={3}>&nbsp;</TableCell>
                        </TableRow>

                        {/* Verpackung */}
                        <TableRow>
                          <TableCell>Seifenform</TableCell>
                          <TableCell>{selectedProduct.seifenform || 'Standard'}</TableCell>
                          <TableCell align="right">0,10 €</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Zusatz</TableCell>
                          <TableCell>{selectedProduct.zusatz || 0}</TableCell>
                          <TableCell align="right"></TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <>
                        {/* Gießwerkstoff für Werkstücke */}
                        <TableRow>
                          <TableCell>🏺 Gießwerkstoff</TableCell>
                          <TableCell>{calculation.giesswerkstoffName || 'Standard'}</TableCell>
                          <TableCell align="right">{calculation.giesswerkstoffKosten?.toFixed(2)} €</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Volumen</TableCell>
                          <TableCell>{selectedProduct.volumenInMl || 0} ml</TableCell>
                          <TableCell align="right"></TableCell>
                        </TableRow>

                        {/* Gießzusatzstoffe */}
                        {calculation.giesszusatzstoffeKostenGesamt > 0 && (
                          <>
                            <TableRow>
                              <TableCell rowSpan={calculation.giesszusatzstoffeKonfiguration?.length + 1 || 2}>
                                🧪 Gießzusatzstoffe
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell align="right"></TableCell>
                            </TableRow>
                            {calculation.giesszusatzstoffeKonfiguration && calculation.giesszusatzstoffeKonfiguration.length > 0 ? (
                              calculation.giesszusatzstoffeKonfiguration.map((zutat, index) => (
                                <TableRow key={index}>
                                  <TableCell>{zutat.giesszusatzstoffName} ({zutat.menge?.toFixed(1)}ml)</TableCell>
                                  <TableCell align="right">{zutat.gesamtKosten?.toFixed(4)} €</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell>Gießzusatzstoffe</TableCell>
                                <TableCell align="right">{calculation.giesszusatzstoffeKostenGesamt?.toFixed(4)} €</TableCell>
                              </TableRow>
                            )}
                          </>
                        )}

                        {/* Leere Zeile */}
                        <TableRow>
                          <TableCell colSpan={3}>&nbsp;</TableCell>
                        </TableRow>

                        {/* Gießform */}
                        <TableRow>
                          <TableCell>🍱 Gießform</TableCell>
                          <TableCell>{selectedProduct.giessform || calculation.giessformName || 'Standard'}</TableCell>
                          <TableCell align="right">{calculation.giessformKosten?.toFixed(2) || '0.10'} €</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Verwendungen</TableCell>
                          <TableCell>{calculation.giessformVerwendungen || 50}</TableCell>
                          <TableCell align="right"></TableCell>
                        </TableRow>
                      </>
                    )}
                    <TableRow>
                      <TableCell>Optional</TableCell>
                      <TableCell>{selectedProduct.optional || 0}</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Verpackung</TableCell>
                      <TableCell>{calculation.verpackungName}</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Verpackung</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">{calculation.verpackungKosten?.toFixed(2)} €</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Energie</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">{calculation.energieKosten?.toFixed(2)} €</TableCell>
                    </TableRow>

                    {/* Zwischensumme EK */}
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Zwischensumme</strong></TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right"><strong>{calculation.zwischensummeEK?.toFixed(2)} €</strong></TableCell>
                    </TableRow>

                    {/* Leere Zeile */}
                    <TableRow>
                      <TableCell colSpan={3}>&nbsp;</TableCell>
                    </TableRow>

                    {/* Pauschale */}
                    <TableRow>
                      <TableCell>Pauschale</TableCell>
                      <TableCell>EK * {calculation.pauschaleFaktor || 3}</TableCell>
                      <TableCell align="right">{calculation.pauschale?.toFixed(2)} €</TableCell>
                    </TableRow>

                    {/* Leere Zeile */}
                    <TableRow>
                      <TableCell colSpan={3}>&nbsp;</TableCell>
                    </TableRow>

                    {/* Gewinn */}
                    <TableRow>
                      <TableCell>Gewinn in %</TableCell>
                      <TableCell>{calculation.gewinnProzent || 0}</TableCell>
                      <TableCell align="right">{calculation.gewinnBetrag?.toFixed(2)} €</TableCell>
                    </TableRow>

                    {/* Leere Zeile */}
                    <TableRow>
                      <TableCell colSpan={3}>&nbsp;</TableCell>
                    </TableRow>

                    {/* Zwischensumme vor Rabatt */}
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Zwischensumme</strong></TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right"><strong>{calculation.zwischensummeVorRabatt?.toFixed(2)} €</strong></TableCell>
                    </TableRow>

                    {/* Leere Zeile */}
                    <TableRow>
                      <TableCell colSpan={3}>&nbsp;</TableCell>
                    </TableRow>

                    {/* Rabatt */}
                    <TableRow>
                      <TableCell>Rabatt in %</TableCell>
                      <TableCell>{calculation.rabattProzent || 0}</TableCell>
                      <TableCell align="right">- {calculation.rabattBetrag?.toFixed(2)} €</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Zusatz</TableCell>
                      <TableCell>{calculation.notizen || ''}</TableCell>
                      <TableCell align="right">{calculation.zusatzKosten > 0 ? `${calculation.zusatzKosten?.toFixed(2)} €` : '- €'}</TableCell>
                    </TableRow>

                    {/* VK Preis (exakt) */}
                    <TableRow>
                      <TableCell>VK Preis (exakt)</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">{calculation.vkPreis?.toFixed(2)} €</TableCell>
                    </TableRow>

                    {/* VK Preis (gerundet) */}
                    <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableCell><strong>VK Preis (gerundet)</strong></TableCell>
                      <TableCell>
                        <Chip 
                          label={getRundungsLabel(calculation.rundungsOption)} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right"><strong>{calculation.vkPreisGerundet?.toFixed(2)} €</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              )}
            </Grid>

            {/* Vergleich mit aktuellem Preis */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                gap: isMobile ? 1.5 : 2 
              }}>
                <Box>
                  <Typography variant={isMobile ? "body2" : "body1"}>
                    Aktueller Portfolio-Preis: <strong>{(selectedProduct.preis || 0).toFixed(2)} €</strong>
                  </Typography>
                  {calculation.vkPreisGerundet !== (selectedProduct.preis || 0) && (
                    <Chip 
                      label={`Differenz: ${(calculation.vkPreisGerundet - (selectedProduct.preis || 0)).toFixed(2)} €`}
                      color={calculation.vkPreisGerundet > (selectedProduct.preis || 0) ? 'error' : 'success'}
                      size={isMobile ? "small" : "medium"}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handlePreisUebernehmen}
                  disabled={calculation.vkPreisGerundet === (selectedProduct.preis || 0)}
                  startIcon={isMobile ? null : <span>💰</span>}
                  size={isMobile ? "medium" : "large"}
                  fullWidth={isMobile}
                >
                  {isMobile ? `💰 ${calculation.vkPreisGerundet?.toFixed(2)} € übernehmen` : `Preis übernehmen (${calculation.vkPreisGerundet?.toFixed(2)} €)`}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        disableRestoreFocus
        aria-labelledby="edit-dialog-title"
        PaperProps={{
          sx: {
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? 'none' : '90vh'
          }
        }}
      >
        <DialogTitle id="edit-dialog-title">
          Kostenberechnung bearbeiten - {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Fixe Kosten (werden automatisch aus Rohstoffen berechnet)
              </Typography>
              <Box sx={{ pl: 2, pb: 2, backgroundColor: '#f5f5f5', borderRadius: 1, p: isMobile ? 1.5 : 2 }}>
                <Typography variant={isMobile ? "caption" : "body2"}>
                  {calculation?.rohseifenKonfiguration?.verwendeZweiRohseifen ? (
                    <>
                      {calculation.rohseifeName}: {calculation?.rohseifeKosten?.toFixed(2)} € ({calculation?.rohseifenKonfiguration?.gewichtVerteilung?.rohseife1Gramm || 0}g)<br/>
                      {calculation?.rohseifenKonfiguration?.rohseife2Name}: {calculation?.rohseife2Kosten?.toFixed(2)} € ({calculation?.rohseifenKonfiguration?.gewichtVerteilung?.rohseife2Gramm || 0}g)<br/>
                    </>
                  ) : (
                    <>Rohseife: {calculation?.rohseifeKosten?.toFixed(2)} € ({calculation?.gewichtInGramm}g)<br/></>
                  )}
                  Duftöl: {calculation?.duftoelKosten?.toFixed(2)} €<br/>
                  Verpackung: {calculation?.verpackungKosten?.toFixed(2)} €
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Energiekosten (€)"
                type="number"
                size={isMobile ? "small" : "medium"}
                value={editValues.energieKosten || 0}
                onChange={(e) => handleEditChange('energieKosten', parseFloat(e.target.value) || 0)}
                onFocus={(e) => {
                  // Feld beim Klick leeren für einfache Eingabe
                  e.target.select();
                }}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zusatzkosten (€)"
                type="number"
                size={isMobile ? "small" : "medium"}
                value={editValues.zusatzKosten || 0}
                onChange={(e) => handleEditChange('zusatzKosten', parseFloat(e.target.value) || 0)}
                onFocus={(e) => {
                  // Feld beim Klick leeren für einfache Eingabe
                  e.target.select();
                }}
                inputProps={{ step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pauschale-Faktor (Standard: 3)"
                type="number"
                size={isMobile ? "small" : "medium"}
                value={editValues.pauschaleFaktor || 3}
                onChange={(e) => handleEditChange('pauschaleFaktor', parseFloat(e.target.value) || 3)}
                onFocus={(e) => {
                  // Feld beim Klick leeren für einfache Eingabe
                  e.target.select();
                }}
                inputProps={{ step: 0.1, min: 1 }}
                helperText="EK wird mit diesem Faktor multipliziert"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Gewinn (%)"
                type="number"
                size={isMobile ? "small" : "medium"}
                value={editValues.gewinnProzent || 0}
                onChange={(e) => handleEditChange('gewinnProzent', parseFloat(e.target.value) || 0)}
                onFocus={(e) => {
                  // Feld beim Klick leeren für einfache Eingabe
                  e.target.select();
                }}
                inputProps={{ step: 1, min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Rabatt (%)"
                type="number"
                size={isMobile ? "small" : "medium"}
                value={editValues.rabattProzent || 0}
                onChange={(e) => handleEditChange('rabattProzent', parseFloat(e.target.value) || 0)}
                onFocus={(e) => {
                  // Feld beim Klick leeren für einfache Eingabe
                  e.target.select();
                }}
                inputProps={{ step: 1, min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Rundung VK-Preis</InputLabel>
                <Select
                  value={editValues.rundungsOption || '0.50'}
                  onChange={(e) => handleEditChange('rundungsOption', e.target.value)}
                  label="Rundung VK-Preis"
                >
                  <MenuItem value="keine">Keine Rundung (exakter Preis)</MenuItem>
                  <MenuItem value="0.10">Auf 0,10 € aufrunden</MenuItem>
                  <MenuItem value="0.50">Auf 0,50 € aufrunden (empfohlen)</MenuItem>
                  <MenuItem value="1.00">Auf 1,00 € aufrunden</MenuItem>
                  <MenuItem value="0.99">Psychologische Preisgestaltung (x,99 €)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={isMobile ? 2 : 3}
                size={isMobile ? "small" : "medium"}
                value={editValues.notizen || ''}
                onChange={(e) => handleEditChange('notizen', e.target.value)}
                placeholder="Zusätzliche Informationen zur Kalkulation..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 3 }}>
          <Button onClick={handleEditClose} size={isMobile ? "medium" : "large"}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            size={isMobile ? "medium" : "large"}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminWarenberechnung;
