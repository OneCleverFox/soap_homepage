import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Fab
} from '@mui/material';

const AdminPanelTest = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: ''
  });

  // Auth check
  useEffect(() => {
    const userToken = localStorage.getItem('userToken');
    const userRole = localStorage.getItem('userRole');
    
    console.log('🔍 AdminPanel: Authentifizierung wird geprüft...');
    console.log('Token:', userToken);
    console.log('Role:', userRole);
    
    if (!userToken || userRole !== 'admin') {
      console.log('❌ Nicht autorisiert - Weiterleitung zur Anmeldung');
      navigate('/anmelden');
      return;
    }
    
    console.log('✅ Admin-Zugang bestätigt');
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simuliere API-Aufruf
      const mockData = [
        {
          _id: '1',
          name: 'Testprodukt 1',
          price: 29.99,
          description: 'Ein tolles Testprodukt',
          category: 'Seife',
          stock: 50
        },
        {
          _id: '2', 
          name: 'Testprodukt 2',
          price: 19.99,
          description: 'Noch ein tolles Testprodukt',
          category: 'Shampoo',
          stock: 30
        }
      ];
      
      setTimeout(() => {
        setData(mockData);
        setLoading(false);
        console.log('📊 Daten geladen:', mockData);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Fehler beim Laden der Daten:', err);
      setError('Fehler beim Laden der Daten');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('👋 Admin-Abmeldung');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '',
      price: item.price || '',
      description: item.description || '',
      category: item.category || ''
    });
    setOpenDialog(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      setData(data.filter(item => item._id !== id));
      setSuccess('Eintrag erfolgreich gelöscht');
    }
  };

  const handleSave = () => {
    if (editItem) {
      // Update existing item
      setData(data.map(item => 
        item._id === editItem._id 
          ? { ...item, ...formData, price: parseFloat(formData.price) }
          : item
      ));
      setSuccess('Eintrag erfolgreich aktualisiert');
    } else {
      // Add new item
      const newItem = {
        _id: Date.now().toString(),
        ...formData,
        price: parseFloat(formData.price)
      };
      setData([...data, newItem]);
      setSuccess('Neuer Eintrag erfolgreich erstellt');
    }
    
    setOpenDialog(false);
    setEditItem(null);
    setFormData({ name: '', price: '', description: '', category: '' });
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ name: '', price: '', description: '', category: '' });
    setOpenDialog(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 3,
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ 
            mr: 2, 
            fontSize: { xs: 28, md: 32 }
          }}>
            ⚙️
          </Typography>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1"
            sx={{ fontWeight: 'bold' }}
          >
            Admin Panel
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleLogout}
          color="error"
          size={isMobile ? "small" : "medium"}
        >
          🚪 Logout
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {data.length}
              </Typography>
              <Typography variant="h6">
                📦 Produkte
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {data.reduce((sum, item) => sum + (item.stock || 0), 0)}
              </Typography>
              <Typography variant="h6">
                📊 Lagerbestand
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                €{data.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
              </Typography>
              <Typography variant="h6">
                💰 Gesamtwert
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                ✅
              </Typography>
              <Typography variant="h6">
                Status: Online
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleAdd}
          sx={{ mb: 2 }}
        >
          ➕ Neuer Eintrag
        </Button>
        <Button
          variant="outlined"
          onClick={fetchData}
          disabled={loading}
        >
          🔄 Aktualisieren
        </Button>
      </Box>

      {/* Data Table/Cards */}
      {isMobile ? (
        // Mobile: Card Layout
        <Box>
          {data.map((item) => (
            <Card key={item._id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {item.name}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Kategorie: {item.category}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    €{item.price}
                  </Typography>
                  <Typography variant="body2">
                    Lager: {item.stock}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleEdit(item)}
                    fullWidth
                  >
                    ✏️ Bearbeiten
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleDelete(item._id)}
                    fullWidth
                  >
                    🗑️ Löschen
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Desktop: Table Layout
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Kategorie</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Preis</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Lager</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Beschreibung</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    €{item.price}
                  </TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleEdit(item)}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(item._id)}
                      >
                        🗑️
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleAdd}
        >
          ➕
        </Fab>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editItem ? '✏️ Eintrag bearbeiten' : '➕ Neuer Eintrag'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Kategorie"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Preis"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Beschreibung"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} variant="contained">
            💾 Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>🔄 Lade Daten...</Typography>
        </Box>
      )}
    </Container>
  );
};

export default AdminPanelTest;