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
  TextField
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadPortfolioProducts();
  }, []);

  const calculateProductCosts = useCallback(async () => {
    if (!selectedProduct) return;

    try {
      console.log('Lade Warenberechnung für Produkt:', selectedProduct);
      
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

  const loadPortfolioProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Lade Portfolio-Produkte...');
      const response = await api.get('/portfolio');
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
    const product = portfolioProducts.find(p => p._id === event.target.value);
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

  const handleRecalculate = async () => {
    if (!calculation) return;
    
    try {
      const response = await api.post(`/warenberechnung/${calculation._id}/recalculate`);
      setCalculation(response.data);
    } catch (err) {
      console.error('Fehler beim Neuberechnen:', err);
      setError(`Fehler beim Neuberechnen: ${err.message}`);
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
      <Container sx={{ mt: 4 }}>
        <Typography>Lade Daten...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          📊 Warenberechnung
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        {portfolioProducts.length > 0 && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Andere Produkte auswählen:</Typography>
            <FormControl fullWidth>
              <InputLabel>Produkt auswählen</InputLabel>
              <Select
                value={selectedProduct?._id || ''}
                onChange={handleProductChange}
                label="Produkt auswählen"
              >
                {portfolioProducts.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} {!product.seife && '⚠️ Keine Rohseife'} {!product.verpackung && '⚠️ Keine Verpackung'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        )}
      </Container>
    );
  }

  if (portfolioProducts.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">
          Keine Portfolio-Produkte gefunden. Bitte legen Sie zuerst Produkte in der Portfolio-Verwaltung an.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        📊 Warenberechnung
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Detaillierte Kostenberechnung für Portfolio-Produkte
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Produkt auswählen</InputLabel>
          <Select
            value={selectedProduct?._id || ''}
            onChange={handleProductChange}
            label="Produkt auswählen"
          >
            {portfolioProducts.map((product) => (
              <MenuItem key={product._id} value={product._id}>
                {product.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {calculation && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">{selectedProduct.name}</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip 
                    label={`VK: ${calculation.vkPreis.toFixed(2)} €`} 
                    color="primary" 
                    sx={{ fontSize: '1.2rem', p: 2 }}
                  />
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    onClick={handleRecalculate}
                  >
                    🔄 Neu berechnen
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleEditClick}
                  >
                    ✏️ Bearbeiten
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Hauptbestandteile */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Rohstoffe</Typography>
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
                    {/* Rohseife */}
                    <TableRow>
                      <TableCell>Seife</TableCell>
                      <TableCell>{calculation.rohseifeName}</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Menge in gramm</TableCell>
                      <TableCell>{calculation.gewichtInGramm}</TableCell>
                      <TableCell align="right">{calculation.rohseifeKosten?.toFixed(2)} €</TableCell>
                    </TableRow>

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
            </Grid>

            {/* Vergleich mit aktuellem Preis */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="body1">
                    Aktueller Portfolio-Preis: <strong>{(selectedProduct.preis || 0).toFixed(2)} €</strong>
                  </Typography>
                  {calculation.vkPreisGerundet !== (selectedProduct.preis || 0) && (
                    <Chip 
                      label={`Differenz: ${(calculation.vkPreisGerundet - (selectedProduct.preis || 0)).toFixed(2)} €`}
                      color={calculation.vkPreisGerundet > (selectedProduct.preis || 0) ? 'error' : 'success'}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handlePreisUebernehmen}
                  disabled={calculation.vkPreisGerundet === (selectedProduct.preis || 0)}
                  startIcon={<span>💰</span>}
                >
                  Preis übernehmen ({calculation.vkPreisGerundet?.toFixed(2)} €)
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>Kostenberechnung bearbeiten - {selectedProduct?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Fixe Kosten (werden automatisch aus Rohstoffen berechnet)
              </Typography>
              <Box sx={{ pl: 2, pb: 2, backgroundColor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                <Typography variant="body2">
                  Rohseife: {calculation?.rohseifeKosten?.toFixed(2)} €<br/>
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
                value={editValues.energieKosten || 0}
                onChange={(e) => handleEditChange('energieKosten', parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zusatzkosten (€)"
                type="number"
                value={editValues.zusatzKosten || 0}
                onChange={(e) => handleEditChange('zusatzKosten', parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pauschale-Faktor (Standard: 3)"
                type="number"
                value={editValues.pauschaleFaktor || 3}
                onChange={(e) => handleEditChange('pauschaleFaktor', parseFloat(e.target.value) || 3)}
                inputProps={{ step: 0.1, min: 1 }}
                helperText="EK wird mit diesem Faktor multipliziert"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Gewinn (%)"
                type="number"
                value={editValues.gewinnProzent || 0}
                onChange={(e) => handleEditChange('gewinnProzent', parseFloat(e.target.value) || 0)}
                inputProps={{ step: 1, min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Rabatt (%)"
                type="number"
                value={editValues.rabattProzent || 0}
                onChange={(e) => handleEditChange('rabattProzent', parseFloat(e.target.value) || 0)}
                inputProps={{ step: 1, min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
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
                rows={3}
                value={editValues.notizen || ''}
                onChange={(e) => handleEditChange('notizen', e.target.value)}
                placeholder="Zusätzliche Informationen zur Kalkulation..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Abbrechen</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminWarenberechnung;
