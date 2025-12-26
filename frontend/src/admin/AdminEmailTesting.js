import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import api from '../services/api';

const AdminEmailTesting = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [testEmail, setTestEmail] = useState('');
  const [selectedEmailType, setSelectedEmailType] = useState('');

  const emailTypes = [
    { 
      id: 'verification', 
      label: 'E-Mail Verifizierung', 
      description: 'Test-E-Mail zur Konto-Verifizierung',
      color: 'primary' 
    },
    { 
      id: 'welcome', 
      label: 'Willkommens-E-Mail', 
      description: 'Begrüßung nach Registrierung',
      color: 'success' 
    },
    { 
      id: 'password-reset', 
      label: 'Passwort-Reset', 
      description: 'Link zum Zurücksetzen des Passworts',
      color: 'warning' 
    },
    { 
      id: 'order-confirmation', 
      label: 'Bestellbestätigung', 
      description: 'Bestätigung einer Testbestellung',
      color: 'info' 
    },
    { 
      id: 'admin-notification', 
      label: 'Admin-Benachrichtigung', 
      description: 'Benachrichtigung über neue Bestellung',
      color: 'secondary' 
    }
  ];

  const sendTestEmail = async (emailType, customEmail = null) => {
    setLoading(true);
    
    const targetEmail = customEmail || 'Standard Admin-E-Mail';
    
    // Frontend-Logging
    console.log('📧 [Frontend] E-Mail-Test gestartet...');
    console.log('  📧 E-Mail-Typ:', emailType);
    console.log('  🎯 Ziel-E-Mail:', targetEmail);
    console.log('  ⏰ Zeitpunkt:', new Date().toLocaleString());
    
    try {
      const payload = {};
      if (customEmail) {
        payload.email = customEmail;
      }

      console.log('  📡 Sende Anfrage an Backend...');
      const response = await api.post(`/invoice/test-email/${emailType}`, payload);
      
      const newResult = {
        id: Date.now(),
        type: emailType,
        email: customEmail || 'Standard Admin-E-Mail',
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date(),
        data: response.data.data
      };

      console.log('✅ [Frontend] E-Mail-Test ERFOLGREICH');
      console.log('  📬 Empfänger:', targetEmail);
      console.log('  📝 Backend-Antwort:', response.data.message);
      if (response.data.data?.messageId) {
        console.log('  📩 Message ID:', response.data.data.messageId);
      }

      setResults(prev => [newResult, ...prev.slice(0, 9)]); // Zeige nur die letzten 10 Ergebnisse
      
    } catch (error) {
      const newResult = {
        id: Date.now(),
        type: emailType,
        email: customEmail || 'Standard Admin-E-Mail',
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: new Date(),
        error: true
      };
      
      console.error('❌ [Frontend] E-Mail-Test FEHLGESCHLAGEN');
      console.error('  📬 Ziel-E-Mail:', targetEmail);
      console.error('  ⚠️ Fehler:', error.response?.data?.message || error.message);
      if (error.response?.data?.error) {
        console.error('  🔍 Details:', error.response.data.error);
      }
      
      setResults(prev => [newResult, ...prev.slice(0, 9)]);
    } finally {
      setLoading(false);
      console.log('🏁 [Frontend] E-Mail-Test abgeschlossen');
    }
  };

  const sendCustomEmail = () => {
    if (!selectedEmailType) return;
    sendTestEmail(selectedEmailType, testEmail || null);
  };

  const getEmailTypeLabel = (typeId) => {
    const type = emailTypes.find(t => t.id === typeId);
    return type ? type.label : typeId;
  };

  const getEmailTypeColor = (typeId) => {
    const type = emailTypes.find(t => t.id === typeId);
    return type ? type.color : 'default';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📧 E-Mail-Testing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Testen Sie alle E-Mail-Funktionen der Anwendung
        </Typography>
      </Box>

      {/* Schnell-Tests */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🚀 Schnell-Tests
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Senden Sie Test-E-Mails an Ihre Admin-E-Mail-Adresse
          </Typography>
          
          <Grid container spacing={2}>
            {emailTypes.map((emailType) => (
              <Grid item xs={12} sm={6} md={4} key={emailType.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Chip 
                        label={emailType.label} 
                        color={emailType.color}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {emailType.description}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<SendIcon />}
                      onClick={() => sendTestEmail(emailType.id)}
                      disabled={loading}
                      color={emailType.color}
                    >
                      Test senden
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Custom E-Mail Test */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 Benutzerdefinierter Test
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Senden Sie Test-E-Mails an eine spezifische E-Mail-Adresse
          </Typography>
          
          <Grid container spacing={2} alignItems="end">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Test-E-Mail-Adresse"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                helperText="Leer lassen für Admin-E-Mail"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>E-Mail-Typ</InputLabel>
                <Select
                  value={selectedEmailType}
                  onChange={(e) => setSelectedEmailType(e.target.value)}
                  label="E-Mail-Typ"
                >
                  {emailTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                fullWidth
                startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                onClick={sendCustomEmail}
                disabled={loading || !selectedEmailType}
                size="large"
              >
                {loading ? 'Sende...' : 'Test senden'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ergebnisse */}
      {results.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Test-Ergebnisse
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Die letzten {results.length} E-Mail-Tests
            </Typography>
            
            {results.map((result, index) => (
              <Box key={result.id}>
                <Alert
                  severity={result.success ? 'success' : 'error'}
                  icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip 
                        label={getEmailTypeLabel(result.type)}
                        color={getEmailTypeColor(result.type)}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        an {result.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {result.message}
                    </Typography>
                    {result.data?.messageId && (
                      <Typography variant="caption" color="text.secondary">
                        Message ID: {result.data.messageId}
                      </Typography>
                    )}
                  </Box>
                </Alert>
                {index < results.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
      
      {results.length === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Keine Tests durchgeführt
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Klicken Sie auf einen der Test-Buttons oben, um zu beginnen
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AdminEmailTesting;