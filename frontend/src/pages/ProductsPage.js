import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Skeleton
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
  Warning as WarningIcon
} from '@mui/icons-material';
import { portfolioAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import toast from 'react-hot-toast';
import LazyImage from '../components/LazyImage';
import stockEventService from '../services/stockEventService';

// API Base URL für Bild-URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductsPage = React.memo(() => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isOnline: _isOnline, isSlowConnection: _isSlowConnection } = useNetworkStatus();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // Für initiales Skeleton
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({}); // { productId: quantity }
  const [_retryCount, setRetryCount] = useState(0); // Für Retry-Logik

  // Optimierte fetchProducts Funktion mit Retry-Mechanismus und Progressive Loading
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
      
      // DEBUG: Prüfe Vanilla Dream Dual-Soap Konfiguration
      const vanillaDream = productsData.find(p => p.name === 'Vanilla Dream');
      if (vanillaDream) {
        console.log('🔍 DEBUG: Vanilla Dream gefunden:', vanillaDream);
        console.log('🔍 DEBUG: rohseifenKonfiguration:', vanillaDream.rohseifenKonfiguration);
        console.log('🔍 DEBUG: verwendeZweiRohseifen:', vanillaDream.rohseifenKonfiguration?.verwendeZweiRohseifen);
        console.log('🔍 DEBUG: seife2:', vanillaDream.rohseifenKonfiguration?.seife2);
      } else {
        console.log('❌ DEBUG: Vanilla Dream NICHT gefunden!');
      }
      
      const duration = performance.now() - startTime;
      console.log(`✅ Products loaded successfully in ${duration.toFixed(0)}ms - Count: ${productsData.length} ${response.data?.cached ? '(CACHED)' : '(FRESH)'}`);
      
      // ⚡ PROGRESSIVE UPDATE: Zeige sofort verfügbare Daten
      if (productsData.length > 0) {
        setProducts(productsData);
        setInitialLoading(false);
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

  // Helper-Funktion um relative Bild-URLs in absolute URLs umzuwandeln
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Wenn es ein Base64-Bild ist (data:image/...), direkt zurückgeben
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }
    
    // Wenn die URL bereits mit http/https beginnt, direkt zurückgeben
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Legacy: Wenn die URL mit /api beginnt, Backend-Host hinzufügen
    if (imageUrl.startsWith('/api')) {
      return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
    }
    
    // Ansonsten vollständige API-URL bauen
    return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
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
            Unsere handgemachten Naturseifen
          </Typography>
          <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary" sx={{ mb: 2 }}>
            Premium Qualität aus natürlichen Zutaten
          </Typography>
          <Skeleton variant="text" width={200} sx={{ mx: 'auto' }} />
        </Box>

        {/* Skeleton Cards */}
        <Grid container spacing={isMobile ? 2 : 4}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <Skeleton 
                  variant="rectangular" 
                  height={isMobile ? 200 : 300}
                  animation="wave"
                />
                <CardContent>
                  <Skeleton variant="text" height={40} width="80%" />
                  <Skeleton variant="text" height={20} width="100%" sx={{ mt: 1 }} />
                  <Skeleton variant="text" height={20} width="90%" />
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Skeleton variant="text" width={60} />
                    <Skeleton variant="text" width={80} />
                  </Box>
                  <Skeleton variant="text" height={35} width="50%" sx={{ mt: 2, mx: 'auto' }} />
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Skeleton variant="rectangular" height={36} width="100%" />
                </CardActions>
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
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
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
          Unsere handgemachten Naturseifen
        </Typography>
        <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary" sx={{ mb: 2 }}>
          Premium Qualität aus natürlichen Zutaten
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {products.length} einzigartige Seifen-Kreationen verfügbar
        </Typography>
      </Box>

      {/* Produktkarten */}
      <Grid container spacing={isMobile ? 2 : 4}>
        {products.map((product, index) => (
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
                  <LazyImage
                    src={getImageUrl(product.bilder?.hauptbild)}
                    alt={`${product.name} - Handgemachte Naturseife (${product.gramm}g)`}
                    height={isMobile ? 200 : 300}
                    objectFit="cover"
                    priority={index < 3} // Erste 3 Bilder haben Priorität
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
                  
                  {/* Rohseifen Badge(s) */}
                  {(() => {
                    const isDualSoap = product.rohseifenKonfiguration?.verwendeZweiRohseifen;
                    const seife2 = product.rohseifenKonfiguration?.seife2;
                    
                    // DEBUG für Vanilla Dream
                    if (product.name === 'Vanilla Dream') {
                      console.log('🎯 RENDER DEBUG Vanilla Dream:');
                      console.log('  isDualSoap:', isDualSoap);
                      console.log('  seife2:', seife2);
                      console.log('  rohseifenKonfiguration:', product.rohseifenKonfiguration);
                    }
                    
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

                    <Box display="flex" alignItems="center">
                      <AromaIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {product.aroma}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Rohseifen-Information */}
                  <Box sx={{ mb: 2 }}>
                    {(() => {
                      const isDualSoapInfo = product.rohseifenKonfiguration?.verwendeZweiRohseifen;
                      
                      // DEBUG für Vanilla Dream Detail-Info
                      if (product.name === 'Vanilla Dream') {
                        console.log('🎯 RENDER DEBUG Vanilla Dream INFO:');
                        console.log('  isDualSoapInfo:', isDualSoapInfo);
                        console.log('  gewichtVerteilung:', product.rohseifenKonfiguration?.gewichtVerteilung);
                      }
                      
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
      {products.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Typography variant="h5" gutterBottom>
            Keine Produkte verfügbar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Zurzeit sind keine Produkte im Portfolio vorhanden.
          </Typography>
        </Box>
      )}
    </Container>
  );
});

export default ProductsPage;