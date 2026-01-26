import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Alert,
  Fade,
  CardActions,
  IconButton,
  useMediaQuery,
  useTheme,
  Skeleton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Fab
} from '@mui/material';
import {
  Inventory as WeightIcon,
  LocalFlorist as AromaIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory2 as InventoryIcon,
  Warning as WarningIcon,
  Soap as SoapIcon,
  Build as BuildIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { portfolioAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getImageUrl } from '../utils/imageUtils';
import toast from 'react-hot-toast';
import LazyImage from '../components/LazyImage';
import stockEventService from '../services/stockEventService';

// API Base URL für Bild-URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductsPage = React.memo(() => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isOnline: _isOnline, isSlowConnection: _isSlowConnection } = useNetworkStatus();
  
  // URL-Parameter für Kategorie
  const [searchParams, setSearchParams] = useSearchParams();
  const kategorieFromURL = searchParams.get('kategorie') || 'alle';
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedKategorie, setSelectedKategorie] = useState(kategorieFromURL);
  const [categoryCounts, setCategoryCounts] = useState({ alle: 0, seife: 0, werkstuck: 0 });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [textDataLoaded, setTextDataLoaded] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [_retryCount, setRetryCount] = useState(0);

  // Kategorien-Definition
  const kategorien = [
    { 
      key: 'alle', 
      label: 'Alle Produkte', 
      icon: FilterIcon,
      beschreibung: 'Zeige alle verfügbaren Produkte' 
    },
    { 
      key: 'seife', 
      label: 'Kosmetikprodukte', 
      icon: SoapIcon,
      beschreibung: 'Hochwertige Seifen aus ausgesuchten Rohstoffen' 
    },
    { 
      key: 'werkstuck', 
      label: 'Gips-Werkstücke', 
      icon: BuildIcon,
      beschreibung: 'Kunstvolle Gips-Abgüsse und Dekorationen' 
    }
  ];

  // Kategorien-Sidebar-Komponente
  const CategorySidebar = ({ mobile = false }) => (
    <Box>
      <Typography 
        variant={mobile ? "h6" : "subtitle1"}
        sx={{ 
          mb: mobile ? 2 : 1.5, 
          fontWeight: 600,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: mobile ? '1.1rem' : '0.95rem'
        }}
      >
        <FilterIcon fontSize={mobile ? 'medium' : 'small'} />
        Kategorien
      </Typography>
      
      <List sx={{ p: 0 }}>
        {kategorien.map((kategorie) => {
          const count = categoryCounts[kategorie.key] || 0;
          const IconComponent = kategorie.icon;
          
          return (
            <ListItem key={kategorie.key} disablePadding sx={{ mb: mobile ? 1 : 0.5 }}>
              <ListItemButton
                onClick={() => handleKategorieChange(kategorie.key)}
                selected={selectedKategorie === kategorie.key}
                sx={{
                  borderRadius: mobile ? 2 : 1.5,
                  py: mobile ? 1.5 : 1,
                  px: mobile ? 2 : 1.5,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: 'primary.50', // Sanfterer Hintergrund
                    color: 'primary.700', // Dunklerer Text für besseren Kontrast
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.100',
                    }
                  },
                  '&:hover': {
                    bgcolor: selectedKategorie === kategorie.key 
                      ? 'primary.100' 
                      : 'grey.100',
                    transform: 'translateX(2px)' // Subtile Hover-Animation
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: selectedKategorie === kategorie.key 
                    ? 'primary.600' 
                    : 'text.secondary',
                  minWidth: mobile ? 40 : 32
                }}>
                  <IconComponent fontSize={mobile ? 'medium' : 'small'} />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography 
                        variant={mobile ? "body2" : "caption"} 
                        fontWeight={selectedKategorie === kategorie.key ? 600 : 500}
                        sx={{ 
                          fontSize: mobile ? '0.9rem' : '0.8rem',
                          lineHeight: 1.3
                        }}
                      >
                        {kategorie.label}
                      </Typography>
                      <Chip 
                        label={count}
                        size="small"
                        sx={{
                          height: mobile ? 20 : 18,
                          fontSize: mobile ? '0.7rem' : '0.65rem',
                          fontWeight: 600,
                          bgcolor: selectedKategorie === kategorie.key 
                            ? 'primary.200' 
                            : 'grey.200',
                          color: selectedKategorie === kategorie.key 
                            ? 'primary.800' 
                            : 'grey.700',
                          '& .MuiChip-label': {
                            px: mobile ? 1 : 0.75
                          }
                        }}
                      />
                    </Box>
                  }
                  secondary={!mobile && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '0.7rem',
                        lineHeight: 1.2,
                        mt: 0.3
                      }}
                    >
                      {kategorie.beschreibung}
                    </Typography>
                  )}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {selectedKategorie !== 'alle' && (
        <>
          <Divider sx={{ my: mobile ? 2 : 1.5, borderColor: 'grey.200' }} />
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ClearIcon />}
            onClick={() => handleKategorieChange('alle')}
            size={mobile ? "medium" : "small"}
            sx={{
              borderColor: 'grey.300',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'grey.400',
                bgcolor: 'grey.50'
              },
              fontSize: mobile ? '0.85rem' : '0.75rem'
            }}
          >
            Filter zurücksetzen
          </Button>
        </>
      )}
    </Box>
  );
  const fetchProducts = useCallback(async (isBackgroundUpdate = false, retryAttempt = 0) => {
    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
      }
      setError('');
      
      console.log(`🚀 OPTIMIZED: Fetching products... ${isBackgroundUpdate ? '(Background)' : '(Initial)'} - Attempt: ${retryAttempt + 1}`);
      
      // Performance Tracking
      const startTime = performance.now();
      
      const response = await portfolioAPI.getWithPrices();
      const productsData = response.data?.data || response.data || [];
      
      // Vanilla Dream Dual-Soap Konfiguration validiert ✅
      
      const duration = performance.now() - startTime;
      console.log(`✅ Products loaded successfully in ${duration.toFixed(0)}ms - Count: ${productsData.length} ${response.data?.cached ? '(CACHED)' : '(FRESH)'}`);
      
      // ⚡ PROGRESSIVE UPDATE: Zeige sofort verfügbare Daten
      if (productsData.length > 0) {
        setProducts(productsData);
        
        // Kategorienanzahl berechnen
        const counts = {
          alle: productsData.length,
          seife: productsData.filter(p => (p.kategorie || 'seife') === 'seife').length,
          werkstuck: productsData.filter(p => p.kategorie === 'werkstuck').length
        };
        setCategoryCounts(counts);
        
        setTextDataLoaded(true); // 📝 Text ist da - Cards können sofort angezeigt werden
        setInitialLoading(false);
        // Starte Image-Loading nach kurzer Verzögerung
        setTimeout(() => {
          setImagesLoading(false); // Bilder können jetzt lazy loaded werden
        }, 100);
      }
      setRetryCount(0); // Reset retry count on success
      
      // ⚡ OPTIMIZED CACHING: Cache-Strategie für bessere Performance
      try {
        sessionStorage.setItem('cachedProducts', JSON.stringify({
          data: productsData,
          timestamp: Date.now(),
          cacheAge: response.data?.cacheAge || 0,
          cached: response.data?.cached || false
        }));
      } catch (cacheError) {
        console.warn('⚠️ Could not cache products:', cacheError);
      }
      
    } catch (err) {
      console.error(`❌ Products fetch failed (Attempt ${retryAttempt + 1}):`, err.message);
      
      // Intelligente Retry-Logik
      const maxRetries = 3;
      const shouldRetry = retryAttempt < maxRetries && (
        err.code === 'NETWORK_ERROR' ||
        err.code === 'ECONNABORTED' ||
        !err.response ||
        err.response?.status >= 500
      );
      
      if (shouldRetry) {
        const delay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
        console.log(`🔄 Retrying in ${delay}ms... (${retryAttempt + 1}/${maxRetries})`);
        
        setTimeout(() => {
          fetchProducts(isBackgroundUpdate, retryAttempt + 1);
        }, delay);
        return;
      }
      
      // Zeige nur bei initialer Ladung oder kritischen Fehlern Error-Message
      if (!isBackgroundUpdate) {
        setError(`Produkte konnten nicht geladen werden. ${err.response?.status === 503 ? 'Server ist momentan überlastet.' : 'Bitte versuchen Sie es später erneut.'}`);
      } else {
        console.warn('Background update failed, keeping existing products');
      }
      
      setRetryCount(retryAttempt + 1);
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Produkte nach Kategorie filtern
  useEffect(() => {
    if (products.length === 0) return;
    
    let filtered = products;
    if (selectedKategorie !== 'alle') {
      filtered = products.filter(product => (product.kategorie || 'seife') === selectedKategorie);
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedKategorie]);

  // Kategorie-Wechsel
  const handleKategorieChange = (kategorie) => {
    setSelectedKategorie(kategorie);
    setSearchParams(kategorie !== 'alle' ? { kategorie } : {});
    setMobileDrawerOpen(false);
  };

  // Mengenauswahl für jedes Produkt initialisieren
  useEffect(() => {
    if (products.length > 0) {
      const initialQuantities = {};
      products.forEach(product => {
        initialQuantities[product._id] = 1;
      });
      setQuantities(initialQuantities);
    }
  }, [products]);

  // Menge ändern
  const handleQuantityChange = (productId, delta) => {
    setQuantities(prev => {
      const product = products.find(p => p._id === productId);
      const maxMenge = product?.bestand?.menge || 0;
      const currentQuantity = prev[productId] || 1;
      const newQuantity = Math.max(1, Math.min(maxMenge, currentQuantity + delta));
      return { ...prev, [productId]: newQuantity };
    });
  };

  // In den Warenkorb legen
  const handleAddToCart = async (product) => {
    if (!product.preis) {
      toast.error('Produkt hat noch keinen Preis');
      return;
    }

    if (!product.bestand?.verfuegbar) {
      toast.error('Produkt ist nicht auf Lager');
      return;
    }

    try {
      const quantity = quantities[product._id] || 1;

      // Prüfe ob genug Bestand vorhanden ist
      if (quantity > product.bestand.menge) {
        toast.error(`Nur noch ${product.bestand.menge} Stück verfügbar`);
        return;
      }

      // Verwende die addToCart-Funktion aus dem CartContext
      await addToCart({
        id: product._id,
        name: product.name,
        price: getProductPrice(product),
        image: product.bilder?.hauptbild,
        gramm: product.gramm,
        seife: product.seife
      }, quantity);
      
      // Erfolgs-Toast wird bereits in addToCart gezeigt
      // Optimistic Update: Reduziere Bestand sofort im lokalen State
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === product._id 
            ? {
                ...p,
                bestand: {
                  ...p.bestand,
                  menge: Math.max(0, (p.bestand?.menge || 0) - quantity)
                }
              }
            : p
        )
      );
      
    } catch (err) {
      console.error('Fehler beim Hinzufügen zum Warenkorb:', err);
      toast.error('Fehler beim Hinzufügen zum Warenkorb');
    }
  };

  // Helper-Funktion um den Preis eines Produkts zu ermitteln
  const getProductPrice = (product) => {
    return product.preis || product.verkaufspreis || 0;
  };

  // Stock-Update-Handler für reaktive Updates
  const handleStockUpdate = useCallback((productId, newStock) => {
    if (!productId) {
      // Globales Update - alle Produkte neu laden
      console.log('🔄 Global stock update - refreshing all products');
      sessionStorage.removeItem('cachedProducts');
      fetchProducts(true);
    } else {
      // Spezifisches Produkt-Update
      console.log(`📦 Updating stock for product ${productId} to ${newStock}`);
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId 
            ? {
                ...p,
                bestand: {
                  ...p.bestand,
                  menge: newStock,
                  verfuegbar: newStock > 0
                }
              }
            : p
        )
      );
    }
  }, [fetchProducts]);

  useEffect(() => {
    let isMounted = true;
    
    // Stock-Event-Listener für reaktive Updates
    const unsubscribeStock = stockEventService.subscribe(handleStockUpdate);
    
    // Event-Listener für Lageränderungen (Legacy)
    const handleInventoryUpdate = () => {
      console.log('📦 Inventory update detected - forcing immediate refresh');
      
      // Cache komplett invalidieren mit mehreren Sicherheitsstufen
      sessionStorage.removeItem('cachedProducts');
      sessionStorage.setItem('forceProductsReload', 'true');
      localStorage.removeItem('cachedProducts'); // Fallback für versehentliche localStorage-Nutzung
      
      console.log('🔒 FORCE FLAG SET: forceProductsReload =', sessionStorage.getItem('forceProductsReload'));
      
      if (isMounted) {
        console.log('🔄 Immediate fresh reload triggered');
        setProducts([]); // Clear current products
        setLoading(true); // Show loading state
        fetchProducts(false); // Fresh load, nicht background
      }
    };

    // Event-Listener registrieren
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    
    // Sofort mit gecachten Daten starten wenn verfügbar
    const loadCachedProducts = () => {
      try {
        // DEBUG: Überprüfe alle Storage-Flags
        const forceReload = sessionStorage.getItem('forceProductsReload');
        const cachedData = sessionStorage.getItem('cachedProducts');
        console.log('🔍 CACHE CHECK: forceReload =', forceReload);
        console.log('🔍 CACHE CHECK: cachedData exists =', !!cachedData);
        
        // Prüfe auf forcierte Neuladen-Flag - ERSTE PRIORITÄT
        if (forceReload) {
          console.log('🔄 Force reload detected - completely skipping cache');
          sessionStorage.removeItem('forceProductsReload');
          return false; // Cache nicht verwenden
        }
        
        // Cache aktiviert für bessere Performance
        const cached = sessionStorage.getItem('cachedProducts');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          console.log('🔍 CACHE AGE: ', Math.round(cacheAge / 1000), 'seconds old');
          
          // Verwende Cache wenn er weniger als 2 Minuten alt ist
          if (cacheAge < 2 * 60 * 1000) {
            console.log('⚡ Loading cached products immediately');
            if (isMounted) {
              setProducts(data);
              setInitialLoading(false); // Zeige Content statt Skeleton
              setLoading(false);
            }
            
            // Lade frische Daten im Hintergrund nach 5 Sekunden
            setTimeout(() => {
              if (isMounted) {
                console.log('🔄 Refreshing products in background');
                fetchProducts(true); // true = background update
              }
            }, 5000);
            return true;
          }
        }
        return false; // Kein gültiger Cache gefunden
        
        /* const cached = sessionStorage.getItem('cachedProducts');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Verwende Cache wenn er weniger als 5 Sekunden alt ist (verkürzt für Testing)
          if (Date.now() - timestamp < 5 * 1000) {
            console.log('⚡ Loading cached products immediately');
            if (isMounted) {
              setProducts(data);
              setInitialLoading(false); // Zeige Content statt Skeleton
              setLoading(false);
            }
            
            // Lade frische Daten im Hintergrund
            setTimeout(() => {
              if (isMounted) {
                console.log('🔄 Refreshing products in background');
                fetchProducts(true); // true = background update
              }
            }, 100);
            return true;
          }
        } */
      } catch (e) {
        console.warn('⚠️ Could not load cached products:', e);
      }
      return false;
    };
    
    // Wenn kein Cache geladen wurde, normale Ladung
    console.log('🚀 ProductsPage initializing...');
    
    if (!loadCachedProducts() && isMounted) {
      console.log('🆕 No valid cache - loading fresh products');
      fetchProducts(false);
    } else {
      console.log('✅ Cache decision completed');
    }

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribeStock(); // Stock-Event-Listener entfernen
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, []); // Empty deps - useCallback handles fetchProducts deps

  if (initialLoading && products.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
        {/* Header - sofort sichtbar */}
        <Box textAlign="center" mb={isMobile ? 3 : 6}>
          <Typography 
            variant={isMobile ? "h4" : "h3"}
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textFillColor: 'transparent'
            }}
          >
            Unsere Seifenprodukte
          </Typography>
          <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary" sx={{ mb: 2 }}>
            Premium Qualität aus ausgewählten Zutaten
          </Typography>
          {/* 🚀 PROGRESSIVE LOADING STATE */}
          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
            {textDataLoaded ? 'Bilder werden geladen...' : 'Produkte werden geladen...'}
          </Typography>
        </Box>

        {/* ⚡ SMART SKELETONS: Realistische Card-Dimensionen */}
        <Grid container spacing={isMobile ? 2 : 4}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: 400 }}> {/* Feste Höhe für realistische Darstellung */}
                <Skeleton 
                  variant="rectangular" 
                  height={200}
                  animation="wave"
                  sx={{ 
                    bgcolor: 'grey.100',
                    borderRadius: '4px 4px 0 0' // Rounded corners nur oben
                  }}
                />
                <CardContent sx={{ p: 2 }}>
                  <Skeleton variant="text" height={28} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error && products.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchProducts}>
          Erneut versuchen
        </Button>
      </Container>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      {!isMobile && !isTablet && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            top: 64, // Unter der Navbar
            width: 240, // Schmaler: 240px statt 300px
            height: 'auto', // Automatische Höhe
            maxHeight: 'calc(100vh - 64px)', // Maximal bis Footer
            bgcolor: 'grey.50', // Sanfterer Hintergrund
            borderRight: '1px solid',
            borderColor: 'grey.200', // Sanftere Borderfarbe
            p: 2, // Weniger Padding
            overflowY: 'auto',
            zIndex: 1100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)' // Subtiler Schatten
          }}
        >
          <CategorySidebar />
        </Box>
      )}

      {/* Mobile Category Filter FAB */}
      {(isMobile || isTablet) && (
        <Fab
          color="primary"
          aria-label="Kategorien filtern"
          size="small"
          sx={{
            position: 'fixed',
            top: 72, // Unter der Navbar mit mehr Abstand
            left: 12, // Etwas weniger Abstand zum Rand
            zIndex: 1000 // Unter der Navbar aber über Content
          }}
          onClick={() => setMobileDrawerOpen(true)}
        >
          <FilterIcon fontSize="small" />
        </Fab>
      )}

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '50vw', // 50% der Bildschirmbreite
            maxWidth: 300, // Maximal 300px auf größeren Bildschirmen
            minWidth: 250, // Mindestens 250px für Lesbarkeit
            p: 3
          }
        }}
      >
        <CategorySidebar mobile />
      </Drawer>

      {/* Main Content */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          py: isMobile ? 2 : 4,
          ...((!isMobile && !isTablet) && {
            marginLeft: '240px' // Angepasst für schmalere Sidebar
          }),
          ...((isMobile || isTablet) && {
            marginTop: '60px' // Platz für Mobile Filter Button
          })
        }}
      >
          {/* Header */}
          <Box textAlign="center" mb={isMobile ? 3 : 6}>
            <Typography 
              variant={isMobile ? "h4" : "h3"}
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textFillColor: 'transparent'
              }}
            >
              {selectedKategorie === 'seife' ? 'Kosmetikprodukte' :
               selectedKategorie === 'werkstuck' ? 'Gips-Werkstücke' :
               'Unsere Produktpalette'}
            </Typography>
            <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary" sx={{ mb: 2 }}>
              {selectedKategorie === 'seife' ? 'Premium Qualität aus natürlichen Zutaten' :
               selectedKategorie === 'werkstuck' ? 'Kunstvolle Gips-Abgüsse und Dekorationen' :
               'Seifen und Werkstücke aus eigener Herstellung'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredProducts.length} {selectedKategorie === 'alle' ? 'Produkte' : 
               selectedKategorie === 'seife' ? 'Seifen' : 'Werkstücke'} verfügbar
            </Typography>
          </Box>

          {/* Produktkarten */}
          <Grid container spacing={isMobile ? 2 : 4}>
            {filteredProducts.map((product, index) => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Fade in={true} timeout={300} style={{ transitionDelay: `${Math.min(index * 50, 200)}ms` }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  contentVisibility: 'auto', // Browser optimiert Rendering
                  containIntrinsicSize: '1px 600px', // Geschätzte Größe für besseres Scrolling
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateY(-4px)',
                    boxShadow: isMobile ? 2 : '0 8px 24px rgba(0,0,0,0.15)'
                  }
                }}
              >
                {/* Großes Produktbild mit LazyImage */}
                <Box
                  onClick={() => navigate(`/products/${product._id}`)}
                  sx={{ position: 'relative', overflow: 'hidden' }}
                >
                  {imagesLoading ? (
                    // 📝 TEXT-FIRST PHASE: Zeige Skeleton während Image-Loading
                    <Skeleton
                      variant="rectangular"
                      height={isMobile ? 200 : 300}
                      animation="wave"
                      sx={{ bgcolor: 'grey.100' }}
                    />
                  ) : (
                    // 🖼️ IMAGE PHASE: Lade Bilder nach Text-Content
                    <LazyImage
                      src={getImageUrl(product.bilder?.hauptbild)}
                      alt={`${product.name} - Handgemachte Naturseife (${product.gramm}g)`}
                      height={isMobile ? 200 : 300}
                      objectFit="cover"
                      priority={index < 3} // 🚀 Erste 3 Bilder haben Priorität
                      fallback={
                        <Box
                          sx={{
                            height: isMobile ? 200 : 300,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography variant="h6" color="text.secondary">
                            Kein Bild
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                  
                  {/* Kategorie-spezifische Badge(s) */}
                  {(() => {
                    // Werkstück-spezifische Anzeige
                    if (product.kategorie === 'werkstuck') {
                      return (
                        <Chip 
                          label={product.giesswerkstoffName || 'Standard'}
                          size="small"
                          sx={{ 
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            bgcolor: 'rgba(255,255,255,0.95)',
                            fontWeight: 'bold',
                            backdropFilter: 'blur(10px)'
                          }}
                        />
                      );
                    }

                    // Seife-spezifische Anzeige (bestehender Code)
                    const isDualSoap = product.rohseifenKonfiguration?.verwendeZweiRohseifen;
                    const seife2 = product.rohseifenKonfiguration?.seife2;
                    
                    // Dual-Soap Konfiguration validiert ✅
                    
                    return isDualSoap ? (
                    <Box
                      sx={{ 
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5
                      }}
                    >
                      <Chip 
                        label={product.seife}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.95)',
                          fontWeight: 'bold',
                          backdropFilter: 'blur(10px)',
                          fontSize: '0.7rem'
                        }}
                      />
                      <Chip 
                        label={seife2}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.95)',
                          fontWeight: 'bold',
                          backdropFilter: 'blur(10px)',
                          fontSize: '0.7rem'
                        }}
                      />
                    </Box>
                  ) : (
                    <Chip 
                      label={product.seife}
                      size="small"
                      sx={{ 
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        bgcolor: 'rgba(255,255,255,0.95)',
                        fontWeight: 'bold',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                  );
                  })()}
                </Box>

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* Produktname */}
                  <Typography 
                    variant="h2" 
                    gutterBottom 
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                  >
                    {product.name}
                  </Typography>

                  {/* Verfügbarkeitsanzeige */}
                  {product.bestand && (
                    <Box sx={{ mb: 2 }}>
                      {product.bestand.verfuegbar ? (
                        <Chip
                          label={`${product.bestand.menge} ${product.bestand.einheit} vorrätig`}
                          color="success"
                          size="small"
                          icon={<InventoryIcon />}
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip
                          label="Aktuell nicht auf Lager"
                          color="error"
                          size="small"
                          icon={<WarningIcon />}
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                  )}

                  {/* Kurzbeschreibung */}
                  {product.beschreibung?.kurz && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ mb: 2, lineHeight: 1.6 }}
                    >
                      {product.beschreibung.kurz}
                    </Typography>
                  )}

                  {/* Produktdetails */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Box display="flex" alignItems="center">
                      <WeightIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {product.gramm}g
                      </Typography>
                    </Box>

                    {/* Aroma nur für Seifen anzeigen */}
                    {product.kategorie === 'seife' && product.aroma && (
                      <Box display="flex" alignItems="center">
                        <AromaIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {product.aroma}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Rohseifen-Information */}
                  <Box sx={{ mb: 2 }}>
                    {(() => {
                      // Kategorie-spezifische Anzeige
                      if (product.kategorie === 'werkstuck') {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            <strong>Gießwerkstoff:</strong> {product.giesswerkstoffName || 'Standard'}
                          </Typography>
                        );
                      }
                      
                      // Seife-spezifische Anzeige (bestehender Code)
                      const isDualSoapInfo = product.rohseifenKonfiguration?.verwendeZweiRohseifen;
                      
                      return isDualSoapInfo ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 1, fontWeight: 500 }}>
                          Rohseifen-Mischung:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2" color="primary.main" sx={{ fontSize: '0.8rem' }}>
                            • {product.seife} ({product.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}%)
                          </Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontSize: '0.8rem' }}>
                            • {product.rohseifenKonfiguration.seife2} ({product.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}%)
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        <strong>Rohseife:</strong> {product.seife}
                      </Typography>
                    );
                    })()}
                  </Box>

                  {/* Preis */}
                  <Box 
                    sx={{ 
                      mt: 'auto',
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    {getProductPrice(product) > 0 ? (
                      <Typography 
                        variant="h5" 
                        color="primary" 
                        fontWeight="bold"
                        sx={{ textAlign: 'center' }}
                      >
                        {getProductPrice(product).toFixed(2)} €
                      </Typography>
                    ) : (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ textAlign: 'center', fontStyle: 'italic' }}
                      >
                        Preis noch nicht festgelegt
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                  {/* Mengenauswahl und Warenkorb-Button in einer Zeile (für alle angemeldeten Benutzer) */}
                  {user && getProductPrice(product) > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
                      {/* Kompakte Mengenauswahl */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          border: '1px solid',
                          borderColor: product.bestand?.verfuegbar ? 'divider' : 'grey.300',
                          borderRadius: 1,
                          overflow: 'hidden',
                          opacity: product.bestand?.verfuegbar ? 1 : 0.5
                        }}
                      >
                        <IconButton
                          size={isMobile ? "medium" : "small"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product._id, -1);
                          }}
                          disabled={!product.bestand?.verfuegbar || quantities[product._id] <= 1}
                          sx={{ 
                            borderRadius: 0,
                            minWidth: isMobile ? 44 : 'auto',
                            minHeight: isMobile ? 44 : 'auto'
                          }}
                          aria-label={`Menge von ${product.name} verringern`}
                          title={`Menge von ${product.name} verringern`}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            minWidth: 30, 
                            textAlign: 'center',
                            px: 1,
                            fontWeight: 'bold'
                          }}
                        >
                          {quantities[product._id] || 1}
                        </Typography>
                        
                        <IconButton
                          size={isMobile ? "medium" : "small"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product._id, 1);
                          }}
                          disabled={!product.bestand?.verfuegbar || (quantities[product._id] || 1) >= (product.bestand?.menge || 0)}
                          sx={{ 
                            borderRadius: 0,
                            minWidth: isMobile ? 44 : 'auto',
                            minHeight: isMobile ? 44 : 'auto'
                          }}
                          aria-label={`Menge von ${product.name} erhöhen`}
                          title={`Menge von ${product.name} erhöhen`}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Kompakter Warenkorb-Button */}
                      <Button
                        variant="contained"
                        color={product.bestand?.verfuegbar ? "success" : "inherit"}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        startIcon={<CartIcon />}
                        disabled={!product.bestand?.verfuegbar}
                        sx={{ 
                          flex: 1,
                          ...(product.bestand?.verfuegbar ? {} : {
                            bgcolor: 'grey.300',
                            color: 'grey.600',
                            '&:hover': {
                              bgcolor: 'grey.400'
                            }
                          })
                        }}
                      >
                        {product.bestand?.verfuegbar ? 'Warenkorb' : 'Nicht verfügbar'}
                      </Button>
                    </Box>
                  )}

                  {/* Details und Doku in einer Zeile */}
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => navigate(`/products/${product._id}`)}
                      startIcon={<InfoIcon />}
                    >
                      Details
                    </Button>

                    {product.weblink && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(product.weblink, '_blank');
                        }}
                        startIcon={<LinkIcon />}
                      >
                        Doku
                      </Button>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Fade>
          </Grid>
            ))}
          </Grid>

          {/* Keine Produkte verfügbar */}
          {filteredProducts.length === 0 && !loading && (
            <Box textAlign="center" py={8}>
              <Typography variant="h5" gutterBottom>
                {selectedKategorie === 'alle' 
                  ? 'Keine Produkte verfügbar'
                  : `Keine ${selectedKategorie === 'seife' ? 'Seifen' : 'Werkstücke'} verfügbar`
                }
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {selectedKategorie === 'alle'
                  ? 'Zurzeit sind keine Produkte im Portfolio vorhanden.'
                  : `Zurzeit sind keine ${selectedKategorie === 'seife' ? 'Seifen' : 'Werkstücke'} verfügbar.`
                }
              </Typography>
              {selectedKategorie !== 'alle' && (
                <Button
                  variant="outlined"
                  onClick={() => handleKategorieChange('alle')}
                  startIcon={<FilterIcon />}
                >
                  Alle Kategorien anzeigen
                </Button>
              )}
            </Box>
          )}
        </Container>
      </>
    );
});

export default ProductsPage;