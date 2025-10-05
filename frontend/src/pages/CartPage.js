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
  CardMedia,
  CardContent,
  Divider,
  Alert,
  TextField
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

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemsCount } = useCart();

  const SHIPPING_COST = 7.69; // Versandkosten innerhalb Deutschlands

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      // TODO: Zur Checkout-Seite navigieren
      alert('Checkout-Funktion wird noch implementiert');
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/products')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Warenkorb ({getCartItemsCount()} {getCartItemsCount() === 1 ? 'Artikel' : 'Artikel'})
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Warenkorb-Artikel */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {items.map((item, index) => (
              <Box key={item.id}>
                <Card elevation={0} sx={{ display: 'flex', mb: 2 }}>
                  {item.image && (
                    <CardMedia
                      component="img"
                      sx={{ width: 120, height: 120, objectFit: 'cover' }}
                      image={item.image}
                      alt={item.name}
                    />
                  )}
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.seife} • {item.gramm}g
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      {/* Mengenauswahl */}
                      <Box sx={{ display: 'flex', alignItems: 'center', border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, val);
                          }}
                          inputProps={{
                            min: 1,
                            max: 99,
                            style: { textAlign: 'center', width: 50 }
                          }}
                          variant="standard"
                          InputProps={{ disableUnderline: true }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Preis und Löschen */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          €{(item.price * item.quantity).toFixed(2)}
                        </Typography>
                        <IconButton
                          color="error"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Artikel entfernen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {index < items.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}

            {/* Warenkorb leeren */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
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
          <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Zusammenfassung
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">Zwischensumme:</Typography>
              <Typography variant="body1">€{getCartTotal().toFixed(2)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Versand mit DHL (nur Deutschland):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                €{SHIPPING_COST.toFixed(2)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Gesamt:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
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
              size="large"
              onClick={handleCheckout}
              sx={{ mb: 2 }}
            >
              Zur Kasse
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
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