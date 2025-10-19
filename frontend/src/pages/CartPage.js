import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  useTheme
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

  console.log('🛒 CartPage Render:', {
    userExists: !!user,
    itemsCount: items.length,
    items: items,
    loading: loading
  });

  const SHIPPING_COST = 7.69; // Versandkosten innerhalb Deutschlands

  // Helper-Funktion um Bild-URLs zu korrigieren
  const getImageUrl = (url) => {
    if (!url) {
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
      const finalUrl = `${API_BASE_URL.replace('/api', '')}${url}`;
      console.log('🖼️ Image URL constructed:', finalUrl);
      return finalUrl;
    }
    
    // Wenn URL mit /uploads beginnt, /api davor hinzufügen
    if (url.startsWith('/uploads')) {
      const finalUrl = `${API_BASE_URL.replace('/api', '')}/api${url}`;
      console.log('🖼️ Image URL constructed (added /api):', finalUrl);
      return finalUrl;
    }
    
    // Fallback: URL so verwenden wie sie ist
    const finalUrl = `${API_BASE_URL.replace('/api', '')}${url}`;
    console.log('🖼️ Fallback image URL:', finalUrl);
    return finalUrl;
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
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
            {items.map((item, index) => (
              <Box key={item.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    display: 'flex', 
                    mb: 2,
                    flexDirection: isMobile ? 'column' : 'row'
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
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <RemoveIcon fontSize={isMobile ? "medium" : "small"} />
                        </IconButton>
                        <TextField
                          size={isMobile ? "medium" : "small"}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, val);
                          }}
                          inputProps={{
                            min: 1,
                            max: 99,
                            style: { textAlign: 'center', width: isMobile ? 60 : 50 }
                          }}
                          variant="standard"
                          InputProps={{ disableUnderline: true }}
                        />
                        <IconButton
                          size={isMobile ? "medium" : "small"}
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
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
                        <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                          €{(item.price * item.quantity).toFixed(2)}
                        </Typography>
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
            ))}

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
              <Typography variant={isMobile ? "body2" : "body1"}>Zwischensumme:</Typography>
              <Typography variant={isMobile ? "body2" : "body1"}>€{getCartTotal().toFixed(2)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                Versand (DHL):
              </Typography>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                €{SHIPPING_COST.toFixed(2)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: isMobile ? 2 : 3 }}>
              <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                Gesamt:
              </Typography>
              <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold" color="primary">
                €{(getCartTotal() + SHIPPING_COST).toFixed(2)}
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
              sx={{ mb: 2 }}
            >
              Zur Kasse
            </Button>
            
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