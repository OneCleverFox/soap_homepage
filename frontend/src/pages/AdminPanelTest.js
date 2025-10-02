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
import { Helmet } from 'react-helmet-async';

const AdminPanelTest = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    console.log('🔍 AdminPanel: Authentifizierung wird geprüft...');
    console.log('🎫 Token vorhanden:', !!adminToken);
    console.log('👤 User-Daten vorhanden:', !!adminUser);
    
    if (!adminToken) {
      console.log('❌ Kein Admin-Token - Zugriff verweigert');
      setError('Nicht authentifiziert. Bitte loggen Sie sich als Admin ein.');
      return;
    }

    try {
      const user = JSON.parse(adminUser);
      console.log('👤 Geladene User-Daten:', user);
      
      if (user.email !== 'Ralle.jacob84@googlemail.com') {
        console.log('❌ Unerlaubter Benutzer:', user.email);
        setError('Zugriff verweigert. Nur Admins haben Zugriff auf diesen Bereich.');
        return;
      }

      console.log('✅ Admin-Zugriff bestätigt für:', user.email);
      loadData();
    } catch (err) {
      console.log('❌ Fehler beim Parsen der User-Daten:', err);
      setError('Fehler bei der Authentifizierung.');
    }
  }, []);

  const loadData = async () => {
    console.log('📡 Lade Daten aus MongoDB...');
    setLoading(true);
    setError('');

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response Status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Erhaltene Daten:', result);
      
      setData(result.data || result || []);
      console.log('✅ Daten erfolgreich geladen:', result.data?.length || result?.length || 0, 'Elemente');
    } catch (err) {
      console.error('❌ Fehler beim Laden der Daten:', err);
      setError(`Fehler beim Laden der Daten: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Admin-Logout...');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const handleAddNew = () => {
    setEditItem(null);
    setFormData({ name: '', price: '', description: '', category: '' });
    setOpenDialog(true);
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

  const handleSave = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const url = editItem 
        ? `http://localhost:5000/api/products/${editItem._id}`
        : 'http://localhost:5000/api/products';
      
      const method = editItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      setOpenDialog(false);
      loadData();
      console.log('✅ Daten erfolgreich gespeichert');
    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err);
      setError(`Fehler beim Speichern: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Wirklich löschen?')) return;

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      loadData();
      console.log('✅ Element erfolgreich gelöscht');
    } catch (err) {
      console.error('❌ Fehler beim Löschen:', err);
      setError(`Fehler beim Löschen: ${err.message}`);
    }
  };

  if (error && !loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Zurück zum Login
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - Gluecksmomente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      
      <Container 
        maxWidth="lg" 
        sx={{ 
          mt: { xs: 2, md: 4 }, 
          mb: { xs: 2, md: 4 },
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
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
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Stats - Mobile optimiert */}
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} color="primary">
                  Produktdatenbank
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"}>
                  {data.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Einträge in der Datenbank
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} color="secondary">
                  Status
                </Typography>
                <Typography 
                  variant={isMobile ? "h5" : "h4"} 
                  color={loading ? 'warning.main' : 'success.main'}
                >
                  {loading ? 'Lädt...' : 'Bereit'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System-Status
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} color="info.main">
                  MongoDB
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"} color="success.main">
                  Verbunden
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Atlas Production DB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Neues Element hinzufügen
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Aktualisieren
          </Button>
        </Box>

        {/* Data Table - Mobile optimiert */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: { xs: '60vh', md: 'none' } }}>
            <Table stickyHeader={isMobile}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                    Name
                  </TableCell>
                  {!isMobile && (
                    <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                      Preis
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                      Kategorie
                    </TableCell>
                  )}
                  <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                    {isMobile ? 'Info' : 'Beschreibung'}
                  </TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                    Aktionen
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 3 : 5} align="center">
                      Lade Daten...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 3 : 5} align="center">
                      Keine Daten gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => (
                    <TableRow key={item._id || index}>
                      <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {item.name || 'Unbekannt'}
                          </Typography>
                          {isMobile && (
                            <Typography variant="caption" color="text.secondary">
                              {item.price ? `€${item.price}` : '-'} • {item.category || '-'}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {!isMobile && (
                        <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                          {item.price ? `€${item.price}` : '-'}
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                          {item.category || '-'}
                        </TableCell>
                      )}
                      <TableCell sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: { xs: 120, md: 200 },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1,
                          flexDirection: { xs: 'column', sm: 'row' }
                        }}>
                          <Button
                            size="small"
                            startIcon={!isMobile ? <Edit /> : null}
                            onClick={() => handleEdit(item)}
                            sx={{ 
                              minWidth: { xs: 60, sm: 'auto' },
                              fontSize: { xs: '0.7rem', md: '0.875rem' }
                            }}
                          >
                            {isMobile ? '✏️' : 'Bearbeiten'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={!isMobile ? <Delete /> : null}
                            onClick={() => handleDelete(item._id)}
                            sx={{ 
                              minWidth: { xs: 60, sm: 'auto' },
                              fontSize: { xs: '0.7rem', md: '0.875rem' }
                            }}
                          >
                            {isMobile ? '🗑️' : 'Löschen'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={handleAddNew}
          >
            <Add />
          </Fab>
        )}

        {/* Add/Edit Dialog - Mobile optimiert */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            {editItem ? 'Element bearbeiten' : 'Neues Element hinzufügen'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '16px', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Preis"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '16px', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kategorie"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '16px', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '16px', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ 
            p: { xs: 2, md: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              fullWidth={isMobile}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              fullWidth={isMobile}
            >
              Speichern
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default AdminPanelTest;