import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Fade,
  CardActions,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Inventory as WeightIcon,
  LocalFlorist as AromaIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { portfolioAPI, cartAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import toast from 'react-hot-toast';
import LazyImage from '../components/LazyImage';

// API Base URL für Bild-URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { user } = useAuth();
  const { loadCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({}); // { productId: quantity }

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
      const newQuantity = Math.max(1, (prev[productId] || 1) + delta);
      return { ...prev, [productId]: newQuantity };
    });
  };

  // In den Warenkorb legen
  const handleAddToCart = async (product) => {
    if (!product.preis) {
      toast.error('Produkt hat noch keinen Preis');
      return;
    }

    try {
      const quantity = quantities[product._id] || 1;

      await cartAPI.addToCart({
        produktId: product._id,
        name: product.name,
        preis: product.preis,
        menge: quantity,
        bild: product.bilder?.hauptbild, // Nur relativen Pfad speichern
        gramm: product.gramm,
        seife: product.seife
      });
      
      toast.success(`${quantity}x ${product.name} zum Warenkorb hinzugefügt`);
      
      // Warenkorb neu laden um die Anzeige zu aktualisieren
      console.log('🔄 Lade Warenkorb nach Hinzufügen neu...');
      await loadCart();
      
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
            backgroundClip: 'text',
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
            <Fade in={true} timeout={500 + index * 100}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateY(-8px)',
                    boxShadow: isMobile ? 2 : '0 12px 30px rgba(0,0,0,0.2)'
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
                    alt={product.name}
                    height={isMobile ? 200 : 300}
                    objectFit="cover"
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
                  
                  {/* Seifentyp Badge */}
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
                </Box>

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* Produktname */}
                  <Typography 
                    variant="h5" 
                    gutterBottom 
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                  >
                    {product.name}
                  </Typography>

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

                  {/* Preis */}
                  <Box 
                    sx={{ 
                      mt: 'auto',
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    {product.preis ? (
                      <Typography 
                        variant="h5" 
                        color="primary" 
                        fontWeight="bold"
                        sx={{ textAlign: 'center' }}
                      >
                        {product.preis.toFixed(2)} €
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
                  {user && product.preis > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
                      {/* Kompakte Mengenauswahl */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product._id, -1);
                          }}
                          disabled={quantities[product._id] <= 1}
                          sx={{ borderRadius: 0 }}
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
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product._id, 1);
                          }}
                          sx={{ borderRadius: 0 }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Kompakter Warenkorb-Button */}
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        startIcon={<CartIcon />}
                        sx={{ flex: 1 }}
                      >
                        Warenkorb
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
};

export default ProductsPage;