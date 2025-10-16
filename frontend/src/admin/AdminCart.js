import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

const AdminCart = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cartData, setCartData] = useState({ items: [], total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Auth-Header für API-Aufrufe
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const loadAdminCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/cart`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCartData(data.data);
      } else {
        throw new Error(data.message || 'Fehler beim Laden des Warenkorbs');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Admin-Warenkorbs:', error);
      toast.error('Fehler beim Laden des Warenkorbs: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const updateQuantity = async (produktId, newQuantity) => {
    try {
      setUpdating(true);
      await cartAPI.updateQuantity(produktId, newQuantity);
      await loadAdminCart(); // Reload cart data
      toast.success('Menge aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Menge:', error);
      toast.error('Fehler beim Aktualisieren der Menge');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (produktId) => {
    try {
      setUpdating(true);
      await cartAPI.removeItem(produktId);
      await loadAdminCart(); // Reload cart data
      toast.success('Artikel entfernt');
    } catch (error) {
      console.error('Fehler beim Entfernen des Artikels:', error);
      toast.error('Fehler beim Entfernen des Artikels');
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setUpdating(true);
      await cartAPI.clearCart();
      await loadAdminCart(); // Reload cart data
      toast.success('Warenkorb geleert');
    } catch (error) {
      console.error('Fehler beim Leeren des Warenkorbs:', error);
      toast.error('Fehler beim Leeren des Warenkorbs');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdminCart();
    }
  }, [user, loadAdminCart]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ 
      mt: isMobile ? 1 : 4, 
      mb: isMobile ? 2 : 4,
      px: isMobile ? 1 : 3 
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 3,
        gap: isMobile ? 2 : 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 0 : 0 }}>
          <CartIcon sx={{ 
            fontSize: isMobile ? 30 : 40, 
            mr: 2, 
            color: 'primary.main' 
          }} />
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            sx={{ 
              flexGrow: 1,
              fontSize: isMobile ? '1.5rem' : '2.125rem'
            }}
          >
            Mein Admin-Warenkorb
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 1,
          width: isMobile ? '100%' : 'auto'
        }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAdminCart}
            disabled={updating}
            size={isMobile ? "large" : "medium"}
            fullWidth={isMobile}
          >
            Aktualisieren
          </Button>
          {cartData.items.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={clearCart}
              disabled={updating}
              size={isMobile ? "large" : "medium"}
              fullWidth={isMobile}
            >
              Warenkorb leeren
            </Button>
          )}
        </Box>
      </Box>

      {/* Benutzer Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography variant="h6" gutterBottom>
            Administrator: {user?.email || 'Unbekannt'}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: 1, 
            mt: 1 
          }}>
            <Chip 
              label={`${cartData.itemCount} Artikel`} 
              color="primary" 
              variant="outlined" 
              size={isMobile ? "medium" : "small"}
            />
            <Chip 
              label={`Gesamt: €${cartData.total.toFixed(2)}`} 
              color="success" 
              variant="outlined" 
              size={isMobile ? "medium" : "small"}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Warenkorb Inhalt */}
      {cartData.items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ihr Warenkorb ist leer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fügen Sie Produkte aus dem Portfolio hinzu.
            </Typography>
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile Card Layout
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom>
            Warenkorb-Inhalt ({cartData.itemCount} Artikel)
          </Typography>
          {cartData.items.map((item) => (
            <Card key={item.produktId}>
              <CardContent sx={{ p: 2 }}>
                {/* Header mit Bild und Name */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar
                    src={item.bild}
                    sx={{ width: 60, height: 60, mr: 2 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.seife} • {item.gramm}g
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 0.5 }}>
                      €{item.preis.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                {/* Mengensteuerung */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                  p: 1.5,
                  borderRadius: 1,
                  mb: 2
                }}>
                  <Typography variant="body2" color="text.secondary">
                    Menge:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.produktId, item.menge - 1)}
                      disabled={updating || item.menge <= 1}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&:disabled': { bgcolor: 'grey.300' },
                        width: 40,
                        height: 40
                      }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    
                    <TextField
                      value={item.menge}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        if (value > 0) updateQuantity(item.produktId, value);
                      }}
                      size="small"
                      type="number"
                      inputProps={{ min: 1, style: { textAlign: 'center', fontSize: '1.1rem' } }}
                      sx={{ 
                        width: 60,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1
                        }
                      }}
                      disabled={updating}
                    />
                    
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.produktId, item.menge + 1)}
                      disabled={updating}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        width: 40,
                        height: 40
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Gesamt und Aktionen */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Gesamt:
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      €{(item.preis * item.menge).toFixed(2)}
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => removeItem(item.produktId)}
                    disabled={updating}
                    sx={{ 
                      bgcolor: 'error.main', 
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                      width: 44,
                      height: 44
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
          
          {/* Mobile Gesamt */}
          <Card sx={{ bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.main' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                Gesamtsumme: €{cartData.total.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
          
          {/* Mobile Info */}
          <Alert severity="info">
            <Typography variant="body2">
              Als Administrator können Sie hier Ihren persönlichen Warenkorb verwalten.
            </Typography>
          </Alert>
        </Stack>
      ) : (
        // Desktop Table Layout
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Warenkorb-Inhalt ({cartData.itemCount} Artikel)
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produkt</TableCell>
                    <TableCell>Seife</TableCell>
                    <TableCell>Gewicht</TableCell>
                    <TableCell align="right">Preis</TableCell>
                    <TableCell align="center">Menge</TableCell>
                    <TableCell align="right">Gesamt</TableCell>
                    <TableCell align="center">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartData.items.map((item) => (
                    <TableRow key={item.produktId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            src={item.bild}
                            sx={{ width: 50, height: 50, mr: 2 }}
                          />
                          <Typography variant="body1">
                            {item.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.seife}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.gramm}g
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          €{item.preis.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.produktId, item.menge - 1)}
                            disabled={updating || item.menge <= 1}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <TextField
                            size="small"
                            value={item.menge}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value) || 1;
                              if (newQuantity >= 1) {
                                updateQuantity(item.produktId, newQuantity);
                              }
                            }}
                            inputProps={{
                              style: { textAlign: 'center', width: '50px' },
                              min: 1
                            }}
                            disabled={updating}
                          />
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.produktId, item.menge + 1)}
                            disabled={updating}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="bold">
                          €{(item.preis * item.menge).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => removeItem(item.produktId)}
                          disabled={updating}
                          title="Artikel entfernen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            {/* Gesamt */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography variant="h5" fontWeight="bold">
                Gesamtsumme: €{cartData.total.toFixed(2)}
              </Typography>
            </Box>

            {/* Info */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                Als Administrator können Sie hier Ihren persönlichen Warenkorb verwalten.
                Sie können Artikel hinzufügen, entfernen und Mengen ändern wie ein normaler Kunde.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AdminCart;