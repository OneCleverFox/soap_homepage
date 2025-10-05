import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardMedia,
  Divider,
  Paper,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Inventory,
  LocalFlorist,
  Category,
  Link as LinkIcon,
  Description,
  ShoppingCart,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { portfolioAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with ID:', id);
      const response = await portfolioAPI.getById(id);
      console.log('Product response:', response);
      const productData = response.data?.data || response.data;
      setProduct(productData);
      setSelectedImage(productData?.bilder?.hauptbild);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Fehler beim Laden: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api')) {
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Bitte melden Sie sich an, um Produkte in den Warenkorb zu legen');
      navigate('/login');
      return;
    }

    const cartProduct = {
      id: product._id,
      name: product.name,
      price: product.preis || 0,
      image: getImageUrl(product.bilder?.hauptbild),
      gramm: product.gramm,
      seife: product.seife
    };

    addToCart(cartProduct, quantity);
    toast.success(`${quantity}x ${product.name} zum Warenkorb hinzugefügt`);
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Lade Produktdetails...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Produkt nicht gefunden'}
        </Alert>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/products')}
          variant="contained"
        >
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/products')} 
        sx={{ mb: 3 }}
        variant="outlined"
      >
        Zurück zur Übersicht
      </Button>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardMedia
              component="img"
              image={getImageUrl(selectedImage || product.bilder?.hauptbild)}
              alt={product.name}
              sx={{ height: 500, objectFit: 'cover' }}
            />
          </Card>

          {product.bilder?.galerie && product.bilder.galerie.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Box
                component="img"
                src={getImageUrl(product.bilder.hauptbild)}
                onClick={() => setSelectedImage(product.bilder.hauptbild)}
                alt={`${product.name} - Hauptbild`}
                sx={{
                  width: 100,
                  height: 100,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: selectedImage === product.bilder.hauptbild ? '3px solid' : '1px solid',
                  borderColor: selectedImage === product.bilder.hauptbild ? 'primary.main' : 'grey.300',
                  transition: 'all 0.3s ease'
                }}
              />
              
              {product.bilder.galerie.map((img, i) => {
                const imgUrl = typeof img === 'string' ? img : img.url;
                return (
                  <Box
                    key={i}
                    component="img"
                    src={getImageUrl(imgUrl)}
                    onClick={() => setSelectedImage(imgUrl)}
                    alt={`${product.name} - Galerie ${i + 1}`}
                    sx={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: selectedImage === imgUrl ? '3px solid' : '1px solid',
                      borderColor: selectedImage === imgUrl ? 'primary.main' : 'grey.300',
                      transition: 'all 0.3s ease'
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {product.name}
          </Typography>

          <Chip label={product.seife} color="primary" sx={{ mt: 2, mb: 3 }} />

          {product.beschreibung?.kurz && (
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              {product.beschreibung.kurz}
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box display="flex" alignItems="center">
              <Inventory sx={{ mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Gewicht</Typography>
                <Typography fontWeight="bold">{product.gramm}g</Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center">
              <LocalFlorist sx={{ mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Duft</Typography>
                <Typography fontWeight="bold">{product.aroma}</Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center">
              <Category sx={{ mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Form</Typography>
                <Typography fontWeight="bold">{product.seifenform}</Typography>
              </Box>
            </Box>

            {product.verpackung && (
              <Box display="flex" alignItems="center">
                <Description sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Verpackung</Typography>
                  <Typography fontWeight="bold">{product.verpackung}</Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Preis und Warenkorb-Bereich */}
          {product.preis && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                €{product.preis.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                inkl. MwSt.
              </Typography>
            </Box>
          )}

          {/* Mengenauswahl und Warenkorb-Button - für Admins und Kunden */}
          {user && product.preis && product.preis > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="body1" fontWeight="bold">
                  Menge:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <IconButton 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    size="small"
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ px: 3, minWidth: 50, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <IconButton 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 99}
                    size="small"
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ShoppingCart />}
                onClick={handleAddToCart}
                sx={{ mb: 2 }}
              >
                In den Warenkorb
              </Button>
            </Box>
          )}

          {!user && (
            <Alert severity="info" sx={{ mt: 3 }}>
              Bitte <Button onClick={() => navigate('/login')} size="small">melden Sie sich an</Button>, um Produkte zu bestellen.
            </Alert>
          )}

          {product.weblink && (
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<LinkIcon />}
              onClick={() => window.open(product.weblink, '_blank')}
              sx={{ mt: 2 }}
            >
              Produktdokumentation öffnen
            </Button>
          )}
        </Grid>

        <Grid item xs={12}>
          {product.beschreibung?.lang && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
```
              <Typography variant="h5" fontWeight="bold" gutterBottom>Beschreibung</Typography>
              <Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.lang}</Typography>
            </Paper>
          )}

          {product.beschreibung?.inhaltsstoffe && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>Inhaltsstoffe</Typography>
              <Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.inhaltsstoffe}</Typography>
            </Paper>
          )}

          {product.beschreibung?.anwendung && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>Anwendung</Typography>
              <Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.anwendung}</Typography>
            </Paper>
          )}

          {product.beschreibung?.besonderheiten && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>Besonderheiten</Typography>
              <Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.besonderheiten}</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetailPage;
