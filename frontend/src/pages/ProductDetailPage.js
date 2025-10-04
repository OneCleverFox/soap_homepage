import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, Chip, CircularProgress, Alert, Grid, Card, CardMedia, Divider, Paper } from '@mui/material';
import { ArrowBack, Inventory, LocalFlorist, Category, Link as LinkIcon, Description } from '@mui/icons-material';
import { portfolioAPI } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await portfolioAPI.getById(id);
      setProduct(response.data?.data || response.data);
      setSelectedImage(response.data?.data?.bilder?.hauptbild || response.data?.bilder?.hauptbild);
    } catch (err) {
      setError('Fehler beim Laden: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  if (loading) return <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Container>;
  if (error || !product) return <Container><Alert severity="error">{error || 'Nicht gefunden'}</Alert><Button startIcon={<ArrowBack />} onClick={() => navigate('/products')}>Zurück</Button></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mb: 3 }}>Zurück</Button>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}><CardMedia component="img" image={getImageUrl(selectedImage || product.bilder?.hauptbild)} alt={product.name} sx={{ height: 500, objectFit: 'cover' }} /></Card>
          {product.bilder?.galerie?.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {[product.bilder.hauptbild, ...product.bilder.galerie.map(img => typeof img === 'string' ? img : img.url)].map((img, i) => (
                <Box key={i} component="img" src={getImageUrl(img)} onClick={() => setSelectedImage(img)} sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', border: selectedImage === img ? '3px solid' : '1px solid', borderColor: selectedImage === img ? 'primary.main' : 'grey.300' }} />
              ))}
            </Box>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h3" fontWeight="bold">{product.name}</Typography>
          <Chip label={product.seife} color="primary" sx={{ mt: 2, mb: 3 }} />
          {product.beschreibung?.kurz && <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>{product.beschreibung.kurz}</Typography>}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box display="flex" alignItems="center"><Inventory sx={{ mr: 2, color: 'primary.main' }} /><Box><Typography variant="body2" color="text.secondary">Gewicht</Typography><Typography fontWeight="bold">{product.gramm}g</Typography></Box></Box>
            <Box display="flex" alignItems="center"><LocalFlorist sx={{ mr: 2, color: 'primary.main' }} /><Box><Typography variant="body2" color="text.secondary">Duft</Typography><Typography fontWeight="bold">{product.aroma}</Typography></Box></Box>
            <Box display="flex" alignItems="center"><Category sx={{ mr: 2, color: 'primary.main' }} /><Box><Typography variant="body2" color="text.secondary">Form</Typography><Typography fontWeight="bold">{product.seifenform}</Typography></Box></Box>
            {product.verpackung && <Box display="flex" alignItems="center"><Description sx={{ mr: 2, color: 'primary.main' }} /><Box><Typography variant="body2" color="text.secondary">Verpackung</Typography><Typography fontWeight="bold">{product.verpackung}</Typography></Box></Box>}
          </Box>
          {product.weblink && <Button variant="contained" fullWidth size="large" startIcon={<LinkIcon />} onClick={() => window.open(product.weblink, '_blank')} sx={{ mt: 3 }}>Produktdokumentation öffnen</Button>}
        </Grid>
        <Grid item xs={12}>
          {product.beschreibung?.lang && <Paper elevation={2} sx={{ p: 3, mb: 3 }}><Typography variant="h5" fontWeight="bold" gutterBottom>Beschreibung</Typography><Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.lang}</Typography></Paper>}
          {product.beschreibung?.inhaltsstoffe && <Paper elevation={2} sx={{ p: 3, mb: 3 }}><Typography variant="h5" fontWeight="bold" gutterBottom>Inhaltsstoffe</Typography><Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.inhaltsstoffe}</Typography></Paper>}
          {product.beschreibung?.anwendung && <Paper elevation={2} sx={{ p: 3, mb: 3 }}><Typography variant="h5" fontWeight="bold" gutterBottom>Anwendung</Typography><Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.anwendung}</Typography></Paper>}
          {product.beschreibung?.besonderheiten && <Paper elevation={2} sx={{ p: 3, mb: 3 }}><Typography variant="h5" fontWeight="bold" gutterBottom>Besonderheiten</Typography><Typography sx={{ whiteSpace: 'pre-line' }}>{product.beschreibung.besonderheiten}</Typography></Paper>}
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetailPage;
