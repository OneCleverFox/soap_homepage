import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Helmet } from 'react-helmet-async';

const LoginPageSimple = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const adminEmail = 'Ralle.jacob84@googlemail.com';
  const adminPassword = 'Ralle1984';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (formData.email === adminEmail && formData.password === adminPassword) {
        const token = btoa(`${adminEmail}:${Date.now()}`);
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminEmail', adminEmail);
        navigate('/admin');
      } else {
        setError('Ungültige E-Mail oder Passwort');
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Anmelden - SOAP Homepage</title>
        <meta name="description" content="Anmelden bei SOAP Homepage" />
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: isMobile ? 1 : 3
        }}
      >
        <Container maxWidth="sm">
          <Paper 
            elevation={8}
            sx={{
              p: isMobile ? 2 : 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box textAlign="center" mb={3}>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                component="h1" 
                gutterBottom
                sx={{
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: 'bold'
                }}
              >
                Willkommen zurück
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Melden Sie sich an, um fortzufahren
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="E-Mail-Adresse"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-input': {
                    fontSize: isMobile ? '16px' : '14px'
                  }
                }}
                variant="outlined"
              />

              <TextField
                fullWidth
                label="Passwort"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                sx={{ 
                  mb: 3,
                  '& .MuiInputBase-input': {
                    fontSize: isMobile ? '16px' : '14px'
                  }
                }}
                variant="outlined"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !formData.email || !formData.password}
                sx={{
                  py: isMobile ? 1.5 : 1.2,
                  fontSize: isMobile ? '16px' : '14px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a6fd8, #6b42a6)',
                  },
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Anmelden...
                  </>
                ) : (
                  'Anmelden'
                )}
              </Button>
            </Box>

            <Box mt={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Für den Admin-Zugang verwenden Sie die vorgegebenen Anmeldedaten
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default LoginPageSimple;