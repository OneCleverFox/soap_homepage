import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Utility-Funktion für Cache-Invalidation
const invalidateProductsCache = () => {
  try {
    // SessionStorage Cache leeren
    sessionStorage.removeItem('cachedProducts');
    console.log('🧹 Products cache invalidated');
    
    // Event feuern für reaktive Updates
    window.dispatchEvent(new CustomEvent('inventoryUpdated'));
    console.log('📡 Inventory update event dispatched');
    
    return true;
  } catch (e) {
    console.warn('⚠️ Could not invalidate products cache:', e);
    return false;
  }
};
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tooltip,
  CircularProgress,
  useMediaQuery,
  useTheme,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Image as ImageIcon,
  DeleteForever as DeleteForeverIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';

const AdminPortfolio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);

  // State für Produktformular
  const [formData, setFormData] = useState({
    name: '',
    seife: '',
    gramm: '',
    aroma: '',
    seifenform: '',
    zusatz: '',
    optional: '',
    verpackung: '',
    aktiv: false, // ✅ Neue Produkte standardmäßig inaktiv
    reihenfolge: 0, // Wird beim Öffnen des Dialogs automatisch gesetzt
    // Erweiterte Rohseifen-Konfiguration
    rohseifenKonfiguration: {
      verwendeZweiRohseifen: false,
      seife2: '',
      gewichtVerteilung: {
        seife1Prozent: 50,
        seife2Prozent: 50
      }
    },
    // Beschreibungsfelder
    beschreibung: {
      kurz: '',
      lang: '',
      inhaltsstoffe: '',
      anwendung: '',
      besonderheiten: ''
    }
  });

  // State für dynamische Optionen
  const [seifenOptions, setSeifenOptions] = useState([]);
  const [aromaOptions, setAromaOptions] = useState(['Vanille', 'Sandelholz', 'Minze', 'Yasmin', 'Lavendel']);
  const [seifenformOptions, setSeifenformOptions] = useState([]);
  const [verpackungOptions, setVerpackungOptions] = useState([]);
  
  // State für neue Einträge Dialog
  const [newEntryDialog, setNewEntryDialog] = useState({ open: false, type: '', value: '' });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Auth-Header für API-Aufrufe
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const getAuthHeadersFormData = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/portfolio`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Laden der Produkte: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Lade dynamische Optionen (optimiert)
  const loadOptions = useCallback(async () => {
    try {
      console.log('🚀 Loading options from optimized endpoint...');
      
      // 🚀 PERFORMANCE: Alle Optionen in einem Call
      const response = await fetch(`${API_BASE}/admin/portfolio/options`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        const { rohseifen, verpackungen, duftoele } = data.data;
        
        // Rohseifen verarbeiten
        const seifenList = rohseifen.map(item => item.bezeichnung);
        setSeifenOptions([...new Set(seifenList)]);

        // Verpackungen verarbeiten  
        const verpackungList = verpackungen.map(item => item.bezeichnung);
        const existingVerpackungen = [...new Set(products.map(p => p.verpackung).filter(Boolean))];
        const orphanedVerpackungen = existingVerpackungen.filter(v => !verpackungList.includes(v));
        
        if (orphanedVerpackungen.length > 0) {
          console.warn('⚠️ Veraltete Verpackungen in Portfolio gefunden:', orphanedVerpackungen);
        }
        
        const allVerpackungOptions = [...verpackungList, ...orphanedVerpackungen.map(v => `${v} (VERALTET)`)];
        setVerpackungOptions([...new Set(allVerpackungOptions)]);

        // Duftöle verarbeiten
        const aromaList = duftoele.map(item => item.bezeichnung);
        const existingAromen = [...new Set(products.map(p => p.aroma).filter(Boolean))];
        const filteredExistingAromen = existingAromen.filter(a => !aromaList.includes(a));
        
        setAromaOptions([...new Set([...aromaList, ...filteredExistingAromen])]);
        
        console.log('✅ Options loaded successfully from optimized endpoint');
      }
    } catch (error) {
      console.warn('Failed to load from optimized endpoint, falling back to individual calls');
      // Fallback zu alten einzelnen Calls falls neue Route nicht verfügbar
      await loadOptionsLegacy();
    }
  }, [products]);
  
  // Legacy-Fallback (für Rückwärtskompatibilität)
  const loadOptionsLegacy = async () => {
    try {
      // Rohseifen laden (inkl. inaktive für Produktplanung)
      const rohseifeResponse = await fetch(`${API_BASE}/rohseife?includeUnavailable=true`, {
        headers: getAuthHeaders()
      });
      const rohseifeData = await rohseifeResponse.json();
      
      if (rohseifeData.success) {
        const seifenList = rohseifeData.data.map(item => item.bezeichnung);
        setSeifenOptions([...new Set(seifenList)]); // Duplikate entfernen
      }

      // Nur echte Verpackungen laden (nicht gemischte Rohstoffe)
      const verpackungResponse = await fetch(`${API_BASE}/verpackungen?includeUnavailable=true`, {
        headers: getAuthHeaders()
      });
      const verpackungData = await verpackungResponse.json();
      
      if (verpackungData.success) {
        const verpackungList = verpackungData.data.map(item => item.bezeichnung);
        
        // ⚠️ DATENBANK-KONSISTENZ: Nur DB-Verpackungen als primäre Optionen
        const primaryOptions = verpackungList;
        
        // Bestehende Verpackungen aus Produkten prüfen (für Datenbereinigung)
        const existingVerpackungen = [...new Set(products.map(p => p.verpackung).filter(Boolean))];
        const orphanedVerpackungen = existingVerpackungen.filter(v => !verpackungList.includes(v));
        
        // Warnung wenn veraltete Verpackungen gefunden werden
        if (orphanedVerpackungen.length > 0) {
          console.warn('⚠️ Veraltete Verpackungen in Portfolio gefunden:', orphanedVerpackungen);
          console.warn('Diese sollten in der Verpackungen-Verwaltung angelegt oder Produkte aktualisiert werden.');
        }
        
        // Primäre DB-Optionen + veraltete (für Bearbeitung bestehender Produkte)
        const allOptions = [...primaryOptions, ...orphanedVerpackungen.map(v => `${v} (VERALTET)`)];
        setVerpackungOptions([...new Set(allOptions)]);
      }

      // Nur echte Duftöle laden (nicht gemischte Rohstoffe)  
      const duftoelResponse = await fetch(`${API_BASE}/duftoele?includeUnavailable=true`, {
        headers: getAuthHeaders()
      });
      const duftoelData = await duftoelResponse.json();
      
      if (duftoelData.success) {
        const aromaList = duftoelData.data.map(item => item.bezeichnung);
        
        // Bestehende Aromen aus Produkten hinzufügen (falls nicht in DB)
        const existingAromen = [...new Set(products.map(p => p.aroma).filter(Boolean))];
        const filteredExistingAromen = existingAromen.filter(a => !aromaList.includes(a));
        
        setAromaOptions([...new Set([...aromaList, ...filteredExistingAromen])]);
      }

      // Seifenformen aus bestehenden Produkten extrahieren und mit Standards kombinieren
      const existingForms = [...new Set(products.map(p => p.seifenform).filter(Boolean))];
      const defaultForms = ['quadratisch', 'Bienenwabe', 'Fight Club', 'Soap länglich'];
      setSeifenformOptions([...new Set([...defaultForms, ...existingForms])]);

    } catch (error) {
      console.error('Fehler beim Laden der Optionen:', error);
    }
  };

  // Neue Option erstellen
  const createNewOption = async (type, value) => {
    try {
      let endpoint = '';
      let payload = {};
      
      switch (type) {
        case 'seifenform':
          // Seifenformen werden nur lokal zur Liste hinzugefügt
          setSeifenformOptions(prev => [...new Set([...prev, value])]);
          setFormData(prev => ({ ...prev, seifenform: value }));
          setNewEntryDialog({ open: false, type: '', value: '' });
          return;
          
        case 'verpackung':
          endpoint = '/verpackungen';
          payload = {
            bezeichnung: value,
            form: 'sonstiges',
            menge: 100,
            kostenInEuro: 0.10,
            kostenProStueck: 0.001,
            verfuegbar: true,
            aktuellVorrat: 0,
            mindestbestand: 10
          };
          break;
          
        case 'seife':
          endpoint = '/rohseife';
          payload = {
            bezeichnung: value,
            typ: 'Seife',
            bestand: 0,
            mindestbestand: 5,
            einheit: 'kg',
            preis: 0,
            verfuegbar: true
          };
          break;
          
        default:
          return;
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSnackbar(`Neue ${type === 'verpackung' ? 'Verpackung' : 'Seife'} erstellt!`, 'success');
        
        // Optionen neu laden
        await loadOptions();
        
        // Formular-Wert setzen
        const fieldName = type === 'seife' ? 'seife' : type;
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        
        setNewEntryDialog({ open: false, type: '', value: '' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar(`Fehler beim Erstellen: ${error.message}`, 'error');
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/portfolio/stats`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    const userRole = user?.rolle || user?.role;
    if (user && userRole === 'admin') {
      loadProducts();
      loadStats();
    }
  }, [user, loadProducts, loadStats]);

  // Separater useEffect für das Laden der Optionen nach dem Laden der Produkte
  useEffect(() => {
    if (products.length > 0) {
      loadOptions();
    }
  }, [products, loadOptions]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Funktion zur Berechnung der nächsten verfügbaren Reihenfolge-Nummer
  const getNextAvailableOrder = () => {
    if (products.length === 0) {
      return 0; // Erstes Produkt bekommt Reihenfolge 0
    }
    
    // Finde die höchste Reihenfolge-Nummer und addiere 1
    const maxOrder = Math.max(...products.map(p => p.reihenfolge || 0));
    return maxOrder + 1;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      seife: '',
      gramm: '',
      aroma: '',
      seifenform: '',
      zusatz: '',
      optional: '',
      verpackung: '',
      aktiv: false, // ✅ Neue Produkte standardmäßig inaktiv
      reihenfolge: getNextAvailableOrder(), // ✅ Automatisch nächste verfügbare Nummer
      // Erweiterte Rohseifen-Konfiguration
      rohseifenKonfiguration: {
        verwendeZweiRohseifen: false,
        seife2: '',
        gewichtVerteilung: {
          seife1Prozent: 50,
          seife2Prozent: 50
        }
      },
      // Beschreibungsfelder
      beschreibung: {
        kurz: '',
        lang: '',
        inhaltsstoffe: '',
        anwendung: '',
        besonderheiten: ''
      }
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = async (product = null) => {
    if (product) {
      // 🔍 DEBUG: Zeige Produkt-Daten beim Dialog-Öffnen
      console.log('🔍 DIALOG ÖFFNEN - Original Product Data:', product);
      console.log('🔍 DIALOG ÖFFNEN - Rohseifen-Konfiguration:', product.rohseifenKonfiguration);
      
      // Bei Edit: Aktuelle Daten vom Server holen um sicherzustellen, dass wir die neuesten Daten haben
      let currentProduct = product;
      if (product._id) {
        try {
          const response = await fetch(`${API_BASE}/admin/portfolio/${product._id}`, {
            headers: getAuthHeaders()
          });
          const data = await response.json();
          if (data.success && data.data) {
            currentProduct = data.data;
            console.log('🔍 DIALOG ÖFFNEN - Aktuelle Server-Daten:', currentProduct);
            console.log('🔍 DIALOG ÖFFNEN - Server Rohseifen-Konfiguration:', currentProduct.rohseifenKonfiguration);
          }
        } catch (error) {
          console.warn('Fehler beim Laden aktueller Produktdaten:', error);
          // Bei Fehler verwenden wir die übergebenen Daten
        }
      }
      
      // Erst die Optionen mit den Produktwerten erweitern
      if (currentProduct.seifenform && !seifenformOptions.includes(currentProduct.seifenform)) {
        setSeifenformOptions(prev => [...prev, currentProduct.seifenform]);
      }
      if (currentProduct.verpackung && !verpackungOptions.includes(currentProduct.verpackung)) {
        setVerpackungOptions(prev => [...prev, currentProduct.verpackung]);
      }
      if (currentProduct.seife && !seifenOptions.includes(currentProduct.seife)) {
        setSeifenOptions(prev => [...prev, currentProduct.seife]);
      }
      if (currentProduct.aroma && !aromaOptions.includes(currentProduct.aroma)) {
        setAromaOptions(prev => [...prev, currentProduct.aroma]);
      }
      
      setFormData({
        name: product.name,
        seife: product.seife,
        gramm: product.gramm.toString(),
        aroma: product.aroma,
        seifenform: product.seifenform,
        zusatz: product.zusatz || '',
        optional: product.optional || '',
        verpackung: product.verpackung,
        aktiv: product.aktiv,
        reihenfolge: product.reihenfolge.toString(),
        // 🧪 Erweiterte Rohseifen-Konfiguration laden - mit Debug
        rohseifenKonfiguration: {
          verwendeZweiRohseifen: currentProduct.rohseifenKonfiguration?.verwendeZweiRohseifen || false,
          seife2: currentProduct.rohseifenKonfiguration?.seife2 || '',
          gewichtVerteilung: {
            seife1Prozent: currentProduct.rohseifenKonfiguration?.gewichtVerteilung?.seife1Prozent || 50,
            seife2Prozent: currentProduct.rohseifenKonfiguration?.gewichtVerteilung?.seife2Prozent || 50
          }
        },
        // Beschreibungsfelder laden
        beschreibung: {
          kurz: product.beschreibung?.kurz || '',
          lang: product.beschreibung?.lang || '',
          inhaltsstoffe: product.beschreibung?.inhaltsstoffe || '',
          anwendung: product.beschreibung?.anwendung || '',
          besonderheiten: product.beschreibung?.besonderheiten || ''
        }
      });
      
      console.log('🔍 DIALOG ÖFFNEN - FormData gesetzt mit verwendeZweiRohseifen:', 
        currentProduct.rohseifenKonfiguration?.verwendeZweiRohseifen);
      
      setEditingProduct(currentProduct);
    } else {
      // Für neue Produkte: automatisch nächste Reihenfolge setzen
      const nextOrder = getNextAvailableOrder();
      setFormData({
        name: '',
        seife: '',
        gramm: '',
        aroma: '',
        seifenform: '',
        zusatz: '',
        optional: '',
        verpackung: '',
        aktiv: false, // ✅ Neue Produkte standardmäßig inaktiv
        reihenfolge: nextOrder.toString(), // ✅ Automatisch nächste verfügbare Nummer
        // Beschreibungsfelder
        beschreibung: {
          kurz: '',
          lang: '',
          inhaltsstoffe: '',
          anwendung: '',
          besonderheiten: ''
        }
      });
      setEditingProduct(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    // 🔍 DEBUG: Zeige alle Input-Events
    console.log('🔍 INPUT CHANGE EVENT:', {
      name,
      value,
      checked,
      type,
      target: e.target,
      eventType: e.type
    });
    
    // Prüfen, ob "Neu erstellen..." ausgewählt wurde
    if (value === '__CREATE_NEW__') {
      handleCreateNew(name);
      return;
    }
    
    // Prüfen, ob es sich um ein Beschreibungsfeld handelt
    if (name.startsWith('beschreibung.')) {
      const fieldName = name.split('.')[1]; // z.B. 'kurz' aus 'beschreibung.kurz'
      setFormData(prev => ({
        ...prev,
        beschreibung: {
          ...prev.beschreibung,
          [fieldName]: value
        }
      }));
    }
    // Prüfen, ob es sich um Rohseifen-Konfiguration handelt
    else if (name.startsWith('rohseifenKonfiguration.')) {
      console.log('🔍 ROHSEIFEN KONFIGURATION EVENT:', { name, value, checked, type });
      
      const fieldParts = name.split('.'); // z.B. ['rohseifenKonfiguration', 'gewichtVerteilung', 'seife1Prozent']
      
      if (fieldParts.length === 2) {
        // Direkte Felder wie 'rohseifenKonfiguration.verwendeZweiRohseifen'
        const fieldName = fieldParts[1];
        
        console.log('🔍 ROHSEIFEN DIREKT-FELD UPDATE:', {
          fieldName,
          oldValue: formData.rohseifenKonfiguration[fieldName],
          newValue: type === 'checkbox' ? checked : value
        });
        
        setFormData(prev => {
          const newData = {
            ...prev,
            rohseifenKonfiguration: {
              ...prev.rohseifenKonfiguration,
              [fieldName]: type === 'checkbox' ? checked : value
            }
          };
          console.log('🔍 NEUE FORMDATA nach Rohseifen-Update:', newData);
          return newData;
        });
      } else if (fieldParts.length === 3) {
        // Verschachtelte Felder wie 'rohseifenKonfiguration.gewichtVerteilung.seife1Prozent'
        const groupName = fieldParts[1]; // 'gewichtVerteilung'
        const fieldName = fieldParts[2]; // 'seife1Prozent'
        
        setFormData(prev => ({
          ...prev,
          rohseifenKonfiguration: {
            ...prev.rohseifenKonfiguration,
            [groupName]: {
              ...prev.rohseifenKonfiguration[groupName],
              [fieldName]: type === 'number' ? parseFloat(value) || 0 : value
            }
          }
        }));
      }
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Navigation zu entsprechender Admin-Seite für neuen Eintrag
  const handleCreateNew = (type) => {
    // Dialog schließen damit der Benutzer weiß, dass navigiert wird
    setOpenDialog(false);
    
    switch (type) {
      case 'verpackung':
        showSnackbar('Weiterleitung zur Verpackungen-Verwaltung...', 'info');
        setTimeout(() => navigate('/admin/rohstoffe?tab=verpackungen&action=create&autoOpen=true'), 1000);
        break;
      case 'seife':
        showSnackbar('Weiterleitung zur Rohseifen-Verwaltung...', 'info');
        setTimeout(() => navigate('/admin/rohstoffe?tab=rohseifen&action=create&autoOpen=true'), 1000);
        break;
      case 'aroma':
        showSnackbar('Weiterleitung zur Duftöl-Verwaltung...', 'info');
        setTimeout(() => navigate('/admin/rohstoffe?tab=duftoele&action=create&autoOpen=true'), 1000);
        break;
      case 'seifenform':
        // Für Seifenformen zeigen wir weiterhin den Dialog, da diese nicht in Rohstoffe verwaltet werden
        setNewEntryDialog({ open: true, type: 'seifenform', value: '' });
        setOpenDialog(true); // Dialog wieder öffnen
        break;
      default:
        console.log('Unbekannter Typ:', type);
    }
  };

  // Handler um das Dialog zu schließen
  const handleCloseNewEntryDialog = () => {
    setNewEntryDialog({ open: false, type: '', value: '' });
  };

  // Handler um neue Option zu speichern
  const handleSaveNewEntry = async () => {
    const { type, value } = newEntryDialog;
    if (!value.trim()) return;

    try {
      await createNewOption(type, value);
      showSnackbar(`Neue ${type === 'seifenform' ? 'Seifenform' : 'Verpackung'} erfolgreich erstellt!`);
      
      // Option in FormData setzen
      setFormData(prev => ({ ...prev, [type]: value }));
      
      // Dialog schließen
      handleCloseNewEntryDialog();
    } catch (error) {
      showSnackbar(`Fehler beim Erstellen: ${error.message}`, 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      // 🔍 DEBUG: Zeige aktuelle formData vor dem Speichern
      console.log('🔍 PORTFOLIO SUBMIT - FormData vor Speicherung:', JSON.stringify(formData, null, 2));
      console.log('🔍 PORTFOLIO SUBMIT - Rohseifen-Konfiguration:', formData.rohseifenKonfiguration);
      
      // 🔍 VALIDIERUNG: Prüfe Verpackung vor Speicherung
      const verpackungName = formData.verpackung;
      
      // Prüfe ob Verpackung als "VERALTET" markiert ist
      if (verpackungName && verpackungName.includes('(VERALTET)')) {
        const confirmed = window.confirm(
          `⚠️ Sie verwenden eine veraltete Verpackung: "${verpackungName}"\n\n` +
          'Diese Verpackung existiert nicht mehr in der Verpackungen-Verwaltung und kann Probleme ' +
          'in der Warenberechnung verursachen.\n\n' +
          'Möchten Sie trotzdem speichern?\n\n' +
          '💡 Empfehlung: Wählen Sie eine aktuelle Verpackung aus oder legen Sie die Verpackung ' +
          'in der Verpackungen-Verwaltung an.'
        );
        
        if (!confirmed) {
          return;
        }
      }
      
      // Prüfe ob Verpackung in verfügbaren Optionen ist (ohne VERALTET-Markierung)
      const verfuegbareVerpackungen = verpackungOptions.filter(v => !v.includes('(VERALTET)'));
      if (verpackungName && !verfuegbareVerpackungen.includes(verpackungName) && !verpackungName.includes('(VERALTET)')) {
        showSnackbar('⚠️ Bitte wählen Sie eine verfügbare Verpackung aus.', 'error');
        return;
      }
      
      const url = editingProduct 
        ? `${API_BASE}/admin/portfolio/${editingProduct._id}`
        : `${API_BASE}/admin/portfolio`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        
        // Cache invalidieren und Updates propagieren
        invalidateProductsCache();
        
        // Erst die Produkte neu laden, dann den Dialog schließen
        await loadProducts();
        await loadStats();
        
        // Dialog schließen nachdem die neuen Daten geladen sind
        handleCloseDialog();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/portfolio/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        
        // Cache invalidieren und Updates propagieren
        invalidateProductsCache();
        
        loadProducts();
        loadStats();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Löschen: ' + error.message, 'error');
    }
  };

  const handleImageUpload = async (productId, file, isHauptbild = false) => {
    setUploadingImage(productId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isHauptbild', isHauptbild.toString());
      formData.append('alt_text', `${products.find(p => p._id === productId)?.name} Produktbild`);

      const response = await fetch(`${API_BASE}/admin/portfolio/${productId}/upload-image`, {
        method: 'POST',
        headers: getAuthHeadersFormData(),
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Upload: ' + error.message, 'error');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (productId, imageType, imageIndex = null) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Bild löschen möchten?')) {
      return;
    }

    try {
      const url = imageIndex !== null 
        ? `${API_BASE}/admin/portfolio/${productId}/image/${imageType}/${imageIndex}`
        : `${API_BASE}/admin/portfolio/${productId}/image/${imageType}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Löschen: ' + error.message, 'error');
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Base64-Bilder direkt zurückgeben
    if (imageUrl.startsWith('data:image/')) return imageUrl;
    return imageUrl.startsWith('/api/') ? `${API_BASE.replace('/api', '')}${imageUrl}` : imageUrl;
  };

  const userRole = user?.rolle || user?.role;
  if (!user || userRole !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Sie haben keine Berechtigung für den Admin-Bereich.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 2 : 3}>
      {/* Upload Progress */}
      {uploadingImage && (
        <Box mb={2}>
          <LinearProgress />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
            Bild wird optimiert und hochgeladen...
          </Typography>
        </Box>
      )}

      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'}
        mb={3}
        gap={isMobile ? 2 : 0}
      >
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          Portfolio-Verwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size={isMobile ? "medium" : "large"}
          fullWidth={isMobile}
        >
          Neues Produkt
        </Button>
      </Box>

      {/* Statistiken */}
      {stats && (
        <Grid container spacing={isMobile ? 1 : 2} mb={3}>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "caption" : "body2"}>
                  Gesamt
                </Typography>
                <Typography variant={isMobile ? "h6" : "h5"}>
                  {stats.totalProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "caption" : "body2"}>
                  Aktiv
                </Typography>
                <Typography variant={isMobile ? "h6" : "h5"} color="primary">
                  {stats.activeProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "caption" : "body2"}>
                  Mit Bilder
                </Typography>
                <Typography variant={isMobile ? "h6" : "h5"} color="success.main">
                  {stats.productsWithImages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "caption" : "body2"}>
                  Ohne Bilder
                </Typography>
                <Typography variant={isMobile ? "h6" : "h5"} color="warning.main">
                  {stats.productsWithoutImages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Produktliste */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={6} lg={4} key={product._id}>
            <Card>
              {/* Hauptbild mit LazyImage */}
              {product.bilder?.hauptbild ? (
                <Box position="relative">
                  <LazyImage
                    src={getImageUrl(product.bilder.hauptbild)}
                    alt={product.bilder.alt_text || product.name}
                    height={isMobile ? 150 : 200}
                    objectFit="cover"
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                    onClick={() => handleImageDelete(product._id, 'hauptbild')}
                  >
                    <DeleteForeverIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  height={isMobile ? 150 : 200}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="grey.100"
                >
                  <Typography color="textSecondary" variant="body2">
                    Kein Hauptbild
                  </Typography>
                </Box>
              )}

              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="h2">
                    {product.name}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip
                      size="small"
                      label={product.aktiv ? 'Aktiv' : 'Inaktiv'}
                      color={product.aktiv ? 'success' : 'default'}
                    />
                    <Chip
                      size="small"
                      label={`#${product.reihenfolge}`}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Typography color="textSecondary" gutterBottom>
                  {product.seife} • {product.aroma} • {product.gramm}g
                </Typography>

                <Typography variant="body2" color="textSecondary" mb={2}>
                  Form: {product.seifenform} | Verpackung: {product.verpackung}
                </Typography>

                {/* Galerie-Bilder */}
                {product.bilder?.galerie?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Galerie ({product.bilder.galerie.length} Bilder):
                    </Typography>
                    <ImageList cols={isMobile ? 2 : 3} rowHeight={isMobile ? 50 : 60}>
                      {product.bilder.galerie.map((img, index) => (
                        <ImageListItem key={index}>
                          <LazyImage
                            src={getImageUrl(img.url)}
                            alt={img.alt_text}
                            height={isMobile ? 50 : 60}
                            objectFit="cover"
                          />
                          <ImageListItemBar
                            actionIcon={
                              <IconButton
                                size="small"
                                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                onClick={() => handleImageDelete(product._id, 'galerie', index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ flexWrap: 'wrap', p: isMobile ? 1 : 1.5, gap: isMobile ? 0.5 : 0 }}>
                <Button
                  size="small"
                  startIcon={!isMobile && <EditIcon />}
                  onClick={() => handleOpenDialog(product)}
                  fullWidth={isMobile}
                >
                  {isMobile ? <EditIcon /> : 'Bearbeiten'}
                </Button>
                
                {/* Bild-Upload */}
                <Tooltip title="Hauptbild hochladen">
                  <IconButton
                    component="label"
                    size="small"
                    disabled={uploadingImage === product._id}
                  >
                    {uploadingImage === product._id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PhotoCameraIcon />
                    )}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(product._id, e.target.files[0], true);
                        }
                      }}
                    />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Galerie-Bild hinzufügen">
                  <IconButton
                    component="label"
                    size="small"
                    disabled={uploadingImage === product._id}
                  >
                    <ImageIcon />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(product._id, e.target.files[0], false);
                        }
                      }}
                    />
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => handleDelete(product._id)}
                >
                  Löschen
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {products.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Noch keine Produkte vorhanden
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Erstes Produkt erstellen
          </Button>
        </Box>
      )}

      {/* Dialog für Produkt erstellen/bearbeiten */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Produktname"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Seifentyp</InputLabel>
                <Select
                  name="seife"
                  value={formData.seife}
                  onChange={handleInputChange}
                  label="Seifentyp"
                  required
                >
                  {seifenOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gewicht (g)"
                name="gramm"
                type="number"
                value={formData.gramm}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            {/* 🧪 ERWEITERTE ROHSEIFEN-KONFIGURATION */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                🧪 Rohseifen-Konfiguration (Debug: {formData.rohseifenKonfiguration.verwendeZweiRohseifen ? 'AKTIV' : 'INAKTIV'})
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.rohseifenKonfiguration.verwendeZweiRohseifen}
                    onChange={handleInputChange}
                    name="rohseifenKonfiguration.verwendeZweiRohseifen"
                  />
                }
                label="Dieses Produkt verwendet zwei verschiedene Rohseifen"
              />
            </Grid>
            
            {/* Zweite Rohseife nur anzeigen wenn aktiviert */}
            {formData.rohseifenKonfiguration.verwendeZweiRohseifen && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Zweite Rohseife</InputLabel>
                    <Select
                      name="rohseifenKonfiguration.seife2"
                      value={formData.rohseifenKonfiguration.seife2}
                      onChange={handleInputChange}
                      label="Zweite Rohseife"
                      required
                    >
                      {seifenOptions
                        .filter(option => option !== formData.seife) // Keine Doppelung
                        .map(option => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Gewichtsverteilung
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label={`${formData.seife || 'Seife 1'} (%)`}
                    name="rohseifenKonfiguration.gewichtVerteilung.seife1Prozent"
                    type="number"
                    value={formData.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange(e);
                      // Automatisch zweite Seife anpassen
                      setFormData(prev => ({
                        ...prev,
                        rohseifenKonfiguration: {
                          ...prev.rohseifenKonfiguration,
                          gewichtVerteilung: {
                            ...prev.rohseifenKonfiguration.gewichtVerteilung,
                            seife2Prozent: 100 - value
                          }
                        }
                      }));
                    }}
                    inputProps={{ min: 0, max: 100 }}
                    helperText={`${Math.round(formData.gramm * formData.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent / 100)}g`}
                  />
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label={`${formData.rohseifenKonfiguration.seife2 || 'Seife 2'} (%)`}
                    name="rohseifenKonfiguration.gewichtVerteilung.seife2Prozent"
                    type="number"
                    value={formData.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange(e);
                      // Automatisch erste Seife anpassen
                      setFormData(prev => ({
                        ...prev,
                        rohseifenKonfiguration: {
                          ...prev.rohseifenKonfiguration,
                          gewichtVerteilung: {
                            ...prev.rohseifenKonfiguration.gewichtVerteilung,
                            seife1Prozent: 100 - value
                          }
                        }
                      }));
                    }}
                    inputProps={{ min: 0, max: 100 }}
                    helperText={`${Math.round(formData.gramm * formData.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent / 100)}g`}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>Gewichtsverteilung:</strong> Die beiden Prozentwerte sollten zusammen 100% ergeben.
                    Das Gesamtgewicht von {formData.gramm}g wird entsprechend aufgeteilt.
                  </Alert>
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Aroma</InputLabel>
                <Select
                  name="aroma"
                  value={formData.aroma}
                  onChange={handleInputChange}
                  label="Aroma"
                  required
                >
                  {aromaOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                  <MenuItem value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Neues Duftöl erstellen...
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Seifenform</InputLabel>
                <Select
                  name="seifenform"
                  value={formData.seifenform}
                  onChange={handleInputChange}
                  label="Seifenform"
                  required
                >
                  {seifenformOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                  <MenuItem value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Neue Seifenform erstellen...
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Verpackung</InputLabel>
                <Select
                  name="verpackung"
                  value={formData.verpackung}
                  onChange={handleInputChange}
                  label="Verpackung"
                  required
                >
                  {verpackungOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                  <MenuItem value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Neue Verpackung erstellen...
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zusatz"
                name="zusatz"
                value={formData.zusatz}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Optional"
                name="optional"
                value={formData.optional}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Produktbeschreibung Sektion */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                📝 Produktbeschreibung
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Kurze Beschreibung"
                name="beschreibung.kurz"
                value={formData.beschreibung.kurz}
                onChange={handleInputChange}
                multiline
                rows={2}
                inputProps={{ maxLength: 200 }}
                helperText={`${formData.beschreibung.kurz.length}/200 Zeichen - Wird auf Produktkarten angezeigt`}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ausführliche Beschreibung"
                name="beschreibung.lang"
                value={formData.beschreibung.lang}
                onChange={handleInputChange}
                multiline
                rows={4}
                helperText="Detaillierte Produktbeschreibung für die Produktdetailseite"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Inhaltsstoffe"
                name="beschreibung.inhaltsstoffe"
                value={formData.beschreibung.inhaltsstoffe}
                onChange={handleInputChange}
                multiline
                rows={3}
                helperText="Alle verwendeten Inhaltsstoffe auflisten"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Anwendung"
                name="beschreibung.anwendung"
                value={formData.beschreibung.anwendung}
                onChange={handleInputChange}
                multiline
                rows={3}
                helperText="Anwendungshinweise für das Produkt"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Besonderheiten"
                name="beschreibung.besonderheiten"
                value={formData.beschreibung.besonderheiten}
                onChange={handleInputChange}
                helperText="Besondere Eigenschaften (z.B. Vegan, Handmade, Ohne Palmöl)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reihenfolge"
                name="reihenfolge"
                type="number"
                value={formData.reihenfolge}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.aktiv}
                    onChange={handleInputChange}
                    name="aktiv"
                  />
                }
                label="Aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProduct ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für neue Einträge erstellen */}
      <Dialog open={newEntryDialog.open} onClose={handleCloseNewEntryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Neue {newEntryDialog.type === 'seifenform' ? 'Seifenform' : 'Verpackung'} erstellen
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={newEntryDialog.type === 'seifenform' ? 'Seifenform Name' : 'Verpackung Name'}
            fullWidth
            variant="outlined"
            value={newEntryDialog.value}
            onChange={(e) => setNewEntryDialog(prev => ({ ...prev, value: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewEntryDialog}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveNewEntry} variant="contained" disabled={!newEntryDialog.value.trim()}>
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPortfolio;