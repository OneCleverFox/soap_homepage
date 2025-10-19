import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Stack,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const AdminLager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false); // Neuer State für Speichern-Loading
  
  // Dialog States
  const [inventurDialog, setInventurDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form States
  const [inventurForm, setInventurForm] = useState({
    typ: '',
    artikelId: '',
    neuerBestand: '',
    notizen: '',
    aktuellerBestand: 0,
    einheit: '',
    produktDetails: {
      name: '',
      beschreibung: '',
      preis: 0,
      mindestbestand: 0,
      verfuegbar: true,
      zusatzinfo: {}
    }
  });
  
  const [historie, setHistorie] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Rohstoff-Info für Fertigprodukte
  const [rohstoffInfo, setRohstoffInfo] = useState(null);
  
  // Data states für alle Produkttypen
  const [data, setData] = useState({
    fertigprodukte: [],
    rohseifen: [],
    duftoele: [],
    verpackungen: []
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Auth-Header für API-Aufrufe
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Rate-limited API call function
  const makeAPICall = useCallback(async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${API_BASE}${url}`, {
          headers: getAuthHeaders()
        });
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          console.warn(`Rate limited (429) for ${url}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [API_BASE]);

  // Alle Daten sequenziell laden (verhindert Rate Limiting)
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const endpoints = [
        { key: 'fertigprodukte', url: '/portfolio' },
        { key: 'rohseifen', url: '/rohseife?includeUnavailable=true' },
        { key: 'duftoele', url: '/duftoele?includeUnavailable=true' },
        { key: 'verpackungen', url: '/verpackungen?includeUnavailable=true' }
      ];

      const newData = {};
      
      // Sequenziell laden mit kleinen Delays
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Lade ${endpoint.key}...`);
          const result = await makeAPICall(endpoint.url);
          
          if (result && result.success) {
            newData[endpoint.key] = result.data || [];
          } else {
            console.error(`Fehler beim Laden von ${endpoint.key}:`, result?.message || 'Unbekannter Fehler');
            newData[endpoint.key] = [];
          }
          
          // Kurze Pause zwischen Requests
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Fehler beim Laden von ${endpoint.key}:`, error.message);
          newData[endpoint.key] = [];
        }
      }

      setData(newData);
      console.log('✅ Alle Lagerdaten geladen:', newData);
    } catch (error) {
      console.error('Fehler beim Laden der Lagerdaten:', error);
    } finally {
      setLoading(false);
    }
  }, [makeAPICall]);

  // UseEffect mit Cleanup und Rate Limiting
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadAllData();
      }
    };
    
    // Slight delay to prevent React Strict Mode double calls
    const timer = setTimeout(loadData, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadAllData]);

  // 🎯 Moderne React-Reaktivität: Nur bei Tab-Fokus und Visibility-Änderungen
  // 🎯 Moderne React-Reaktivität: Nur bei Tab-Fokus und Visibility-Änderungen
  // 🎯 Moderne React-Reaktivität: Nur bei wirklich längerer Inaktivität
  const subscribeToUpdates = useCallback(() => {
    // Browser-Tab-Fokus: Aktualisiere Daten nur bei sehr langer Inaktivität (30 Minuten)
    let lastFocusTime = Date.now();
    
    const handleFocus = () => {
      const timeSinceLastFocus = Date.now() - lastFocusTime;
      const THIRTY_MINUTES = 30 * 60 * 1000; // 30 Minuten statt 5
      
      if (timeSinceLastFocus > THIRTY_MINUTES) {
        console.log('🎯 Tab sehr lange inaktiv (30+ min): Lade aktuelle Daten...');
        loadAllData();
      }
      lastFocusTime = Date.now();
    };

    const handleBlur = () => {
      lastFocusTime = Date.now();
    };

    // Visibility API: Nur bei sehr langer Abwesenheit aktualisieren
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastFocus = Date.now() - lastFocusTime;
        const THIRTY_MINUTES = 30 * 60 * 1000; // 30 Minuten statt 5
        
        if (timeSinceLastFocus > THIRTY_MINUTES) {
          console.log('🎯 Seite sehr lange nicht sichtbar (30+ min): Lade aktuelle Daten...');
          loadAllData();
        }
        lastFocusTime = Date.now();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllData]);

  useEffect(() => {
    const cleanup = subscribeToUpdates();
    return cleanup;
  }, [subscribeToUpdates]);

  // 🔄 Event-basierte Reaktivität: State-Änderungen triggern Updates
  const updateSingleProductType = useCallback((produktTyp, artikelId, newData) => {
    setData(prevData => {
      const typeKey = produktTyp === 'fertigprodukt' ? 'fertigprodukte' : 
                     produktTyp === 'rohseife' ? 'rohseifen' :
                     produktTyp === 'duftoele' ? 'duftoele' : 'verpackungen';
      
      if (!prevData[typeKey]) return prevData;
      
      return {
        ...prevData,
        [typeKey]: prevData[typeKey].map(item => 
          item._id === artikelId ? { ...item, ...newData } : item
        )
      };
    });
  }, []);

  // Nur Rohstoff-Daten aktualisieren (optimiert)
  const refreshRohstoffData = useCallback(async () => {
    try {
      console.log('🔄 Aktualisiere nur Rohstoff-Daten...');
      
      const [rohseifeResponse, duftoeleResponse, verpackungenResponse] = await Promise.all([
        makeAPICall('/rohseife?includeUnavailable=true'),
        makeAPICall('/duftoele?includeUnavailable=true'), 
        makeAPICall('/verpackungen?includeUnavailable=true')
      ]);

      setData(prevData => ({
        ...prevData,
        rohseifen: rohseifeResponse?.data || prevData.rohseifen,
        duftoele: duftoeleResponse?.data || prevData.duftoele,
        verpackungen: verpackungenResponse?.data || prevData.verpackungen
      }));
      
      console.log('✅ Rohstoff-Daten reaktiv aktualisiert');
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Rohstoff-Daten:', error);
    }
  }, [makeAPICall]);

  // Rohstoff-Informationen für Fertigprodukt laden
  const loadRohstoffInfo = useCallback(async (produktId) => {
    try {
      // Debug: API-URL prüfen
      console.log('🔍 Debug - API_BASE:', API_BASE);
      console.log('🔍 Debug - Full URL:', `${API_BASE}/lager/fertigprodukt-rohstoffe/${produktId}`);
      
      const response = await fetch(`${API_BASE}/lager/fertigprodukt-rohstoffe/${produktId}`, {
        headers: getAuthHeaders()
      });
      
      console.log('🔍 Debug - Response Status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRohstoffInfo(result.data);
          console.log('✅ Rohstoff-Info geladen:', result.data);
        } else {
          console.error('Fehler beim Laden der Rohstoff-Info:', result.message);
          setRohstoffInfo(null);
        }
      } else {
        console.error('API-Fehler beim Laden der Rohstoff-Info:', response.status);
        const errorText = await response.text();
        console.error('Response Text:', errorText);
        setRohstoffInfo(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rohstoff-Info:', error);
      setRohstoffInfo(null);
    }
  }, [API_BASE]);

  // Inventur-Dialog öffnen
  const openInventurDialog = (item, typ) => {
    console.log('📋 Inventur für:', item);
    console.log('🔍 Debug - Item Eigenschaften:', {
      verfuegbareMenge: item.verfuegbareMenge,
      aktuellVorrat: item.aktuellVorrat,
      menge: item.menge,
      bestand: item.bestand,
      alle_eigenschaften: Object.keys(item)
    });
    setSelectedItem(item);
    
    // Ermittle die richtige Maßeinheit basierend auf dem Produkttyp
    let einheit = '';
    let aktuellerBestand = 0;
    
    switch (typ) {
      case 'fertigprodukte':
        einheit = 'Stück';
        aktuellerBestand = item.verfuegbareMenge || 0;
        break;
      case 'rohseifen':
        einheit = 'g (Gramm)';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      case 'duftoele':
        einheit = 'ml (Milliliter)';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      case 'verpackungen':
        einheit = 'Stück';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      default:
        einheit = 'Einheiten';
        aktuellerBestand = item.verfuegbareMenge || item.aktuellVorrat || 0;
    }
    
    // Typ-Mapping für Backend-Kompatibilität
    let backendTyp;
    switch (typ) {
      case 'fertigprodukte':
        backendTyp = 'fertigprodukt';
        break;
      case 'rohseifen':
        backendTyp = 'rohseife';
        break;
      case 'duftoele':
        backendTyp = 'duftoele';
        break;
      case 'verpackungen':
        backendTyp = 'verpackungen';
        break;
      default:
        backendTyp = typ;
    }

    setInventurForm({
      typ: backendTyp,
      artikelId: item._id,
      neuerBestand: aktuellerBestand.toString(),
      notizen: '',
      aktuellerBestand: aktuellerBestand,
      einheit: einheit,
      produktDetails: {
        name: item.name || item.bezeichnung,
        beschreibung: item.beschreibung || item.aroma || item.seife || '',
        preis: item.preis || item.preis_pro_kg || item.preis_pro_ml || item.preis_pro_stueck || 0,
        mindestbestand: item.mindestbestand || 0,
        verfuegbar: item.aktiv !== undefined ? item.aktiv : item.verfuegbar,
        zusatzinfo: getZusatzinfo(item, typ)
      }
    });
    
    // Bei Fertigprodukten: Rohstoff-Informationen laden
    if (backendTyp === 'fertigprodukt') {
      loadRohstoffInfo(item._id);
    } else {
      setRohstoffInfo(null);
    }
    
    setInventurDialog(true);
  };

  // Hilfsfunktion für zusätzliche Produktinformationen
  const getZusatzinfo = (item, typ) => {
    switch (typ) {
      case 'fertigprodukte':
        return {
          seife: item.seife || '',
          aroma: item.aroma || '',
          gramm: item.gramm || '',
          reihenfolge: item.reihenfolge || ''
        };
      case 'rohseifen':
      case 'duftoele':
      case 'verpackungen':
        return {
          kategorie: item.kategorie || '',
          lieferant: item.lieferant || '',
          chargenNr: item.chargenNr || ''
        };
      default:
        return {};
    }
  };

  // 🚨 Rohstoff-Validierung für Fertigprodukte
  const validateRohstoffVerfuegbarkeit = () => {
    if (inventurForm.typ !== 'fertigprodukt' || !rohstoffInfo) {
      return { isValid: true, errors: [] };
    }
    
    const neueAnzahl = parseFloat(inventurForm.neuerBestand) || 0;
    const buchungsAnzahl = neueAnzahl - inventurForm.aktuellerBestand;
    
    // Bei negativen oder null Buchungen (weniger oder gleich Fertigprodukte) ist alles ok
    if (buchungsAnzahl <= 0) {
      return { isValid: true, errors: [] };
    }
    
    const errors = [];
    
    for (const rohstoff of rohstoffInfo.rohstoffe) {
      const benoetigt = rohstoff.proStueck * buchungsAnzahl;
      if (rohstoff.verfuegbar < benoetigt) {
        errors.push({
          name: rohstoff.name,
          benoetigt: benoetigt,
          verfuegbar: rohstoff.verfuegbar,
          einheit: rohstoff.einheit,
          fehlend: benoetigt - rohstoff.verfuegbar
        });
      }
    }
    
    return { 
      isValid: errors.length === 0, 
      errors: errors 
    };
  };

  // Historie-Dialog öffnen
  const openHistoryDialog = async (item, typ) => {
    setSelectedItem(item);
    setHistoryLoading(true);
    setHistoryDialog(true);
    
    try {
      const response = await fetch(`${API_BASE}/lager/bewegungen/${item._id}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        setHistorie(result.data || []);
      } else {
        console.error('Fehler beim Laden der Historie');
        setHistorie([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error);
      setHistorie([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Inventur speichern mit Rohstoff-Validierung
  const saveInventur = async () => {
    if (saving) return; // Verhindere Doppel-Speichern
    
    try {
      setSaving(true);
      
      // 🚨 WICHTIG: Bei Fertigprodukten erst Rohstoff-Verfügbarkeit prüfen
      if (inventurForm.typ === 'fertigprodukt') {
        const neueAnzahl = parseFloat(inventurForm.neuerBestand);
        const buchungsAnzahl = neueAnzahl - inventurForm.aktuellerBestand;
        
        // Nur bei positiven Buchungen (mehr Fertigprodukte) Rohstoffe prüfen
        if (buchungsAnzahl > 0) {
          if (!rohstoffInfo) {
            toast.error('Rohstoff-Informationen nicht verfügbar. Bitte laden Sie die Seite neu.');
            return;
          }
          
          // Prüfe jeden Rohstoff
          const rohstoffMangel = [];
          
          for (const rohstoff of rohstoffInfo.rohstoffe) {
            const benoetigt = rohstoff.proStueck * buchungsAnzahl;
            if (rohstoff.verfuegbar < benoetigt) {
              rohstoffMangel.push({
                name: rohstoff.name,
                benoetigt: benoetigt,
                verfuegbar: rohstoff.verfuegbar,
                einheit: rohstoff.einheit,
                fehlend: benoetigt - rohstoff.verfuegbar
              });
            }
          }
          
          // Falls Rohstoffe fehlen: Speichern verhindern
          if (rohstoffMangel.length > 0) {
            console.error('❌ Rohstoff-Mangel erkannt:', rohstoffMangel);
            
            // Detaillierte Fehlermeldung
            const mangelnachricht = rohstoffMangel.map(rm => 
              `${rm.name}: ${rm.fehlend} ${rm.einheit} fehlen (benötigt: ${rm.benoetigt}, verfügbar: ${rm.verfuegbar})`
            ).join('\n');
            
            toast.error(
              `❌ Inventur nicht möglich!\n\nNicht genügend Rohstoffe verfügbar:\n${mangelnachricht}\n\nBitte erst Rohstoffe nachbestellen.`,
              {
                duration: 8000,
                style: {
                  maxWidth: '500px',
                  whiteSpace: 'pre-line'
                }
              }
            );
            
            return; // Inventur abbrechen
          }
          
          // Zusätzliche Warnung bei kritischen Beständen
          const kritischeRohstoffe = rohstoffInfo.rohstoffe.filter(rohstoff => {
            const benoetigt = rohstoff.proStueck * buchungsAnzahl;
            const verbleibt = rohstoff.verfuegbar - benoetigt;
            return verbleibt >= 0 && verbleibt < rohstoff.proStueck * 2; // Weniger als 2 Produktionen übrig
          });
          
          if (kritischeRohstoffe.length > 0) {
            const kritischNachricht = kritischeRohstoffe.map(kr => 
              `${kr.name}: Nur noch ${kr.verfuegbar - (kr.proStueck * buchungsAnzahl)} ${kr.einheit} übrig`
            ).join('\n');
            
            // Warnung aber erlauben
            toast(
              `⚠️ Warnung: Kritische Rohstoff-Bestände!\n\n${kritischNachricht}\n\nBitte bald nachbestellen.`,
              {
                duration: 6000,
                icon: '⚠️',
                style: {
                  maxWidth: '500px',
                  whiteSpace: 'pre-line',
                  backgroundColor: '#fff3cd',
                  borderLeft: '4px solid #ffc107',
                  color: '#856404'
                }
              }
            );
          }
        }
      }
      
      const payload = {
        typ: inventurForm.typ,
        artikelId: inventurForm.artikelId,
        neuerBestand: parseFloat(inventurForm.neuerBestand),
        notizen: inventurForm.notizen
      };

      // Optimistisches Update: UI sofort aktualisieren
      const optimisticUpdate = () => {
        const newBestandValue = parseFloat(inventurForm.neuerBestand);
        const artikelId = inventurForm.artikelId;
        
        // Korrekte Mapping für produktTyp
        let produktTyp;
        switch(inventurForm.typ) {
          case 'fertigprodukt':
            produktTyp = 'fertigprodukte';
            break;
          case 'rohseife':
            produktTyp = 'rohseifen';
            break;
          case 'duftoele':
            produktTyp = 'duftoele';
            break;
          case 'verpackungen':
            produktTyp = 'verpackungen';
            break;
          default:
            console.warn('Unbekannter Produkttyp:', inventurForm.typ);
            return; // Beende Funktion wenn Typ unbekannt
        }
        
        setData(prevData => {
          // Prüfe ob das Array existiert
          if (!prevData[produktTyp] || !Array.isArray(prevData[produktTyp])) {
            console.warn('Produkttyp-Array nicht gefunden oder kein Array:', produktTyp, prevData[produktTyp]);
            return prevData; // Keine Änderung
          }
          
          return {
            ...prevData,
            [produktTyp]: prevData[produktTyp].map(item => {
              if (item._id === artikelId) {
                return {
                  ...item,
                  verfuegbareMenge: newBestandValue,
                  aktuellVorrat: newBestandValue
                };
              }
              return item;
            })
          };
        });
      };

      // Optimistisches Update: UI sofort aktualisieren
      optimisticUpdate();
      setInventurDialog(false);
      
      // ⚡ MODERNE REACT PATTERNS: State-Change-Event für andere Komponenten
      const stateChangeEvent = new CustomEvent('inventurStateChange', {
        detail: {
          type: inventurForm.typ,
          articleId: inventurForm.artikelId,
          oldValue: inventurForm.aktuellerBestand,
          newValue: parseFloat(inventurForm.neuerBestand),
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(stateChangeEvent);
      
      // Kurzes visuelles Feedback für sofortige Bestätigung
      toast.loading('Inventur wird gespeichert...', { 
        id: 'inventur-save',
        duration: 2000 
      });

      const response = await fetch(`${API_BASE}/lager/inventur-new`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Parse result nur wenn benötigt  
        await response.json();
        
        // Erfolg: Daten sind bereits optimistisch aktualisiert
        toast.success('Inventur erfolgreich gespeichert!', { id: 'inventur-save' });
        
        // 🔄 MODERNE REAKTIVITÄT: Nur betroffene Daten aktualisieren statt alles neu zu laden
        if (inventurForm.typ === 'fertigprodukt') {
          console.log('🔄 Fertigprodukt-Inventur: Aktualisiere gezielt Rohstoff-Daten...');
          
          // Statt alle Daten neu zu laden, nur Rohstoffe aktualisieren
          await refreshRohstoffData();
          
          // Update auch die Rohstoff-Info falls Dialog offen ist
          if (rohstoffInfo && rohstoffInfo.produkt && rohstoffInfo.produkt.id === inventurForm.artikelId) {
            await loadRohstoffInfo(inventurForm.artikelId);
          }
        } else {
          // Bei anderen Produkttypen: Nur den betroffenen Typ im State aktualisieren
          updateSingleProductType(inventurForm.typ, inventurForm.artikelId, {
            aktuellVorrat: parseFloat(inventurForm.neuerBestand),
            verfuegbareMenge: parseFloat(inventurForm.neuerBestand)
          });
        }
        
        // Wenn der Historie-Dialog für das gleiche Item offen ist, aktualisiere die Historie
        if (historyDialog && selectedItem && selectedItem._id === inventurForm.artikelId) {
          await openHistoryDialog(selectedItem, currentTab.key);
        }
      } else {
        // Fehler: Rollback der optimistischen Änderungen
        await loadAllData();
        const error = await response.json();
        toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'), { id: 'inventur-save' });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Inventur:', error);
      toast.error('Fehler beim Speichern der Inventur', { id: 'inventur-save' });
      // Bei Netzwerkfehler: Daten neu laden für Konsistenz
      await loadAllData();
    } finally {
      setSaving(false);
    }
  };

  // Erweiterte Filter-Funktion für universelle Suche
  const filterItems = (items, searchTerm) => {
    // Sicherheitsprüfung: Wenn items undefined oder kein Array ist
    if (!items || !Array.isArray(items)) {
      console.warn('filterItems: items ist undefined oder kein Array:', items);
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
        // Grundlegende Felder (für alle Produkttypen)
        const matchesBasic = 
          safeString(item.bezeichnung || item.name).toLowerCase().includes(search) ||
          safeString(item.beschreibung || item.description).toLowerCase().includes(search) ||
          safeString(item.seife).toLowerCase().includes(search) ||
          safeString(item.aroma).toLowerCase().includes(search) ||
          safeString(item.category).toLowerCase().includes(search) ||
          safeString(item.price).includes(search) ||
          safeString(item.stock?.quantity).includes(search);
        
        // Rohseife-spezifische Felder
        const matchesRohseife = 
          safeString(item.farbe).toLowerCase().includes(search) ||
          safeString(item.lieferant).toLowerCase().includes(search) ||
          safeString(item.gesamtInGramm).includes(search) ||
          safeString(item.ekPreis).includes(search) ||
          safeString(item.preisProGramm).includes(search) ||
          safeString(item.preisPro10Gramm).includes(search) ||
          safeString(item.aktuellVorrat).includes(search) ||
          safeString(item.mindestbestand).includes(search);
        
        // Duftöl-spezifische Felder
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
          safeString(item.lagertemperatur).toLowerCase().includes(search);
        
        // Verpackung-spezifische Felder
        const matchesVerpackungen = 
          safeString(item.form).toLowerCase().includes(search) ||
          safeString(item.groesse).toLowerCase().includes(search) ||
          safeString(item.material).toLowerCase().includes(search) ||
          safeString(item.menge).includes(search) ||
          safeString(item.kostenInEuro).includes(search) ||
          safeString(item.kostenProStueck).includes(search) ||
          safeString(item.maximalGewicht).includes(search) ||
          safeString(item.notizen).toLowerCase().includes(search);
        
        // Fertigprodukt-spezifische Felder
        const matchesFertigprodukte = 
          safeString(item.shortDescription).toLowerCase().includes(search) ||
          safeString(item.originalPrice).includes(search) ||
          safeString(item.ingredients).toLowerCase().includes(search) ||
          safeString(item.weight).includes(search) ||
          safeString(item.sku).toLowerCase().includes(search) ||
          safeString(item.tags).toLowerCase().includes(search);
        
        return matchesBasic || matchesRohseife || matchesDuftoele || matchesVerpackungen || matchesFertigprodukte;
      } catch (error) {
        console.warn('Fehler beim Filtern eines Items:', error, item);
        return false;
      }
    });
  };

  // Status-Chip-Komponente
  const StatusChip = ({ isActive, productType = 'fertigprodukt' }) => {
    if (productType === 'fertigprodukt') {
      return isActive ? (
        <Chip
          icon={<CheckCircleIcon />}
          label="Aktiv"
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          icon={<CancelIcon />}
          label="Inaktiv"
          color="error"
          size="small"
          variant="outlined"
        />
      );
    } else {
      // Für Rohstoffe, Duftöle, Verpackungen
      return isActive ? (
        <Chip
          icon={<VisibilityIcon />}
          label="Verfügbar"
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          icon={<VisibilityOffIcon />}
          label="Nicht verfügbar"
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }
  };

  // Tab-Inhalte definieren
  const tabs = [
    {
      label: 'Fertigprodukte',
      key: 'fertigprodukte',
      icon: '🧼',
      columns: [
        { key: 'bilder', label: 'Bild', width: '80px' },
        { key: 'name', label: 'Produktname', width: '200px' },
        { key: 'seife', label: 'Seife', width: '120px' },
        { key: 'aroma', label: 'Aroma', width: '120px' },
        { key: 'gramm', label: 'Gewicht', width: '80px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis', label: 'Preis', width: '80px' },
        { key: 'aktiv', label: 'Status', width: '100px' },
        { key: 'reihenfolge', label: 'Reihenfolge', width: '80px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Rohseifen',
      key: 'rohseifen',
      icon: '🥥',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_kg', label: 'Preis/kg', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Duftöle',
      key: 'duftoele',
      icon: '🌸',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_ml', label: 'Preis/ml', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Verpackungen',
      key: 'verpackungen',
      icon: '📦',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_stueck', label: 'Preis/Stück', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    }
  ];

  const currentTab = tabs[activeTab];
  const currentData = filterItems(data[currentTab.key] || [], searchTerm);

  // Render-Funktionen für verschiedene Zellentypen
  const renderCell = (item, column) => {
    switch (column.key) {
      case 'bilder':
        return (
          <Avatar
            src={item.bilder?.hauptbild}
            sx={{ width: 50, height: 50 }}
            variant="rounded"
          >
            {item.name?.[0] || '?'}
          </Avatar>
        );
      
      case 'aktiv':
        return <StatusChip isActive={item.aktiv} productType="fertigprodukt" />;
      
      case 'verfuegbar':
        return <StatusChip isActive={item.verfuegbar} productType="rohstoff" />;
      
      case 'preis':
        return item.preis ? `€${item.preis.toFixed(2)}` : '-';
      
      case 'preis_pro_kg':
        return item.preis_pro_kg ? `€${item.preis_pro_kg.toFixed(2)}` : '-';
      
      case 'preis_pro_ml':
        return item.preis_pro_ml ? `€${item.preis_pro_ml.toFixed(2)}` : '-';
      
      case 'preis_pro_stueck':
        return item.preis_pro_stueck ? `€${item.preis_pro_stueck.toFixed(2)}` : '-';
      
      case 'gramm':
        return item.gramm ? `${item.gramm}g` : '-';
      
      case 'bestand':
        // Je nach Produkttyp verschiedene Bestandsfelder und Einheiten anzeigen
        if (currentTab.key === 'fertigprodukte') {
          const bestand = item.verfuegbareMenge || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand} Stück
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'rohseifen') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand}g
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'duftoele') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand}ml
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'verpackungen') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand} Stück
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        }
        return '-';
      
      case 'mindestbestand':
        return item.mindestbestand || '-';
      
      case 'reihenfolge':
        return item.reihenfolge || '-';
      
      case 'actions':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Inventur">
              <IconButton
                size="small"
                color="primary"
                onClick={() => openInventurDialog(item, currentTab.key)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Historie">
              <IconButton
                size="small"
                color="secondary"
                onClick={() => openHistoryDialog(item, currentTab.key)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      
      case 'beschreibung':
        if (typeof item.beschreibung === 'object' && item.beschreibung !== null) {
          return item.beschreibung.kurz || item.beschreibung.lang || '-';
        }
        return item.beschreibung || '-';
      
      default:
        const value = item[column.key];
        if (typeof value === 'object' && value !== null) {
          // Für Objekte versuchen wir einen String-Wert zu finden
          if (value.kurz) return value.kurz;
          if (value.lang) return value.lang;
          if (value.name) return value.name;
          if (value.titel) return value.titel;
          return JSON.stringify(value);
        }
        return value || '-';
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
      {/* Header - Mobile optimiert */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: isMobile ? 2 : 3,
        flexDirection: isMobile ? 'column' : 'row',
        textAlign: isMobile ? 'center' : 'left'
      }}>
        <InventoryIcon sx={{ 
          fontSize: isMobile ? 32 : 40, 
          mr: isMobile ? 0 : 2, 
          mb: isMobile ? 1 : 0,
          color: 'primary.main' 
        }} />
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          sx={{ flexGrow: 1 }}
        >
          Lagerverwaltung
        </Typography>
      </Box>

      {/* Info-Card - Reduziert */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Alert severity="info">
            Fertigprodukte mit "Aktiv" (grün) 
            sind für Kunden im Frontend sichtbar. 
            "Inaktiv" (rot) bedeutet nicht sichtbar für Kunden.
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs - Mobile Best Practice */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? "fullWidth" : "fullWidth"}
          sx={{
            '& .MuiTab-root': {
              minWidth: isMobile ? 0 : 'auto',
              minHeight: isMobile ? 72 : 48,
              fontSize: isMobile ? '0.75rem' : '1rem',
              padding: isMobile ? '6px 4px' : '12px 16px',
              textTransform: 'none'
            },
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-between'
            }
          }}
        >
          {tabs.map((tab, index) => {
            const mobileLabels = {
              'fertigprodukte': 'Produkte',
              'rohseifen': 'Seifen', 
              'duftoele': 'Düfte',
              'verpackungen': 'Verpack.'
            };
            
            return (
              <Tab
                key={tab.key}
                label={
                  isMobile ? (
                    // Mobile: Ultra-kompakt - kein horizontales Scrollen
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 0.3,
                      width: '100%'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                        <Chip
                          label={data[tab.key]?.length || 0}
                          size="small"
                          color={activeTab === index ? "primary" : "default"}
                          sx={{ 
                            height: 18, 
                            fontSize: '0.65rem',
                            '& .MuiChip-label': { px: 0.5 }
                          }}
                        />
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.7rem', 
                          lineHeight: 1,
                          fontWeight: activeTab === index ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                      >
                        {mobileLabels[tab.key] || tab.label}
                      </Typography>
                    </Box>
                  ) : (
                    // Desktop: Normale Darstellung
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <Chip
                        label={data[tab.key]?.length || 0}
                        size="small"
                        color={activeTab === index ? "primary" : "default"}
                      />
                    </Box>
                  )
                }
                sx={{
                  flex: isMobile ? 1 : 'none',
                  maxWidth: isMobile ? '25%' : 'none'
                }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Erweiterte Suche */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size={isMobile ? "small" : "medium"}
              placeholder={
                currentTab.key === 'fertigprodukte' ? "Suche nach Produkten (Name, Beschreibung, Kategorie, Preis, SKU, Tags...)" :
                currentTab.key === 'rohseifen' ? "Suche nach Rohseifen (Name, Farbe, Lieferant, Preis, Vorrat...)" :
                currentTab.key === 'duftoele' ? "Suche nach Duftölen (Name, Hersteller, Duftrichtung, Intensität...)" :
                "Suche nach Verpackungen (Name, Material, Form, Größe, Notizen...)"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {searchTerm && (
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                alignItems: 'center', 
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <Chip
                  size={isMobile ? "medium" : "small"}
                  label={`Ergebnisse: ${currentData.length} von ${data[currentTab.key]?.length || 0}`}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                  }}
                />
                <Chip
                  size={isMobile ? "medium" : "small"}
                  label={`Suchbegriff: "${searchTerm}"`}
                  color="secondary"
                  variant="outlined"
                  onDelete={() => setSearchTerm('')}
                  sx={{ 
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                  }}
                />
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabelle für Desktop, Cards für Mobile */}
      {isMobile ? (
        // Mobile Card Layout
        <Stack spacing={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : currentData.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchTerm ? 
                    `Keine ${currentTab.label} gefunden, die "${searchTerm}" entsprechen.` :
                    `Keine ${currentTab.label} vorhanden.`
                  }
                </Typography>
              </CardContent>
            </Card>
          ) : (
            currentData.map((item, index) => (
              <Card 
                key={item._id || index}
                sx={{ 
                  opacity: (currentTab.key === 'fertigprodukte' && !item.aktiv) || 
                          (currentTab.key !== 'fertigprodukte' && !item.verfuegbar) ? 0.6 : 1,
                  '&:active': { transform: 'scale(0.98)' }
                }}
              >
                <CardContent sx={{ pb: 1, px: isMobile ? 1.5 : 2, py: isMobile ? 1.5 : 2 }}>
                  {/* Header mit Name und Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1, mr: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                        {item.name}
                      </Typography>
                      {item.beschreibung && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {typeof item.beschreibung === 'object' 
                            ? (item.beschreibung.kurz || item.beschreibung.lang || '').substring(0, 60) + '...'
                            : item.beschreibung.substring(0, 60) + '...'
                          }
                        </Typography>
                      )}
                    </Box>
                    <StatusChip 
                      isActive={currentTab.key === 'fertigprodukte' ? item.aktiv : item.verfuegbar} 
                      productType={currentTab.key === 'fertigprodukte' ? 'fertigprodukt' : 'rohstoff'} 
                    />
                  </Box>

                  {/* Bestand Info - Mobile optimiert */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr auto' : 'auto 1fr auto', 
                    gap: isMobile ? 1 : 2, 
                    alignItems: 'center',
                    bgcolor: 'grey.50',
                    p: isMobile ? 1 : 1.5,
                    borderRadius: 1,
                    mb: 2
                  }}>
                    {!isMobile && (
                      <Typography variant="body2" color="text.secondary">
                        Bestand:
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isMobile && (
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          Bestand:
                        </Typography>
                      )}
                      <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
                        {item.bestand || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.einheit}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => openInventurDialog(item, currentTab.key)}
                        sx={{ 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          minWidth: isMobile ? 36 : 40,
                          height: isMobile ? 36 : 40
                        }}
                      >
                        <EditIcon fontSize={isMobile ? "small" : "small"} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openHistoryDialog(item, currentTab.key)}
                        sx={{ 
                          bgcolor: 'secondary.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'secondary.dark' },
                          minWidth: isMobile ? 36 : 40,
                          height: isMobile ? 36 : 40
                        }}
                      >
                        <HistoryIcon fontSize={isMobile ? "small" : "small"} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Zusätzliche Infos in kompakter Form */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
                    {item.preis_pro_kg && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Preis/kg: <strong>{item.preis_pro_kg.toFixed(2)}€</strong>
                        </Typography>
                      </Box>
                    )}
                    {item.preis_pro_ml && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Preis/ml: <strong>{item.preis_pro_ml.toFixed(2)}€</strong>
                        </Typography>
                      </Box>
                    )}
                    {item.preis_pro_stueck && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Preis/Stk: <strong>{item.preis_pro_stueck.toFixed(2)}€</strong>
                        </Typography>
                      </Box>
                    )}
                    {item.mindestbestand && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Min-Bestand: <strong>{item.mindestbestand}</strong>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      ) : (
        // Desktop Table Layout
        <Paper>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {currentTab.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{ 
                        width: column.width,
                        fontWeight: 'bold',
                        backgroundColor: 'grey.50'
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={currentTab.columns.length} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentTab.columns.length} align="center">
                      <Typography variant="body1" color="text.secondary" sx={{ p: 3 }}>
                        {searchTerm ? 
                          `Keine ${currentTab.label} gefunden, die "${searchTerm}" entsprechen.` :
                          `Keine ${currentTab.label} vorhanden.`
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow
                      key={item._id || index}
                      hover
                      sx={{ 
                        '&:hover': { backgroundColor: 'grey.50' },
                        opacity: (currentTab.key === 'fertigprodukte' && !item.aktiv) || 
                                (currentTab.key !== 'fertigprodukte' && !item.verfuegbar) ? 0.6 : 1
                      }}
                    >
                      {currentTab.columns.map((column) => (
                        <TableCell key={column.key}>
                          {renderCell(item, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Footer Info */}
      {!loading && currentData.length > 0 && (
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 1 : 0
        }}>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 
              `${currentData.length} von ${data[currentTab.key]?.length || 0} ${currentTab.label} angezeigt` :
              `${currentData.length} ${currentTab.label} angezeigt`
            }
          </Typography>
          
          {currentTab.key === 'fertigprodukte' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Aktiv: ${currentData.filter(item => item.aktiv).length}`}
                color="success"
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<CancelIcon />}
                label={`Inaktiv: ${currentData.filter(item => !item.aktiv).length}`}
                color="error"
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Inventur Dialog */}
      <Dialog 
        open={inventurDialog} 
        onClose={() => setInventurDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { 
            margin: 0, 
            maxHeight: '100vh',
            borderRadius: 0 
          } : {}
        }}
      >
        {isMobile && (
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setInventurDialog(false)}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                Inventur: {inventurForm.produktDetails?.name}
              </Typography>
              
              {(() => {
                const validation = validateRohstoffVerfuegbarkeit();
                const isFormValid = inventurForm.neuerBestand && 
                                   inventurForm.neuerBestand !== inventurForm.aktuellerBestand.toString();
                const canSave = isFormValid && validation.isValid && !saving;
                
                return (
                  <Button 
                    autoFocus 
                    color="inherit" 
                    onClick={saveInventur}
                    disabled={!canSave}
                  >
                    {saving ? <CircularProgress size={20} /> : 
                     !validation.isValid ? 'Rohstoffe fehlen' : 
                     'Speichern'}
                  </Button>
                );
              })()}
            </Toolbar>
          </AppBar>
        )}
        
        {!isMobile && (
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon />
              Inventur für {inventurForm.produktDetails?.name}
            </Box>
          </DialogTitle>
        )}
        
        <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Produktinformationen */}
            <Card variant="outlined">
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Produktinformationen
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2 
                  }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Produktname:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {inventurForm.produktDetails?.name || '-'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Status:
                      </Typography>
                      <StatusChip 
                        isActive={inventurForm.produktDetails?.verfuegbar} 
                        productType={inventurForm.typ === 'fertigprodukt' ? 'fertigprodukt' : 'rohstoff'} 
                      />
                    </Box>
                  </Box>

                  {inventurForm.produktDetails?.beschreibung && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Beschreibung:
                      </Typography>
                      <Typography variant="body1">
                        {typeof inventurForm.produktDetails.beschreibung === 'object' 
                          ? (inventurForm.produktDetails.beschreibung.kurz || inventurForm.produktDetails.beschreibung.lang || '-')
                          : inventurForm.produktDetails.beschreibung
                        }
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Preis:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        €{inventurForm.produktDetails?.preis?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Mindestbestand:
                      </Typography>
                      <Typography variant="body1">
                        {inventurForm.produktDetails?.mindestbestand || 0} {inventurForm.einheit}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Maßeinheit:
                      </Typography>
                      <Chip 
                        label={inventurForm.einheit} 
                        color="info" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {/* Zusätzliche Produktspezifische Informationen */}
                  {inventurForm.typ === 'fertigprodukt' && inventurForm.produktDetails?.zusatzinfo && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                      {inventurForm.produktDetails.zusatzinfo.seife && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Seife:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.seife}</Typography>
                        </Box>
                      )}
                      {inventurForm.produktDetails.zusatzinfo.aroma && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Aroma:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.aroma}</Typography>
                        </Box>
                      )}
                      {inventurForm.produktDetails.zusatzinfo.gramm && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Gewicht:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.gramm}g</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Bestandsinformationen */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  📦 Bestandsinformationen
                </Typography>
                
                <Alert 
                  severity={inventurForm.aktuellerBestand <= (inventurForm.produktDetails?.mindestbestand || 0) ? "warning" : "info"}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body1">
                    <strong>Aktueller Bestand:</strong> {inventurForm.aktuellerBestand} {inventurForm.einheit}
                  </Typography>
                  {inventurForm.aktuellerBestand <= (inventurForm.produktDetails?.mindestbestand || 0) && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      ⚠️ Bestand ist unter dem Mindestbestand von {inventurForm.produktDetails?.mindestbestand || 0} {inventurForm.einheit}
                    </Typography>
                  )}
                </Alert>

                <TextField
                  label={`Neuer Bestand (${inventurForm.einheit})`}
                  type="number"
                  fullWidth
                  value={inventurForm.neuerBestand}
                  onChange={(e) => setInventurForm({
                    ...inventurForm,
                    neuerBestand: e.target.value
                  })}
                  onFocus={(e) => {
                    // Feld beim ersten Klick leeren für einfache Eingabe
                    if (inventurForm.neuerBestand === inventurForm.aktuellerBestand.toString()) {
                      setInventurForm({
                        ...inventurForm,
                        neuerBestand: ''
                      });
                    }
                    e.target.select(); // Text markieren falls vorhanden
                  }}
                  inputProps={{ 
                    min: 0, 
                    step: inventurForm.typ === 'fertigprodukt' || inventurForm.typ === 'verpackungen' ? 1 : 0.1 
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip label={inventurForm.einheit} size="small" />
                      </InputAdornment>
                    ),
                  }}
                  helperText={`Geben Sie den korrekten Bestand in ${inventurForm.einheit} ein`}
                />

                {/* Rohstoff-Informationen für Fertigprodukte */}
                {inventurForm.typ === 'fertigprodukt' && (
                  <Card variant="outlined" sx={{ mb: 2, backgroundColor: 'action.hover' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="info.main">
                        🧪 Automatische Rohstoff-Subtraktion
                      </Typography>
                      
                      {rohstoffInfo ? (
                        <Box>
                          <Stack spacing={1.5}>
                            {rohstoffInfo.rohstoffe.map((rohstoff, index) => {
                              // Dynamische Berechnung basierend auf eingegebener Menge
                              const neueAnzahl = parseFloat(inventurForm.neuerBestand) || 0;
                              const buchungsAnzahl = neueAnzahl - inventurForm.aktuellerBestand;
                              const benoetigt = buchungsAnzahl > 0 ? rohstoff.proStueck * buchungsAnzahl : 0;
                              const verfuegbar = rohstoff.verfuegbar;
                              const ausreichendFuerBuchung = benoetigt <= verfuegbar;
                              const verbleibt = verfuegbar - benoetigt;
                              
                              return (
                                <Box 
                                  key={index}
                                  sx={{ 
                                    p: 1.5, 
                                    border: '2px solid', 
                                    borderColor: ausreichendFuerBuchung ? 'success.main' : 'error.main',
                                    borderRadius: 1,
                                    backgroundColor: ausreichendFuerBuchung ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.12)'
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body1" fontWeight="bold">
                                      {rohstoff.name}
                                    </Typography>
                                    <Chip 
                                      label={ausreichendFuerBuchung ? 'OK' : 'NICHT GENUG'} 
                                      color={ausreichendFuerBuchung ? 'success' : 'error'} 
                                      size="small" 
                                    />
                                  </Box>
                                  
                                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, mt: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Pro Stück:
                                      </Typography>
                                      <Typography variant="body2">
                                        {rohstoff.proStueck} {rohstoff.einheit}
                                      </Typography>
                                    </Box>
                                    
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Benötigt:
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color={benoetigt > 0 ? 'warning.main' : 'text.primary'}>
                                        {benoetigt > 0 ? `${benoetigt} ${rohstoff.einheit}` : '0'}
                                      </Typography>
                                    </Box>
                                    
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Verfügbar:
                                      </Typography>
                                      <Typography variant="body2">
                                        {verfuegbar} {rohstoff.einheit}
                                      </Typography>
                                    </Box>
                                    
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Verbleibt:
                                      </Typography>
                                      <Typography 
                                        variant="body2" 
                                        fontWeight="bold"
                                        color={
                                          verbleibt < 0 ? 'error.main' : 
                                          verbleibt < rohstoff.proStueck * 2 ? 'warning.main' : 
                                          'success.main'
                                        }
                                      >
                                        {verbleibt} {rohstoff.einheit}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  {!ausreichendFuerBuchung && (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                      <Typography variant="body2">
                                        <strong>Fehlen {benoetigt - verfuegbar} {rohstoff.einheit}</strong>
                                      </Typography>
                                    </Alert>
                                  )}
                                  
                                  {ausreichendFuerBuchung && verbleibt >= 0 && verbleibt < rohstoff.proStueck * 2 && benoetigt > 0 && (
                                    <Alert severity="warning" sx={{ mt: 1 }}>
                                      <Typography variant="body2">
                                        Kritischer Bestand nach Buchung!
                                      </Typography>
                                    </Alert>
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>
                          
                          {rohstoffInfo.verfuegbarkeit.warnungen.length > 0 && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              <Typography variant="body2" fontWeight="bold" gutterBottom>
                                ⚠️ Rohstoff-Warnungen:
                              </Typography>
                              {rohstoffInfo.verfuegbarkeit.warnungen.map((warnung, index) => (
                                <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                                  • {warnung}
                                </Typography>
                              ))}
                            </Alert>
                          )}
                          
                          <Box sx={{ mt: 2, p: 1, backgroundColor: 'info.light', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                              🎯 Maximale Produktion gesamt: {rohstoffInfo.maxProduktionGesamt} Stück
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity="warning">
                          <Typography variant="body2">
                            Rohstoff-Informationen konnten nicht geladen werden.
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Änderungsvorschau */}
                {inventurForm.neuerBestand && parseFloat(inventurForm.neuerBestand) !== inventurForm.aktuellerBestand && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      📊 Bestandsänderung:
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body1">
                        {inventurForm.aktuellerBestand} {inventurForm.einheit}
                      </Typography>
                      <Typography variant="body1">→</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {inventurForm.neuerBestand} {inventurForm.einheit}
                      </Typography>
                      <Chip
                        label={`${parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand > 0 ? '+' : ''}${(parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand).toFixed(1)} ${inventurForm.einheit}`}
                        color={parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* Notizen */}
            <TextField
              label="Notizen zur Inventur"
              multiline
              rows={3}
              fullWidth
              value={inventurForm.notizen}
              onChange={(e) => setInventurForm({
                ...inventurForm,
                notizen: e.target.value
              })}
              placeholder="Grund für Bestandsänderung, Bemerkungen, etc..."
              helperText="Optional: Dokumentieren Sie den Grund für diese Bestandsänderung"
            />
          </Stack>
        </DialogContent>
        {!isMobile && (
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setInventurDialog(false)} 
              startIcon={<CloseIcon />}
              size="large"
            >
              Abbrechen
            </Button>
            
            {(() => {
              const validation = validateRohstoffVerfuegbarkeit();
              const isFormValid = inventurForm.neuerBestand && 
                                 inventurForm.neuerBestand !== inventurForm.aktuellerBestand.toString();
              const canSave = isFormValid && validation.isValid && !saving;
              
              return (
                <Button 
                  onClick={saveInventur} 
                  variant="contained" 
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={!canSave}
                  size="large"
                  color={validation.isValid ? 'primary' : 'error'}
                >
                  {saving ? 'Speichern...' : 
                   !validation.isValid ? 'Nicht genügend Rohstoffe' : 
                   'Inventur speichern'}
                </Button>
              );
            })()}
          </DialogActions>
        )}
      </Dialog>

      {/* Historie Dialog */}
      <Dialog 
        open={historyDialog} 
        onClose={() => setHistoryDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { 
            margin: 0, 
            maxHeight: '100vh',
            borderRadius: 0 
          } : {}
        }}
      >
        {isMobile && (
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setHistoryDialog(false)}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                Historie: {selectedItem?.bezeichnung || selectedItem?.name}
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        
        {!isMobile && (
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              Bestandshistorie für {selectedItem?.bezeichnung || selectedItem?.name}
            </Box>
          </DialogTitle>
        )}
        <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : historie.length === 0 ? (
            <Alert severity="info">
              Keine Bestandsbewegungen gefunden.
            </Alert>
          ) : isMobile ? (
            // Mobile Card Layout für Historie
            <Stack spacing={2}>
              {historie.map((entry, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(entry.datum).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <Chip
                        label={entry.aktion}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Vorher:</Typography>
                        <Typography variant="body1" fontWeight="bold">{entry.vorherBestand || 0}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Nachher:</Typography>
                        <Typography variant="body1" fontWeight="bold">{entry.nachherBestand || 0}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Änderung:</Typography>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={entry.aenderung >= 0 ? 'success.main' : 'error.main'}
                        >
                          {entry.aenderung >= 0 ? '+' : ''}{entry.aenderung}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {entry.notizen && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Notizen:</Typography>
                        <Typography variant="body2">{entry.notizen}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            // Desktop Table Layout für Historie
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell>Aktion</TableCell>
                    <TableCell align="right">Vorher</TableCell>
                    <TableCell align="right">Nachher</TableCell>
                    <TableCell align="right">Änderung</TableCell>
                    <TableCell>Notizen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historie.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(entry.datum).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{entry.aktion}</TableCell>
                      <TableCell align="right">{entry.vorherBestand}</TableCell>
                      <TableCell align="right">{entry.nachherBestand}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${entry.aenderung > 0 ? '+' : ''}${entry.aenderung}`}
                          color={entry.aenderung > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{entry.notizen || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        {!isMobile && (
          <DialogActions>
            <Button onClick={() => setHistoryDialog(false)}>
              Schließen
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Container>
  );
};

export default AdminLager;