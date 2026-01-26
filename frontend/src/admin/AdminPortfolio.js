import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TablePagination,
  Fade  // ✅ Für Animationen
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
import LazyImage from '../components/LazyImage';  // ✅ Performance-optimierte Lazy Loading

const AdminPortfolio = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State für Portfolio Items
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);  // Separate für Bilder
  const [error, setError] = useState(null);

  // 📄 Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);  // 12 Items pro Seite (3x4 Grid)

  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState('alle');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Options für Dropdowns
  const [seifenOptions, setSeifenOptions] = useState([]);
  const [aromaOptions, setAromaOptions] = useState([]);
  const [seifenformOptions, setSeifenformOptions] = useState([]);
  const [verpackungOptions, setVerpackungOptions] = useState([]);
  const [giessformOptions, setGiessformOptions] = useState([]);
  const [giesswerkstoffOptions, setGiesswerkstoffOptions] = useState([]);

  // Dialog für neue Items
  const [showCreateAroma, setShowCreateAroma] = useState(false);
  const [showCreateSeife, setShowCreateSeife] = useState(false);
  const [newAromaName, setNewAromaName] = useState('');
  const [newAromaDescription, setNewAromaDescription] = useState('');
  const [newSeifeName, setNewSeifeName] = useState('');
  const [newSeifeDescription, setSeifeDescription] = useState('');

  // Bild-Upload States
  const [uploadingImages, setUploadingImages] = useState({});

  // Kategorien für Navigation
  const categories = [
    { id: 'alle', label: 'Alle Produkte', icon: Category },
    { id: 'seife', label: 'Seifen', icon: LocalShipping },
    { id: 'werkstuck', label: 'Werkstücke', icon: ShoppingCart }
  ];

  // Initialwerte für Formular
  const initialFormData = {
    kategorie: '',
    name: '',
    gramm: '',
    preis: '',
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
    }
  };

  const [formData, setFormData] = useState(initialFormData);

  // ✅ Funktionen VOR useEffect definieren (wegen Dependencies)
  const loadPortfolioItems = useCallback(async (signal) => {
    try {
      setLoading(true);
      const startTime = performance.now();
      console.log('⏱️ Portfolio API-Call startet...');
      
      const response = await portfolioAdminService.getAll(signal);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Portfolio API-Call abgeschlossen in ${duration.toFixed(0)}ms - ${response.data?.length || 0} Produkte`);
      
      if (!signal?.aborted) {
        // ✅ SOFORT setzen, damit Cards erscheinen (Bilder laden separat)
        setPortfolioItems(response.data || []);
        setLoading(false); // ✅ Loading SOFORT beenden → Cards werden gerendert
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('❌ Fehler beim Laden der Portfolio Items:', err);
        setError('Fehler beim Laden der Portfolio Items');
      }
      setLoading(false);
    }
  }, []);

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

  // Portfolio Items laden
  useEffect(() => {
    const abortController = new AbortController();
    console.log('📡 Portfolio: Lade Daten...');
    
    const loadData = async () => {
      await loadOptions(); // Erst Optionen laden
      await loadPortfolioItems(abortController.signal); // Dann Portfolio-Items
    };
    loadData();
    
    return () => {
      console.log('🛑 Portfolio: Abbruch - Komponente wird unmounted');
      abortController.abort();
    };
  }, [loadPortfolioItems]);

  // Items nach Kategorie filtern (memoized)
  useEffect(() => {
    setPage(0);  // Reset pagination bei Filter-Änderung
    if (selectedCategory === 'alle') {
      setFilteredItems(portfolioItems);
    } else {
      setFilteredItems(portfolioItems.filter(item => item.kategorie === selectedCategory));
    }
  }, [portfolioItems, selectedCategory]);

  // ⚡ Paginierte Items (memoized für Performance)
  const paginatedItems = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  // Pagination Handler
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

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

    // Spezialbehandlung: Wenn Gießform gewählt wird, lade Abmessungen, Gewicht und Durchmesser automatisch
    if (name === 'giessform' && value) {
      try {
        const selectedGiessform = giessformOptions.find(g => g._id === value);
        if (selectedGiessform) {
          // Konvertiere mm in cm für konsistente Darstellung
          const laengeCm = selectedGiessform.laengeMm ? (selectedGiessform.laengeMm / 10).toFixed(1) : '';
          const breiteCm = selectedGiessform.breiteMm ? (selectedGiessform.breiteMm / 10).toFixed(1) : '';
          const tiefeCm = selectedGiessform.tiefeMm ? (selectedGiessform.tiefeMm / 10).toFixed(1) : '';
          const durchmesserCm = selectedGiessform.durchmesserMm ? (selectedGiessform.durchmesserMm / 10).toFixed(1) : '';
          
          // Gewicht aus Volumen berechnen (volumenMl = Gewicht in Gramm für Gips, ca. 1:1)
          // Für andere Materialien könnte man mit Dichte-Faktoren arbeiten
          const gewichtGramm = selectedGiessform.volumenMl || '';
          
          setFormData(prev => ({
            ...prev,
            giessform: value,
            gramm: gewichtGramm,
            abmessungen: {
              laenge: laengeCm,
              breite: breiteCm,
              hoehe: tiefeCm,
              durchmesser: durchmesserCm
            }
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
      
      if (formData.kategorie === 'werkstuck') {
        // Für Werkstücke: Setze nur Seifenfelder auf leere Strings
        submitData.seife = '';
        submitData.aroma = '';
        submitData.seifenform = '';
        submitData.verpackung = '';
        // NICHT zusatz und optional überschreiben - die können auch für Werkstücke genutzt werden!
        
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
      
      if (editingItem) {
        await portfolioAdminService.update(editingItem._id, submitData);
      } else {
        await portfolioAdminService.create(submitData);
      }
      
      setOpen(false);
      loadPortfolioItems();
      setFormData(initialFormData);
    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err);
      setError(err.response?.data?.message || err.message || 'Fehler beim Speichern des Portfolio Items');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Portfolio Item löschen möchten?')) {
      try {
        await portfolioAdminService.delete(id);
        loadPortfolioItems();
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
      setSeifeDescription('');
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
      loadPortfolioItems(); // Neu laden um aktualisierte Bilder zu zeigen
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
        // Übersetze deutsche Begriffe zu API-Endpunkten
        const apiImageType = imageType === 'galerie' ? 'gallery' : imageType;
        await portfolioAdminService.deleteImage(productId, apiImageType, imageIndex);
        loadPortfolioItems();
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
        setError('Fehler beim Löschen des Bildes');
      }
    }
  };

  // Render Navigation
  const renderNavigation = () => (
    <List>
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
    return <Typography>Laden...</Typography>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box sx={{ width: 240, flexShrink: 0, bgcolor: 'grey.50', borderRight: '1px solid', borderColor: 'divider' }}>
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

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 2, md: 3 } }}>
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

          {/* Cards Grid - nur paginierte Items rendern */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {loading && portfolioItems.length === 0 ? (
              // ✅ Skeleton Cards während des ersten Ladens
              Array.from({ length: 12 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`}>
                  <Card sx={{ height: '100%' }}>
                    <Box sx={{ height: 200, bgcolor: '#f5f5f5' }} />
                    <CardContent>
                      <Box sx={{ height: 24, bgcolor: '#e0e0e0', mb: 1, borderRadius: 1 }} />
                      <Box sx={{ height: 16, bgcolor: '#e0e0e0', width: '60%', borderRadius: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              // ✅ Echte Cards sofort anzeigen (auch wenn noch loading=true)
              paginatedItems.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                <Fade in={true} timeout={200} style={{ transitionDelay: `${Math.min(index * 30, 150)}ms` }}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateY(-4px)',
                    boxShadow: isMobile ? 2 : '0 8px 24px rgba(0,0,0,0.15)'
                  }
                }}>
                  {/* Product Image mit Upload */}
                  <Box sx={{ position: 'relative' }}>
                    <LazyImage
                      src={getImageUrl(item.bilder?.hauptbild) || getPlaceholderImage('Kein Bild')}
                      alt={item.name}
                      height={isMobile ? 180 : 200}
                      objectFit="cover"
                      priority={index < (isMobile ? 6 : 3)}  // 🚀 Mobile: 6, Desktop: 3
                      onError={(e) => {
                        console.log('Bild konnte nicht geladen werden:', item.bilder?.hauptbild);
                      }}
                      fallback={
                        <Box
                          sx={{
                            height: isMobile ? 180 : 200,
                            bgcolor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Kein Bild
                          </Typography>
                        </Box>
                      }
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
                      <Chip 
                        label={item.aktiv ? 'Aktiv' : 'Inaktiv'} 
                        size="small"
                        color={item.aktiv ? 'success' : 'default'}
                      />
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
                    <Typography variant="h6" color="primary" sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '1.1rem', sm: '1.25rem' }
                    }}>
                      €{item.preis}
                    </Typography>
                    
                    {/* Gallery Images Upload */}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Galerie ({item.bilder?.galerie?.length || 0}):
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))', gap: { xs: 0.5, sm: 1 }, maxWidth: '100%' }}>
                        {/* Vorhandene Galeriebilder */}
                        {item.bilder?.galerie && item.bilder.galerie.slice(0, 4).map((img, idx) => (
                          <Box key={idx} sx={{ position: 'relative' }}>
                            <LazyImage
                              src={getImageUrl(img) || getPlaceholderImage(`Galerie ${idx + 1}`)}
                              alt={img.alt_text || `Galerie ${idx + 1}`}
                              height={60}
                              objectFit="cover"
                              priority={false}  // Gallery-Bilder haben keine Priorität
                              onError={(e) => {
                                console.log('Galeriebild konnte nicht geladen werden:', img);
                              }}
                              sx={{
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                              }}
                              fallback={
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: 60,
                                    bgcolor: '#f5f5f5',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    {idx + 1}
                                  </Typography>
                                </Box>
                              }
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
                              onClick={() => handleImageDelete(item._id, 'galerie', idx)}
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
                </Fade>
              </Grid>
              ))
            )}
          </Grid>

          {/* ✅ Pagination Controls */}
          {filteredItems.length > rowsPerPage && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <TablePagination
                component="div"
                count={filteredItems.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[8, 12, 24, 48]}
                labelRowsPerPage="Produkte pro Seite:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
              />
            </Box>
          )}

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
                    helperText="Für rechteckige Formen"
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
                    helperText="Für rechteckige Formen"
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
                    helperText="Für runde Formen"
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
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kurzbeschreibung"
                    name="beschreibung.kurz"
                    value={formData.beschreibung.kurz}
                    onChange={handleInputChange}
                    multiline
                    rows={2}
                    helperText="Kurze Produktbeschreibung für Übersichten"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Lange Beschreibung"
                    name="beschreibung.lang"
                    value={formData.beschreibung.lang}
                    onChange={handleInputChange}
                    multiline
                    rows={2}
                    helperText="Detaillierte Produktbeschreibung"
                  />
                </Grid>

                {formData.kategorie === 'seife' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Inhaltsstoffe"
                      name="beschreibung.inhaltsstoffe"
                      value={formData.beschreibung.inhaltsstoffe}
                      onChange={handleInputChange}
                      multiline
                      rows={2}
                      helperText="Liste der Inhaltsstoffe"
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Anwendung/Pflegehinweise"
                    name="beschreibung.anwendung"
                    value={formData.beschreibung.anwendung}
                    onChange={handleInputChange}
                    multiline
                    rows={2}
                    helperText={formData.kategorie === 'seife' ? 'Anwendungshinweise für die Seife' : 'Pflegehinweise für das Werkstück'}
                  />
                </Grid>
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
                onChange={(e) => setSeifeDescription(e.target.value)}
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
    </Box>
  );
};

export default AdminPortfolio;