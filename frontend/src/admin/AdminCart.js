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
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { cartAPI } from '../services/api';
import stockEventService from '../services/stockEventService';
import toast from 'react-hot-toast';

const AdminCart = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cartData, setCartData] = useState({ items: [], total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [swipeStates, setSwipeStates] = useState({});

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Swipe-Funktionalität für mobile Ansicht - ohne preventDefault
  const handleTouchStart = (itemId, e) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setSwipeStates(prev => ({
      ...prev,
      [itemId]: {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        swiping: false,
        swipeDistance: 0,
        startTime: Date.now()
      }
    }));
  };

  const handleTouchMove = (itemId, e) => {
    if (!isMobile || !swipeStates[itemId]) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStates[itemId].startX;
    const deltaY = Math.abs(touch.clientY - swipeStates[itemId].startY);
    
    // Nur horizontales Swipen erkennen - ohne preventDefault
    if (Math.abs(deltaX) > 15 && deltaY < 60) {
      setSwipeStates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          currentX: touch.clientX,
          swiping: true,
          swipeDistance: deltaX
        }
      }));
    }
  };

  const handleTouchEnd = (itemId) => {
    if (!isMobile || !swipeStates[itemId]) return;
    
    const swipeState = swipeStates[itemId];
    const swipeThreshold = 120; // Etwas höherer Threshold
    const swipeTime = Date.now() - swipeState.startTime;
    
    // Swipe muss schnell genug und weit genug sein
    if (swipeState.swiping && 
        Math.abs(swipeState.swipeDistance) > swipeThreshold && 
        swipeTime < 500) {
      // Nach links gewischt - löschen
      if (swipeState.swipeDistance < 0) {
        removeItem(itemId);
      }
    }
    
    // Swipe-State zurücksetzen
    setSwipeStates(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  // Sichere Preisberechnung für nicht verfügbare Artikel
  const getSafePrice = useCallback((price) => {
    return isNaN(price) || price === null || price === undefined ? 0 : parseFloat(price);
  }, []);

  const getSafeTotal = useCallback((price, quantity) => {
    const safePrice = getSafePrice(price);
    const safeQuantity = isNaN(quantity) || quantity === null || quantity === undefined ? 0 : parseInt(quantity);
    return safePrice * safeQuantity;
  }, [getSafePrice]);

  // Berechnet verfügbare Gesamtsumme (nur verfügbare Artikel)
  const getAvailableTotal = useCallback((items) => {
    return items
      .filter(item => item.hasEnoughStock === true)
      .reduce((sum, item) => sum + getSafeTotal(item.preis, item.menge), 0);
  }, [getSafeTotal]);

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
        // Sichere Verarbeitung der Warenkorb-Daten
        const processedItems = data.data.items.map(item => {
          // Verfügbarkeitsstatus: Prüfe sowohl aktiv als auch bestand.verfuegbar
          const isAvailable = (item.aktiv !== false) && (item.bestand?.verfuegbar !== false) && (item.bestand?.menge || 0) > 0;
          const hasEnoughStock = isAvailable && (parseInt(item.menge) || 0) <= (item.bestand?.menge || 0);
          
          console.log('📦 AdminCart Availability Check:', {
            name: item.name,
            aktiv: item.aktiv,
            bestandVerfuegbar: item.bestand?.verfuegbar,
            bestandMenge: item.bestand?.menge,
            itemMenge: item.menge,
            isAvailable: isAvailable,
            hasEnoughStock: hasEnoughStock
          });
          
          const processedItem = {
            ...item,
            preis: getSafePrice(item.preis),
            menge: parseInt(item.menge) || 0,
            gesamtpreis: getSafeTotal(item.preis, item.menge),
            isAvailable,
            hasEnoughStock
          };
          
          console.log('📦 Processed item:', {
            name: processedItem.name,
            bestand: processedItem.bestand,
            isAvailable: processedItem.isAvailable,
            hasEnoughStock: processedItem.hasEnoughStock
          });
          
          return processedItem;
        });
        
        const safeCartData = {
          ...data.data,
          items: processedItems
        };
        
        // Neuberechnung der Gesamtsumme - alle Artikel
        safeCartData.total = safeCartData.items.reduce((sum, item) => sum + item.gesamtpreis, 0);
        // Nur bestellbare Artikel
        safeCartData.availableTotal = safeCartData.items
          .filter(item => item.hasEnoughStock)
          .reduce((sum, item) => sum + item.gesamtpreis, 0);
        safeCartData.itemCount = safeCartData.items.reduce((sum, item) => sum + item.menge, 0);
        safeCartData.availableItemCount = safeCartData.items
          .filter(item => item.hasEnoughStock)
          .reduce((sum, item) => sum + item.menge, 0);
        
        setCartData(safeCartData);
      } else {
        throw new Error(data.message || 'Fehler beim Laden des Warenkorbs');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Admin-Warenkorbs:', error);
      toast.error('Fehler beim Laden des Warenkorbs: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getSafePrice, getSafeTotal]);

  const updateQuantity = async (produktId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(produktId);
      return;
    }

    try {
      setUpdating(true);
      
      // Bestandsprüfung vor dem Update
      const item = cartData.items.find(item => item.produktId === produktId);
      if (!item) {
        toast.error('Artikel nicht im Warenkorb gefunden');
        return;
      }
      
      // Prüfe Verfügbarkeit und Bestand
      if (!item.isAvailable) {
        toast.error('Artikel ist nicht verfügbar');
        return;
      }
      
      const maxAvailable = item.bestand?.menge || 0;
      if (newQuantity > maxAvailable) {
        toast.error(`Nur ${maxAvailable} Stück verfügbar`);
        return;
      }

      // Optimistische UI-Update - sofort das lokale State aktualisieren
      setCartData(prevData => {
        const updatedItems = prevData.items.map(item => {
          if (item.produktId === produktId) {
            const updatedItem = { ...item, menge: newQuantity };
            updatedItem.gesamtpreis = getSafeTotal(updatedItem.preis, newQuantity);
            return updatedItem;
          }
          return item;
        });
        
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
        const newItemCount = updatedItems.reduce((sum, item) => sum + item.menge, 0);
        
        return {
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount
        };
      });

      // Backend-Update
      await cartAPI.updateQuantity(produktId, newQuantity);
      toast.success('Menge aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Menge:', error);
      
      // Spezifische Fehlermeldungen basierend auf Backend-Response
      if (error.response?.data?.errorType === 'INSUFFICIENT_STOCK') {
        const available = error.response.data.availableQuantity || 0;
        toast.error(`Nur ${available} Stück verfügbar`);
      } else if (error.response?.data?.errorType === 'NOT_AVAILABLE') {
        toast.error('Artikel ist nicht mehr verfügbar');
      } else {
        toast.error('Fehler beim Aktualisieren der Menge');
      }
      
      // Bei Fehler: Daten neu laden
      await loadAdminCart();
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (produktId) => {
    try {
      setUpdating(true);
      
      // Optimistische UI-Update - sofort aus lokalem State entfernen
      setCartData(prevData => {
        const updatedItems = prevData.items.filter(item => item.produktId !== produktId);
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
        const newItemCount = updatedItems.reduce((sum, item) => sum + item.menge, 0);
        
        return {
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount
        };
      });

      // Backend-Update
      await cartAPI.removeItem(produktId);
      toast.success('Artikel entfernt');
    } catch (error) {
      console.error('Fehler beim Entfernen des Artikels:', error);
      toast.error('Fehler beim Entfernen des Artikels');
      // Bei Fehler: Daten neu laden
      await loadAdminCart();
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setUpdating(true);
      
      // Optimistische UI-Update - sofort leeren
      setCartData({
        items: [],
        total: 0,
        itemCount: 0
      });

      // Backend-Update
      await cartAPI.clearCart();
      toast.success('Warenkorb geleert');
    } catch (error) {
      console.error('Fehler beim Leeren des Warenkorbs:', error);
      toast.error('Fehler beim Leeren des Warenkorbs');
      // Bei Fehler: Daten neu laden
      await loadAdminCart();
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdminCart();
    }
    
    // Registriere Stock Event Listener für reaktive Updates
    const unsubscribe = stockEventService.subscribe((productId, newStock) => {
      console.log('🛒 Admin Cart received stock update:', { productId, newStock });
      
      if (productId === null) {
        // Globales Update - kompletten Warenkorb neu laden
        if (user) {
          loadAdminCart();
        }
      } else {
        // Spezifisches Produkt - nur dieses Item aktualisieren
        setCartData(prevData => {
          const updatedItems = prevData.items.map(item => {
            if (item.produktId === productId) {
              const updatedItem = {
                ...item,
                bestand: newStock,
                isAvailable: item.aktiv && (newStock?.menge || 0) > 0,
                hasEnoughStock: item.aktiv && (newStock?.menge || 0) >= item.menge
              };
              return updatedItem;
            }
            return item;
          });
          
          // Neuberechnung der verfügbaren Summe
          const newAvailableTotal = getAvailableTotal(updatedItems);
          
          return {
            ...prevData,
            items: updatedItems,
            availableTotal: newAvailableTotal,
            availableItemCount: updatedItems
              .filter(item => item.hasEnoughStock)
              .reduce((sum, item) => sum + item.menge, 0)
          };
        });
        
        toast.info('Bestandsänderung erkannt - Warenkorb aktualisiert');
      }
    });

    // Cleanup Subscription
    return () => {
      unsubscribe();
    };
  }, [user, loadAdminCart, getAvailableTotal]);

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
        
        {cartData.items.length > 0 && (
          <Box>
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
          </Box>
        )}
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
            mt: 1,
            flexWrap: 'wrap'
          }}>
            <Chip 
              label={`${cartData.itemCount} Artikel gesamt`} 
              color="primary" 
              variant="outlined" 
              size={isMobile ? "medium" : "small"}
            />
            {cartData.availableItemCount !== undefined && cartData.availableItemCount !== cartData.itemCount && (
              <Chip 
                label={`${cartData.availableItemCount} verfügbar`} 
                color="success" 
                variant="outlined" 
                size={isMobile ? "medium" : "small"}
              />
            )}
            <Chip 
              label={`Gesamt: €${(cartData.total || 0).toFixed(2)}`} 
              color="info" 
              variant="outlined" 
              size={isMobile ? "medium" : "small"}
            />
            {cartData.availableTotal !== undefined && cartData.availableTotal !== cartData.total && (
              <Chip 
                label={`Bestellbar: €${(cartData.availableTotal || 0).toFixed(2)}`} 
                color="success" 
                variant="filled" 
                size={isMobile ? "medium" : "small"}
              />
            )}
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
          {cartData.items.map((item) => {
            const swipeState = swipeStates[item.produktId];
            const isSwipingLeft = swipeState?.swiping && swipeState.swipeDistance < -50;
            
            return (
              <Card 
                key={item.produktId}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  transform: swipeState?.swiping ? 
                    `translateX(${Math.min(0, swipeState.swipeDistance)}px)` : 
                    'translateX(0)',
                  transition: swipeState?.swiping ? 'none' : 'transform 0.3s ease',
                  bgcolor: isSwipingLeft ? 'error.light' : 'background.paper'
                }}
                onTouchStart={(e) => handleTouchStart(item.produktId, e)}
                onTouchMove={(e) => handleTouchMove(item.produktId, e)}
                onTouchEnd={() => handleTouchEnd(item.produktId)}
              >
                {/* Swipe-Delete-Indikator */}
                {isSwipingLeft && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 80,
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}
                  >
                    <DeleteIcon sx={{ color: 'white', fontSize: 30 }} />
                  </Box>
                )}
                
                <CardContent sx={{ p: 2, position: 'relative', zIndex: 2 }}>
                  {/* Swipe-Hint für erste Benutzung */}
                  {cartData.items.indexOf(item) === 0 && !swipeState && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'error.main',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        zIndex: 3,
                        boxShadow: 2,
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      ← Wischen = Löschen
                    </Box>
                  )}
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
                    
                    {/* Verfügbarkeitsstatus */}
                    {!item.isAvailable ? (
                      <Chip 
                        label="Nicht verfügbar" 
                        color="error" 
                        size="small" 
                        sx={{ mt: 0.5, fontSize: '0.75rem' }}
                      />
                    ) : !item.hasEnoughStock ? (
                      <Chip 
                        label={`Nur ${item.bestand?.menge || 0} verfügbar`} 
                        color="warning" 
                        size="small" 
                        sx={{ mt: 0.5, fontSize: '0.75rem' }}
                      />
                    ) : (
                      <Chip 
                        label="Verfügbar" 
                        color="success" 
                        size="small" 
                        sx={{ mt: 0.5, fontSize: '0.75rem' }}
                      />
                    )}
                    
                    <Typography variant="h6" color="primary" sx={{ mt: 0.5 }}>
                      €{getSafePrice(item.preis).toFixed(2)}
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
                      disabled={updating || !item.isAvailable || item.menge >= (item.bestand?.menge || 0)}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { 
                          bgcolor: 'grey.300', 
                          color: 'grey.500' 
                        },
                        width: 40,
                        height: 40
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Gesamt */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.hasEnoughStock ? 'Gesamt:' : 'Gesamt (nicht bestellbar):'}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={item.hasEnoughStock ? "success.main" : "text.disabled"}
                      sx={{
                        textDecoration: item.hasEnoughStock ? 'none' : 'line-through'
                      }}
                    >
                      €{getSafeTotal(item.preis, item.menge).toFixed(2)}
                    </Typography>
                    {!item.hasEnoughStock && (
                      <Typography variant="caption" color="error.main" display="block">
                        Nicht in Bestellung enthalten
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
            );
          })}
          
          {/* Mobile Gesamt */}
          <Card sx={{ bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.main' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
                Gesamtsumme: €{(cartData.total || 0).toFixed(2)}
              </Typography>
              {cartData.availableTotal !== undefined && cartData.availableTotal !== cartData.total && (
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  Bestellbar: €{(cartData.availableTotal || 0).toFixed(2)}
                </Typography>
              )}
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
                    <TableCell>Status</TableCell>
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
                      <TableCell>
                        {!item.isAvailable ? (
                          <Chip 
                            label="Nicht verfügbar" 
                            color="error" 
                            size="small"
                          />
                        ) : !item.hasEnoughStock ? (
                          <Chip 
                            label={`Nur ${item.bestand?.menge || 0} verfügbar`} 
                            color="warning" 
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Verfügbar" 
                            color="success" 
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          €{getSafePrice(item.preis).toFixed(2)}
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
                            disabled={updating || !item.isAvailable || item.menge >= (item.bestand?.menge || 0)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={item.hasEnoughStock ? "text.primary" : "text.disabled"}
                          sx={{
                            textDecoration: item.hasEnoughStock ? 'none' : 'line-through'
                          }}
                        >
                          €{getSafeTotal(item.preis, item.menge).toFixed(2)}
                        </Typography>
                        {!item.hasEnoughStock && (
                          <Typography variant="caption" color="error.main" display="block">
                            Nicht bestellbar
                          </Typography>
                        )}
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