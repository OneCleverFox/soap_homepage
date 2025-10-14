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
  Divider
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CartIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Mein Admin-Warenkorb
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadAdminCart}
          disabled={updating}
          sx={{ mr: 2 }}
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
          >
            Leeren
          </Button>
        )}
      </Box>

      {/* Benutzer Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Administrator: {user?.email || 'Unbekannt'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Chip 
              label={`${cartData.itemCount} Artikel`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`Gesamt: €${cartData.total.toFixed(2)}`} 
              color="success" 
              variant="outlined" 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Warenkorb Inhalt */}
      {cartData.items.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
              <CartIcon sx={{ mr: 2 }} />
              Ihr Warenkorb ist leer. Fügen Sie Produkte aus dem Portfolio hinzu.
            </Alert>
          </CardContent>
        </Card>
      ) : (
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