import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  CardMedia,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Image as ImageIcon,
  DeleteForever as DeleteForeverIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const AdminPortfolio = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);

  // Form-State
  const [formData, setFormData] = useState({
    name: '',
    seife: '',
    gramm: '',
    aroma: '',
    seifenform: '',
    zusatz: '',
    optional: '',
    verpackung: '',
    aktiv: true,
    reihenfolge: 0
  });

  // Vordefinierte Optionen
  const seifenOptions = ['Aloe-Vera', 'pink', 'Sheabutter', 'Honigseife', 'transparent', 'schwarz'];
  const aromaOptions = ['Vanille', 'Sandelholz', 'Minze', 'Yasmin', 'Lavendel'];
  const seifenformOptions = ['quadratisch', 'Bienenwabe', 'Fight Club', 'Soap länglich'];
  const verpackungOptions = ['viereck', 'tüte 100g 9x13', 'länglich'];

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Auth-Header für API-Aufrufe
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const getAuthHeadersFormData = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/portfolio`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Laden der Produkte: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/portfolio/stats`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    const userRole = user?.rolle || user?.role;
    if (user && userRole === 'admin') {
      loadProducts();
      loadStats();
    }
  }, [user, loadProducts, loadStats]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      seife: '',
      gramm: '',
      aroma: '',
      seifenform: '',
      zusatz: '',
      optional: '',
      verpackung: '',
      aktiv: true,
      reihenfolge: 0
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setFormData({
        name: product.name,
        seife: product.seife,
        gramm: product.gramm.toString(),
        aroma: product.aroma,
        seifenform: product.seifenform,
        zusatz: product.zusatz || '',
        optional: product.optional || '',
        verpackung: product.verpackung,
        aktiv: product.aktiv,
        reihenfolge: product.reihenfolge.toString()
      });
      setEditingProduct(product);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    try {
      const url = editingProduct 
        ? `${API_BASE}/admin/portfolio/${editingProduct._id}`
        : `${API_BASE}/admin/portfolio`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
        loadStats();
        handleCloseDialog();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/portfolio/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
        loadStats();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Löschen: ' + error.message, 'error');
    }
  };

  const handleImageUpload = async (productId, file, isHauptbild = false) => {
    setUploadingImage(productId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isHauptbild', isHauptbild.toString());
      formData.append('alt_text', `${products.find(p => p._id === productId)?.name} Produktbild`);

      const response = await fetch(`${API_BASE}/admin/portfolio/${productId}/upload-image`, {
        method: 'POST',
        headers: getAuthHeadersFormData(),
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Upload: ' + error.message, 'error');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (productId, imageType, imageIndex = null) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Bild löschen möchten?')) {
      return;
    }

    try {
      const url = imageIndex !== null 
        ? `${API_BASE}/admin/portfolio/${productId}/image/${imageType}/${imageIndex}`
        : `${API_BASE}/admin/portfolio/${productId}/image/${imageType}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar(data.message);
        loadProducts();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showSnackbar('Fehler beim Löschen: ' + error.message, 'error');
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    return imageUrl.startsWith('/api/') ? `${API_BASE.replace('/api', '')}${imageUrl}` : imageUrl;
  };

  const userRole = user?.rolle || user?.role;
  if (!user || userRole !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Sie haben keine Berechtigung für den Admin-Bereich.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Portfolio-Verwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="large"
        >
          Neues Produkt
        </Button>
      </Box>

      {/* Statistiken */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Gesamte Produkte
                </Typography>
                <Typography variant="h5">
                  {stats.totalProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Aktive Produkte
                </Typography>
                <Typography variant="h5" color="primary">
                  {stats.activeProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Mit Bildern
                </Typography>
                <Typography variant="h5" color="success.main">
                  {stats.productsWithImages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Ohne Bilder
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {stats.productsWithoutImages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Produktliste */}
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} md={6} lg={4} key={product._id}>
            <Card>
              {/* Hauptbild */}
              {product.bilder?.hauptbild ? (
                <Box position="relative">
                  <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(product.bilder.hauptbild)}
                    alt={product.bilder.alt_text || product.name}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                    onClick={() => handleImageDelete(product._id, 'hauptbild')}
                  >
                    <DeleteForeverIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  height="200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="grey.100"
                >
                  <Typography color="textSecondary">
                    Kein Hauptbild
                  </Typography>
                </Box>
              )}

              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="h2">
                    {product.name}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip
                      size="small"
                      label={product.aktiv ? 'Aktiv' : 'Inaktiv'}
                      color={product.aktiv ? 'success' : 'default'}
                    />
                    <Chip
                      size="small"
                      label={`#${product.reihenfolge}`}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Typography color="textSecondary" gutterBottom>
                  {product.seife} • {product.aroma} • {product.gramm}g
                </Typography>

                <Typography variant="body2" color="textSecondary" mb={2}>
                  Form: {product.seifenform} | Verpackung: {product.verpackung}
                </Typography>

                {/* Galerie-Bilder */}
                {product.bilder?.galerie?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Galerie ({product.bilder.galerie.length} Bilder):
                    </Typography>
                    <ImageList cols={3} rowHeight={60}>
                      {product.bilder.galerie.map((img, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={getImageUrl(img.url)}
                            alt={img.alt_text}
                            loading="lazy"
                            style={{ width: '100%', height: '60px', objectFit: 'cover' }}
                          />
                          <ImageListItemBar
                            actionIcon={
                              <IconButton
                                size="small"
                                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                onClick={() => handleImageDelete(product._id, 'galerie', index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(product)}
                >
                  Bearbeiten
                </Button>
                
                {/* Bild-Upload */}
                <Tooltip title="Hauptbild hochladen">
                  <IconButton
                    component="label"
                    size="small"
                    disabled={uploadingImage === product._id}
                  >
                    {uploadingImage === product._id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PhotoCameraIcon />
                    )}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(product._id, e.target.files[0], true);
                        }
                      }}
                    />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Galerie-Bild hinzufügen">
                  <IconButton
                    component="label"
                    size="small"
                    disabled={uploadingImage === product._id}
                  >
                    <ImageIcon />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(product._id, e.target.files[0], false);
                        }
                      }}
                    />
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => handleDelete(product._id)}
                >
                  Löschen
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {products.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Noch keine Produkte vorhanden
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Erstes Produkt erstellen
          </Button>
        </Box>
      )}

      {/* Dialog für Produkt erstellen/bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Produktname"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Seifentyp</InputLabel>
                <Select
                  name="seife"
                  value={formData.seife}
                  onChange={handleInputChange}
                  label="Seifentyp"
                  required
                >
                  {seifenOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gewicht (g)"
                name="gramm"
                type="number"
                value={formData.gramm}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Aroma</InputLabel>
                <Select
                  name="aroma"
                  value={formData.aroma}
                  onChange={handleInputChange}
                  label="Aroma"
                  required
                >
                  {aromaOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Seifenform</InputLabel>
                <Select
                  name="seifenform"
                  value={formData.seifenform}
                  onChange={handleInputChange}
                  label="Seifenform"
                  required
                >
                  {seifenformOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Verpackung</InputLabel>
                <Select
                  name="verpackung"
                  value={formData.verpackung}
                  onChange={handleInputChange}
                  label="Verpackung"
                  required
                >
                  {verpackungOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zusatz"
                name="zusatz"
                value={formData.zusatz}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Optional"
                name="optional"
                value={formData.optional}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reihenfolge"
                name="reihenfolge"
                type="number"
                value={formData.reihenfolge}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.aktiv}
                    onChange={handleInputChange}
                    name="aktiv"
                  />
                }
                label="Aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProduct ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPortfolio;