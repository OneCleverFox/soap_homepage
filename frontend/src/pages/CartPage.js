import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import _toast from 'react-hot-toast';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  TextField,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowBack as ArrowBackIcon,
  ShoppingBag as ShoppingBagIcon
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemsCount, loading } = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [shippingConfig, setShippingConfig] = useState({
    enabled: true,
    cost: 5.99,
    freeThreshold: 30
  });

  useEffect(() => {
    const loadShippingConfig = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/admin-settings/shop-status`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setShippingConfig({
          enabled: data?.status?.shippingEnabled !== false,
          cost: Number(data?.status?.shippingCost ?? 5.99),
          freeThreshold: Number(data?.status?.freeShippingThreshold ?? 30)
        });
      } catch (_error) {
        // Fallback bleibt auf Default-Werten
      }
    };

    loadShippingConfig();
  }, []);

  const getShippingCost = (subtotal) => {
    if (!shippingConfig.enabled) {
      return 0;
    }

    if (subtotal >= shippingConfig.freeThreshold) {
      return 0;
    }

    return shippingConfig.cost;
  };

  // Helper-Funktion um Bild-URLs zu korrigieren
  const getImageUrl = (imageData) => {
    if (!imageData) {
      return null;
    }

    const url = typeof imageData === 'object' && imageData !== null
      ? imageData.url
      : imageData;

    if (typeof url !== 'string' || !url) {
      return null;
    }
    
    // Base64-Bilder direkt zurückgeben
    if (url.startsWith('data:image/')) {
      return url;
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    // API_BASE_URL aus der Umgebung verwenden
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    
    // Wenn URL mit /api/uploads beginnt, direkt verwenden
    if (url.startsWith('/api/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    
    // Wenn URL mit /uploads beginnt, /api davor hinzufügen
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}/api${url}`;
    }
    
    // Fallback: URL so verwenden wie sie ist
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  const handleQuantityChange = (productId, newQuantity) => {
    // Finde das entsprechende Item um verfügbare Menge zu prüfen
    const item = items.find(item => item.id === productId || item.produktId === productId);
    const maxAvailable = Number(item?.bestand?.menge || 0);
    // Verbesserte Verfügbarkeitsprüfung: aktiv ist verfügbar wenn true oder undefined
    const isAvailable = (item?.aktiv !== false) && maxAvailable > 0;

    if (!isAvailable) {
      return;
    }

    if (newQuantity > maxAvailable) {
      // Kein Backend-Request über verfügbarem Bestand
      updateQuantity(productId, maxAvailable);
      return;
    }

    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = () => {
    console.log('🛒 Checkout clicked, user:', user);
    if (!user) {
      console.log('🛒 No user, navigating to login');
      navigate('/login');
    } else {
      console.log('🛒 User exists, navigating to checkout');
      navigate('/checkout');
    }
  };

  const isItemAvailable = (item) => {
    if (typeof item?.isAvailable === 'boolean') {
      return item.isAvailable;
    }

    if (item?.bestand) {
      return (item?.aktiv !== false) && Number(item.bestand?.menge || 0) > 0;
    }

    // Fallback fuer optimistische lokale Items ohne Bestandsdaten
    return item?.aktiv !== false;
  };

  const hasEnoughStockForItem = (item) => {
    if (typeof item?.hasEnoughStock === 'boolean') {
      return item.hasEnoughStock;
    }

    if (item?.bestand) {
      return Number(item.quantity || 0) <= Number(item.bestand?.menge || 0);
    }

    return true;
  };

  // Berechne verfügbare Gesamtsumme (nur verfügbare Artikel)
  const getAvailableTotal = () => {
    return items
      .filter(item => isItemAvailable(item) && hasEnoughStockForItem(item))
      .reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  // Berechne verfügbare Artikel-Anzahl
  const getAvailableItemsCount = () => {
    return items
      .filter(item => isItemAvailable(item) && hasEnoughStockForItem(item))
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Bitte melden Sie sich an, um Ihren Warenkorb zu nutzen.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Zur Anmeldung
        </Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Lade Warenkorb...
        </Typography>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <ShoppingCartIcon sx={{ fontSize: 120, color: 'grey.300', mb: 3 }} />
        <Typography variant="h4" gutterBottom>
          Ihr Warenkorb ist leer
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Entdecken Sie unsere Produkte und fügen Sie etwas zu Ihrem Warenkorb hinzu.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/products')}
          startIcon={<ShoppingBagIcon />}
        >
          Weiter einkaufen
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3 }}>
        <IconButton 
          onClick={() => navigate('/products')} 
          sx={{ mr: 2 }}
          size={isMobile ? "small" : "medium"}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          Warenkorb ({getCartItemsCount()})
        </Typography>
      </Box>

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Warenkorb-Artikel */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: isMobile ? 1.5 : 2 }}>
            {items.map((item, index) => {
              const available = isItemAvailable(item);
              const enoughStock = hasEnoughStockForItem(item);

              return (
              <Box key={item.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    display: 'flex', 
                    mb: 2,
                    flexDirection: isMobile ? 'column' : 'row',
                    // Visuell hervorheben wenn nicht verfügbar
                    opacity: available ? 1 : 0.6,
                    border: available ? 'none' : '2px dashed #f44336',
                    backgroundColor: available ? 'transparent' : '#ffebee'
                  }}
                >
                  {item.image && (
                    <Box 
                      sx={{ 
                        width: isMobile ? '100%' : 120, 
                        height: isMobile ? 200 : 120,
                        flexShrink: 0
                      }}
                    >
                      <LazyImage
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        height={isMobile ? 200 : 120}
                        objectFit="cover"
                      />
                    </Box>
                  )}
                  <CardContent sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    p: isMobile ? 1.5 : 2,
                    '&:last-child': { pb: isMobile ? 1.5 : 2 }
                  }}>
                    <Box>
                      <Typography variant={isMobile ? "body1" : "h6"} gutterBottom fontWeight="bold">
                        {item.name}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                        {item.seife} • {item.gramm}g
                      </Typography>
                      
                      {/* Verfügbarkeitsstatus */}
                      {item.bestand && (
                        <Box sx={{ mt: 0.5 }}>
                          {!available ? (
                            <Chip 
                              label="Nicht verfügbar" 
                              color="error" 
                              size="small" 
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ) : !enoughStock ? (
                            <Chip 
                              label={`Nur ${item.bestand?.menge || 0} verfügbar`} 
                              color="warning" 
                              size="small" 
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip 
                                label="Verfügbar" 
                                color="success" 
                                size="small" 
                                sx={{ fontSize: '0.75rem' }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                (max. {item.bestand?.menge || 0} {item.bestand?.einheit || 'Stück'})
                              </Typography>
                            </Box>
                          )}

                          {available && item.quantity >= (item.bestand?.menge || 0) && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                              Es sind nur {item.bestand?.menge || 0} Stück vorrätig.
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: isMobile ? 1.5 : 0,
                      mt: 2 
                    }}>
                      {/* Mengenauswahl */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        border: 1, 
                        borderColor: 'grey.300', 
                        borderRadius: 1,
                        justifyContent: isMobile ? 'center' : 'flex-start',
                        alignSelf: isMobile ? 'center' : 'flex-start'
                      }}>
                        <IconButton
                          size={isMobile ? "medium" : "small"}
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.id, item.quantity - 1);
                          }}
                          disabled={item.quantity <= 1}
                        >
                          <RemoveIcon fontSize={isMobile ? "medium" : "small"} />
                        </IconButton>
                        <TextField
                          size={isMobile ? "medium" : "small"}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, val);
                          }}
                          inputProps={{
                            min: 1,
                            max: item.bestand?.menge || 1,
                            style: { textAlign: 'center', width: isMobile ? 60 : 50 }
                          }}
                          variant="standard"
                          InputProps={{ disableUnderline: true }}
                        />
                        <IconButton
                          size={isMobile ? "medium" : "small"}
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.id, item.quantity + 1);
                          }}
                          disabled={!available || item.quantity >= (item.bestand?.menge || 0)}
                        >
                          <AddIcon fontSize={isMobile ? "medium" : "small"} />
                        </IconButton>
                      </Box>

                      {/* Preis und Löschen */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: isMobile ? 'space-between' : 'flex-end',
                        gap: 2,
                        width: isMobile ? '100%' : 'auto'
                      }}>
                        <Box sx={{ textAlign: 'right' }}>
                          {item.sale?.isOnSale && Number(item.sale?.discountPercent || 0) > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', display: 'block' }}>
                              €{(Number(item.sale?.basispreis || item.price || 0) * item.quantity).toFixed(2)}
                            </Typography>
                          )}
                          <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                            €{((item.price || 0) * item.quantity).toFixed(2)}
                          </Typography>
                        </Box>
                        <IconButton
                          color="error"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Artikel entfernen"
                          size={isMobile ? "medium" : "small"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {index < items.length - 1 && <Divider sx={{ my: isMobile ? 1.5 : 2 }} />}
              </Box>
              );
            })}

            {/* Warenkorb leeren */}
            <Box sx={{ mt: isMobile ? 2 : 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  if (window.confirm('Möchten Sie wirklich alle Artikel aus dem Warenkorb entfernen?')) {
                    clearCart();
                  }
                }}
              >
                Warenkorb leeren
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Zusammenfassung */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, position: isMobile ? 'static' : 'sticky', top: 20 }}>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom fontWeight="bold">
              Zusammenfassung
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant={isMobile ? "body2" : "body1"}>Verfügbare Artikel:</Typography>
              <Typography variant={isMobile ? "body2" : "body1"}>€{getAvailableTotal().toFixed(2)}</Typography>
            </Box>
            
            {getCartTotal() !== getAvailableTotal() && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant={isMobile ? "caption" : "body2"} color="warning.main">
                  Nicht verfügbare Artikel:
                </Typography>
                <Typography variant={isMobile ? "caption" : "body2"} color="warning.main">
                  €{(getCartTotal() - getAvailableTotal()).toFixed(2)}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                Versand (DHL):
              </Typography>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                €{getShippingCost(getAvailableTotal()).toFixed(2)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: isMobile ? 2 : 3 }}>
              <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                Gesamt:
              </Typography>
              <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold" color="primary">
                €{(getAvailableTotal() + getShippingCost(getAvailableTotal())).toFixed(2)}
              </Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              * Alle Preise inkl. MwSt.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              * Versand erfolgt ausschließlich innerhalb Deutschlands
            </Typography>
            
            <Button
              variant="contained"
              fullWidth
              size={isMobile ? "large" : "medium"}
              onClick={handleCheckout}
              disabled={getAvailableItemsCount() === 0}
              sx={{ mb: 2 }}
            >
              Zur Kasse ({getAvailableItemsCount()} verfügbare Artikel)
            </Button>
            
            {getAvailableItemsCount() === 0 && items.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Keine verfügbaren Artikel im Warenkorb
              </Alert>
            )}
            
            <Button
              variant="outlined"
              fullWidth
              size={isMobile ? "medium" : "small"}
              onClick={() => navigate('/products')}
            >
              Weiter einkaufen
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CartPage;