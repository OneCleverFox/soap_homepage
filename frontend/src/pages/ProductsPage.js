import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Fade,
  CardActions,
  Avatar,
  Divider
} from '@mui/material';
import {
  LocalOffer as PriceIcon,
  Inventory as WeightIcon,
  LocalFlorist as AromaIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  ShoppingCart as CartIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { portfolioAPI } from '../services/api';

// API Base URL für Bild-URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper-Funktion um relative Bild-URLs in absolute URLs umzuwandeln
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Wenn die URL bereits mit http/https beginnt, direkt zurückgeben
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Wenn die URL mit /api beginnt, Backend-Host hinzufügen
    if (imageUrl.startsWith('/api')) {
      return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
    }
    // Ansonsten vollständige API-URL bauen
    return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await portfolioAPI.getWithPrices();
      console.log('API Response:', response); // Debug log
      setProducts(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Fehler beim Laden der Produkte: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getSeifenColor = (seifenTyp) => {
    const colors = {
      'Olivenöl': '#8BC34A',
      'Kokosöl': '#FF9800',
      'Sheabutter': '#FFEB3B',
      'Arganöl': '#4CAF50',
      'Mandelöl': '#FFC107',
      'Jojobaöl': '#009688'
    };
    return colors[seifenTyp] || '#2196F3';
  };

  const getAromaIcon = (aroma) => {
    if (aroma.toLowerCase().includes('lavendel')) return '🌾';
    if (aroma.toLowerCase().includes('rose')) return '🌹';
    if (aroma.toLowerCase().includes('zitrus')) return '🍋';
    if (aroma.toLowerCase().includes('mint')) return '🌿';
    if (aroma.toLowerCase().includes('vanille')) return '🍯';
    return '🌸';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Lade Produkte...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
            backgroundClip: 'text',
            textFillColor: 'transparent'
          }}
        >
          Unsere handgemachten Naturseifen
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Premium Qualität aus natürlichen Zutaten
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {products.length} einzigartige Seifen-Kreationen verfügbar
        </Typography>
      </Box>

      {/* Produktkarten */}
      <Grid container spacing={3}>
        {products.map((product, index) => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Fade in={true} timeout={500 + index * 100}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }
                }}
              >
                {/* Produktbild */}
                {product.bilder?.hauptbild ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(product.bilder.hauptbild)}
                    alt={product.bilder.alt_text || product.name}
                    sx={{
                      objectFit: 'cover',
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                  </Box>
                )}

                {/* Produkt-Header mit Avatar */}
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 1,
                      bgcolor: getSeifenColor(product.seife),
                      fontSize: '2rem'
                    }}
                  >
                    {getAromaIcon(product.aroma)}
                  </Avatar>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {product.name}
                  </Typography>
                  <Chip 
                    label={product.seife}
                    size="small"
                    sx={{ 
                      bgcolor: getSeifenColor(product.seife),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                  {/* Produktdetails */}
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WeightIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Nettogewicht <strong> {product.gramm}g</strong> 
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" mb={1}>
                      <AromaIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Duft: <strong>{product.aroma}</strong>
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" mb={1}>
                      <CategoryIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Form: <strong>{product.seifenform}</strong>
                      </Typography>
                    </Box>

                    {/* Galerie-Vorschau */}
                    {product.bilder?.galerie && product.bilder.galerie.length > 0 && (
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Weitere Bilder:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                          {product.bilder.galerie.slice(0, 3).map((image, imgIndex) => (
                            <Box
                              key={imgIndex}
                              component="img"
                              src={getImageUrl(typeof image === 'string' ? image : image.url)}
                              alt={typeof image === 'object' ? image.alt_text : `${product.name} Bild ${imgIndex + 1}`}
                              sx={{
                                width: 50,
                                height: 50,
                                borderRadius: 1,
                                objectFit: 'cover',
                                border: '1px solid',
                                borderColor: 'grey.300',
                                flexShrink: 0
                              }}
                            />
                          ))}
                          {product.bilder.galerie.length > 3 && (
                            <Box
                              sx={{
                                width: 50,
                                height: 50,
                                borderRadius: 1,
                                bgcolor: 'grey.200',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid',
                                borderColor: 'grey.300',
                                flexShrink: 0
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                +{product.bilder.galerie.length - 3}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}

                    

                    {product.zusatz && (
                      <Box display="flex" alignItems="center" mb={1}>
                        <AddIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          Extra: <strong>{product.zusatz}</strong>
                        </Typography>
                      </Box>
                    )}

                    {product.optional && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {product.optional}
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Preis */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {formatPrice(product.verkaufspreis)}
                      </Typography>
                      
                    </Box>
                    <Chip
                      icon={<PriceIcon />}
                      label={`${((product.verkaufspreis / product.gramm) * 100).toFixed(1)}€/100g`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<CartIcon />}
                    sx={{
                      bgcolor: getSeifenColor(product.seife),
                      '&:hover': {
                        bgcolor: getSeifenColor(product.seife),
                        filter: 'brightness(0.9)'
                      }
                    }}
                  >
                    In den Warenkorb
                  </Button>
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
};

export default ProductsPage;