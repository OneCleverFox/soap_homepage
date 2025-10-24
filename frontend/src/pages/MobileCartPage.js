import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogContent,
  DialogActions,
  Slide,
  Badge,
  AppBar,
  Toolbar,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowBack as ArrowBackIcon,
  ShoppingBag as ShoppingBagIcon,
  LocalShipping,
  ClearAll,
  SwipeLeft
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const MobileCartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemsCount, loading } = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [deleteDialog, setDeleteDialog] = useState({ open: false, productId: null });
  const [clearDialog, setClearDialog] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const SHIPPING_COST = 7.69;
  const FREE_SHIPPING_THRESHOLD = 50;

  // Helper-Funktion um Bild-URLs zu korrigieren
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) return url;
    if (url.startsWith('http')) return url;
    
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    
    if (url.startsWith('/api/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}/api${url}`;
    }
    
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  const handleQuantityChange = (productId, newQuantity) => {
    // Finde das Item um Bestandslimit zu prüfen
    const item = items.find(item => (item.id === productId || item.produktId === productId));
    const maxStock = item?.bestand?.menge || 0;
    const isAvailable = item?.bestand?.verfuegbar === true;
    
    // Prüfe Limits: min 1, max verfügbarer Bestand, max 99
    const minQuantity = 1;
    const maxQuantity = isAvailable ? Math.min(maxStock, 99) : 1;
    
    if (newQuantity >= minQuantity && newQuantity <= maxQuantity) {
      updateQuantity(productId, newQuantity);
    } else if (newQuantity > maxQuantity) {
      // Zeige Warnung wenn Bestandslimit erreicht
      toast.warning(`Nur ${maxStock} Stück verfügbar`);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  const handleDeleteItem = (productId) => {
    setDeleteDialog({ open: true, productId });
  };

  const confirmDelete = () => {
    if (deleteDialog.productId) {
      removeFromCart(deleteDialog.productId);
    }
    setDeleteDialog({ open: false, productId: null });
  };

  const getShippingInfo = () => {
    const total = getCartTotal();
    const remaining = FREE_SHIPPING_THRESHOLD - total;
    
    if (remaining <= 0) {
      return {
        isFree: true,
        message: 'Kostenloser Versand!',
        cost: 0
      };
    } else {
      return {
        isFree: false,
        message: `Noch €${remaining.toFixed(2)} bis zum kostenlosen Versand`,
        cost: SHIPPING_COST
      };
    }
  };

  // Berechne verfügbare Gesamtsumme (nur verfügbare Artikel)
  const getAvailableTotal = () => {
    return items
      .filter(item => item.hasEnoughStock === true)
      .reduce((sum, item) => sum + (item.price || item.preis || 0) * item.quantity, 0);
  };

  // Berechne verfügbare Artikel-Anzahl
  const getAvailableItemsCount = () => {
    return items
      .filter(item => item.hasEnoughStock === true)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Mobile Header
  const MobileHeader = () => (
    <AppBar 
      position="sticky" 
      sx={{ 
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important' }}>
        <IconButton 
          edge="start" 
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <ShoppingCartIcon sx={{ mr: 2 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Warenkorb
        </Typography>
        <Badge badgeContent={getCartItemsCount()} color="primary">
          <Chip 
            label={`€${getCartTotal().toFixed(2)}`}
            color="primary"
            size="small"
          />
        </Badge>
        {items.length > 0 && (
          <IconButton 
            onClick={() => setClearDialog(true)}
            color="error"
            sx={{ ml: 1 }}
          >
            <ClearAll />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );

  // Mobile Cart Item
  const MobileCartItem = ({ item, index }) => {
    const [swipeDistance, setSwipeDistance] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      setStartX(touch.clientX);
    };

    const [startX, setStartX] = useState(0);

    const handleTouchMove = (e) => {
      if (!startX) return;
      const touch = e.touches[0];
      const distance = startX - touch.clientX;
      
      if (distance > 0 && distance < 100) {
        setSwipeDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      if (swipeDistance > 60) {
        setIsDeleting(true);
        setTimeout(() => handleDeleteItem(item.id || item.produktId), 200);
      } else {
        setSwipeDistance(0);
      }
      setStartX(0);
    };

    return (
      <Card 
        sx={{ 
          mb: 2, 
          mx: 2,
          transform: `translateX(-${swipeDistance}px)`,
          transition: isDeleting ? 'transform 0.2s ease-out' : 'none',
          position: 'relative',
          '&::after': swipeDistance > 30 ? {
            content: '"Löschen"',
            position: 'absolute',
            right: -80,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'error.main',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 1,
            fontSize: '0.875rem',
            opacity: Math.min(swipeDistance / 60, 1)
          } : {}
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Product Image */}
            <Grid item xs={3}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                position: 'relative',
                borderRadius: 1,
                overflow: 'hidden'
              }}>
                <LazyImage
                  src={getImageUrl(item.image || item.hauptbild || item.images?.[0])}
                  alt={item.name || item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </Box>
            </Grid>

            {/* Product Info */}
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {item.name || item.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.kategorie}
              </Typography>
              
              {/* Verfügbarkeitsstatus */}
              {item.bestand && (
                <Box sx={{ mt: 0.5 }}>
                  {!item.isAvailable ? (
                    <Chip 
                      label="Nicht verfügbar" 
                      color="error" 
                      size="small" 
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  ) : !item.hasEnoughStock ? (
                    <Chip 
                      label={`Nur ${item.bestand?.menge || 0} verfügbar`} 
                      color="warning" 
                      size="small" 
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  ) : (
                    <Chip 
                      label="Verfügbar" 
                      color="success" 
                      size="small" 
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  )}
                </Box>
              )}
              
              <Typography variant="body2" color="primary" fontWeight="bold" sx={{ mt: 0.5 }}>
                €{(item.preis || item.price).toFixed(2)}
              </Typography>
            </Grid>

            {/* Quantity Controls */}
            <Grid item xs={3}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <IconButton 
                    size="small"
                    onClick={() => handleQuantityChange(item.id || item.produktId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    sx={{ width: 28, height: 28 }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mx: 1, 
                      minWidth: 24, 
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    {item.quantity}
                  </Typography>
                  
                  <IconButton 
                    size="small"
                    onClick={() => handleQuantityChange(item.id || item.produktId, item.quantity + 1)}
                    disabled={
                      item.quantity >= Math.min(item.bestand?.menge || 0, 99) || 
                      !item.bestand?.verfuegbar
                    }
                    sx={{ width: 28, height: 28 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* Bestandsanzeige bei Quantity Controls */}
                {item.bestand?.verfuegbar && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ fontSize: '0.7rem', textAlign: 'center', display: 'block' }}
                  >
                    max. {item.bestand.menge}
                  </Typography>
                )}
                
                <Typography variant="caption" fontWeight="bold">
                  €{((item.preis || item.price) * item.quantity).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Shipping Info Banner
  const ShippingBanner = () => {
    const shippingInfo = getShippingInfo();
    
    return (
      <Paper 
        elevation={0}
        sx={{ 
          mx: 2, 
          mb: 2, 
          p: 2, 
          bgcolor: shippingInfo.isFree ? 'success.light' : 'info.light',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LocalShipping sx={{ mr: 1, color: shippingInfo.isFree ? 'success.main' : 'info.main' }} />
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {shippingInfo.message}
          </Typography>
          {!shippingInfo.isFree && (
            <Typography variant="body2" fontWeight="bold">
              +€{shippingInfo.cost.toFixed(2)}
            </Typography>
          )}
        </Box>
        
        {!shippingInfo.isFree && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ 
              height: 4, 
              bgcolor: 'rgba(0,0,0,0.1)', 
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                height: '100%', 
                bgcolor: 'success.main',
                width: `${Math.min((getCartTotal() / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                transition: 'width 0.3s ease'
              }} />
            </Box>
          </Box>
        )}
      </Paper>
    );
  };

  // Sticky Bottom Bar
  const StickyBottomBar = () => {
    const totalAll = getCartTotal();
    const availableTotal = getAvailableTotal();
    const availableCount = getAvailableItemsCount();
    const shippingInfo = getShippingInfo();
    const finalTotal = availableTotal + shippingInfo.cost;
    
    return (
      <Paper 
        elevation={8}
        sx={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          zIndex: 1200
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Verfügbar: €{availableTotal.toFixed(2)}
            </Typography>
            {totalAll !== availableTotal && (
              <Typography variant="caption" color="warning.main">
                Nicht verfügbar: €{(totalAll - availableTotal).toFixed(2)}
              </Typography>
            )}
            {!shippingInfo.isFree && availableTotal > 0 && (
              <Typography variant="body2" color="text.secondary">
                Versand: €{shippingInfo.cost.toFixed(2)}
              </Typography>
            )}
          </Box>
          <Typography variant="h6" fontWeight="bold">
            €{finalTotal.toFixed(2)}
          </Typography>
        </Box>
        
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleCheckout}
          disabled={loading || availableCount === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <ShoppingBagIcon />}
          sx={{ minHeight: 48 }}
        >
          {loading ? 'Laden...' : `Zur Kasse (${availableCount} verfügbare Artikel)`}
        </Button>
        
        {!user && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
            Anmeldung erforderlich für Checkout
          </Typography>
        )}
        
        {availableCount === 0 && items.length > 0 && (
          <Typography variant="caption" color="warning.main" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
            Keine verfügbaren Artikel im Warenkorb
          </Typography>
        )}
      </Paper>
    );
  };

  // Empty Cart
  const EmptyCart = () => (
    <Box sx={{ 
      textAlign: 'center', 
      py: 8, 
      px: 4,
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Ihr Warenkorb ist leer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Entdecken Sie unsere handgefertigten Seifen und Produkte
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        startIcon={<ShoppingBagIcon />}
      >
        Produkte entdecken
      </Button>
    </Box>
  );

  // Loading State
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <Box sx={{ pb: 12 }}>
        <MobileHeader />
        
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            {/* Swipe Hint */}
            {showSwipeHint && items.length > 0 && (
              <Alert 
                severity="info" 
                sx={{ m: 2 }}
                onClose={() => setShowSwipeHint(false)}
                action={
                  <SwipeLeft sx={{ ml: 1 }} />
                }
              >
                Nach links wischen zum Löschen
              </Alert>
            )}
            
            <ShippingBanner />
            
            {/* Cart Items */}
            <Box sx={{ mb: 2 }}>
              {items.map((item, index) => (
                <MobileCartItem key={item.id || item.produktId || index} item={item} index={index} />
              ))}
            </Box>
          </>
        )}

        {items.length > 0 && <StickyBottomBar />}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, productId: null })}
          TransitionComponent={Transition}
        >
          <DialogContent>
            <Typography>
              Möchten Sie dieses Produkt aus dem Warenkorb entfernen?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, productId: null })}>
              Abbrechen
            </Button>
            <Button onClick={confirmDelete} color="error">
              Entfernen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear Cart Dialog */}
        <Dialog
          open={clearDialog}
          onClose={() => setClearDialog(false)}
          TransitionComponent={Transition}
        >
          <DialogContent>
            <Typography>
              Möchten Sie den gesamten Warenkorb leeren?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                clearCart();
                setClearDialog(false);
              }} 
              color="error"
            >
              Leeren
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Desktop Layout (Original)
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Original Desktop Layout */}
    </Container>
  );
};

export default MobileCartPage;