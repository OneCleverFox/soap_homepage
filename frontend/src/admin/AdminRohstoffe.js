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
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  Link as LinkIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000/api' 
  : (process.env.REACT_APP_API_URL || 'https://soap-homepage-backend-production.up.railway.app/api');

// Axios Interceptor für Token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('🚨 Kein Token gefunden in localStorage');
  }
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
    success, setSuccess
  } = useAdminState();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [rohseife, setRohseife] = useState([]);
  const [duftoele, setDuftoele] = useState([]);
  const [verpackungen, setVerpackungen] = useState([]);
  const [zusatzinhaltsstoffe, setZusatzinhaltsstoffe] = useState([]);
  const [giessformen, setGiessformen] = useState([]);
  const [giesswerkstoff, setGiesswerkstoff] = useState([]);
  
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
    if (currentTab === 3) return zusatzinhaltsstoffe;
    if (currentTab === 4) return giessformen;
    return giesswerkstoff;
  };

  const {
    searchTerm,
    setSearchTerm
  } = useAdminSearch(getCurrentTabData(), ['name', 'bezeichnung', 'beschreibung', 'inventarnummer', 'form', 'material', 'typ', 'haerte', 'farbe']);

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
      } else if (currentTab === 4) {
        const response = await axios.get(`${API_BASE}/admin/rohstoffe/giessformen`, { headers: getAuthHeaders() });
        setGiessformen(response.data.data || []);
      } else if (currentTab === 5) {
        const response = await axios.get(`${API_BASE}/admin/rohstoffe/giesswerkstoff`, { headers: getAuthHeaders() });
        setGiesswerkstoff(response.data.data || []);
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
      else if (tab === 'giessformen') tabIndex = 4;
      else if (tab === 'giesswerkstoff') tabIndex = 5;
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

  // Spezielle Filterfunktion für Gießformen (Inventarnummer + Name)
  const filterGiessformen = (items, searchTerm) => {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    
    if (!searchTerm) return items;
    
    const search = searchTerm.toLowerCase();
    
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const inventarnummer = (item.inventarnummer || '').toLowerCase();
      
      return name.includes(search) || inventarnummer.includes(search);
    });
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

  // Hilfsfunktion um Objektwerte zu Strings zu konvertieren
  const sanitizeFormData = (data) => {
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] && typeof sanitized[key] === 'object' && sanitized[key].constructor === Object) {
        // Konvertiere Objekte zu leerem String oder zu JSON falls gewünscht
        sanitized[key] = '';
      } else if (sanitized[key] === null || sanitized[key] === undefined) {
        sanitized[key] = '';
      }
    });
    return sanitized;
  };

  // Bild-Komprimierung für Gießformen
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Berechne neue Dimensionen unter Beibehaltung des Seitenverhältnisses
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Zeichne das Bild mit neuer Größe
        ctx.drawImage(img, 0, 0, width, height);
        
        // Konvertiere zu base64 mit Komprimierung
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Bild-Upload Handler für Gießformen
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validiere Dateityp
      if (!file.type.startsWith('image/')) {
        setError('Bitte wählen Sie eine Bilddatei aus');
        return;
      }
      
      // Validiere Dateigröße (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Bild ist zu groß. Maximal 5MB erlaubt');
        return;
      }

      try {
        const compressedImage = await compressImage(file, 800, 0.8);
        setFormData(prev => ({
          ...prev,
          bild: compressedImage
        }));
        console.log('📸 Bild erfolgreich komprimiert und hochgeladen');
        setSuccess('Bild erfolgreich hochgeladen');
      } catch (error) {
        console.error('Fehler beim Komprimieren des Bildes:', error);
        setError('Fehler beim Verarbeiten des Bildes');
      }
    }
  };

  const handleOpenDialog = async (mode, item = null) => {
    setDialogMode(mode);
    setSelectedItem(item);
    
    if (mode === 'edit' && item) {
      setFormData(sanitizeFormData(item));
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
          produktlink: '',
          aktuellVorrat: 1000,
          mindestbestand: 100,
          bild: '',
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
          produktlink: '',
          duftrichtung: 'blumig',
          intensitaet: 'mittel',
          empfohlungProSeife: 5,
          maximalProSeife: 10,
          aktuellVorrat: 300,
          mindestbestand: 50,
          haltbarkeitMonate: 24,
          lagertemperatur: 'Raumtemperatur (15-25°C)',
          bild: '',
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
          hersteller: '',
          produktlink: '',
          maximalGewicht: 0,
          aktuellVorrat: 0,
          mindestbestand: 0,
          notizen: '',
          bild: '',
          verfuegbar: true
        });
      } else if (currentTab === 3) {
        setFormData({
          bezeichnung: '',
          typ: 'pflegend',
          hersteller: '',
          produktlink: '',
          beschreibung: '',
          wirkung: '',
          eigenschaften: '',
          minDosierung: 0.1,
          empfohleneDosierung: 0.5,
          maxDosierung: 1.0,
          gesamtInGramm: 100,
          ekPreis: 0,
          preisProGramm: 0,
          aktuellVorrat: 0,
          mindestbestand: 50,
          verfuegbar: true,
          bild: '',
          sicherheit: ''
        });
      } else if (currentTab === 4) {
        // Für neue Gießform: Inventarnummer automatisch laden
        if (mode === 'create') {
          try {
            const response = await axios.get(`${API_BASE}/admin/rohstoffe/giessformen/next-inventarnummer`, { headers: getAuthHeaders() });
            const nextInventarnummer = response.data.data.inventarnummer;
            setFormData({
              inventarnummer: nextInventarnummer,
              name: '',
              form: 'sonstiges',
              material: 'silikon',
              volumenMl: 100,
              tiefeMm: 30,
              laengeMm: 100,
              breiteMm: 100,
              durchmesserMm: 80,
              anschaffungskosten: 0,
              lieferant: '',
              produktlink: '',
              bild: '',
              verfuegbar: true
            });
          } catch (error) {
            console.error('Fehler beim Laden der nächsten Inventarnummer:', error);
            setFormData({
              inventarnummer: 'GF-001', // Fallback
              name: '',
              form: 'sonstiges',
              material: 'silikon',
              volumenMl: 100,
              tiefeMm: 30,
              laengeMm: 100,
              breiteMm: 100,
              durchmesserMm: 80,
              anschaffungskosten: 0,
              lieferant: '',
              produktlink: '',
              bild: '',
              verfuegbar: true
            });
          }
        } else {
          setFormData({
            inventarnummer: '',
            name: '',
            form: 'sonstiges',
            material: 'silikon',
            volumenMl: 100,
            tiefeMm: 30,
            laengeMm: 100,
            breiteMm: 100,
            durchmesserMm: 80,
            anschaffungskosten: 0,
            lieferant: '',
            produktlink: '',
            bild: '',
            verfuegbar: true
          });
        }
      } else if (currentTab === 5) {
        setFormData({
          bezeichnung: '',
          typ: 'gips',
          kategorie: 'rohstoff',
          konsistenz: 'pulver',
          farbe: 'weiß',
          dichte: 0,
          aktuellerBestand: 0,
          einheit: 'g',
          mindestbestand: 1000,
          einkaufspreis: 0,
          preisProEinheit: 0,
          lieferant: '',
          artikelnummer: '',
          produktlink: '',
          topfzeit: 0,
          haertungszeit: 0,
          vollhaertung: 0,
          haerte: 'mittel',
          oberflaeche: 'glatt',
          wasserfest: false,
          uvBestaendig: false,
          temperaturMin: 15,
          temperaturMax: 25,
          haltbarkeitMonate: 12,
          bild: '',
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
    // Sicherstellen dass value niemals undefined/null ist für textareas
    const cleanValue = value === null || value === undefined ? '' : String(value);
    const newValue = type === 'checkbox' ? checked : cleanValue;
    
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
    
    // Entferne _id und andere MongoDB-interne Felder aus den Request-Daten
    const { _id, __v, createdAt: _createdAt, updatedAt: _updatedAt, ...cleanFormData } = formData;
    
    // Bei neuen Gießformen: Inventarnummer nicht mitschicken (wird automatisch generiert)
    if (dialogMode === 'create' && currentTab === 4) {
      delete cleanFormData.inventarnummer;
    }
    
    try {
      const endpoint = currentTab === 0 ? 'rohseife' : 
                      currentTab === 1 ? 'duftoele' : 
                      currentTab === 2 ? 'verpackungen' : 
                      currentTab === 3 ? 'zusatzinhaltsstoffe' :
                      currentTab === 4 ? 'admin/rohstoffe/giessformen' : 'admin/rohstoffe/giesswerkstoff';
      
      if (dialogMode === 'create') {
        await axios.post(`${API_BASE}/${endpoint}`, cleanFormData, { headers: getAuthHeaders() });
        setSuccess('Erfolgreich erstellt!');
      } else {
        await axios.put(`${API_BASE}/${endpoint}/${selectedItem._id}`, cleanFormData, { headers: getAuthHeaders() });
        setSuccess('Erfolgreich aktualisiert!');
      }
      
      handleCloseDialog();
      loadData();
    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err);
      console.error('📤 Clean Request Data (ohne _id):', cleanFormData);
      console.error('🔑 Headers:', getAuthHeaders());
      
      if (err.response?.status === 403) {
        setError('Zugriff verweigert - möglicherweise ist Ihr Login abgelaufen. Bitte loggen Sie sich erneut ein.');
      } else if (err.response?.status === 401) {
        setError('Nicht autorisiert - bitte loggen Sie sich erneut ein.');
      } else {
        setError('Fehler beim Speichern: ' + (err.response?.data?.message || err.message));
      }
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
                      currentTab === 3 ? 'zusatzinhaltsstoffe' :
                      currentTab === 4 ? 'admin/rohstoffe/giessformen' : 'admin/rohstoffe/giesswerkstoff';
      
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
              <TableCell align="center">Link</TableCell>
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
                  {item.produktlink && (
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => window.open(item.produktlink, '_blank')}
                      title="Produktlink öffnen"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  )}
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
                <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
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
              <TableCell align="center">Link</TableCell>
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
                  {item.produktlink && (
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => window.open(item.produktlink, '_blank')}
                      title="Produktlink öffnen"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  )}
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
              <TableCell align="center">Link</TableCell>
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
                  {item.produktlink && (
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => window.open(item.produktlink, '_blank')}
                      title="Produktlink öffnen"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  )}
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
                      {item.bezeichnung}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={item.typ} 
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                        color={item.verfuegbar ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  
                  {item.beschreibung && (
                    <Typography variant="body2" color="textSecondary">
                      {item.beschreibung}
                    </Typography>
                  )}
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Typ:</Typography>
                      <Typography variant="body2">{item.typ}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Hersteller:</Typography>
                      <Typography variant="body2">{item.hersteller}</Typography>
                    </Box>
                    {item.produktlink && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Produktlink:</Typography>
                        <Typography 
                          variant="body2" 
                          component="a" 
                          href={item.produktlink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          sx={{ 
                            color: 'primary.main', 
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          🔗 Link
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">EK-Preis:</Typography>
                      <Typography variant="body2">{item.ekPreis?.toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Preis/g:</Typography>
                      <Typography variant="body2">{item.preisProGramm?.toFixed(4)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Dosierung:</Typography>
                      <Typography variant="body2">
                        {(item.empfohleneDosierung !== undefined && item.empfohleneDosierung !== null) 
                          ? item.empfohleneDosierung 
                          : (item.dosierung?.empfohleneProzentzahl || 0.5)}g (pro 10g)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Vorrat:</Typography>
                      <Typography 
                        variant="body2" 
                        fontWeight={(item.bestand?.menge || 0) < (item.bestand?.mindestbestand || 0) ? 'bold' : 'normal'}
                        color={(item.bestand?.menge || 0) < (item.bestand?.mindestbestand || 0) ? 'error' : 'inherit'}
                      >
                        {item.bestand?.menge || 0} g
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Mindestbestand:</Typography>
                      <Typography variant="body2">{item.bestand?.mindestbestand || 0} g</Typography>
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
                    `Keine Zusatzinhaltsstoffe gefunden, die "${searchTerm}" entsprechen.` :
                    'Keine Zusatzinhaltsstoffe verfügbar.'
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
              <TableCell>Typ</TableCell>
              <TableCell>Hersteller</TableCell>
              <TableCell>Produktlink</TableCell>
              <TableCell align="right">EK-Preis (€)</TableCell>
              <TableCell align="right">Preis/g (€)</TableCell>
              <TableCell align="center">Dosierung (g pro 10g)</TableCell>
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
                <TableCell>
                  <Chip 
                    label={item.typ} 
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{item.hersteller}</TableCell>
                <TableCell>
                  {item.produktlink ? (
                    <a 
                      href={item.produktlink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#1976d2', 
                        textDecoration: 'none',
                        fontSize: '14px'
                      }}
                    >
                      🔗 Produkt
                    </a>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '14px' }}>-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{item.ekPreis?.toFixed(2)}</TableCell>
                <TableCell align="right">{item.preisProGramm?.toFixed(4)}</TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {(item.empfohleneDosierung !== undefined && item.empfohleneDosierung !== null) 
                      ? item.empfohleneDosierung 
                      : (item.dosierung?.empfohleneProzentzahl || 0.5)}g
                  </Typography>
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{
                    fontWeight: (item.bestand?.menge || 0) < (item.bestand?.mindestbestand || 0) ? 'bold' : 'normal',
                    color: (item.bestand?.menge || 0) < (item.bestand?.mindestbestand || 0) ? 'error.main' : 'inherit'
                  }}
                >
                  {item.bestand?.menge || 0}
                </TableCell>
                <TableCell align="right">{item.bestand?.mindestbestand || 0}</TableCell>
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
                <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm ? 
                      `Keine Zusatzinhaltsstoffe gefunden, die "${searchTerm}" entsprechen.` :
                      'Keine Zusatzinhaltsstoffe verfügbar.'
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

  const renderGiessformenTable = () => {
    const filteredData = filterGiessformen(giessformen, searchTerm);
    
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {filteredData.map((item) => (
            <Card key={item._id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {item.name} ({item.inventarnummer})
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Material:</Typography>
                      <Typography variant="body2">{item.material}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Volumen:</Typography>
                      <Typography variant="body2">{item.volumenMl} ml</Typography>
                    </Box>
                    {item.durchmesserMm && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Durchmesser:</Typography>
                        <Typography variant="body2">⌀ {item.durchmesserMm}mm</Typography>
                      </Box>
                    )}
                    {(item.laengeMm && item.breiteMm) || item.tiefeMm ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">L x B x H:</Typography>
                        <Typography variant="body2">
                          {item.laengeMm && item.breiteMm ? 
                            `${item.laengeMm} x ${item.breiteMm} x ${item.tiefeMm} mm` :
                            `${item.tiefeMm}mm Höhe`
                          }
                        </Typography>
                      </Box>
                    ) : null}
                  </Stack>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 2 }}>
                    {item.produktlink && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(item.produktlink, '_blank')}
                        color="primary"
                        title="Produktlink öffnen"
                      >
                        <LinkIcon />
                      </IconButton>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
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
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {filteredData.length === 0 && (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
              {searchTerm ? 
                `Keine Gießformen gefunden, die "${searchTerm}" entsprechen.` :
                'Keine Gießformen verfügbar.'
              }
            </Typography>
          )}
        </Stack>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bild</TableCell>
              <TableCell>Inventarnummer</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Volumen (ml)</TableCell>
              <TableCell>Durchmesser (mm)</TableCell>
              <TableCell>L x B x H (mm)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Link</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {item.bild ? (
                    <Box 
                      component="img" 
                      src={item.bild} 
                      alt={item.name}
                      sx={{
                        width: 50,
                        height: 50,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleOpenDialog('edit', item)}
                    />
                  ) : (
                    <Box 
                      sx={{
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        color: 'grey.500'
                      }}
                    >
                      📷
                    </Box>
                  )}
                </TableCell>
                <TableCell>{item.inventarnummer}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.form}</TableCell>
                <TableCell>{item.material}</TableCell>
                <TableCell>{item.volumenMl}</TableCell>
                <TableCell>
                  {item.durchmesserMm ? `⌀ ${item.durchmesserMm}` : '-'}
                </TableCell>
                <TableCell>
                  {item.laengeMm && item.breiteMm ? 
                    `${item.laengeMm} x ${item.breiteMm} x ${item.tiefeMm}` :
                    item.tiefeMm ? `${item.tiefeMm} H` : '-'
                  }
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                    color={item.verfuegbar ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {item.produktlink && (
                    <IconButton
                      size="small"
                      onClick={() => window.open(item.produktlink, '_blank')}
                      color="primary"
                      title="Produktlink öffnen"
                    >
                      <LinkIcon />
                    </IconButton>
                  )}
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
                <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm ? 
                      `Keine Gießformen gefunden, die "${searchTerm}" entsprechen.` :
                      'Keine Gießformen verfügbar.'
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

  const renderGiesswerkstoffTable = () => {
    const filteredData = filterItems(giesswerkstoff, searchTerm);
    
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
                  
                  {item.kategorie && (
                    <Typography variant="caption" color="textSecondary">
                      {item.kategorie}
                    </Typography>
                  )}
                  
                  <Divider />
                  
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Typ:</Typography>
                      <Chip label={item.typ || 'Unbekannt'} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Konsistenz:</Typography>
                      <Typography variant="body2">{item.konsistenz || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Farbe:</Typography>
                      <Typography variant="body2">{item.farbe || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Härte:</Typography>
                      <Typography variant="body2">{item.haerte || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">Bestand:</Typography>
                      <Typography variant="body2" color={item.aktuellerBestand < item.mindestbestand ? 'error' : 'inherit'}>
                        {item.aktuellerBestand || 0} {item.einheit || 'g'}
                      </Typography>
                    </Box>
                    {item.lieferant && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">Lieferant:</Typography>
                        <Typography variant="body2">{item.lieferant}</Typography>
                      </Box>
                    )}
                  </Stack>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 2 }}>
                    {item.produktlink && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(item.produktlink, '_blank')}
                        color="primary"
                        title="Produktlink öffnen"
                      >
                        <LinkIcon />
                      </IconButton>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
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
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {filteredData.length === 0 && (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
              {searchTerm ? 
                `Keine Gießwerkstoffe gefunden, die "${searchTerm}" entsprechen.` :
                'Keine Gießwerkstoffe verfügbar.'
              }
            </Typography>
          )}
        </Stack>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bild</TableCell>
              <TableCell>Bezeichnung</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Konsistenz</TableCell>
              <TableCell>Farbe</TableCell>
              <TableCell>Bestand</TableCell>
              <TableCell>Einheit</TableCell>
              <TableCell>Härte</TableCell>
              <TableCell>Lieferant</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Link</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {item.bild ? (
                    <Box 
                      component="img" 
                      src={item.bild} 
                      alt={item.bezeichnung}
                      sx={{
                        width: 50,
                        height: 50,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleOpenDialog('edit', item)}
                    />
                  ) : (
                    <Box 
                      sx={{
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        color: 'grey.500'
                      }}
                    >
                      📷
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.bezeichnung}
                    </Typography>
                    {item.kategorie && (
                      <Typography variant="caption" color="textSecondary">
                        {item.kategorie}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.typ || 'Unbekannt'} 
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{item.konsistenz || '-'}</TableCell>
                <TableCell>{item.farbe || '-'}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {item.aktuellerBestand || 0}
                    </Typography>
                    {item.mindestbestand && item.aktuellerBestand < item.mindestbestand && (
                      <Typography variant="caption" color="error">
                        Min: {item.mindestbestand}g
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{item.einheit || 'g'}</TableCell>
                <TableCell>{item.haerte || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.lieferant || '-'}
                  </Typography>
                  {item.artikelnummer && (
                    <Typography variant="caption" color="textSecondary">
                      Art: {item.artikelnummer}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'} 
                    color={item.verfuegbar ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {item.produktlink && (
                    <IconButton
                      size="small"
                      onClick={() => window.open(item.produktlink, '_blank')}
                      color="primary"
                      title="Produktlink öffnen"
                    >
                      <LinkIcon />
                    </IconButton>
                  )}
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
                <TableCell colSpan={12} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm ? 
                      `Keine Gießwerkstoffe gefunden, die "${searchTerm}" entsprechen.` :
                      'Keine Gießwerkstoffe verfügbar.'
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
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://beispiel.de/produkt-xyz"
              helperText="Link zum Produkt beim Anbieter"
            />
          </Grid>

          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                size={isMobile ? "small" : "medium"}
                startIcon={<AddIcon />}
              >
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="textSecondary">
                Max. 5MB, wird automatisch komprimiert
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            {formData.bild && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt="Vorschau"
                  sx={{
                    width: '100%',
                    maxWidth: 200,
                    height: 'auto',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                >
                  Bild entfernen
                </Button>
              </Box>
            )}
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink / Weblink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://... (Link zur Bezugsquelle)"
              helperText="Optional: Link zum Produkt beim Hersteller"
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

          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                size={isMobile ? "small" : "medium"}
                startIcon={<AddIcon />}
              >
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="textSecondary">
                Max. 5MB, wird automatisch komprimiert
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            {formData.bild && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt="Vorschau"
                  sx={{
                    width: '100%',
                    maxWidth: 200,
                    height: 'auto',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                >
                  Bild entfernen
                </Button>
              </Box>
            )}
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
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Hersteller"
              name="hersteller"
              value={formData.hersteller || ''}
              onChange={handleInputChange}
              placeholder="z.B. Boxprofi"
            />
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink / Weblink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://... (Link zur Bezugsquelle)"
              helperText="Optional: Link zum Produkt beim Hersteller"
            />
          </Grid>

          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                size={isMobile ? "small" : "medium"}
                startIcon={<AddIcon />}
              >
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="textSecondary">
                Max. 5MB, wird automatisch komprimiert
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            {formData.bild && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt="Vorschau"
                  sx={{
                    width: '100%',
                    maxWidth: 200,
                    height: 'auto',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                >
                  Bild entfernen
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      );
    } else if (currentTab === 3) {
      // Zusatzinhaltsstoffe Form
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
              placeholder="z.B. Sheabutter, Kakaobutter, Bienenwachs"
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Typ *</InputLabel>
              <Select
                name="typ"
                value={formData.typ || 'pflegend'}
                onChange={handleInputChange}
                label="Typ *"
                required
              >
                <MenuItem value="aktivkohle">⚫ Aktivkohle</MenuItem>
                <MenuItem value="peeling">🧴 Peeling</MenuItem>
                <MenuItem value="farbe">🎨 Farbe</MenuItem>
                <MenuItem value="duftstoff">🌸 Duftstoff</MenuItem>
                <MenuItem value="pflegend">🧴 Pflegend</MenuItem>
                <MenuItem value="sonstiges">❓ Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Hersteller"
              name="hersteller"
              value={formData.hersteller || ''}
              onChange={handleInputChange}
              placeholder="z.B. Behawe"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink / Weblink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://... (Link zur Bezugsquelle)"
              helperText="Optional: Link zum Produkt beim Hersteller"
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

          {/* Eigenschaften */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Eigenschaften und Wirkung
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Hauptwirkung"
              name="wirkung"
              value={formData.wirkung || ''}
              onChange={handleInputChange}
              multiline
              rows={2}
              placeholder="z.B. feuchtigkeitsspendend, pflegend"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Eigenschaften"
              name="eigenschaften"
              value={formData.eigenschaften || ''}
              onChange={handleInputChange}
              placeholder="z.B. reich an Vitamin E, antibakteriell"
            />
          </Grid>

          {/* Dosierung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Dosierungsrichtlinien
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Min. Dosierung (g)"
              name="minDosierung"
              type="number"
              value={formData.minDosierung || 0.1}
              onChange={handleInputChange}
              inputProps={{ step: '0.01', min: 0 }}
              helperText="Pro 10g Rohseife"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Empf. Dosierung (g)"
              name="empfohleneDosierung"
              type="number"
              value={formData.empfohleneDosierung || 0.5}
              onChange={handleInputChange}
              inputProps={{ step: '0.01', min: 0 }}
              helperText="Pro 10g Rohseife"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Max. Dosierung (g)"
              name="maxDosierung"
              type="number"
              value={formData.maxDosierung || 1.0}
              onChange={handleInputChange}
              inputProps={{ step: '0.01', min: 0 }}
              helperText="Pro 10g Rohseife"
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
              value={formData.gesamtInGramm || 100}
              onChange={handleInputChange}
              onFocus={(e) => {
                e.target.select();
              }}
              required
              inputProps={{ min: 1 }}
              helperText="Packungsgröße"
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
                e.target.select();
              }}
              inputProps={{ step: '0.01', min: 0 }}
              required
              helperText="Einkaufspreis"
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
              value={formData.mindestbestand || 50}
              onChange={handleInputChange}
              onFocus={(e) => {
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

          {/* Sicherheit und Lagerung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Sicherheit und Lagerung
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Sicherheitshinweise"
              name="sicherheit"
              value={formData.sicherheit || ''}
              onChange={handleInputChange}
              multiline
              rows={2}
              placeholder="z.B. Von direkter Sonneneinstrahlung fernhalten, Allergiehinweise..."
            />
          </Grid>

          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                size={isMobile ? "small" : "medium"}
                startIcon={<AddIcon />}
              >
                Bild auswählen
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="textSecondary">
                Max. 5MB, wird automatisch komprimiert
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            {formData.bild && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt="Vorschau"
                  sx={{
                    width: '100%',
                    maxWidth: 200,
                    height: 'auto',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                >
                  Bild entfernen
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      );
    } else if (currentTab === 4) {
      // Gießformen Form
      return (
        <Grid container spacing={2}>
          {/* Bild-Anzeige oben im Dialog */}
          {formData.bild && (
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2
              }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt={formData.name || 'Gießform'}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    boxShadow: 2
                  }}
                />
              </Box>
            </Grid>
          )}
          
          {/* Grundinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Grundinformationen
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Inventarnummer *"
              name="inventarnummer"
              value={formData.inventarnummer || ''}
              onChange={handleInputChange}
              required
              placeholder="z.B. GF-001"
              helperText={dialogMode === 'create' ? "Automatisch vergeben" : "Eindeutige Kennzeichnung"}
              InputProps={{
                readOnly: dialogMode === 'create'
              }}
              sx={{
                '& .MuiInputBase-input.Mui-readOnly': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  cursor: 'not-allowed'
                }
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Name *"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="z.B. Runde Silikonform"
            />
          </Grid>
          
          {/* Form und Material */}
          <Grid item xs={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Form *</InputLabel>
              <Select
                name="form"
                value={formData.form || 'sonstiges'}
                onChange={handleInputChange}
                label="Form *"
                required
              >
                <MenuItem value="rund">🟡 Rund</MenuItem>
                <MenuItem value="oval">🥚 Oval</MenuItem>
                <MenuItem value="quadratisch">⬜ Quadratisch</MenuItem>
                <MenuItem value="rechteckig">▬ Rechteckig</MenuItem>
                <MenuItem value="herz">💖 Herz</MenuItem>
                <MenuItem value="stern">⭐ Stern</MenuItem>
                <MenuItem value="blume">🌸 Blume</MenuItem>
                <MenuItem value="tier">🐾 Tier</MenuItem>
                <MenuItem value="figur">👤 Figur</MenuItem>
                <MenuItem value="abstrakt">🔀 Abstrakt</MenuItem>
                <MenuItem value="sonstiges">❓ Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Material *</InputLabel>
              <Select
                name="material"
                value={formData.material || 'silikon'}
                onChange={handleInputChange}
                label="Material *"
                required
              >
                <MenuItem value="silikon">🔵 Silikon</MenuItem>
                <MenuItem value="kunststoff">🟢 Kunststoff</MenuItem>
                <MenuItem value="gummi">🟤 Gummi</MenuItem>
                <MenuItem value="metall">⚫ Metall</MenuItem>
                <MenuItem value="keramik">🔶 Keramik</MenuItem>
                <MenuItem value="gips">⚪ Gips</MenuItem>
                <MenuItem value="sonstiges">❓ Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Abmessungen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Abmessungen (in mm)
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Höhe (Tiefe) *"
              name="tiefeMm"
              type="number"
              value={formData.tiefeMm || 30}
              onChange={handleInputChange}
              required
              inputProps={{ min: 1 }}
              helperText="mm"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Länge"
              name="laengeMm"
              type="number"
              value={formData.laengeMm || ''}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="mm (bei rechteckigen)"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Breite"
              name="breiteMm"
              type="number"
              value={formData.breiteMm || ''}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="mm (bei rechteckigen)"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Durchmesser"
              name="durchmesserMm"
              type="number"
              value={formData.durchmesserMm || ''}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="mm (bei runden)"
            />
          </Grid>
          
          {/* Füllmenge */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Füllmenge
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Volumen *"
              name="volumenMl"
              type="number"
              value={formData.volumenMl || 100}
              onChange={handleInputChange}
              required
              inputProps={{ min: 1 }}
              helperText="ml Füllmenge"
            />
          </Grid>
          
          {/* Kaufinformationen */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Kaufinformationen
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Anschaffungskosten"
              name="anschaffungskosten"
              type="number"
              value={formData.anschaffungskosten || 0}
              onChange={handleInputChange}
              inputProps={{ min: 0, step: '0.01' }}
              helperText="€"
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
              placeholder="z.B. Amazon, Fachhandel"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://... (Link zum Produkt)"
              type="url"
            />
          </Grid>
          
          {/* Status */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Status
            </Typography>
          </Grid>
          <Grid item xs={6}>
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
          
          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="bild-upload-gießformen"
                type="file"
                onChange={(e) => handleImageUpload(e, 'bild')}
              />
              <label htmlFor="bild-upload-gießformen">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                  Bild hochladen
                </Button>
              </label>
              {formData.bild && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                    startIcon={<DeleteIcon />}
                  >
                    Bild entfernen
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      );
    } else if (currentTab === 5) {
      // Gießwerkstoffe Form
      return (
        <Grid container spacing={2}>
          {/* Bild-Anzeige oben im Dialog */}
          {formData.bild && (
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2
              }}>
                <Box
                  component="img"
                  src={formData.bild}
                  alt={formData.bezeichnung || 'Gießwerkstoff'}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    boxShadow: 2
                  }}
                />
              </Box>
            </Grid>
          )}
          
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
              placeholder="z.B. Gips Modelliergips, Epoxidharz EP-2000"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Typ *</InputLabel>
              <Select
                name="typ"
                value={formData.typ || 'gips'}
                onChange={handleInputChange}
                label="Typ *"
                required
              >
                <MenuItem value="gips">⚪ Gips</MenuItem>
                <MenuItem value="beton">⬜ Beton</MenuItem>
                <MenuItem value="epoxidharz">🟡 Epoxidharz</MenuItem>
                <MenuItem value="polyurethan">🟠 Polyurethan</MenuItem>
                <MenuItem value="silikon">🔵 Silikon</MenuItem>
                <MenuItem value="wachs">🟫 Wachs</MenuItem>
                <MenuItem value="ton">🟫 Ton</MenuItem>
                <MenuItem value="keramikschlicker">🏺 Keramikschlicker</MenuItem>
                <MenuItem value="sonstiges">❓ Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Kategorie</InputLabel>
              <Select
                name="kategorie"
                value={formData.kategorie || 'rohstoff'}
                onChange={handleInputChange}
                label="Kategorie"
              >
                <MenuItem value="rohstoff">Rohstoff</MenuItem>
                <MenuItem value="fertigmischung">Fertigmischung</MenuItem>
                <MenuItem value="zusatzstoff">Zusatzstoff</MenuItem>
                <MenuItem value="haertungsagent">Härtungsagent</MenuItem>
                <MenuItem value="pigment">Pigment</MenuItem>
                <MenuItem value="release_agent">Trennmittel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Konsistenz</InputLabel>
              <Select
                name="konsistenz"
                value={formData.konsistenz || 'pulver'}
                onChange={handleInputChange}
                label="Konsistenz"
              >
                <MenuItem value="pulver">Pulver</MenuItem>
                <MenuItem value="fluessig">Flüssig</MenuItem>
                <MenuItem value="pastoes">Pastös</MenuItem>
                <MenuItem value="fest">Fest</MenuItem>
                <MenuItem value="gel">Gel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Physikalische Eigenschaften */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Physikalische Eigenschaften
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Farbe"
              name="farbe"
              value={formData.farbe || ''}
              onChange={handleInputChange}
              placeholder="z.B. weiß, grau, natur"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Dichte"
              name="dichte"
              type="number"
              value={formData.dichte || ''}
              onChange={handleInputChange}
              inputProps={{ min: 0, step: '0.1' }}
              helperText="g/cm³"
            />
          </Grid>
          
          {/* Bestand und Preise */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Bestand und Preise
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Aktueller Bestand (g) *"
              name="aktuellerBestand"
              type="number"
              value={formData.aktuellerBestand || 0}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Einheit *</InputLabel>
              <Select
                name="einheit"
                value={formData.einheit || 'g'}
                onChange={handleInputChange}
                label="Einheit *"
                required
              >
                <MenuItem value="g">g (Gramm)</MenuItem>
                <MenuItem value="kg">kg (Kilogramm)</MenuItem>
                <MenuItem value="stueck">Stück</MenuItem>
                <MenuItem value="packung">Packung</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Mindestbestand (g) *"
              name="mindestbestand"
              type="number"
              value={formData.mindestbestand || 1000}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0 }}
              helperText="Standard: 1000g"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Einkaufspreis *"
              name="einkaufspreis"
              type="number"
              value={formData.einkaufspreis || 0}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0, step: '0.01' }}
              helperText="€"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Preis pro Einheit *"
              name="preisProEinheit"
              type="number"
              value={formData.preisProEinheit || 0}
              onChange={handleInputChange}
              required
              inputProps={{ min: 0, step: '0.01' }}
              helperText="€ pro g/kg"
            />
          </Grid>
          
          {/* Lieferant */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Lieferant"
              name="lieferant"
              value={formData.lieferant || ''}
              onChange={handleInputChange}
              placeholder="z.B. Baumarkt, Fachhandel"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Artikelnummer"
              name="artikelnummer"
              value={formData.artikelnummer || ''}
              onChange={handleInputChange}
              placeholder="Herstellernummer"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Produktlink"
              name="produktlink"
              value={formData.produktlink || ''}
              onChange={handleInputChange}
              placeholder="https://beispiel.de/produkt-xyz"
              helperText="Link zum Produkt beim Anbieter oder Hersteller"
            />
          </Grid>
          
          {/* Verarbeitungszeiten */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Verarbeitungszeiten
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Topfzeit"
              name="topfzeit"
              type="number"
              value={formData.topfzeit || ''}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Minuten"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Härtungszeit"
              name="haertungszeit"
              type="number"
              value={formData.haertungszeit || ''}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Minuten bis entformbar"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Vollhärtung"
              name="vollhaertung"
              type="number"
              value={formData.vollhaertung || ''}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
              helperText="Stunden"
            />
          </Grid>
          
          {/* Eigenschaften */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Eigenschaften
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Härte</InputLabel>
              <Select
                name="haerte"
                value={formData.haerte || 'mittel'}
                onChange={handleInputChange}
                label="Härte"
              >
                <MenuItem value="sehr_weich">Sehr weich</MenuItem>
                <MenuItem value="weich">Weich</MenuItem>
                <MenuItem value="mittel">Mittel</MenuItem>
                <MenuItem value="hart">Hart</MenuItem>
                <MenuItem value="sehr_hart">Sehr hart</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Oberfläche</InputLabel>
              <Select
                name="oberflaeche"
                value={formData.oberflaeche || 'glatt'}
                onChange={handleInputChange}
                label="Oberfläche"
              >
                <MenuItem value="glatt">Glatt</MenuItem>
                <MenuItem value="rau">Rau</MenuItem>
                <MenuItem value="poroes">Porös</MenuItem>
                <MenuItem value="strukturiert">Strukturiert</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Wasserfest</InputLabel>
              <Select
                name="wasserfest"
                value={formData.wasserfest === undefined ? false : formData.wasserfest}
                onChange={handleInputChange}
                label="Wasserfest"
              >
                <MenuItem value={true}>✓ Wasserfest</MenuItem>
                <MenuItem value={false}>✗ Nicht wasserfest</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Lagerung */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Lagerung
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Min. Temperatur"
              name="temperaturMin"
              type="number"
              value={formData.temperaturMin || ''}
              onChange={handleInputChange}
              helperText="°C"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Max. Temperatur"
              name="temperaturMax"
              type="number"
              value={formData.temperaturMax || ''}
              onChange={handleInputChange}
              helperText="°C"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              label="Haltbarkeit"
              name="haltbarkeitMonate"
              type="number"
              value={formData.haltbarkeitMonate || 12}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
              helperText="Monate"
            />
          </Grid>
          
          {/* Status */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Status
            </Typography>
          </Grid>
          <Grid item xs={6}>
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
          
          {/* Bild-Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
              Produktbild
            </Typography>
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="bild-upload-gießwerkstoffe"
                type="file"
                onChange={(e) => handleImageUpload(e, 'bild')}
              />
              <label htmlFor="bild-upload-gießwerkstoffe">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                  Bild hochladen
                </Button>
              </label>
              {formData.bild && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setFormData(prev => ({ ...prev, bild: '' }))}
                    startIcon={<DeleteIcon />}
                  >
                    Bild entfernen
                  </Button>
                </Box>
              )}
            </Box>
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
          Verwalten Sie Rohseifen, Duftöle, Verpackungen, Zusatzinhaltsstoffe, Gießformen und Gießwerkstoffe
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
          <Tab label={isMobile ? "Formen" : "Gießformen"} />
          <Tab label={isMobile ? "Werkst." : "Gießwerkstoffe"} />
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
            currentTab === 3 ? "Suche nach Zusatzinhaltsstoffen (Name, Typ, Hersteller, Wirkung...)" :
            currentTab === 4 ? "Suche nach Gießformen (Inventarnummer, Name, Form, Material...)" :
            "Suche nach Gießwerkstoffen (Bezeichnung, Typ, Hersteller...)"
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
              currentTab === 3 ? filterItems(zusatzinhaltsstoffe, searchTerm).length :
              currentTab === 4 ? filterItems(giessformen, searchTerm).length :
              filterItems(giesswerkstoff, searchTerm).length
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
          {isMobile ? "Neu" : (
            currentTab === 0 ? "Neue Rohseife hinzufügen" :
            currentTab === 1 ? "Neues Duftöl hinzufügen" :
            currentTab === 2 ? "Neue Verpackung hinzufügen" :
            currentTab === 3 ? "Neuen Zusatzinhaltsstoff hinzufügen" :
            currentTab === 4 ? "Neue Gießform hinzufügen" : "Neuen Gießwerkstoff hinzufügen"
          )}
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
          {currentTab === 4 && renderGiessformenTable()}
          {currentTab === 5 && renderGiesswerkstoffTable()}
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
          {dialogMode === 'create' ? (
            currentTab === 0 ? 'Neue Rohseife erstellen' :
            currentTab === 1 ? 'Neues Duftöl erstellen' :
            currentTab === 2 ? 'Neue Verpackung erstellen' :
            currentTab === 3 ? 'Neuen Zusatzinhaltsstoff erstellen' :
            currentTab === 4 ? 'Neue Gießform erstellen' : 'Neuen Gießwerkstoff erstellen'
          ) : (
            currentTab === 0 ? 'Rohseife bearbeiten' :
            currentTab === 1 ? 'Duftöl bearbeiten' :
            currentTab === 2 ? 'Verpackung bearbeiten' :
            currentTab === 3 ? 'Zusatzinhaltsstoff bearbeiten' :
            currentTab === 4 ? 'Gießform bearbeiten' : 'Gießwerkstoff bearbeiten'
          )}
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
