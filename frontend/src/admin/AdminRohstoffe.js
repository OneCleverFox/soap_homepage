import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios Interceptor für Token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AdminRohstoffe = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [rohseife, setRohseife] = useState([]);
  const [duftoele, setDuftoele] = useState([]);
  const [verpackungen, setVerpackungen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (currentTab === 0) {
        const response = await axios.get(`${API_BASE}/rohseife?includeUnavailable=true`, { headers: getAuthHeaders() });
        setRohseife(response.data.data || []);
      } else if (currentTab === 1) {
        const response = await axios.get(`${API_BASE}/duftoele?includeUnavailable=true`, { headers: getAuthHeaders() });
        setDuftoele(response.data.data || []);
      } else if (currentTab === 2) {
        const response = await axios.get(`${API_BASE}/verpackungen?includeUnavailable=true`, { headers: getAuthHeaders() });
        setVerpackungen(response.data.data || []);
      }
    } catch (err) {
      setError('Fehler beim Laden der Daten: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenDialog = (mode, item = null) => {
    setDialogMode(mode);
    setSelectedItem(item);
    
    if (mode === 'edit' && item) {
      setFormData(item);
    } else {
      // Initialize empty form based on current tab
      if (currentTab === 0) {
        setFormData({
          bezeichnung: '',
          beschreibung: '',
          gesamtInGramm: 1000,
          ekPreis: 0,
          farbe: '',
          lieferant: '',
          aktuellVorrat: 1000,
          mindestbestand: 100,
          verfuegbar: true
        });
      } else if (currentTab === 1) {
        setFormData({
          bezeichnung: '',
          beschreibung: '',
          gesamtInMl: 15,
          ekPreis: 0,
          tropfenProMl: 20,
          hersteller: '',
          duftrichtung: 'blumig',
          intensitaet: 'mittel',
          empfohlungProSeife: 5,
          maximalProSeife: 10,
          aktuellVorrat: 300,
          mindestbestand: 50,
          haltbarkeitMonate: 24,
          lagertemperatur: 'Raumtemperatur (15-25°C)',
          verfuegbar: true
        });
      } else if (currentTab === 2) {
        setFormData({
          bezeichnung: '',
          menge: 1,
          kostenInEuro: 0,
          kostenProStueck: 0,
          form: 'viereck',
          groesse: '',
          material: 'karton',
          farbe: '',
          maximalGewicht: 0,
          aktuellVorrat: 0,
          mindestbestand: 0,
          notizen: '',
          verfuegbar: true
        });
      }
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      };
      
      // Automatische Berechnung für Rohseife: preisProGramm
      if (currentTab === 0 && (name === 'gesamtInGramm' || name === 'ekPreis')) {
        const gesamtInGramm = name === 'gesamtInGramm' ? parseFloat(newValue) : parseFloat(prev.gesamtInGramm || 1000);
        const ekPreis = name === 'ekPreis' ? parseFloat(newValue) : parseFloat(prev.ekPreis || 0);
        
        if (gesamtInGramm > 0 && ekPreis >= 0) {
          updated.preisProGramm = parseFloat((ekPreis / gesamtInGramm).toFixed(6));
          updated.preisPro10Gramm = parseFloat((updated.preisProGramm * 10).toFixed(4));
        }
      }
      
      // Automatische Berechnung für Duftöle: anzahlTropfen und kostenProTropfen
      if (currentTab === 1) {
        if (name === 'gesamtInMl' || name === 'tropfenProMl' || name === 'ekPreis') {
          const gesamtInMl = name === 'gesamtInMl' ? parseFloat(newValue) : parseFloat(prev.gesamtInMl || 15);
          const tropfenProMl = name === 'tropfenProMl' ? parseFloat(newValue) : parseFloat(prev.tropfenProMl || 20);
          const ekPreis = name === 'ekPreis' ? parseFloat(newValue) : parseFloat(prev.ekPreis || 0);
          
          if (gesamtInMl > 0 && tropfenProMl > 0) {
            updated.anzahlTropfen = Math.floor(gesamtInMl * tropfenProMl);
            
            if (updated.anzahlTropfen > 0 && ekPreis >= 0) {
              updated.kostenProTropfen = parseFloat((ekPreis / updated.anzahlTropfen).toFixed(8));
            }
          }
        }
        
        // Wenn aktuellVorrat nicht manuell gesetzt wurde, setze ihn auf anzahlTropfen
        if (name === 'anzahlTropfen' && !prev.aktuellVorratManuallySet) {
          updated.aktuellVorrat = updated.anzahlTropfen;
        }
      }
      
      // Automatische Berechnung für Verpackungen: kostenProStueck
      if (currentTab === 2 && (name === 'menge' || name === 'kostenInEuro')) {
        const menge = name === 'menge' ? parseFloat(newValue) : parseFloat(prev.menge || 1);
        const kostenInEuro = name === 'kostenInEuro' ? parseFloat(newValue) : parseFloat(prev.kostenInEuro || 0);
        
        if (menge > 0 && kostenInEuro >= 0) {
          updated.kostenProStueck = parseFloat((kostenInEuro / menge).toFixed(4));
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      const endpoint = currentTab === 0 ? 'rohseife' : 
                      currentTab === 1 ? 'duftoele' : 'verpackungen';
      
      if (dialogMode === 'create') {
        await axios.post(`${API_BASE}/${endpoint}`, formData, { headers: getAuthHeaders() });
        setSuccess('Erfolgreich erstellt!');
      } else {
        await axios.put(`${API_BASE}/${endpoint}/${selectedItem._id}`, formData, { headers: getAuthHeaders() });
        setSuccess('Erfolgreich aktualisiert!');
      }
      
      handleCloseDialog();
      loadData();
    } catch (err) {
      setError('Fehler beim Speichern: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Möchten Sie diesen Rohstoff wirklich löschen?')) {
      return;
    }

    try {
      const endpoint = currentTab === 0 ? 'rohseife' : 
                      currentTab === 1 ? 'duftoele' : 'verpackungen';
      
      await axios.delete(`${API_BASE}/${endpoint}/${id}`, { headers: getAuthHeaders() });
      setSuccess('Erfolgreich gelöscht!');
      loadData();
    } catch (err) {
      setError('Fehler beim Löschen: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderRohseifeTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Bezeichnung</TableCell>
            <TableCell>Beschreibung</TableCell>
            <TableCell>Farbe</TableCell>
            <TableCell align="right">EK-Preis (€)</TableCell>
            <TableCell align="right">Preis/g (€)</TableCell>
            <TableCell align="right">Vorrat (g)</TableCell>
            <TableCell align="right">Mindestbestand</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Aktionen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rohseife.map((item) => (
            <TableRow key={item._id}>
              <TableCell>{item.bezeichnung}</TableCell>
              <TableCell>{item.beschreibung}</TableCell>
              <TableCell>{item.farbe}</TableCell>
              <TableCell align="right">{item.ekPreis?.toFixed(2)}</TableCell>
              <TableCell align="right">{item.preisProGramm?.toFixed(4)}</TableCell>
              <TableCell align="right">{item.aktuellVorrat}</TableCell>
              <TableCell align="right">{item.mindestbestand}</TableCell>
              <TableCell>
                <Chip 
                  label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                  color={item.verfuegbar ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  color="primary"
                  onClick={() => handleOpenDialog('edit', item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDelete(item._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderDuftoeleTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Bezeichnung</TableCell>
            <TableCell>Beschreibung</TableCell>
            <TableCell>Duftrichtung</TableCell>
            <TableCell>Intensität</TableCell>
            <TableCell align="right">Gesamt (ml)</TableCell>
            <TableCell align="right">EK-Preis (€)</TableCell>
            <TableCell align="right">Kosten/Tropfen</TableCell>
            <TableCell align="right">Vorrat (Tropfen)</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Aktionen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {duftoele.map((item) => (
            <TableRow key={item._id}>
              <TableCell>{item.bezeichnung}</TableCell>
              <TableCell>{item.beschreibung}</TableCell>
              <TableCell>{item.duftrichtung}</TableCell>
              <TableCell>{item.intensitaet}</TableCell>
              <TableCell align="right">{item.gesamtInMl}</TableCell>
              <TableCell align="right">{item.ekPreis?.toFixed(2)}</TableCell>
              <TableCell align="right">{item.kostenProTropfen?.toFixed(6)}</TableCell>
              <TableCell align="right">{item.aktuellVorrat}</TableCell>
              <TableCell>
                <Chip 
                  label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                  color={item.verfuegbar ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  color="primary"
                  onClick={() => handleOpenDialog('edit', item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDelete(item._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderVerpackungenTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Bezeichnung</TableCell>
            <TableCell>Form</TableCell>
            <TableCell>Größe</TableCell>
            <TableCell>Material</TableCell>
            <TableCell align="right">Kosten/Stück (€)</TableCell>
            <TableCell align="right">Vorrat</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Aktionen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {verpackungen.map((item) => (
            <TableRow key={item._id}>
              <TableCell>{item.bezeichnung}</TableCell>
              <TableCell>{item.form}</TableCell>
              <TableCell>{item.groesse || '-'}</TableCell>
              <TableCell>{item.material || '-'}</TableCell>
              <TableCell align="right">{item.kostenProStueck?.toFixed(2)}</TableCell>
              <TableCell align="right">{item.aktuellVorrat}</TableCell>
              <TableCell>
                <Chip 
                  label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                  color={item.verfuegbar ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  color="primary"
                  onClick={() => handleOpenDialog('edit', item)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDelete(item._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderDialogContent = () => {
    if (currentTab === 0) {
      // Rohseife Form
      return (
        <Grid container spacing={2}>
          {/* Grundinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grundinformationen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bezeichnung *"
              name="bezeichnung"
              value={formData.bezeichnung || ''}
              onChange={handleInputChange}
              required
              placeholder="z.B. Sheabutter, Aloe-Vera, etc."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Beschreibung"
              name="beschreibung"
              value={formData.beschreibung || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Detaillierte Beschreibung der Rohseife..."
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Farbe"
              name="farbe"
              value={formData.farbe || ''}
              onChange={handleInputChange}
              placeholder="z.B. cremeweiß, transparent"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Lieferant"
              name="lieferant"
              value={formData.lieferant || ''}
              onChange={handleInputChange}
              placeholder="z.B. Seifenprofis"
            />
          </Grid>

          {/* Preisinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Preisinformationen
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Gesamt in Gramm *"
              name="gesamtInGramm"
              type="number"
              value={formData.gesamtInGramm || 1000}
              onChange={handleInputChange}
              required
              inputProps={{ min: 1 }}
              helperText="Gesamtmenge der Packung"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="EK-Preis (€) *"
              name="ekPreis"
              type="number"
              value={formData.ekPreis || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01', min: 0 }}
              required
              helperText="Einkaufspreis gesamt"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Preis pro Gramm (€)"
              name="preisProGramm"
              type="number"
              value={formData.preisProGramm || 0}
              inputProps={{ step: '0.0001' }}
              disabled
              helperText="Automatisch berechnet"
              sx={{ 
                '& .MuiInputBase-input.Mui-disabled': { 
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)' 
                } 
              }}
            />
          </Grid>

          {/* Lagerverwaltung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Lagerverwaltung
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Aktueller Vorrat (g) *"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0 }}
              helperText="Aktuell auf Lager"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Mindestbestand (g)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 100}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Warngrenze"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>Verfügbarkeit *</InputLabel>
              <Select
                name="verfuegbar"
                value={formData.verfuegbar === undefined ? true : formData.verfuegbar}
                onChange={handleInputChange}
                label="Verfügbarkeit *"
              >
                <MenuItem value={true}>✓ Verfügbar</MenuItem>
                <MenuItem value={false}>✗ Nicht verfügbar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    } else if (currentTab === 1) {
      // Duftöle Form
      return (
        <Grid container spacing={2}>
          {/* Grundinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grundinformationen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bezeichnung *"
              name="bezeichnung"
              value={formData.bezeichnung || ''}
              onChange={handleInputChange}
              required
              placeholder="z.B. Lavendel, Rose, Sandelholz"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Beschreibung"
              name="beschreibung"
              value={formData.beschreibung || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Detaillierte Beschreibung des Duftöls..."
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Duftrichtung *</InputLabel>
              <Select
                name="duftrichtung"
                value={formData.duftrichtung || 'blumig'}
                onChange={handleInputChange}
                label="Duftrichtung *"
              >
                <MenuItem value="blumig">🌸 Blumig</MenuItem>
                <MenuItem value="fruchtig">🍊 Fruchtig</MenuItem>
                <MenuItem value="holzig">🌲 Holzig</MenuItem>
                <MenuItem value="kräuterig">🌿 Kräuterig</MenuItem>
                <MenuItem value="süß">🍯 Süß</MenuItem>
                <MenuItem value="frisch">❄️ Frisch</MenuItem>
                <MenuItem value="orientalisch">✨ Orientalisch</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Intensität *</InputLabel>
              <Select
                name="intensitaet"
                value={formData.intensitaet || 'mittel'}
                onChange={handleInputChange}
                label="Intensität *"
              >
                <MenuItem value="mild">Mild</MenuItem>
                <MenuItem value="mittel">Mittel</MenuItem>
                <MenuItem value="stark">Stark</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Hersteller"
              name="hersteller"
              value={formData.hersteller || ''}
              onChange={handleInputChange}
              placeholder="z.B. Seifenprofis"
            />
          </Grid>

          {/* Preisinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Preis- und Mengeninformationen
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Gesamt in ml *"
              name="gesamtInMl"
              type="number"
              value={formData.gesamtInMl || 15}
              onChange={handleInputChange}
              required
              inputProps={{ min: 1, step: 1 }}
              helperText="Gesamtmenge"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Tropfen pro ml *"
              name="tropfenProMl"
              type="number"
              value={formData.tropfenProMl || 20}
              onChange={handleInputChange}
              required
              inputProps={{ min: 1, step: 1 }}
              helperText="Standard: 20"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Anzahl Tropfen"
              name="anzahlTropfen"
              type="number"
              value={formData.anzahlTropfen || 0}
              disabled
              helperText="Automatisch berechnet"
              sx={{ 
                '& .MuiInputBase-input.Mui-disabled': { 
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)' 
                } 
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="EK-Preis (€) *"
              name="ekPreis"
              type="number"
              value={formData.ekPreis || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01', min: 0 }}
              required
              helperText="Einkaufspreis"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Kosten pro Tropfen (€)"
              name="kostenProTropfen"
              type="number"
              value={formData.kostenProTropfen || 0}
              inputProps={{ step: '0.000001' }}
              disabled
              helperText="Automatisch berechnet"
              sx={{ 
                '& .MuiInputBase-input.Mui-disabled': { 
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)' 
                } 
              }}
            />
          </Grid>

          {/* Anwendungshinweise */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Anwendungshinweise (Regel: 1 Tropfen pro 50g Seife)
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Empfohlen pro Seife"
              name="empfohlungProSeife"
              type="number"
              value={formData.empfohlungProSeife || 5}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="Tropfen (für 100g = 2 Tropfen)"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Maximal pro Seife"
              name="maximalProSeife"
              type="number"
              value={formData.maximalProSeife || 10}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="Maximale Tropfen"
            />
          </Grid>

          {/* Lagerverwaltung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Lagerverwaltung
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Aktueller Vorrat (Tropfen) *"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0 }}
              helperText="Auf Lager"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Mindestbestand (Tropfen)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 50}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Warngrenze"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel>Verfügbarkeit *</InputLabel>
              <Select
                name="verfuegbar"
                value={formData.verfuegbar === undefined ? true : formData.verfuegbar}
                onChange={handleInputChange}
                label="Verfügbarkeit *"
              >
                <MenuItem value={true}>✓ Verfügbar</MenuItem>
                <MenuItem value={false}>✗ Nicht verfügbar</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Lagerung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Lagerungsinformationen
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Haltbarkeit (Monate)"
              name="haltbarkeitMonate"
              type="number"
              value={formData.haltbarkeitMonate || 24}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Lagertemperatur"
              name="lagertemperatur"
              value={formData.lagertemperatur || 'Raumtemperatur (15-25°C)'}
              onChange={handleInputChange}
              placeholder="z.B. Raumtemperatur (15-25°C)"
            />
          </Grid>
        </Grid>
      );
    } else if (currentTab === 2) {
      // Verpackungen Form
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bezeichnung"
              name="bezeichnung"
              value={formData.bezeichnung || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notizen"
              name="notizen"
              value={formData.notizen || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Form</InputLabel>
              <Select
                name="form"
                value={formData.form || 'viereck'}
                onChange={handleInputChange}
              >
                <MenuItem value="viereck">Viereck</MenuItem>
                <MenuItem value="länglich">Länglich</MenuItem>
                <MenuItem value="tüte">Tüte</MenuItem>
                <MenuItem value="dose">Dose</MenuItem>
                <MenuItem value="schachtel">Schachtel</MenuItem>
                <MenuItem value="beutel">Beutel</MenuItem>
                <MenuItem value="sonstiges">Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Material</InputLabel>
              <Select
                name="material"
                value={formData.material || 'karton'}
                onChange={handleInputChange}
              >
                <MenuItem value="karton">Karton</MenuItem>
                <MenuItem value="plastik">Plastik</MenuItem>
                <MenuItem value="papier">Papier</MenuItem>
                <MenuItem value="glas">Glas</MenuItem>
                <MenuItem value="metall">Metall</MenuItem>
                <MenuItem value="stoff">Stoff</MenuItem>
                <MenuItem value="sonstiges">Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Größe (z.B. 9x13)"
              name="groesse"
              value={formData.groesse || ''}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Farbe"
              name="farbe"
              value={formData.farbe || ''}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Menge pro Packung"
              name="menge"
              type="number"
              value={formData.menge || 1}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Kosten in Euro"
              name="kostenInEuro"
              type="number"
              value={formData.kostenInEuro || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01' }}
              required
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Kosten pro Stück (€)"
              name="kostenProStueck"
              type="number"
              value={formData.kostenProStueck || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01' }}
              helperText="Wird automatisch berechnet"
              disabled
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max. Gewicht (g)"
              name="maximalGewicht"
              type="number"
              value={formData.maximalGewicht || 0}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Aktueller Vorrat (Stück)"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Mindestbestand (Stück)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 0}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Verfügbar</InputLabel>
              <Select
                name="verfuegbar"
                value={formData.verfuegbar === undefined ? true : formData.verfuegbar}
                onChange={handleInputChange}
              >
                <MenuItem value={true}>Ja</MenuItem>
                <MenuItem value={false}>Nein</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Rohstoff-Verwaltung
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Verwalten Sie Rohseifen, Duftöle und Verpackungen
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Rohseifen" />
          <Tab label="Duftöle" />
          <Tab label="Verpackungen" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Neuen Rohstoff hinzufügen
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
        >
          Aktualisieren
        </Button>
      </Box>

      {loading ? (
        <Typography>Lädt...</Typography>
      ) : (
        <>
          {currentTab === 0 && renderRohseifeTable()}
          {currentTab === 1 && renderDuftoeleTable()}
          {currentTab === 2 && renderVerpackungenTable()}
        </>
      )}

      {/* Dialog für Create/Edit */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Neuen Rohstoff erstellen' : 'Rohstoff bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {renderDialogContent()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminRohstoffe;
