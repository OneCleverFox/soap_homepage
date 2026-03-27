import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  IconButton,
  Chip,
  Box,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Switch,
  Checkbox,
  FormHelperText,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Container
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  LocalShipping,
  ShoppingCart,
  Category,
  CameraAlt as CameraIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import portfolioAdminService from '../services/portfolioAdminService';
import { getImageUrl, getPlaceholderImage } from '../utils/imageUtils';
import { invalidateProductsCache } from '../utils/cacheUtils';

// Portfolio Admin Component
const AdminPortfolio = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State für Portfolio Items
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState('alle');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('alle'); // 'alle', 'aktiv', 'inaktiv'
  const [saleFilter, setSaleFilter] = useState('alle'); // 'alle', 'sale'

  // Options für Dropdowns
  const [seifenOptions, setSeifenOptions] = useState([]);
  const [aromaOptions, setAromaOptions] = useState([]);
  const [seifenformOptions, setSeifenformOptions] = useState([]);
  const [verpackungOptions, setVerpackungOptions] = useState([]);
  const [giessformOptions, setGiessformOptions] = useState([]);
  const [giesswerkstoffOptions, setGiesswerkstoffOptions] = useState([]);

  // State fuer das Anlegen neuer Duftoele und Rohseifen
  const [showCreateAroma, setShowCreateAroma] = useState(false);
  const [newAromaName, setNewAromaName] = useState('');
  const [newAromaDescription, setNewAromaDescription] = useState('');
  const [showCreateSeife, setShowCreateSeife] = useState(false);
  const [newSeifeName, setNewSeifeName] = useState('');
  const [newSeifeDescription, setNewSeifeDescription] = useState('');

  // State für required documents reminder
  const [requiredDocumentsDialog, setRequiredDocumentsDialog] = useState({ open: false, category: null, docTypes: [] });

  const REQUIRED_DOCUMENTS = {
    seife: [
      { key: 'gpsr_konformitaetsblatt', label: 'GPSR – Produktsicherheits- & Konformitaetsblatt', required: true },
      { key: 'gpsr_risikoanalyse_art9', label: 'GPSR – Interne Risikoanalyse (Art. 9)', required: true },
      { key: 'reach_info_art33', label: 'REACH – Informationsdokument (Art. 33)', required: true },
      { key: 'lieferanten_dokumentencheck', label: 'Lieferanten-Dokumentencheck (REACH/GPSR)', required: true },
      { key: 'rueckverfolgbarkeitsregister', label: 'Rueckverfolgbarkeitsregister (Chargen / Komponenten)', required: true }
    ],
    werkstuck: [
      { key: 'gpsr_konformitaetsblatt', label: 'GPSR – Produktsicherheits- & Konformitaetsblatt', required: true },
      { key: 'gpsr_risikoanalyse_art9', label: 'GPSR – Interne Risikoanalyse (Art. 9)', required: true },
      { key: 'lieferanten_dokumentencheck', label: 'Lieferanten-Dokumentencheck (REACH/GPSR)', required: true },
      { key: 'rueckverfolgbarkeitsregister', label: 'Rueckverfolgbarkeitsregister (Chargen / Komponenten)', required: true }
    ],
    schmuck: [
      { key: 'gpsr_konformitaetsblatt', label: 'GPSR – Produktsicherheits- & Konformitaetsblatt', required: true },
      { key: 'gpsr_risikoanalyse_art9', label: 'GPSR – Interne Risikoanalyse (Art. 9)', required: true },
      { key: 'lieferanten_dokumentencheck', label: 'Lieferanten-Dokumentencheck (REACH/GPSR)', required: true },
      { key: 'rueckverfolgbarkeitsregister', label: 'Rueckverfolgbarkeitsregister (Chargen / Komponenten)', required: true },
      { key: 'webshop_compliance_schmuck', label: 'Webshop-Compliance-Checkliste (Schmuck)', required: false }
    ],
    kosmetik: [
      { key: 'pif_kosmetik', label: 'PIF – Nachweis der Produktinformationen (Kosmetik)', required: true },
      { key: 'cpsr_kosmetik', label: 'CPSR – Kosmetik-Sicherheitsbericht', required: true },
      { key: 'cpnp_kosmetik', label: 'CPNP-Anmeldung & Verwaltung', required: true },
      { key: 'gmp_kosmetik_check', label: 'GMP-Plausibilitaetspruefung', required: true },
      { key: 'kosmetik_etiketten_check', label: 'Kosmetik Etikett-Compliance Check', required: true },
      { key: 'lieferanten_dokumentencheck', label: 'Lieferanten-Dokumentencheck', required: true },
      { key: 'rueckverfolgbarkeitsregister', label: 'Rueckverfolgbarkeitsregister', required: true }
    ]
  };

  // Bild-Upload States
  const [uploadingImages, setUploadingImages] = useState({});

  // Kategorien für Navigation
  const categories = [
    { id: 'alle', label: 'Alle Produkte', icon: Category },
    { id: 'seife', label: 'Seifen', icon: LocalShipping },
    { id: 'werkstuck', label: 'Werkstücke', icon: ShoppingCart },
    { id: 'schmuck', label: 'Schmuck', icon: Category }
  ];

  // Initialwerte für Formular
  const initialFormData = {
    kategorie: '',
    name: '',
    gramm: '',
    preis: '',
    sale: {
      isOnSale: false,
      discountPercent: 0,
      startsAt: '',
      endsAt: ''
    },
    seife: '',
    aroma: '',
    seifenform: '',
    verpackung: '',
    giessform: '',
    giesswerkstoff: '',
    optional: '',
    reihenfolge: '',
    aktiv: false,
    istMischung: false,
    rohseifenKonfiguration: null,
    abmessungen: {
      laenge: '',
      breite: '',
      hoehe: '',
      durchmesser: ''
    },
    beschreibung: {
      kurz: '',
      lang: '',
      inhaltsstoffe: '',
      anwendung: ''
    },
    schmuckDetails: {
      schmuckTyp: '',
      material: '',
      oberflaeche: '',
      ringgroesse: '',
      kettenlaenge: '',
      nickelhaltig: false,
      steinbesatz: ''
    },
    gpsr: {
      verwendungszweck: '',
      warnhinweise: '',
      zielgruppe: '',
      herstellerAbweichend: false,
      herstellerName: '',
      herstellerAnschrift: '',
      herstellerEmail: ''
    }
  };

  const [formData, setFormData] = useState(initialFormData);

  const getSaleScheduleStatus = (item) => {
    const isOnSale = !!item?.sale?.isOnSale;
    const discountPercent = Number(item?.sale?.discountPercent || 0);

    if (!isOnSale || discountPercent <= 0) {
      return null;
    }

    const now = new Date();
    const startsAt = item?.sale?.startsAt ? new Date(item.sale.startsAt) : null;
    const endsAt = item?.sale?.endsAt ? new Date(item.sale.endsAt) : null;

    const startsValid = startsAt && !Number.isNaN(startsAt.getTime());
    const endsValid = endsAt && !Number.isNaN(endsAt.getTime());

    if (startsValid && now < startsAt) {
      return { label: 'Geplant', color: 'info' };
    }

    if (endsValid && now > endsAt) {
      return { label: 'Abgelaufen', color: 'default' };
    }

    return { label: 'Aktiv', color: 'success' };
  };

  // 🛡️ Guard gegen doppeltes Laden in React Strict Mode
  const hasLoadedRef = useRef(false);

  // Portfolio Items laden
  useEffect(() => {
    // Verhindere doppeltes Laden in Strict Mode
    if (hasLoadedRef.current) {
      console.log("⏭️ AdminPortfolio: Skipping duplicate load (Strict Mode)");
      return;
    }
    
    console.log("🚀 AdminPortfolio: Initial load starting");
    hasLoadedRef.current = true;
    
    const loadData = async () => {
      await loadOptions(); // Erst Optionen laden
      await loadPortfolioItems(); // Dann Portfolio-Items
    };
    loadData();
  }, []);

  // Items nach Kategorie und Status filtern
  useEffect(() => {
    let filtered = portfolioItems;
    
    // Kategorie-Filter
    if (selectedCategory !== 'alle') {
      filtered = filtered.filter(item => item.kategorie === selectedCategory);
    }
    
    // Status-Filter
    if (statusFilter === 'aktiv') {
      filtered = filtered.filter(item => item.aktiv === true);
    } else if (statusFilter === 'inaktiv') {
      filtered = filtered.filter(item => item.aktiv !== true);
    }

    if (saleFilter === 'sale') {
      filtered = filtered.filter(item => !!item.sale?.isOnSale);
    }
    
    setFilteredItems(filtered);
  }, [portfolioItems, selectedCategory, statusFilter, saleFilter]);

  const loadPortfolioItems = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await portfolioAdminService.getAll();
      setPortfolioItems(response.data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Portfolio Items:', err);
      setError('Fehler beim Laden der Portfolio Items');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadOptions = async () => {
    try {
      // Seife-spezifische Optionen
      const [rohseifen, duftoele, seifenformen, verpackungen] = await Promise.all([
        portfolioAdminService.getSeifenOptions(),
        fetch('/api/duftoele').then(res => res.json()).then(data => data.data?.map(item => item.bezeichnung) || []).catch(() => []),
        portfolioAdminService.getSeifenformOptions(),
        portfolioAdminService.getVerpackungOptions()
      ]);
      
      setSeifenOptions(rohseifen || []);
      setAromaOptions(duftoele || []);
      setSeifenformOptions(seifenformen || []);
      setVerpackungOptions(verpackungen || []);

      // Werkstück-spezifische Optionen
      const [giessformen, giesswerkstoff] = await Promise.all([
        portfolioAdminService.getGiessformOptions(),
        portfolioAdminService.getGiesswerkstoffOptions()
      ]);
      
      console.log('🔍 Geladene Gießformen:', giessformen);
      console.log('🔍 Geladene Gießwerkstoffe:', giesswerkstoff);
      
      // Sortiere Gießformen nach Inventarnummer absteigend (GF035, GF034, ...)
      const sortedGiessformen = (giessformen || []).sort((a, b) => {
        // Extrahiere Nummer aus Inventarnummer (z.B. "GF015" -> 15)
        const numA = parseInt(a.inventarnummer?.replace(/\D/g, '') || '0');
        const numB = parseInt(b.inventarnummer?.replace(/\D/g, '') || '0');
        return numB - numA; // Absteigend sortieren
      });
      
      setGiessformOptions(sortedGiessformen);
      setGiesswerkstoffOptions(giesswerkstoff || []);
    } catch (err) {
      console.error('Fehler beim Laden der Optionen:', err);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;

    // Spezielle Behandlung für Zahlenfelder um NaN zu vermeiden
    let processedValue = type === 'checkbox' ? checked : value;
    if (name === 'reihenfolge' && value !== '') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) ? '' : numValue;
    }

    // Spezialbehandlung: Wenn Gießform gewählt wird, lade Abmessungen automatisch
    if (name === 'giessform' && value) {
      try {
        const selectedGiessform = giessformOptions.find(g => g._id === value);
        if (selectedGiessform) {
          // Konvertiere mm in cm für konsistente Darstellung
          const laengeCm = selectedGiessform.laengeMm ? (selectedGiessform.laengeMm / 10).toFixed(1) : '';
          const breiteCm = selectedGiessform.breiteMm ? (selectedGiessform.breiteMm / 10).toFixed(1) : '';
          const tiefeCm = selectedGiessform.tiefeMm ? (selectedGiessform.tiefeMm / 10).toFixed(1) : '';
          const durchmesserCm = selectedGiessform.durchmesserMm ? (selectedGiessform.durchmesserMm / 10).toFixed(1) : '';
          
          // Berechne Gewicht aus Volumen (1ml Seife ≈ 1g)
          const gewichtGramm = selectedGiessform.volumenMl ? selectedGiessform.volumenMl.toString() : '';
          
          setFormData(prev => ({
            ...prev,
            giessform: value,
            abmessungen: {
              laenge: laengeCm,
              breite: breiteCm,
              hoehe: tiefeCm,
              durchmesser: durchmesserCm
            },
            gramm: gewichtGramm
          }));
          return;
        }
      } catch (err) {
        console.error('Fehler beim Laden der Gießform-Abmessungen:', err);
      }
    }

    if (name.includes('.')) {
      const parts = name.split('.');
      
      // Behandle verschachtelte Strukturen (z.B. rohseifenKonfiguration.gewichtVerteilung.seife1Prozent)
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: processedValue
          }
        }));
      } else if (parts.length === 3) {
        const [parent, middle, child] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [middle]: {
              ...prev[parent]?.[middle],
              [child]: processedValue
            }
          }
        }));
      }
    } else {
      // Wenn Kategorie gewechselt wird: GPSR-Defaults vorbelegen
      if (name === 'kategorie') {
        const gpsrDefaults = {
          seife: {
            verwendungszweck: 'Kosmetisches Reinigungsprodukt zur äußerlichen Anwendung auf der Haut.',
            zielgruppe: 'Geeignet für Erwachsene und Jugendliche ab 14 Jahren.',
            warnhinweise:
              'Nur zur äußerlichen Anwendung.\nBei Kontakt mit den Augen sofort gründlich mit Wasser spülen.\nAußerhalb der Reichweite von Kindern aufbewahren.\nBei anhaltenden Hautreizungen Gebrauch einstellen und ärztlichen Rat einholen.',
          },
          werkstuck: {
            verwendungszweck: 'Dekorationsartikel für Erwachsene.',
            zielgruppe: 'Nicht geeignet für Kinder unter 14 Jahren.',
            warnhinweise:
              'Kein Spielzeug. Nicht geeignet für Kinder unter 14 Jahren.\nKleinteile – Erstickungsgefahr!\nNur zur dekorativen Verwendung bestimmt.',
          },
          schmuck: {
            verwendungszweck: 'Modeschmuck für Erwachsene, dekoratives Tragen am Körper.',
            zielgruppe: 'Nicht geeignet für Kinder unter 14 Jahren.',
            warnhinweise:
              'Kein Spielzeug. Nicht geeignet für Kinder unter 14 Jahren.\nKleinteile – Erstickungsgefahr!\nBei Hautreaktionen oder allergischen Reaktionen sofort ablegen und ärztlichen Rat einholen.\nNicht beim Schlafen, Duschen, Baden oder Sport tragen.',
          },
        };
        const defaults = gpsrDefaults[processedValue];
        setFormData(prev => ({
          ...prev,
          kategorie: processedValue,
          gpsr: {
            ...prev.gpsr,
            ...(defaults || {}),
          },
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    
    // Extrahiere IDs korrekt - Backend kann ObjectId-Objekte oder Strings zurückgeben
    const extractId = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (field._id) return field._id;
      return field.toString ? field.toString() : '';
    };
    
    // Wenn Gießform als Objekt zurückgegeben wird, extrahiere Abmessungen
    let abmessungenFromGiessform = {};
    if (item.giessform && typeof item.giessform === 'object' && item.giessform.laengeMm) {
      abmessungenFromGiessform = {
        laenge: item.giessform.laengeMm ? (item.giessform.laengeMm / 10).toFixed(1) : '',
        breite: item.giessform.breiteMm ? (item.giessform.breiteMm / 10).toFixed(1) : '',
        hoehe: item.giessform.tiefeMm ? (item.giessform.tiefeMm / 10).toFixed(1) : '',
        durchmesser: item.giessform.durchmesserMm ? (item.giessform.durchmesserMm / 10).toFixed(1) : ''
      };
    }
    
    // Vollständige Datenstruktur für das Bearbeiten
    const editFormData = {
      ...initialFormData,
      kategorie: item.kategorie || '',
      name: item.name || '',
      gramm: item.gramm || '',
      preis: item.preis || '',
      sale: {
        isOnSale: !!item.sale?.isOnSale,
        discountPercent: item.sale?.discountPercent || 0,
        startsAt: item.sale?.startsAt ? new Date(item.sale.startsAt).toISOString().slice(0, 16) : '',
        endsAt: item.sale?.endsAt ? new Date(item.sale.endsAt).toISOString().slice(0, 16) : ''
      },
      seife: item.seife || '',
      aroma: item.aroma || '',
      seifenform: item.seifenform || '',
      verpackung: item.verpackung || '',
      giessform: extractId(item.giessform),
      giesswerkstoff: extractId(item.giesswerkstoff),
      optional: item.optional || '',
      reihenfolge: item.reihenfolge || '',
      aktiv: item.aktiv !== undefined ? item.aktiv : false,
      istMischung: item.rohseifenKonfiguration?.verwendeZweiRohseifen || false,
      rohseifenKonfiguration: item.rohseifenKonfiguration || null,
      abmessungen: {
        // Verwende Abmessungen aus Item, falls vorhanden, sonst aus Gießform
        laenge: (item.abmessungen && item.abmessungen.laenge) || abmessungenFromGiessform.laenge || '',
        breite: (item.abmessungen && item.abmessungen.breite) || abmessungenFromGiessform.breite || '',
        hoehe: (item.abmessungen && item.abmessungen.hoehe) || abmessungenFromGiessform.hoehe || '',
        durchmesser: (item.abmessungen && item.abmessungen.durchmesser) || abmessungenFromGiessform.durchmesser || ''
      },
      beschreibung: {
        kurz: (item.beschreibung && item.beschreibung.kurz) || '',
        lang: (item.beschreibung && item.beschreibung.lang) || '',
        inhaltsstoffe: (item.beschreibung && item.beschreibung.inhaltsstoffe) || '',
        anwendung: (item.beschreibung && item.beschreibung.anwendung) || ''
      },
      schmuckDetails: {
        schmuckTyp: item.schmuckDetails?.schmuckTyp || '',
        material: item.schmuckDetails?.material || '',
        oberflaeche: item.schmuckDetails?.oberflaeche || '',
        ringgroesse: item.schmuckDetails?.ringgroesse || '',
        kettenlaenge: item.schmuckDetails?.kettenlaenge || '',
        nickelhaltig: item.schmuckDetails?.nickelhaltig || false,
        steinbesatz: item.schmuckDetails?.steinbesatz || ''
      },
      gpsr: {
        verwendungszweck: item.gpsr?.verwendungszweck || '',
        warnhinweise: item.gpsr?.warnhinweise || '',
        zielgruppe: item.gpsr?.zielgruppe || '',
        herstellerAbweichend: item.gpsr?.herstellerAbweichend || false,
        herstellerName: item.gpsr?.herstellerName || '',
        herstellerAnschrift: item.gpsr?.herstellerAnschrift || '',
        herstellerEmail: item.gpsr?.herstellerEmail || ''
      }
    };
    
    setFormData(editFormData);
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // Bereite die Daten basierend auf der Kategorie vor
      const submitData = { ...formData };
      
      // Stelle sicher, dass verwendeZweiRohseifen korrekt gesetzt ist
      if (submitData.istMischung && submitData.rohseifenKonfiguration) {
        submitData.rohseifenKonfiguration.verwendeZweiRohseifen = true;
      }
      
      // Verhindere leere Strings für numerische Werte
      if (!submitData.preis || submitData.preis === '' || submitData.preis === 'NaN') {
        delete submitData.preis; // Behalte alten Wert im Backend
      }
      if (!submitData.gramm || submitData.gramm === '' || submitData.gramm === 'NaN') {
        delete submitData.gramm;
      }
      if (!submitData.reihenfolge || submitData.reihenfolge === '' || submitData.reihenfolge === 'NaN') {
        delete submitData.reihenfolge;
      }

      const normalizedDiscount = Math.max(0, Math.min(100, Number(submitData.sale?.discountPercent) || 0));
      submitData.sale = {
        isOnSale: !!submitData.sale?.isOnSale,
        discountPercent: !!submitData.sale?.isOnSale ? normalizedDiscount : 0,
        startsAt: !!submitData.sale?.isOnSale && submitData.sale?.startsAt ? submitData.sale.startsAt : null,
        endsAt: !!submitData.sale?.isOnSale && submitData.sale?.endsAt ? submitData.sale.endsAt : null
      };
      
      if (formData.kategorie === 'werkstuck' || formData.kategorie === 'schmuck') {
        // Für Werkstücke und Schmuck: Setze Seifenfelder auf leere Strings
        submitData.seife = '';
        submitData.aroma = '';
        submitData.seifenform = '';
        submitData.verpackung = '';
        submitData.zusatz = '';
        submitData.optional = '';
        
        // Stelle sicher dass giessform und giesswerkstoff als ObjectId oder undefined gesetzt sind
        // WICHTIG: Leere Strings vermeiden, die zu Validation-Fehlern führen
        if (!submitData.giessform || submitData.giessform === '') {
          delete submitData.giessform;
        }
        if (!submitData.giesswerkstoff || submitData.giesswerkstoff === '') {
          delete submitData.giesswerkstoff;
        }
      } else {
        // Für Seifen: Entferne Werkstückfelder komplett
        delete submitData.giessform;
        delete submitData.giesswerkstoff;
      }
      
      console.log('📤 Sende Portfolio-Daten:', submitData);
      
      // Merke alte Werte für Cache-Invalidierung
      const wasActive = editingItem?.aktiv;
      const willBeActive = submitData.aktiv;
      
      if (editingItem) {
        await portfolioAdminService.update(editingItem._id, submitData);
        
        // Cache nur invalidieren wenn aktiv-Status sich ändert
        if (wasActive !== willBeActive) {
          invalidateProductsCache(`Portfolio Item "${submitData.name}" ${willBeActive ? 'aktiviert' : 'deaktiviert'}`);
        }
      } else {
        await portfolioAdminService.create(submitData);
        
        // Bei neuem Item: Cache invalidieren wenn es aktiv erstellt wird
        if (willBeActive) {
          invalidateProductsCache(`Neues Portfolio Item "${submitData.name}" erstellt`);
        }
        
        // Zeige erforderliche Dokumente für neue Produkte
        const requiredDocs = REQUIRED_DOCUMENTS[formData.kategorie] || [];
        const mandatoryDocs = requiredDocs.filter(doc => doc.required);
        if (mandatoryDocs.length > 0) {
          setRequiredDocumentsDialog({
            open: true,
            category: formData.kategorie,
            docTypes: requiredDocs
          });
        }
      }
      
      setOpen(false);
      loadPortfolioItems(true); // Silent reload - kein Loading-State
      setFormData(initialFormData);
    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Speichern des Portfolio Items');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Portfolio Item löschen möchten?')) {
      try {
        // Finde das Item für Logging
        const item = portfolioItems.find(i => i._id === id);
        
        await portfolioAdminService.delete(id);
        
        // Cache invalidieren wenn ein aktives Item gelöscht wird
        if (item?.aktiv) {
          invalidateProductsCache(`Portfolio Item "${item.name}" gelöscht`);
        }
        
        loadPortfolioItems(true); // Silent reload - kein Loading-State
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
        setError('Fehler beim Löschen des Portfolio Items');
      }
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setFormData(initialFormData);
    setEditingItem(null);
  };

  const handleCreateNewAroma = async () => {
    if (!newAromaName.trim()) return;
    
    try {
      await fetch('/api/duftoele', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bezeichnung: newAromaName.trim(),
          beschreibung: newAromaDescription.trim()
        })
      });
      
      setShowCreateAroma(false);
      setNewAromaName('');
      setNewAromaDescription('');
      loadOptions();
      
      setFormData(prev => ({
        ...prev,
        aroma: newAromaName.trim()
      }));
    } catch (err) {
      console.error('Fehler beim Erstellen des Duftöls:', err);
      setError('Fehler beim Erstellen des neuen Duftöls');
    }
  };

  const handleCreateNewSeife = async () => {
    if (!newSeifeName.trim()) return;
    
    try {
      await fetch('/api/rohseife', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newSeifeName.trim(),
          beschreibung: newSeifeDescription.trim()
        })
      });
      
      setShowCreateSeife(false);
      setNewSeifeName('');
      setNewSeifeDescription('');
      loadOptions();
      
      setFormData(prev => ({
        ...prev,
        seife: newSeifeName.trim()
      }));
    } catch (err) {
      console.error('Fehler beim Erstellen der Rohseife:', err);
      setError('Fehler beim Erstellen der neuen Rohseife');
    }
  };

  // Bild-Upload Funktionen
  const handleImageUpload = async (productId, file, imageType = 'hauptbild') => {
    if (!file) return;
    
    setUploadingImages(prev => ({ ...prev, [`${productId}_${imageType}`]: true }));
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isHauptbild', imageType === 'hauptbild' ? 'true' : 'false');  // Backend erwartet isHauptbild
      
      await portfolioAdminService.uploadImage(productId, formData);
      
      // ⚡ OPTIMIERUNG: Nur das betroffene Item aktualisieren statt alles neu zu laden
      const response = await portfolioAdminService.getById(productId);
      const updatedItem = response.data || response; // Extrahiere data aus Response
      setPortfolioItems(prevItems => 
        prevItems.map(item => item._id === productId ? updatedItem : item)
      );
    } catch (err) {
      console.error('Fehler beim Upload:', err);
      setError('Fehler beim Hochladen des Bildes');
    } finally {
      setUploadingImages(prev => ({ ...prev, [`${productId}_${imageType}`]: false }));
    }
  };

  const handleImageDelete = async (productId, imageType, imageIndex = '') => {
    if (window.confirm('Möchten Sie dieses Bild wirklich löschen?')) {
      try {
        await portfolioAdminService.deleteImage(productId, imageType, imageIndex);
        
        // ⚡ OPTIMIERUNG: Nur das betroffene Item aktualisieren statt alles neu zu laden
        const response = await portfolioAdminService.getById(productId);
        const updatedItem = response.data || response; // Extrahiere data aus Response
        setPortfolioItems(prevItems => 
          prevItems.map(item => item._id === productId ? updatedItem : item)
        );
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
        setError('Fehler beim Löschen des Bildes');
      }
    }
  };

  // Render Navigation
  const renderNavigation = () => (
    <List>
      {/* Status Filter ganz oben */}
      <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch', px: 2, py: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
          Status:
        </Typography>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(event, newValue) => newValue && setStatusFilter(newValue)}
          size="small"
          fullWidth
          sx={{ 
            mb: 0.5,
            '& .MuiToggleButton-root': {
              py: 0.75,
              fontSize: '0.875rem'
            }
          }}
        >
          <ToggleButton value="alle">
            Alle
          </ToggleButton>
          <ToggleButton value="aktiv">
            ✅<br/>Aktiv
          </ToggleButton>
          <ToggleButton value="inaktiv">
            🚫<br/>Inaktiv
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1.5 }}>
          Sale:
        </Typography>
        <ToggleButtonGroup
          value={saleFilter}
          exclusive
          onChange={(event, newValue) => newValue && setSaleFilter(newValue)}
          size="small"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.75,
              fontSize: '0.875rem'
            }
          }}
        >
          <ToggleButton value="alle">
            Alle
          </ToggleButton>
          <ToggleButton value="sale">
            Sale
          </ToggleButton>
        </ToggleButtonGroup>
      </ListItem>
      <Divider />
      
      <ListItem>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Portfolio Kategorien
        </Typography>
      </ListItem>
      <Divider />
      {categories.map((category) => {
        const IconComponent = category.icon;
        const count = category.id === 'alle' 
          ? portfolioItems.length 
          : portfolioItems.filter(item => item.kategorie === category.id).length;
        
        return (
          <ListItem key={category.id} disablePadding>
            <ListItemButton
              selected={selectedCategory === category.id}
              onClick={() => handleCategorySelect(category.id)}
            >
              <ListItemIcon>
                <IconComponent />
              </ListItemIcon>
              <ListItemText 
                primary={category.label}
                secondary={`${count} Artikel`}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" width="80%" height={28} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop Sidebar - FIXIERT */}
      {!isMobile && (
        <Box sx={{ 
          width: 240, 
          flexShrink: 0, 
          bgcolor: 'grey.50', 
          borderRight: '1px solid', 
          borderColor: 'divider',
          overflowY: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0
        }}>
          {renderNavigation()}
        </Box>
      )}

      {/* Fixiertes Filter-Symbol (Mobile) */}
      {isMobile && (
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          sx={{ 
            position: 'fixed', 
            top: 70, 
            left: 16, 
            zIndex: 1000,
            bgcolor: 'primary.main',
            color: 'white',
            boxShadow: 3,
            width: 48,
            height: 48,
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          <FilterIcon />
        </IconButton>
      )}

      {/* Filter Drawer (50% Breite) */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        PaperProps={{ 
          sx: { 
            width: '50vw',
            minWidth: 200,
            maxWidth: 300
          } 
        }}
      >
        {renderNavigation()}
      </Drawer>

      {/* Main Content - SCROLLBAR */}
      <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 2, md: 3 }, overflowY: 'auto', height: '100vh' }}>
        <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, m: { xs: 0, sm: 0 }, borderRadius: { xs: 0, sm: 1 } }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 0 },
            mb: { xs: 2, md: 3 } 
          }}>
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}>
                Portfolio Verwaltung
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                {selectedCategory === 'alle' ? 'Alle Produkte' : 
                 categories.find(c => c.id === selectedCategory)?.label} 
                ({filteredItems.length} Artikel)
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={isMobile ? null : <AddIcon />}
              onClick={handleNew}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              {isMobile ? '+ Neues Produkt' : 'Neues Produkt'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Cards Grid */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {filteredItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Product Image mit Upload */}
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      sx={{ height: { xs: 180, sm: 200 }, objectFit: 'cover' }}
                      image={getImageUrl(item.bilder?.hauptbild) || getPlaceholderImage('Kein Bild')}
                      alt={item.name}
                      onError={(e) => {
                        console.log('Bild konnte nicht geladen werden:', item.bilder?.hauptbild);
                        e.target.src = getPlaceholderImage('Fehler beim Laden');
                      }}
                    />
                    
                    {/* Hauptbild Upload Button */}
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: 1
                    }}>
                      <input
                        id={`hauptbild-upload-${item._id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(item._id, file, 'hauptbild');
                        }}
                      />
                      <label htmlFor={`hauptbild-upload-${item._id}`}>
                        <IconButton 
                          component="span" 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.9)', 
                            '&:hover': { bgcolor: 'white' }
                          }}
                          disabled={uploadingImages[`${item._id}_hauptbild`]}
                        >
                          <CameraIcon fontSize="small" />
                        </IconButton>
                      </label>
                      
                      {item.bilder?.hauptbild && (
                        <IconButton 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.9)', 
                            '&:hover': { bgcolor: 'white' }
                          }}
                          onClick={() => handleImageDelete(item._id, 'hauptbild')}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                    {/* Category Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Chip 
                        label={item.kategorie || 'Unbekannt'} 
                        size="small"
                        color={item.kategorie === 'seife' ? 'primary' : 'secondary'}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {item.sale?.isOnSale && Number(item.sale?.discountPercent) > 0 && (
                          <Chip
                            label={`Sale ${Number(item.sale.discountPercent).toFixed(0)}%`}
                            size="small"
                            color="warning"
                          />
                        )}
                        {(() => {
                          const saleStatus = getSaleScheduleStatus(item);
                          if (!saleStatus) return null;

                          return (
                            <Chip
                              label={saleStatus.label}
                              size="small"
                              color={saleStatus.color}
                              variant="outlined"
                            />
                          );
                        })()}
                        <Chip 
                          label={item.aktiv ? 'Aktiv' : 'Inaktiv'} 
                          size="small"
                          color={item.aktiv ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>
                    
                    {/* Product Name */}
                    <Typography variant="h6" component="h3" sx={{ 
                      fontWeight: 'bold', 
                      mb: 1, 
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      lineHeight: 1.3
                    }}>
                      {item.name}
                    </Typography>
                    
                    {/* Product Details */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {item.kategorie === 'seife' && (
                        <>
                          {item.seife} • {item.aroma} • {item.gramm}g
                        </>
                      )}
                      {item.kategorie === 'werkstuck' && (
                        <>
                          {item.gramm}g<br/>
                          {item.abmessungen && (
                            <>Abmessungen: {item.abmessungen.laenge}x{item.abmessungen.breite}x{item.abmessungen.hoehe}cm</>
                          )}
                        </>
                      )}
                    </Typography>
                    
                    {/* Price */}
                    {item.sale?.isOnSale && Number(item.sale?.discountPercent) > 0 ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                          €{Number(item.preis || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="h6" color="warning.main" sx={{ 
                          fontWeight: 'bold',
                          fontSize: { xs: '1.1rem', sm: '1.25rem' }
                        }}>
                          €{(Number(item.preis || 0) * (1 - (Number(item.sale?.discountPercent || 0) / 100))).toFixed(2)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="h6" color="primary" sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}>
                        €{Number(item.preis || 0).toFixed(2)}
                      </Typography>
                    )}
                    
                    {/* Gallery Images Upload */}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Galerie ({item.bilder?.galerie?.length || 0}):
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))', gap: { xs: 0.5, sm: 1 }, maxWidth: '100%' }}>
                        {/* Vorhandene Galeriebilder */}
                        {item.bilder?.galerie && item.bilder.galerie.slice(0, 4).map((img, index) => (
                          <Box key={index} sx={{ position: 'relative' }}>
                            <img 
                              src={img.url || img}  // Base64-Data-URL direkt aus Datenbank
                              alt={`Galerie ${index + 1}`}
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                              }}
                            />
                            <IconButton
                              size="small"
                              sx={{ 
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 16,
                                height: 16,
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' }
                              }}
                              onClick={() => handleImageDelete(item._id, 'galerie', index)}
                            >
                              <DeleteIcon sx={{ fontSize: 10 }} />
                            </IconButton>
                          </Box>
                        ))}
                        {/* Upload Button für Galerie */}
                        <input
                          id={`galerie-upload-${item._id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            Array.from(e.target.files).forEach(file => {
                              handleImageUpload(item._id, file, 'galerie');
                            });
                          }}
                        />
                        <label htmlFor={`galerie-upload-${item._id}`}>
                          <Box sx={{ 
                            width: item.bilder?.galerie?.length > 0 ? '100%' : '50%',
                            aspectRatio: '1',
                            border: '2px dashed #ccc',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'primary.main' }
                          }}>
                            <AddIcon sx={{ fontSize: 16, color: 'grey.600' }} />
                          </Box>
                        </label>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: { xs: 1, sm: 2 }, pt: 0, gap: 0.5 }}>
                    <Button
                      size="small"
                      startIcon={isMobile ? null : <EditIcon />}
                      onClick={() => handleEdit(item)}
                      variant="outlined"
                      fullWidth={isMobile}
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        py: { xs: 0.5, sm: 0.75 }
                      }}
                    >
                      {isMobile ? 'Edit' : 'Bearbeiten'}
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(item._id)}
                      color="error"
                      sx={{ minWidth: { xs: 36, sm: 40 } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {filteredItems.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Keine Produkte gefunden
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCategory === 'alle' 
                  ? 'Es wurden noch keine Produkte erstellt.' 
                  : `Keine Produkte in der Kategorie "${categories.find(c => c.id === selectedCategory)?.label}" gefunden.`
                }
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={handleNew}
                sx={{ mt: 2 }}
              >
                Erstes Produkt erstellen
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Hauptdialog für Produkt erstellen/bearbeiten */}
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          {editingItem ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {/* Kategorie Auswahl als erstes */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Produktkategorie auswählen
              </Typography>
              <FormControl fullWidth required>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  name="kategorie"
                  value={formData.kategorie}
                  onChange={handleInputChange}
                  label="Kategorie"
                >
                  <MenuItem value="seife">Seife</MenuItem>
                  <MenuItem value="werkstuck">Werkstück (Gips/Deko)</MenuItem>
                  <MenuItem value="schmuck">Schmuck</MenuItem>
                </Select>
                <FormHelperText>
                  Wählen Sie zuerst die Produktkategorie. Je nach Auswahl werden unterschiedliche Felder angezeigt.
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Gemeinsame Grundfelder für alle Kategorien */}
            {formData.kategorie && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Grundinformationen
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Produktname"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    helperText="Name des Produkts"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Gewicht (g)"
                    name="gramm"
                    type="number"
                    value={formData.gramm}
                    onChange={handleInputChange}
                    required
                    inputProps={{ min: 1 }}
                    helperText="Gewicht in Gramm"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Preis (€)"
                    name="preis"
                    type="number"
                    value={formData.preis}
                    onChange={handleInputChange}
                    required={formData.kategorie !== 'werkstuck'}
                    disabled={formData.kategorie === 'werkstuck'}
                    inputProps={{ 
                      min: 0, 
                      step: 0.01,
                      readOnly: formData.kategorie === 'werkstuck'
                    }}
                    helperText={
                      formData.kategorie === 'werkstuck' 
                        ? "Wird automatisch in der Warenberechnung ermittelt"
                        : "Verkaufspreis"
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!formData.sale?.isOnSale}
                        onChange={handleInputChange}
                        name="sale.isOnSale"
                      />
                    }
                    label="Sale aktiv"
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Rabatt (%)"
                    name="sale.discountPercent"
                    type="number"
                    value={formData.sale?.discountPercent ?? 0}
                    onChange={handleInputChange}
                    disabled={!formData.sale?.isOnSale}
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    helperText={formData.sale?.isOnSale ? '0 bis 100 Prozent' : 'Sale ist deaktiviert'}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sale von"
                    name="sale.startsAt"
                    type="datetime-local"
                    value={formData.sale?.startsAt || ''}
                    onChange={handleInputChange}
                    disabled={!formData.sale?.isOnSale}
                    InputLabelProps={{ shrink: true }}
                    helperText={formData.sale?.isOnSale ? 'Optional: Startzeitpunkt' : 'Sale ist deaktiviert'}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sale bis"
                    name="sale.endsAt"
                    type="datetime-local"
                    value={formData.sale?.endsAt || ''}
                    onChange={handleInputChange}
                    disabled={!formData.sale?.isOnSale}
                    InputLabelProps={{ shrink: true }}
                    helperText={formData.sale?.isOnSale ? 'Optional: Endzeitpunkt' : 'Sale ist deaktiviert'}
                  />
                </Grid>
              </>
            )}

            {/* Seife-spezifische Felder */}
            {formData.kategorie === 'seife' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Seife-Konfiguration
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rohseife</InputLabel>
                    <Select
                      name="seife"
                      value={formData.seife}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setShowCreateSeife(true);
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      label="Rohseife"
                      required
                    >
                      {seifenOptions.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                      <MenuItem key="__CREATE_NEW__" value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                        + Neue Rohseife erstellen...
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Aroma</InputLabel>
                    <Select
                      name="aroma"
                      value={formData.aroma}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setShowCreateAroma(true);
                        } else {
                          handleInputChange(e);
                        }
                      }}
                      label="Aroma"
                      required
                    >
                      {aromaOptions.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                      <MenuItem key="__CREATE_NEW__" value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
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
                    </Select>
                  </FormControl>
                </Grid>

                {/* Rohseifen-Konfiguration für Mix-Seifen */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.istMischung || false}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            istMischung: e.target.checked,
                            rohseifenKonfiguration: e.target.checked ? {
                              verwendeZweiRohseifen: true,
                              seife2: '',
                              gewichtVerteilung: {
                                seife1Prozent: 50,
                                seife2Prozent: 50
                              }
                            } : null
                          }));
                        }}
                        name="istMischung"
                      />
                    }
                    label="Dieses Produkt ist eine Mischung aus zwei Rohseifen"
                  />
                </Grid>

                {formData.istMischung && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Erste Rohseife</InputLabel>
                        <Select
                          name="seife"
                          value={formData.seife || ''}
                          onChange={handleInputChange}
                          label="Erste Rohseife"
                          required
                        >
                          {seifenOptions.map(option => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Zweite Rohseife</InputLabel>
                        <Select
                          name="rohseifenKonfiguration.seife2"
                          value={formData.rohseifenKonfiguration?.seife2 || ''}
                          onChange={handleInputChange}
                          label="Zweite Rohseife"
                          required
                        >
                          {seifenOptions
                            .filter(option => option !== formData.seife)
                            .map(option => (
                              <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={`${formData.seife || 'Seife 1'} (%)`}
                        name="rohseifenKonfiguration.gewichtVerteilung.seife1Prozent"
                        type="number"
                        value={formData.rohseifenKonfiguration?.gewichtVerteilung?.seife1Prozent || 50}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleInputChange(e);
                          setFormData(prev => ({
                            ...prev,
                            rohseifenKonfiguration: {
                              ...prev.rohseifenKonfiguration,
                              gewichtVerteilung: {
                                ...prev.rohseifenKonfiguration?.gewichtVerteilung,
                                seife2Prozent: 100 - value
                              }
                            }
                          }));
                        }}
                        inputProps={{ min: 0, max: 100 }}
                        helperText={`${Math.round(formData.gramm * (formData.rohseifenKonfiguration?.gewichtVerteilung?.seife1Prozent || 50) / 100)}g`}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={`${formData.rohseifenKonfiguration?.seife2 || 'Seife 2'} (%)`}
                        name="rohseifenKonfiguration.gewichtVerteilung.seife2Prozent"
                        type="number"
                        value={formData.rohseifenKonfiguration?.gewichtVerteilung?.seife2Prozent || 50}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleInputChange(e);
                          setFormData(prev => ({
                            ...prev,
                            rohseifenKonfiguration: {
                              ...prev.rohseifenKonfiguration,
                              gewichtVerteilung: {
                                ...prev.rohseifenKonfiguration?.gewichtVerteilung,
                                seife1Prozent: 100 - value
                              }
                            }
                          }));
                        }}
                        inputProps={{ min: 0, max: 100 }}
                        helperText={`${Math.round(formData.gramm * (formData.rohseifenKonfiguration?.gewichtVerteilung?.seife2Prozent || 50) / 100)}g`}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}

            {/* Werkstück-spezifische Felder */}
            {formData.kategorie === 'werkstuck' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Werkstück-Konfiguration
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Gießform</InputLabel>
                    <Select
                      name="giessform"
                      value={formData.giessform}
                      onChange={handleInputChange}
                      label="Gießform"
                      required
                    >
                      {giessformOptions.map(option => (
                        <MenuItem 
                          key={option._id} 
                          value={option._id}
                          disabled={!option.verfuegbar}
                          sx={{
                            fontStyle: !option.verfuegbar ? 'italic' : 'normal',
                            color: !option.verfuegbar ? 'text.disabled' : 'text.primary'
                          }}
                        >
                          {option.inventarnummer} - {option.name} - {option.form}, {option.material}
                          {!option.verfuegbar && ' (nicht verfügbar)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Gießwerkstoff</InputLabel>
                    <Select
                      name="giesswerkstoff"
                      value={formData.giesswerkstoff}
                      onChange={handleInputChange}
                      label="Gießwerkstoff"
                      required
                    >
                      {giesswerkstoffOptions.map(option => (
                        <MenuItem 
                          key={option._id} 
                          value={option._id}
                          disabled={!option.verfuegbar}
                          sx={{
                            fontStyle: !option.verfuegbar ? 'italic' : 'normal',
                            color: !option.verfuegbar ? 'text.disabled' : 'text.primary'
                          }}
                        >
                          {option.bezeichnung} - {option.typ} ({option.konsistenz})
                          {!option.verfuegbar && ' (nicht verfügbar)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
                    Abmessungen
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Länge (cm)"
                    name="abmessungen.laenge"
                    type="number"
                    value={formData.abmessungen?.laenge || ''}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Breite (cm)"
                    name="abmessungen.breite"
                    type="number"
                    value={formData.abmessungen?.breite || ''}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Höhe (cm)"
                    name="abmessungen.hoehe"
                    type="number"
                    value={formData.abmessungen?.hoehe || ''}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Durchmesser (cm)"
                    name="abmessungen.durchmesser"
                    type="number"
                    value={formData.abmessungen?.durchmesser || ''}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
              </>
            )}

            {/* Gemeinsame Felder für alle Kategorien */}
            {formData.kategorie && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Allgemeine Einstellungen
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Zusatz/Optional"
                    name="optional"
                    value={formData.optional}
                    onChange={handleInputChange}
                    helperText="Zusätzliche Informationen oder Besonderheiten"
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
                    helperText="Position in der Produktliste"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.aktiv}
                        onChange={handleInputChange}
                        name="aktiv"
                      />
                    }
                    label="Produkt ist aktiv und sichtbar im Shop"
                  />
                </Grid>

                {/* Beschreibungsfelder für alle Kategorien */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    Produktbeschreibung
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kurzbeschreibung"
                    name="beschreibung.kurz"
                    value={formData.beschreibung.kurz}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    helperText="Kurze Produktbeschreibung für Übersichten"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Lange Beschreibung"
                    name="beschreibung.lang"
                    value={formData.beschreibung.lang}
                    onChange={handleInputChange}
                    multiline
                    rows={10}
                    helperText="Detaillierte Produktbeschreibung"
                  />
                </Grid>

                {formData.kategorie === 'seife' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Inhaltsstoffe"
                      name="beschreibung.inhaltsstoffe"
                      value={formData.beschreibung.inhaltsstoffe}
                      onChange={handleInputChange}
                      multiline
                      rows={4}
                      helperText="Liste der Inhaltsstoffe"
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Anwendung/Pflegehinweise"
                    name="beschreibung.anwendung"
                    value={formData.beschreibung.anwendung}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    helperText={formData.kategorie === 'seife' ? 'Anwendungshinweise für die Seife' : 'Pflegehinweise für das Produkt'}
                  />
                </Grid>

                {/* ── Schmuck-spezifische Felder ─────────────────────────────── */}
                {formData.kategorie === 'schmuck' && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                        Schmuck-Details
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Schmuck-Typ</InputLabel>
                        <Select
                          name="schmuckDetails.schmuckTyp"
                          value={formData.schmuckDetails?.schmuckTyp || ''}
                          onChange={handleInputChange}
                          label="Schmuck-Typ"
                        >
                          <MenuItem value="">– Bitte wählen –</MenuItem>
                          <MenuItem value="ring">Ring</MenuItem>
                          <MenuItem value="kette">Kette</MenuItem>
                          <MenuItem value="armband">Armband</MenuItem>
                          <MenuItem value="ohrring">Ohrringe</MenuItem>
                          <MenuItem value="anhaenger">Anhänger</MenuItem>
                          <MenuItem value="brosche">Brosche</MenuItem>
                          <MenuItem value="sonstiges">Sonstiges</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Material"
                        name="schmuckDetails.material"
                        value={formData.schmuckDetails?.material || ''}
                        onChange={handleInputChange}
                        helperText="z. B. 925 Sterling Silber, Edelstahl vergoldet"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Oberfläche / Veredelung"
                        name="schmuckDetails.oberflaeche"
                        value={formData.schmuckDetails?.oberflaeche || ''}
                        onChange={handleInputChange}
                        helperText="z. B. rhodiniert, vergoldet, poliert"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Steinbesatz"
                        name="schmuckDetails.steinbesatz"
                        value={formData.schmuckDetails?.steinbesatz || ''}
                        onChange={handleInputChange}
                        helperText="z. B. Zirkonia, Swarovski, ohne"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Ringgröße"
                        name="schmuckDetails.ringgroesse"
                        value={formData.schmuckDetails?.ringgroesse || ''}
                        onChange={handleInputChange}
                        helperText="z. B. 52, 54–58, XS/M/L"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Kettenlänge (cm)"
                        name="schmuckDetails.kettenlaenge"
                        type="number"
                        value={formData.schmuckDetails?.kettenlaenge || ''}
                        onChange={handleInputChange}
                        inputProps={{ min: 0, step: 0.5 }}
                        helperText="Länge in cm"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.schmuckDetails?.nickelhaltig || false}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              schmuckDetails: {
                                ...prev.schmuckDetails,
                                nickelhaltig: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Kann Nickel enthalten"
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                  </>
                )}

                {/* ── GPSR-Pflichtangaben ─────────────────────────────────────── */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'warning.dark' }}>
                    Produktsicherheit (GPSR – EU 2023/988)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Pflichtangaben für den Online-Verkauf. Werden auf der Produktseite angezeigt.
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bestimmungsgemäße Verwendung"
                    name="gpsr.verwendungszweck"
                    value={formData.gpsr?.verwendungszweck || ''}
                    onChange={handleInputChange}
                    helperText={
                      formData.kategorie === 'seife'
                        ? 'z. B. Kosmetisches Reinigungsprodukt zur äußerlichen Anwendung auf der Haut'
                        : formData.kategorie === 'schmuck'
                        ? 'z. B. Modeschmuck für Erwachsene, dekoratives Tragen am Körper'
                        : 'z. B. Dekorationsartikel für Erwachsene'
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Zielgruppe</InputLabel>
                    <Select
                      name="gpsr.zielgruppe"
                      value={formData.gpsr?.zielgruppe || ''}
                      onChange={handleInputChange}
                      label="Zielgruppe"
                    >
                      <MenuItem value="Nicht geeignet für Kinder unter 14 Jahren.">
                        Nicht geeignet für Kinder unter 14 Jahren
                      </MenuItem>
                      <MenuItem value="Nicht geeignet für Kinder unter 3 Jahren. Kleinteile – Erstickungsgefahr.">
                        Nicht geeignet für Kinder unter 3 Jahren (Kleinteile)
                      </MenuItem>
                      <MenuItem value="Geeignet für Erwachsene und Jugendliche ab 14 Jahren.">
                        Ab 14 Jahren (Jugendliche + Erwachsene)
                      </MenuItem>
                      <MenuItem value="Geeignet für Erwachsene ab 18 Jahren.">
                        Nur Erwachsene ab 18 Jahren
                      </MenuItem>
                      <MenuItem value="Geeignet für alle Altersgruppen.">
                        Alle Altersgruppen
                      </MenuItem>
                      <MenuItem value="">
                        – Keine Angabe –
                      </MenuItem>
                    </Select>
                    <FormHelperText>Standard für Schmuck: „Nicht geeignet für Kinder unter 14 Jahren"</FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sicherheits- und Warnhinweise"
                    name="gpsr.warnhinweise"
                    value={formData.gpsr?.warnhinweise || ''}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    helperText={
                      formData.kategorie === 'schmuck'
                        ? 'z. B. Kein Spielzeug. Kleinteile – Erstickungsgefahr. Nicht für Kinder unter 14 Jahren. Bei Hautreaktionen sofort ablegen.'
                        : 'z. B. Nur zur äußerlichen Anwendung. Bei Kontakt mit Augen sofort mit Wasser spülen. Außerhalb der Reichweite von Kindern aufbewahren.'
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.gpsr?.herstellerAbweichend || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          gpsr: {
                            ...prev.gpsr,
                            herstellerAbweichend: e.target.checked
                          }
                        }))}
                      />
                    }
                    label="Abweichender Hersteller / Inverkehrbringer (sonst werden Firmendaten verwendet)"
                  />
                </Grid>

                {formData.gpsr?.herstellerAbweichend && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Hersteller Name"
                        name="gpsr.herstellerName"
                        value={formData.gpsr?.herstellerName || ''}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Hersteller Anschrift"
                        name="gpsr.herstellerAnschrift"
                        value={formData.gpsr?.herstellerAnschrift || ''}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Hersteller E-Mail"
                        name="gpsr.herstellerEmail"
                        type="email"
                        value={formData.gpsr?.herstellerEmail || ''}
                        onChange={handleInputChange}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editingItem ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Aroma Dialog */}
      <Dialog
        open={showCreateAroma}
        onClose={() => setShowCreateAroma(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neues Duftöl erstellen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name des Duftöls"
                value={newAromaName}
                onChange={(e) => setNewAromaName(e.target.value)}
                placeholder="z.B. Lavendel-Bergamotte"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                value={newAromaDescription}
                onChange={(e) => setNewAromaDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Kurze Beschreibung des Duftes"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateAroma(false)} color="secondary">
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateNewAroma} 
            color="primary" 
            variant="contained"
            disabled={!newAromaName.trim()}
          >
            Duftöl erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Seife Dialog */}
      <Dialog
        open={showCreateSeife}
        onClose={() => setShowCreateSeife(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neue Rohseife erstellen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name der Rohseife"
                value={newSeifeName}
                onChange={(e) => setNewSeifeName(e.target.value)}
                placeholder="z.B. Bio Olivenöl-Basis"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                value={newSeifeDescription}
                onChange={(e) => setNewSeifeDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Kurze Beschreibung der Seifenbasis"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateSeife(false)} color="secondary">
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateNewSeife} 
            color="primary" 
            variant="contained"
            disabled={!newSeifeName.trim()}
          >
            Rohseife erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für erforderliche Dokumente */}
      <Dialog
        open={requiredDocumentsDialog.open}
        onClose={() => setRequiredDocumentsDialog({ open: false, category: null, docTypes: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          ✅ Produkt erfolgreich erstellt!
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Bitte erstellen Sie für dieses Produkt folgende erforderliche Dokumente:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {requiredDocumentsDialog.docTypes.map((doc) => (
              <Box
                key={doc.key}
                sx={{
                  p: 1.5,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  backgroundColor: doc.required ? '#ffebee' : '#fff3e0'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography sx={{ fontSize: '1.2em', lineHeight: 1, mt: 0.5 }}>
                    {doc.required ? '🔴' : '🟡'}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {doc.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.required ? 'Pflichtdokument' : 'Optionales Dokument'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setRequiredDocumentsDialog({ open: false, category: null, docTypes: [] })}
          >
            Später erstellen
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setRequiredDocumentsDialog({ open: false, category: null, docTypes: [] });
              // Diese ökrffnete die Admin-Dokumente Seite
              window.open('/admin-dokumente/blanko', '_blank');
            }}
          >
            Jetzt zu Dokumenten
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPortfolio;