import React, { useState, useContext } from 'react';
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
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  AdminPanelSettingsOutlined,
  EmailOutlined,
  LockOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined
} from '@mui/icons-material';
import AuthContext from '../contexts/AuthContext';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    email: 'Ralle.jacob84@googlemail.com',  // Vorgefüllt für einfachere Tests
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Admin-Login-Versuch:', formData.email);

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Admin-Login erfolgreich:', data.user);
        
        // Token im localStorage speichern
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        
        // AuthContext aktualisieren
        if (login) {
          login(data.user, data.token);
        }
        
        // Zum Admin-Panel weiterleiten
        navigate('/admin');
        
      } else {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }

    } catch (err) {
      console.error('❌ Login-Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={8} sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <AdminPanelSettingsOutlined 
            sx={{ 
              fontSize: 60, 
              color: 'primary.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Admin-Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zugang nur für Administratoren
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="E-Mail"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Passwort"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={loading}
            sx={{ mb: 4 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Anmelden'
            )}
          </Button>
        </form>

        <Box textAlign="center" sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>🔐 Test-Zugang:</strong><br/>
            E-Mail: Ralle.jacob84@googlemail.com<br/>
            Passwort: Ralle1984
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminLoginPage;