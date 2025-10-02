import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  AdminPanelSettingsOutlined,
  LogoutOutlined,
  RefreshOutlined
} from '@mui/icons-material';

const AdminPanelSimple = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Authentifizierung prüfen
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    console.log('🔍 AdminPanel: Prüfe Authentifizierung...');
    console.log('🎫 Token vorhanden:', !!adminToken);
    console.log('👤 User vorhanden:', !!adminUser);
    
    if (!adminToken || !adminUser) {
      console.log('❌ Kein Admin-Token gefunden - Weiterleitung zur Login-Seite');
      setError('Nicht authentifiziert. Bitte loggen Sie sich ein.');
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(adminUser);
      console.log('👤 User-Daten:', user);
      
      if (user.email !== 'Ralle.jacob84@googlemail.com') {
        console.log('❌ Unauthorized user - Weiterleitung zur Login-Seite');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setError('Nicht autorisiert. Nur Admins haben Zugriff.');
        setLoading(false);
        return;
      }
      console.log('✅ Admin-Authentifizierung erfolgreich');
      
      // Daten laden
      loadData();
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Admin-Daten:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login');
      return;
    }
  }, [navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📊 Lade Admin-Daten von Backend...');

      const response = await fetch('http://localhost:5000/api/admin/data', {
        headers: getAuthHeaders()
      });

      console.log('📡 Backend Response Status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Daten erfolgreich geladen:', result);
        setData(result.data);
      } else {
        const errorText = await response.text();
        console.error('❌ Backend-Fehler:', response.status, errorText);
        throw new Error(`Backend-Fehler: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden der Daten:', err);
      setError(`Fehler beim Laden der Daten: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    console.log('🔓 Admin-Logout erfolgreich');
    navigate('/login');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Lade Admin-Panel...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsOutlined sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Admin-Panel
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={loadData}
            >
              Aktualisieren
            </Button>
            <Button
              variant="outlined"
              startIcon={<LogoutOutlined />}
              onClick={handleLogout}
              color="error"
            >
              Abmelden
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Fehler anzeigen */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistiken */}
      {data && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Produkte
                </Typography>
                <Typography variant="h4">
                  {data.products?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Bestellungen
                </Typography>
                <Typography variant="h4">
                  {data.orders?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Kunden
                </Typography>
                <Typography variant="h4">
                  {data.customers?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <Typography variant="h6" color="success.main">
                  ✅ Verbunden
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Daten anzeigen */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          MongoDB Atlas Daten
        </Typography>
        
        {data ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Verfügbare Daten:
            </Typography>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '8px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Box>
        ) : (
          <Typography variant="body1" color="textSecondary">
            Keine Daten verfügbar. Klicken Sie auf "Aktualisieren" um Daten zu laden.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default AdminPanelSimple;