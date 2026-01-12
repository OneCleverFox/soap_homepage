import React, { useState, useEffect } from 'react';
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
  CardActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Menu as MenuIcon,
  LocalShipping,
  ShoppingCart,
  Category,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import portfolioAdminService from '../services/portfolioAdminService';

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
      hoehe: ''
    },
    beschreibung: {
      kurz: '',
      lang: '',
      inhaltsstoffe: '',
      anwendung: ''
    }
  };

  const [formData, setFormData] = useState(initialFormData);

  // Portfolio Items laden
  useEffect(() => {
    loadPortfolioItems();
    loadOptions();
  }, []);

  // Items nach Kategorie filtern
  useEffect(() => {
    if (selectedCategory === 'alle') {
      setFilteredItems(portfolioItems);
    } else {
      setFilteredItems(portfolioItems.filter(item => item.kategorie === selectedCategory));
    }
  }, [portfolioItems, selectedCategory]);

  const loadPortfolioItems = async () => {
    try {
      setLoading(true);
      const response = await portfolioAdminService.getAll();
      setPortfolioItems(response.data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Portfolio Items:', err);
      setError('Fehler beim Laden der Portfolio Items');
    } finally {
      setLoading(false);
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
      
      setGiessformOptions(giessformen || []);
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Spezielle Behandlung für Zahlenfelder um NaN zu vermeiden
    let processedValue = type === 'checkbox' ? checked : value;
    if (name === 'reihenfolge' && value !== '') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) ? '' : numValue;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue
        }
      }));
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
      giessform: item.giessform || '',
      giesswerkstoff: item.giesswerkstoff || '',
      optional: item.optional || '',
      reihenfolge: item.reihenfolge || '',
      aktiv: item.aktiv !== undefined ? item.aktiv : false,
      istMischung: item.istMischung || false,
      rohseifenKonfiguration: item.rohseifenKonfiguration || null,
      abmessungen: {
        laenge: (item.abmessungen && item.abmessungen.laenge) || '',
        breite: (item.abmessungen && item.abmessungen.breite) || '',
        hoehe: (item.abmessungen && item.abmessungen.hoehe) || ''
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
      
      if (formData.kategorie === 'werkstuck') {
        // Für Werkstücke: Setze Seifenfelder auf leere Strings
        submitData.seife = '';
        submitData.aroma = '';
        submitData.seifenform = '';
        submitData.verpackung = '';
        submitData.zusatz = '';
        submitData.optional = '';
      } else {
        // Für Seifen: Setze Werkstückfelder auf null
        submitData.giessform = null;
        submitData.giesswerkstoff = null;
      }
      
      if (editingItem) {
        await portfolioAdminService.update(editingItem._id, submitData);
      } else {
        await portfolioAdminService.create(submitData);
      }
      
      setOpen(false);
      loadPortfolioItems();
      setFormData(initialFormData);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Fehler beim Speichern des Portfolio Items');
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
        await portfolioAdminService.deleteImage(productId, imageType, imageIndex);
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

      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1200 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        PaperProps={{ sx: { width: '50vw', minWidth: 200 } }}
      >
        {renderNavigation()}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Paper sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Portfolio Verwaltung
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCategory === 'alle' ? 'Alle Produkte' : 
                 categories.find(c => c.id === selectedCategory)?.label} 
                ({filteredItems.length} Artikel)
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNew}
            >
              Neues Produkt
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Cards Grid */}
          <Grid container spacing={3}>
            {filteredItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Product Image mit Upload */}
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={item.bilder?.hauptbild 
                        ? item.bilder.hauptbild  // Direkte Base64-Data-URL nutzen
                        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktlaW4gQmlsZDwvdGV4dD48L3N2Zz4='
                      }
                      alt={item.name}
                      sx={{ objectFit: 'cover' }}
                      onError={(e) => {
                        console.log('Bild konnte nicht geladen werden:', item.bilder?.hauptbild);
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktlaW4gQmlsZDwvdGV4dD48L3N2Zz4=';
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
                  
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
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
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1.1rem' }}>
                      {item.name}
                    </Typography>
                    
                    {/* Product Details */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      €{item.preis}
                    </Typography>
                    
                    {/* Gallery Images Upload */}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Galerie ({item.bilder?.galerie?.length || 0}):
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: 1, maxWidth: '100%' }}>
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
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(item)}
                      variant="outlined"
                      sx={{ mr: 1 }}
                    >
                      Bearbeiten
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(item._id)}
                      color="error"
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
                      <MenuItem value="__CREATE_NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
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
                              seife1: prev.seife || '',
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
                          name="rohseifenKonfiguration.seife1"
                          value={formData.rohseifenKonfiguration?.seife1 || formData.seife || ''}
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
                            .filter(option => option !== formData.rohseifenKonfiguration?.seife1)
                            .map(option => (
                              <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={`${formData.rohseifenKonfiguration?.seife1 || 'Seife 1'} (%)`}
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
                        <MenuItem key={option._id} value={option._id}>
                          {option.inventarnummer} - {option.name} - {option.form}, {option.material}
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
                        <MenuItem key={option._id} value={option._id}>
                          {option.bezeichnung} - {option.typ} ({option.konsistenz})
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