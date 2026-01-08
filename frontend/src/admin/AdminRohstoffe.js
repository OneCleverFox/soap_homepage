import React, { useState, useEffect } from 'react';
import { useAdminState } from '../hooks/useAdminState';
import { useAdminSearch } from '../hooks/useAdminSearch';
import { useSearchParams } from 'react-router-dom';
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
  Grid,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios Interceptor für Token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AdminRohstoffe = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  
  // Standardisierte Admin-States
  const {
    loading, setLoading,
    error, setError,
    success, setSuccess,
    // eslint-disable-next-line no-unused-vars
    handleAsyncOperation
  } = useAdminState();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [rohseife, setRohseife] = useState([]);
  const [duftoele, setDuftoele] = useState([]);
  const [verpackungen, setVerpackungen] = useState([]);
  const [zusatzinhaltsstoffe, setZusatzinhaltsstoffe] = useState([]);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});

  // Search Hook für die aktuelle Tab-Daten
  const getCurrentTabData = () => {
    if (currentTab === 0) return rohseife;
    if (currentTab === 1) return duftoele;
    if (currentTab === 2) return verpackungen;
    return zusatzinhaltsstoffe;
  };

  const {
    searchTerm,
    setSearchTerm
  } = useAdminSearch(getCurrentTabData(), ['name', 'bezeichnung', 'beschreibung']);

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
      } else if (currentTab === 3) {
        const response = await axios.get(`${API_BASE}/zusatzinhaltsstoffe?includeUnavailable=true`, { headers: getAuthHeaders() });
        setZusatzinhaltsstoffe(response.data.data || []);
      }
    } catch (err) {
      setError('Fehler beim Laden der Daten: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentTab, setError, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // URL-Parameter verarbeiten für automatisches Öffnen des Dialogs
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    const autoOpen = searchParams.get('autoOpen');

    // Tab setzen basierend auf URL-Parameter
    if (tab) {
      let tabIndex = 0;
      if (tab === 'duftoele') tabIndex = 1;
      else if (tab === 'verpackungen') tabIndex = 2;
      else if (tab === 'zusatzinhaltsstoffe') tabIndex = 3;
      else if (tab === 'rohseifen') tabIndex = 0;
      
      setCurrentTab(tabIndex);
    }

    // Dialog automatisch öffnen wenn autoOpen=true
    if (action === 'create' && autoOpen === 'true') {
      setTimeout(() => {
        setDialogMode('create');
        setSelectedItem(null);
        setFormData({});
        setOpenDialog(true);
      }, 500); // Kurze Verzögerung für Tab-Switch
    }
  }, [searchParams]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSearchTerm(''); // Suche beim Tab-Wechsel zurücksetzen
  };

  // Universelle Filterfunktion für alle Rohstoff-Typen
  const filterItems = (items, searchTerm) => {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    
    if (!searchTerm) return items;
    
    const search = searchTerm.toLowerCase();
    
    // Hilfsfunktion für sichere String-Konvertierung
    const safeString = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      if (Array.isArray(value)) return value.join(' ');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    return items.filter(item => {
      try {
        // Grundlegende Felder (für alle Typen)
        const matchesBasic = 
          safeString(item.bezeichnung).toLowerCase().includes(search) ||
          safeString(item.beschreibung).toLowerCase().includes(search) ||
          safeString(item.ekPreis).includes(search);
        
        // Rohseife-spezifische Felder
        if (currentTab === 0) {
          const matchesRohseife = 
            safeString(item.farbe).toLowerCase().includes(search) ||
            safeString(item.lieferant).toLowerCase().includes(search) ||
            safeString(item.gesamtInGramm).includes(search) ||
            safeString(item.preisProGramm).includes(search) ||
            safeString(item.preisPro10Gramm).includes(search) ||
            safeString(item.aktuellVorrat).includes(search) ||
            safeString(item.mindestbestand).includes(search);
          
          return matchesBasic || matchesRohseife;
        }
        
        // Duftöl-spezifische Felder
        if (currentTab === 1) {
          const matchesDuftoele = 
            safeString(item.hersteller).toLowerCase().includes(search) ||
            safeString(item.duftrichtung).toLowerCase().includes(search) ||
            safeString(item.intensitaet).toLowerCase().includes(search) ||
            safeString(item.gesamtInMl).includes(search) ||
            safeString(item.tropfenProMl).includes(search) ||
            safeString(item.anzahlTropfen).includes(search) ||
            safeString(item.kostenProTropfen).includes(search) ||
            safeString(item.empfohlungProSeife).includes(search) ||
            safeString(item.maximalProSeife).includes(search) ||
            safeString(item.haltbarkeitMonate).includes(search) ||
            safeString(item.lagertemperatur).toLowerCase().includes(search) ||
            safeString(item.aktuellVorrat).includes(search) ||
            safeString(item.mindestbestand).includes(search);
          
          return matchesBasic || matchesDuftoele;
        }
        
        // Verpackung-spezifische Felder
        if (currentTab === 2) {
          const matchesVerpackungen = 
            safeString(item.hersteller).toLowerCase().includes(search) ||
            safeString(item.form).toLowerCase().includes(search) ||
            safeString(item.groesse).toLowerCase().includes(search) ||
            safeString(item.material).toLowerCase().includes(search) ||
            safeString(item.farbe).toLowerCase().includes(search) ||
            safeString(item.menge).includes(search) ||
            safeString(item.kostenInEuro).includes(search) ||
            safeString(item.kostenProStueck).includes(search) ||
            safeString(item.maximalGewicht).includes(search) ||
            safeString(item.aktuellVorrat).includes(search) ||
            safeString(item.mindestbestand).includes(search) ||
            safeString(item.notizen).toLowerCase().includes(search);
          
          return matchesBasic || matchesVerpackungen;
        }
        
        return matchesBasic;
      } catch (error) {
        console.warn('Fehler beim Filtern eines Items:', error, item);
        return false;
      }
    });
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
      let updated = { ...prev };
      
      // Handle verschachtelte Eigenschaften (z.B. "dosierung.empfohleneZusatzmenge")
      if (name.includes('.')) {
        const keys = name.split('.');
        let current = updated;
        
        // Erstelle verschachtelte Objekte falls sie nicht existieren
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        // Setze den Wert
        current[keys[keys.length - 1]] = newValue;
      } else {
        updated[name] = newValue;
      }
      
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
      
      // Automatische Berechnung für Zusatzinhaltsstoffe: kostenProGramm
      if (currentTab === 3 && (name === 'packungsgroesse' || name === 'einkaufspreis')) {
        const packungsgroesse = name === 'packungsgroesse' ? parseFloat(newValue) : parseFloat(prev.packungsgroesse || 1);
        const einkaufspreis = name === 'einkaufspreis' ? parseFloat(newValue) : parseFloat(prev.einkaufspreis || 0);
        
        if (packungsgroesse > 0 && einkaufspreis >= 0) {
          updated.kostenProGramm = parseFloat((einkaufspreis / packungsgroesse).toFixed(4));
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
                      currentTab === 1 ? 'duftoele' : 
                      currentTab === 2 ? 'verpackungen' :
                      'zusatzinhaltsstoffe';
      
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
                      currentTab === 1 ? 'duftoele' : 
                      currentTab === 2 ? 'verpackungen' :
                      'zusatzinhaltsstoffe';
      
      await axios.delete(`${API_BASE}/${endpoint}/${id}`, { headers: getAuthHeaders() });
      setSuccess('Erfolgreich gelöscht!');
      loadData();
    } catch (err) {
      setError('Fehler beim Löschen: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderRohseifeTable = () => {
    const filteredData = filterItems(rohseife, searchTerm);
    
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {filteredData.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {item.bezeichnung}
                    </Typography>
                    <Chip 
                      label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                      color={item.verfuegbar ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  {item.beschreibung && (
                    <Typography variant="body2" color="textSecondary">
                      {item.beschreibung}
                    </Typography>
                  )}
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Farbe:</Typography>
                      <Typography variant="body2">{item.farbe}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">EK-Preis:</Typography>
                      <Typography variant="body2">{item.ekPreis?.toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Preis/g:</Typography>
                      <Typography variant="body2">{item.preisProGramm?.toFixed(4)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Vorrat:</Typography>
                      <Typography variant="body2" fontWeight={item.aktuellVorrat < item.mindestbestand ? 'bold' : 'normal'} color={item.aktuellVorrat < item.mindestbestand ? 'error' : 'inherit'}>
                        {item.aktuellVorrat} g
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Mindestbestand:</Typography>
                      <Typography variant="body2">{item.mindestbestand} g</Typography>
                    </Box>
                  </Stack>
                  
                  <Divider />
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog('edit', item)}
                      sx={{ flex: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(item._id)}
                      sx={{ flex: 1 }}
                    >
                      Löschen
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {filteredData.length === 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="textSecondary" align="center">
                  {searchTerm ? 
                    `Keine Rohseifen gefunden, die "${searchTerm}" entsprechen.` :
                    'Keine Rohseifen verfügbar.'
                  }
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      );
    }
    
    // Desktop-Tabellenansicht
    return (
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
            {filteredData.map((item) => (
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
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm ? 
                      `Keine Rohseifen gefunden, die "${searchTerm}" entsprechen.` :
                      'Keine Rohseifen verfügbar.'
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderDuftoeleTable = () => {
    const filteredData = filterItems(duftoele, searchTerm);
    
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {filteredData.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {item.bezeichnung}
                    </Typography>
                    <Chip 
                      label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                      color={item.verfuegbar ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  {item.beschreibung && (
                    <Typography variant="body2" color="textSecondary">
                      {item.beschreibung}
                    </Typography>
                  )}
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Duftrichtung:</Typography>
                      <Typography variant="body2">{item.duftrichtung}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Intensität:</Typography>
                      <Typography variant="body2">{item.intensitaet}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Gesamt:</Typography>
                      <Typography variant="body2">{item.gesamtInMl} ml</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">EK-Preis:</Typography>
                      <Typography variant="body2">{item.ekPreis?.toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Kosten/Tropfen:</Typography>
                      <Typography variant="body2">{item.kostenProTropfen?.toFixed(6)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Vorrat:</Typography>
                      <Typography variant="body2" fontWeight={item.aktuellVorrat < item.anzahlTropfen * 0.2 ? 'bold' : 'normal'} color={item.aktuellVorrat < item.anzahlTropfen * 0.2 ? 'error' : 'inherit'}>
                        {item.aktuellVorrat} Tropfen
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Divider />
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog('edit', item)}
                      sx={{ flex: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(item._id)}
                      sx={{ flex: 1 }}
                    >
                      Löschen
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      );
    }
    
    // Desktop-Tabellenansicht
    return (
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
            {filteredData.map((item) => (
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
  };

  const renderVerpackungenTable = () => {
    const filteredData = filterItems(verpackungen, searchTerm);
    
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {filteredData.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {item.bezeichnung}
                    </Typography>
                    <Chip 
                      label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                      color={item.verfuegbar ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Form:</Typography>
                      <Typography variant="body2">{item.form}</Typography>
                    </Box>
                    {item.groesse && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Größe:</Typography>
                        <Typography variant="body2">{item.groesse}</Typography>
                      </Box>
                    )}
                    {item.material && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Material:</Typography>
                        <Typography variant="body2">{item.material}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Kosten/Stück:</Typography>
                      <Typography variant="body2">{item.kostenProStueck?.toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Vorrat:</Typography>
                      <Typography variant="body2">
                        {item.aktuellVorrat} Stück
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Divider />
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog('edit', item)}
                      sx={{ flex: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(item._id)}
                      sx={{ flex: 1 }}
                    >
                      Löschen
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      );
    }
    
    // Desktop-Tabellenansicht
    return (
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
            {filteredData.map((item) => (
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
  };

  const renderZusatzinhaltsstoffeTable = () => {
    const filteredData = filterItems(zusatzinhaltsstoffe, searchTerm);
    
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {filteredData.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {item.name}
                    </Typography>
                    <Chip 
                      label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                      color={item.verfuegbar ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Hersteller:</Typography>
                      <Typography variant="body2">{item.typ}</Typography>
                    </Box>
                    {item.dosierung?.empfohleneZusatzmenge && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Dosierung:</Typography>
                        <Typography variant="body2">{item.dosierung.empfohleneZusatzmenge}% {item.dosierung.einheit}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Kosten/Gramm:</Typography>
                      <Typography variant="body2">{item.kostenProGramm?.toFixed(4)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Vorrat:</Typography>
                      <Typography variant="body2">
                        {item.aktuellVorrat} {item.einheit || 'g'}
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Divider />
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog('edit', item)}
                      sx={{ flex: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(item._id)}
                      sx={{ flex: 1 }}
                    >
                      Löschen
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      );
    }
    
    // Desktop-Tabellenansicht
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Hersteller</TableCell>
              <TableCell>Dosierung</TableCell>
              <TableCell align="right">Kosten/Gramm (€)</TableCell>
              <TableCell align="right">Vorrat</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.typ}</TableCell>
                <TableCell>
                  {item.dosierung?.empfohleneZusatzmenge ? 
                    `${item.dosierung.empfohleneZusatzmenge}% ${item.dosierung.einheit}` : 
                    '-'
                  }
                </TableCell>
                <TableCell align="right">{item.kostenProGramm?.toFixed(4)}</TableCell>
                <TableCell align="right">{item.aktuellVorrat} {item.einheit || 'g'}</TableCell>
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
  };

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
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
              label="Gesamt in Gramm *"
              name="gesamtInGramm"
              type="number"
              value={formData.gesamtInGramm || 1000}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              required
              inputProps={{ min: 1 }}
              helperText="Gesamtmenge der Packung"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="EK-Preis (€) *"
              name="ekPreis"
              type="number"
              value={formData.ekPreis || 0}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              inputProps={{ step: '0.01', min: 0 }}
              required
              helperText="Einkaufspreis gesamt"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
              label="Aktueller Vorrat (g) *"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              required
              inputProps={{ min: 0 }}
              helperText="Aktuell auf Lager"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Mindestbestand (g)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 100}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              inputProps={{ min: 0 }}
              helperText="Warngrenze"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {/* Grundinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grundinformationen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
              label="Beschreibung"
              name="beschreibung"
              value={formData.beschreibung || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Detaillierte Beschreibung des Duftöls..."
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Gesamt in ml *"
              name="gesamtInMl"
              type="number"
              value={formData.gesamtInMl || 15}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              required
              inputProps={{ min: 1, step: 1 }}
              helperText="Gesamtmenge"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="EK-Preis (€) *"
              name="ekPreis"
              type="number"
              value={formData.ekPreis || 0}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              inputProps={{ step: '0.01', min: 0 }}
              required
              helperText="Einkaufspreis"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Empfohlen pro Seife"
              name="empfohlungProSeife"
              type="number"
              value={formData.empfohlungProSeife || 5}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
              inputProps={{ min: 1 }}
              helperText="Tropfen (für 100g = 2 Tropfen)"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Maximal pro Seife"
              name="maximalProSeife"
              type="number"
              value={formData.maximalProSeife || 10}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Feld beim Klick leeren für einfache Eingabe
                e.target.select();
              }}
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
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Mindestbestand (Tropfen)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 50}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Warngrenze"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Haltbarkeit (Monate)"
              name="haltbarkeitMonate"
              type="number"
              value={formData.haltbarkeitMonate || 24}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
        <Grid container spacing={isMobile ? 1.5 : 2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
              label="Notizen"
              name="notizen"
              value={formData.notizen || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Größe (z.B. 9x13)"
              name="groesse"
              value={formData.groesse || ''}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Farbe"
              name="farbe"
              value={formData.farbe || ''}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Menge pro Packung"
              name="menge"
              type="number"
              value={formData.menge || 1}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Kosten in Euro"
              name="kostenInEuro"
              type="number"
              value={formData.kostenInEuro || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01' }}
              required
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Max. Gewicht (g)"
              name="maximalGewicht"
              type="number"
              value={formData.maximalGewicht || 0}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Aktueller Vorrat (Stück)"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Mindestbestand (Stück)"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 0}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
    } else if (currentTab === 3) {
      // Zusatzinhaltsstoffe Form
      return (
        <Grid container spacing={isMobile ? 1.5 : 2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grundinformationen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Name *"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="z.B. Aktivkohle, Moon Peeling, Haferflocken"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Hersteller/Bezugsquelle"
              name="typ"
              value={formData.typ || ''}
              onChange={handleInputChange}
              placeholder="z.B. Mountain Rose Herbs, Dragonspice"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Einheit"
              name="einheit"
              value={formData.einheit || 'g'}
              onChange={handleInputChange}
              placeholder="g, ml, Stück"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Beschreibung"
              name="beschreibung"
              value={formData.beschreibung || ''}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Detaillierte Beschreibung des Zusatzinhaltsstoffs..."
            />
          </Grid>

          {/* Dosierung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Dosierung
            </Typography>
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Empfohlene Zusatzmenge"
              name="dosierung.empfohleneZusatzmenge"
              type="number"
              value={formData.dosierung?.empfohleneZusatzmenge || ''}
              onChange={handleInputChange}
              inputProps={{ step: '0.1' }}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Dosierung Einheit</InputLabel>
              <Select
                name="dosierung.einheit"
                value={formData.dosierung?.einheit || 'prozent'}
                onChange={handleInputChange}
              >
                <MenuItem value="prozent">% (Prozent)</MenuItem>
                <MenuItem value="gramm">Gramm pro 100g Seife</MenuItem>
                <MenuItem value="teelöffel">Teelöffel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Max. Dosierung"
              name="dosierung.maximaleZusatzmenge"
              type="number"
              value={formData.dosierung?.maximaleZusatzmenge || ''}
              onChange={handleInputChange}
              inputProps={{ step: '0.1' }}
            />
          </Grid>

          {/* Kosten und Lager */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Kosten & Lager
            </Typography>
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Einkaufspreis (€)"
              name="einkaufspreis"
              type="number"
              value={formData.einkaufspreis || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01' }}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Packungsgröße"
              name="packungsgroesse"
              type="number"
              value={formData.packungsgroesse || ''}
              onChange={handleInputChange}
              inputProps={{ step: '0.1' }}
              helperText={`in ${formData.einheit || 'g'}`}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Kosten/Gramm (€)"
              name="kostenProGramm"
              type="number"
              value={formData.kostenProGramm || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.0001' }}
              helperText="Wird automatisch berechnet"
              disabled
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Aktueller Vorrat"
              name="aktuellVorrat"
              type="number"
              value={formData.aktuellVorrat || 0}
              onChange={handleInputChange}
              inputProps={{ step: '0.1' }}
              helperText={`in ${formData.einheit || 'g'}`}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Mindestbestand"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 0}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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

          {/* Eigenschaften */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Eigenschaften
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Farbe"
              name="eigenschaften.farbe"
              value={formData.eigenschaften?.farbe || ''}
              onChange={handleInputChange}
              placeholder="z.B. schwarz, grau, weiß"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Wasserlöslichkeit"
              name="eigenschaften.wasserloeslichkeit"
              value={formData.eigenschaften?.wasserloeslichkeit || ''}
              onChange={handleInputChange}
              placeholder="hoch, mittel, niedrig"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Hauttyp"
              name="eigenschaften.hauttyp"
              value={formData.eigenschaften?.hauttyp || ''}
              onChange={handleInputChange}
              placeholder="alle, fettig, trocken, empfindlich"
            />
          </Grid>

          {/* Sicherheit */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Sicherheit & Hinweise
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Sicherheitshinweise"
              name="sicherheit.hinweise"
              value={formData.sicherheit?.hinweise || ''}
              onChange={handleInputChange}
              multiline
              rows={2}
              placeholder="Wichtige Sicherheitshinweise..."
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Allergene vorhanden</InputLabel>
              <Select
                name="sicherheit.allergene"
                value={formData.sicherheit?.allergene || false}
                onChange={handleInputChange}
              >
                <MenuItem value={false}>Nein</MenuItem>
                <MenuItem value={true}>Ja</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Gefahrstoff</InputLabel>
              <Select
                name="sicherheit.gefahrstoff"
                value={formData.sicherheit?.gefahrstoff || false}
                onChange={handleInputChange}
              >
                <MenuItem value={false}>Nein</MenuItem>
                <MenuItem value={true}>Ja</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    }
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: isMobile ? 2 : 4, 
        mb: isMobile ? 2 : 4, 
        px: isMobile ? 1 : 3 
      }}
    >
      <Box sx={{ mb: isMobile ? 2 : 4 }}>
        <Typography 
          variant={isMobile ? "h5" : "h3"} 
          component="h1" 
          gutterBottom
        >
          Rohstoff-Verwaltung
        </Typography>
        <Typography 
          variant={isMobile ? "body2" : "body1"} 
          color="textSecondary"
        >
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: isMobile ? 2 : 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab label={isMobile ? "Seifen" : "Rohseifen"} />
          <Tab label={isMobile ? "Düfte" : "Duftöle"} />
          <Tab label={isMobile ? "Verp." : "Verpackungen"} />
          <Tab label={isMobile ? "Zusatz" : "Zusatzinhaltsstoffe"} />
        </Tabs>
      </Box>

      {/* Universelles Suchfeld */}
      <Box sx={{ 
        mb: isMobile ? 2 : 3,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2,
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        <TextField
          fullWidth={isMobile}
          sx={{ 
            minWidth: isMobile ? '100%' : 300,
            maxWidth: isMobile ? '100%' : 500
          }}
          size={isMobile ? "small" : "medium"}
          placeholder={
            currentTab === 0 ? "Suche nach Rohseifen (Name, Farbe, Lieferant, Preis...)" :
            currentTab === 1 ? "Suche nach Duftölen (Name, Hersteller, Duftrichtung...)" :
            currentTab === 2 ? "Suche nach Verpackungen (Name, Material, Form, Größe...)" :
            "Suche nach Zusatzinhaltsstoffen (Name, Typ, Dosierung, Eigenschaften...)"
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon color="action" sx={{ mr: 1 }} />
            ),
            endAdornment: searchTerm && (
              <IconButton
                size="small"
                onClick={() => setSearchTerm('')}
                edge="end"
              >
                <RefreshIcon />
              </IconButton>
            )
          }}
        />
        
        {searchTerm && (
          <Chip
            size="small"
            label={`Ergebnisse: ${
              currentTab === 0 ? filterItems(rohseife, searchTerm).length :
              currentTab === 1 ? filterItems(duftoele, searchTerm).length :
              currentTab === 2 ? filterItems(verpackungen, searchTerm).length :
              filterItems(zusatzinhaltsstoffe, searchTerm).length
            }`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        gap: isMobile ? 1 : 0,
        mb: isMobile ? 2 : 3 
      }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          size={isMobile ? "medium" : "large"}
          fullWidth={isMobile}
        >
          {isMobile ? "Neu" : "Neuen Rohstoff hinzufügen"}
        </Button>
      </Box>

      {loading ? (
        <Typography>Lädt...</Typography>
      ) : (
        <>
          {currentTab === 0 && renderRohseifeTable()}
          {currentTab === 1 && renderDuftoeleTable()}
          {currentTab === 2 && renderVerpackungenTable()}
          {currentTab === 3 && renderZusatzinhaltsstoffeTable()}
        </>
      )}

      {/* Dialog für Create/Edit */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
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
          <Button onClick={handleCloseDialog} fullWidth={isMobile}>Abbrechen</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            fullWidth={isMobile}
          >
            {dialogMode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminRohstoffe;
