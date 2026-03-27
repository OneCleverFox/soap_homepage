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
  Divider,
  Paper,
  IconButton,
  useMediaQuery,
  useTheme
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
  Remove as RemoveIcon,
  Inventory2 as InventoryIcon,
  Warning as WarningIcon,
  Build,
  Security as SecurityIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { portfolioAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import toast from 'react-hot-toast';
import LazyImage from '../components/LazyImage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const company = useCompany();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textDataLoaded, setTextDataLoaded] = useState(false); // 🚀 Text-First Loading
  const [imagesLoading, setImagesLoading] = useState(true); // 🖼️ Images Loading State
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const isProductOnSale = Boolean(product?.sale?.isOnSale) && Number(product?.sale?.discountPercent || 0) > 0;
  const basePrice = Number(product?.basispreis || product?.preis || 0);
  const effectivePrice = Number(product?.preis || 0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      console.log('Fetching product with ID:', id);
      const response = await portfolioAPI.getById(id);
      console.log('Product response:', response);
      const productData = response.data?.data || response.data;
      
      // Produktdaten verarbeitet ✅
      
      setProduct(productData);
      setSelectedImage(productData?.bilder?.hauptbild);
      setTextDataLoaded(true); // 📝 Text ist da - Produktinfo sofort anzeigen
      
      // Starte Image-Loading nach kurzer Verzögerung
      setTimeout(() => {
        setImagesLoading(false); // Bilder können jetzt geladen werden
      }, 100);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Fehler beim Laden: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageData) => {
    if (!imageData) return null;
    
    // Neue Struktur: { url: '/api/portfolio/:id/image/main', type: 'image/jpeg' }
    if (typeof imageData === 'object' && imageData.url) {
      if (imageData.url.startsWith('/api')) {
        return `${API_BASE_URL.replace('/api', '')}${imageData.url}`;
      }
      return imageData.url;
    }
    
    // Legacy: String-URLs
    const url = imageData;
    // Base64-Bilder direkt zurückgeben
    if (url.startsWith('data:image/')) return url;
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

    if (!product.bestand?.verfuegbar) {
      toast.error('Produkt ist aktuell nicht auf Lager');
      return;
    }

    if (quantity > (product.bestand?.menge || 0)) {
      toast.error(`Nur noch ${product.bestand?.menge} Stück verfügbar`);
      return;
    }

    const cartProduct = {
      id: product._id,
      name: product.name,
      price: effectivePrice,
      sale: {
        isOnSale: isProductOnSale,
        discountPercent: Number(product?.sale?.discountPercent || 0),
        basispreis: basePrice,
        startsAt: product?.sale?.startsAt || null,
        endsAt: product?.sale?.endsAt || null
      },
      image: product.bilder?.hauptbild, // Speichere relative URL, nicht absolute
      gramm: product.gramm,
      seife: product.seife
    };

    addToCart(cartProduct, quantity);
    toast.success(`${quantity}x ${product.name} zum Warenkorb hinzugefügt`);
    
    // Produktdaten neu laden um aktuellen Bestand anzuzeigen
    setTimeout(() => {
      fetchProduct();
    }, 500);
  };

  const handleQuantityChange = (delta) => {
    const maxMenge = product.bestand?.menge || 99;
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= Math.min(maxMenge, 99)) {
      setQuantity(newQuantity);
    }
  };

  // 🚀 PROGRESSIVE LOADING: Zeige Skeleton während Laden
  if (loading || !textDataLoaded) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/products')} 
          sx={{ mb: isMobile ? 2 : 3 }}
          variant="outlined"
          size={isMobile ? "small" : "medium"}
        >
          Zurück
        </Button>

        <Grid container spacing={isMobile ? 2 : 4}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <Box
                sx={{
                  height: isMobile ? 300 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100'
                }}
              >
                <CircularProgress size={60} />
              </Box>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: isMobile ? 1 : 2 }}>
              <Typography variant="body2" color="primary" sx={{ mb: 2, fontWeight: 500 }}>
                {textDataLoaded ? 'Bilder werden geladen...' : 'Produktdetails werden geladen...'}
              </Typography>
              
              {/* Skeleton für Produktinfo */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Lade Produktdaten...
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
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
          onClick={() => {
            const lastProductsUrl = sessionStorage.getItem('lastProductsUrl') || '/products';
            navigate(lastProductsUrl);
          }}
          variant="contained"
        >
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => {
          const lastProductsUrl = sessionStorage.getItem('lastProductsUrl') || '/products';
          navigate(lastProductsUrl);
        }} 
        sx={{ mb: isMobile ? 2 : 3 }}
        variant="outlined"
        size={isMobile ? "small" : "medium"}
      >
        Zurück
      </Button>

      <Grid container spacing={isMobile ? 2 : 4}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            {imagesLoading ? (
              // 📝 TEXT-FIRST PHASE: Zeige Skeleton während Image-Loading
              <Box
                sx={{
                  height: isMobile ? 300 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100'
                }}
              >
                <Box textAlign="center">
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    Bilder werden geladen...
                  </Typography>
                </Box>
              </Box>
            ) : (
              // 🖼️ IMAGE PHASE: Lade Bild nach Text-Content
              <LazyImage
                src={getImageUrl(selectedImage || product.bilder?.hauptbild)}
                alt={product.name}
                height={isMobile ? 300 : 500}
                objectFit="cover"
                priority={true} // 🚀 Hauptbild hat Priorität
              />
            )}
          </Card>

          {!imagesLoading && product.bilder?.galerie && product.bilder.galerie.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Box
                onClick={() => setSelectedImage(product.bilder.hauptbild)}
                sx={{
                  width: isMobile ? 60 : 100,
                  height: isMobile ? 60 : 100,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: selectedImage === product.bilder.hauptbild ? '3px solid' : '1px solid',
                  borderColor: selectedImage === product.bilder.hauptbild ? 'primary.main' : 'grey.300',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}
              >
                <LazyImage
                  src={getImageUrl(product.bilder.hauptbild)}
                  alt={`${product.name} - Hauptbild`}
                  height={isMobile ? 60 : 100}
                  objectFit="cover"
                />
              </Box>
              
              {product.bilder.galerie.map((img, i) => {
                const imgUrl = typeof img === 'string' ? img : img.url;
                return (
                  <Box
                    key={i}
                    onClick={() => setSelectedImage(imgUrl)}
                    sx={{
                      width: isMobile ? 60 : 100,
                      height: isMobile ? 60 : 100,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: selectedImage === imgUrl ? '3px solid' : '1px solid',
                      borderColor: selectedImage === imgUrl ? 'primary.main' : 'grey.300',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden'
                    }}
                  >
                    <LazyImage
                      src={getImageUrl(imgUrl)}
                      alt={`${product.name} - Galerie ${i + 1}`}
                      height={isMobile ? 60 : 100}
                      objectFit="cover"
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant={isMobile ? "h4" : "h3"} fontWeight="bold" gutterBottom>
            {product.name}
          </Typography>

          {/* Rohseifen-Anzeige: Single oder Dual */}
          {product.rohseifenKonfiguration?.verwendeZweiRohseifen ? (
            <Box sx={{ mt: 2, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`${product.seife} (${product.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}%)`}
                color="primary" 
                size={isMobile ? "small" : "medium"}
              />
              <Chip 
                label={`${product.rohseifenKonfiguration.seife2} (${product.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}%)`}
                color="secondary"
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          ) : (
            <Chip 
              label={product.seife} 
              color="primary" 
              sx={{ mt: 2, mb: 3 }}
              size={isMobile ? "small" : "medium"}
            />
          )}

          {/* Verfügbarkeitsanzeige */}
          {product.bestand && (
            <Box sx={{ mb: 3 }}>
              {product.bestand.verfuegbar ? (
                <Chip
                  label={`${product.bestand.menge} ${product.bestand.einheit} vorrätig`}
                  color="success"
                  size={isMobile ? "small" : "medium"}
                  icon={<InventoryIcon />}
                  sx={{ fontWeight: 'bold' }}
                />
              ) : (
                <Chip
                  label="Aktuell nicht auf Lager"
                  color="error"
                  size={isMobile ? "small" : "medium"}
                  icon={<WarningIcon />}
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>
          )}

          {product.beschreibung?.kurz && (
            <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary" sx={{ mb: 3 }}>
              {product.beschreibung.kurz}
            </Typography>
          )}

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1.5 : 2 }}>
            <Box display="flex" alignItems="center">
              <Inventory sx={{ mr: 2, color: 'primary.main', fontSize: isMobile ? 20 : 24 }} />
              <Box>
                <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Gewicht</Typography>
                <Typography fontWeight="bold" variant={isMobile ? "body2" : "body1"}>{product.gramm}g</Typography>
              </Box>
            </Box>

            {/* Kategorie-spezifische Informationen */}
            {product.kategorie === 'werkstuck' ? (
              <>
                <Box display="flex" alignItems="center">
                  <Build sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Gießwerkstoff</Typography>
                    <Typography fontWeight="bold">{product.giesswerkstoffName || 'Standard'}</Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center">
                  <Category sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Gießform</Typography>
                    <Typography fontWeight="bold">{product.giessformName || 'Standard'}</Typography>
                  </Box>
                </Box>
              </>
            ) : (
              <>
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
              </>
            )}

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
              {isProductOnSale ? (
                <>
                  <Chip
                    label={`SALE -${Number(product.sale?.discountPercent || 0).toFixed(0)}%`}
                    color="warning"
                    sx={{ mb: 1, fontWeight: 'bold' }}
                  />
                  <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                    €{basePrice.toFixed(2)}
                  </Typography>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    €{effectivePrice.toFixed(2)}
                  </Typography>
                  {(product.sale?.startsAt || product.sale?.endsAt) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {product.sale?.startsAt ? `Von ${new Date(product.sale.startsAt).toLocaleString('de-DE')}` : ''}
                      {product.sale?.startsAt && product.sale?.endsAt ? ' bis ' : ''}
                      {product.sale?.endsAt ? `${new Date(product.sale.endsAt).toLocaleString('de-DE')}` : ''}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  €{effectivePrice.toFixed(2)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                inkl. MwSt.
              </Typography>
            </Box>
          )}

          {/* Mengenauswahl und Warenkorb-Button - für Admins und Kunden */}
          {user && product.preis && product.preis > 0 && (
            <Box sx={{ mt: isMobile ? 2 : 3 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 2, 
                mb: 2 
              }}>
                <Typography variant="body1" fontWeight="bold">
                  Menge:
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  border: 1, 
                  borderColor: product.bestand?.verfuegbar ? 'grey.300' : 'grey.200',
                  borderRadius: 1,
                  justifyContent: isMobile ? 'center' : 'flex-start',
                  opacity: product.bestand?.verfuegbar ? 1 : 0.5
                }}>
                  <IconButton 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={!product.bestand?.verfuegbar || quantity <= 1}
                    size={isMobile ? "medium" : "small"}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ px: isMobile ? 4 : 3, minWidth: isMobile ? 60 : 50, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <IconButton 
                    onClick={() => handleQuantityChange(1)}
                    disabled={!product.bestand?.verfuegbar || quantity >= Math.min((product.bestand?.menge || 0), 99)}
                    size={isMobile ? "medium" : "small"}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>

              <Button
                variant="contained"
                color={product.bestand?.verfuegbar ? "success" : "inherit"}
                fullWidth
                size={isMobile ? "large" : "medium"}
                startIcon={<ShoppingCart />}
                onClick={handleAddToCart}
                disabled={!product.bestand?.verfuegbar}
                sx={{ 
                  mb: 2,
                  ...(product.bestand?.verfuegbar ? {} : {
                    bgcolor: 'grey.300',
                    color: 'grey.600',
                    '&:hover': {
                      bgcolor: 'grey.400'
                    }
                  })
                }}
              >
                {product.bestand?.verfuegbar ? 'In den Warenkorb' : 'Nicht verfügbar'}
              </Button>
              
              {product.bestand?.verfuegbar && product.bestand?.menge <= 5 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Nur noch {product.bestand.menge} Stück verfügbar!
                </Alert>
              )}
            </Box>
          )}

          {!user && (
            <Alert severity="info" sx={{ mt: isMobile ? 2 : 3 }}>
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

          {/* ── Schmuck-spezifische Informationen ─────────────────────────── */}
          {product.kategorie === 'schmuck' && product.schmuckDetails && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StoreIcon color="primary" />
                <Typography variant="h5" fontWeight="bold">Schmuck-Details</Typography>
              </Box>
              <Grid container spacing={2}>
                {product.schmuckDetails.material && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Material</Typography>
                    <Typography fontWeight="medium">{product.schmuckDetails.material}</Typography>
                  </Grid>
                )}
                {product.schmuckDetails.oberflaeche && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Oberfläche / Veredelung</Typography>
                    <Typography fontWeight="medium">{product.schmuckDetails.oberflaeche}</Typography>
                  </Grid>
                )}
                {product.schmuckDetails.ringgroesse && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Ringgröße</Typography>
                    <Typography fontWeight="medium">{product.schmuckDetails.ringgroesse}</Typography>
                  </Grid>
                )}
                {product.schmuckDetails.kettenlaenge > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Kettenlänge</Typography>
                    <Typography fontWeight="medium">{product.schmuckDetails.kettenlaenge} cm</Typography>
                  </Grid>
                )}
                {product.schmuckDetails.steinbesatz && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Steinbesatz</Typography>
                    <Typography fontWeight="medium">{product.schmuckDetails.steinbesatz}</Typography>
                  </Grid>
                )}
                {product.schmuckDetails.nickelhaltig && (
                  <Grid item xs={12}>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Dieses Produkt kann Nickel enthalten. Bei bekannter Nickelallergie
                      vor dem Tragen Ihren Arzt befragen.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* ── GPSR-Pflichtangaben (EU) 2023/988 ─────────────────────────── */}
          <Paper
            elevation={1}
            sx={{ p: 3, mb: 3, borderLeft: 4, borderColor: 'primary.light', bgcolor: 'grey.50' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon color="primary" fontSize="small" />
              <Typography variant="h6" fontWeight="bold">
                Produktsicherheitsinformationen
              </Typography>
            </Box>

            {/* Hersteller / Inverkehrbringer */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Hersteller / Inverkehrbringer</strong>
              </Typography>
              {product.gpsr?.herstellerAbweichend && product.gpsr?.herstellerName ? (
                <Typography variant="body2">
                  {product.gpsr.herstellerName}<br />
                  {product.gpsr.herstellerAnschrift && <>{product.gpsr.herstellerAnschrift}<br /></>}
                  {product.gpsr.herstellerEmail && (
                    <a href={`mailto:${product.gpsr.herstellerEmail}`} style={{ color: 'inherit' }}>
                      {product.gpsr.herstellerEmail}
                    </a>
                  )}
                </Typography>
              ) : (
                <Typography variant="body2">
                  {company.name || 'Glücksmomente Manufaktur'}<br />
                  {company.address?.street && company.address?.houseNumber
                    ? `${company.address.street} ${company.address.houseNumber}, `
                    : ''}
                  {company.address?.postalCode && company.address?.city
                    ? `${company.address.postalCode} ${company.address.city}`
                    : '68642 Bürstadt'}<br />
                  <a
                    href={`mailto:${company.email || 'info@gluecksmomente-manufaktur.de'}`}
                    style={{ color: 'inherit' }}
                  >
                    {company.email || 'info@gluecksmomente-manufaktur.de'}
                  </a>
                </Typography>
              )}
            </Box>

            {/* Bestimmungsgemäße Verwendung */}
            {product.gpsr?.verwendungszweck && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Bestimmungsgemäße Verwendung</strong>
                </Typography>
                <Typography variant="body2">{product.gpsr.verwendungszweck}</Typography>
              </Box>
            )}

            {/* Zielgruppe */}
            {product.gpsr?.zielgruppe && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Zielgruppe</strong>
                </Typography>
                <Typography variant="body2">{product.gpsr.zielgruppe}</Typography>
              </Box>
            )}

            {/* Sicherheits- und Warnhinweise */}
            {product.gpsr?.warnhinweise && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Sicherheits- und Warnhinweise</strong>
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {product.gpsr.warnhinweise}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetailPage;
