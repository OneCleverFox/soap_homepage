import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton
} from '@mui/material';
import {
  AdminPanelSettingsOutlined,
  ShoppingBagOutlined,
  ShoppingCartOutlined,
  PeopleOutlined,
  EuroOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  RefreshOutlined
} from '@mui/icons-material';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Authentifizierung prüfen
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUser) {
      console.log('❌ Kein Admin-Token gefunden - Weiterleitung zur Login-Seite');
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(adminUser);
      // Überprüfe Admin-Berechtigung über Token
      if (!user || user.role !== 'admin') {
        console.log('❌ Unauthorized user - Weiterleitung zur Login-Seite');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/login');
        return;
      }
      console.log('✅ Admin-Authentifizierung erfolgreich');
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Admin-Daten:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login');
      return;
    }
  }, [navigate]);
  
  // Dialog States
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'seife',
    creator: 'Ralf',
    stock: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    console.log('🔓 Admin-Logout erfolgreich');
    navigate('/login');
  };

  // Daten neu laden Funktion
  const refreshData = async () => {
    try {
      setLoading(true);
      console.log('📊 Lade Admin-Daten...');

      const response = await fetch('http://localhost:5000/api/admin/data', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        console.log('✅ Daten geladen:', result.data);
      } else {
        throw new Error('Fehler beim Laden der Daten');
      }
    } catch (err) {
      console.error('❌ Daten-Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 Lade Admin-Daten...');

        const response = await fetch('http://localhost:5000/api/admin/data', {
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const result = await response.json();
          setData(result.data);
          console.log('✅ Daten geladen:', result.data);
        } else {
          throw new Error('Fehler beim Laden der Daten');
        }
      } catch (err) {
        console.error('❌ Daten-Fehler:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openProductDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        creator: product.creator,
        stock: product.stock.toString()
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: 'seife',
        creator: 'Ralf',
        stock: ''
      });
    }
    setProductDialog(true);
  };

  const handleProductSubmit = async () => {
    try {
      const url = editingProduct 
        ? `http://localhost:5000/api/admin/products/${editingProduct.id}`
        : 'http://localhost:5000/api/admin/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock)
        })
      });

      if (response.ok) {
        setProductDialog(false);
        refreshData(); // Daten neu laden
      } else {
        throw new Error('Fehler beim Speichern des Produkts');
      }
    } catch (err) {
      console.error('❌ Produkt-Fehler:', err);
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Produkt wirklich löschen?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        refreshData(); // Daten neu laden
      } else {
        throw new Error('Fehler beim Löschen des Produkts');
      }
    } catch (err) {
      console.error('❌ Lösch-Fehler:', err);
      setError(err.message);
    }
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        refreshData(); // Daten neu laden
      } else {
        throw new Error('Fehler beim Aktualisieren der Bestellung');
      }
    } catch (err) {
      console.error('❌ Bestellungs-Fehler:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center">
          <AdminPanelSettingsOutlined sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            Admin-Panel
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <IconButton onClick={refreshData} color="primary">
            <RefreshOutlined />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Abmelden
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistiken */}
      {data && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingBagOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.stats.totalProducts}</Typography>
                    <Typography color="text.secondary">Produkte</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingCartOutlined sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.stats.totalOrders}</Typography>
                    <Typography color="text.secondary">Bestellungen</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleOutlined sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.stats.totalCustomers}</Typography>
                    <Typography color="text.secondary">Kunden</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <EuroOutlined sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{data.stats.totalRevenue.toFixed(2)}€</Typography>
                    <Typography color="text.secondary">Umsatz</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Produkte */}
      {data && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">Produkte verwalten</Typography>
              <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => openProductDialog()}
              >
                Neues Produkt
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Kategorie</TableCell>
                    <TableCell>Preis</TableCell>
                    <TableCell>Ersteller</TableCell>
                    <TableCell>Lager</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={product.category} 
                          variant="outlined" 
                          size="small"
                          color={product.category === 'schmuck' ? 'secondary' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>{product.price.toFixed(2)}€</TableCell>
                      <TableCell>{product.creator}</TableCell>
                      <TableCell>
                        <Chip 
                          label={product.stock} 
                          color={product.stock < 5 ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => openProductDialog(product)}
                          color="primary"
                        >
                          <EditOutlined />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteProduct(product.id)}
                          color="error"
                        >
                          <DeleteOutlined />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Bestellungen */}
      {data && (
        <Paper>
          <Box p={3}>
            <Typography variant="h5" mb={2}>Bestellungen verwalten</Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kunde</TableCell>
                    <TableCell>E-Mail</TableCell>
                    <TableCell>Artikel</TableCell>
                    <TableCell>Gesamt</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Datum</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>
                        {order.items.map(item => (
                          <div key={item.productId}>
                            Produkt {item.productId} (x{item.quantity})
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{order.total.toFixed(2)}€</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={order.status}
                            onChange={(e) => handleOrderStatusUpdate(order.id, e.target.value)}
                          >
                            <MenuItem value="pending">Ausstehend</MenuItem>
                            <MenuItem value="processing">In Bearbeitung</MenuItem>
                            <MenuItem value="shipped">Versandt</MenuItem>
                            <MenuItem value="delivered">Geliefert</MenuItem>
                            <MenuItem value="cancelled">Storniert</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Produkt-Dialog */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Produktname"
              value={productForm.name}
              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              fullWidth
            />
            <TextField
              label="Beschreibung"
              value={productForm.description}
              onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Preis (€)"
              type="number"
              value={productForm.price}
              onChange={(e) => setProductForm({...productForm, price: e.target.value})}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={productForm.category}
                onChange={(e) => setProductForm({...productForm, category: e.target.value})}
              >
                <MenuItem value="seife">Seife</MenuItem>
                <MenuItem value="schmuck">Schmuck</MenuItem>
                <MenuItem value="sonstiges">Sonstiges</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Ersteller</InputLabel>
              <Select
                value={productForm.creator}
                onChange={(e) => setProductForm({...productForm, creator: e.target.value})}
              >
                <MenuItem value="Ralf">Ralf</MenuItem>
                <MenuItem value="Jonas">Jonas</MenuItem>
                <MenuItem value="Sandra">Sandra</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Lagerbestand"
              type="number"
              value={productForm.stock}
              onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>Abbrechen</Button>
          <Button onClick={handleProductSubmit} variant="contained">
            {editingProduct ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;