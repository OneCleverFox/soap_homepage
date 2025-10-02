import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { SendOutlined, DataObjectOutlined } from '@mui/icons-material';

const DataTestPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    productName: '',
    price: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendTestData = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const response = await fetch('http://localhost:5000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          source: 'frontend-test'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResponse(data);
        console.log('✅ Antwort vom Backend:', data);
      } else {
        throw new Error(data.message || 'Fehler beim Senden');
      }
    } catch (err) {
      console.error('❌ Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendProductData = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const productData = {
      name: formData.productName,
      price: parseFloat(formData.price) || 0,
      category: 'schmuck',
      description: 'Test-Produkt von Jonas',
      creator: 'Jonas (11)',
      type: 'handmade',
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:5000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setResponse(data);
        console.log('✅ Produkt-Daten gesendet:', data);
      } else {
        throw new Error(data.message || 'Fehler beim Senden');
      }
    } catch (err) {
      console.error('❌ Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom textAlign="center">
        <DataObjectOutlined sx={{ mr: 2, verticalAlign: 'middle' }} />
        Frontend ↔ Backend Test
      </Typography>
      
      <Typography variant="h6" color="text.secondary" textAlign="center" mb={4}>
        Testen Sie die Datenübertragung zwischen Frontend und Backend
      </Typography>

      {/* Formular */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          📝 Test-Daten eingeben
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <TextField
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            placeholder="z.B. Jonas"
          />
          
          <TextField
            label="E-Mail"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            fullWidth
            placeholder="z.B. jonas@example.com"
          />
          
          <TextField
            label="Nachricht"
            name="message"
            multiline
            rows={3}
            value={formData.message}
            onChange={handleInputChange}
            fullWidth
            placeholder="Test-Nachricht..."
          />

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Produkt-Daten
            </Typography>
          </Divider>
          
          <TextField
            label="Produkt Name"
            name="productName"
            value={formData.productName}
            onChange={handleInputChange}
            fullWidth
            placeholder="z.B. Halskette mit Anhänger"
          />
          
          <TextField
            label="Preis (€)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleInputChange}
            fullWidth
            placeholder="z.B. 25.50"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={sendTestData}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendOutlined />}
            sx={{ flex: 1, minWidth: 200 }}
          >
            Kontakt-Daten senden
          </Button>
          
          <Button
            variant="outlined"
            onClick={sendProductData}
            disabled={loading || !formData.productName}
            startIcon={loading ? <CircularProgress size={20} /> : <SendOutlined />}
            sx={{ flex: 1, minWidth: 200 }}
          >
            Produkt-Daten senden
          </Button>
        </Box>
      </Paper>

      {/* Antwort anzeigen */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Fehler:</strong> {error}
        </Alert>
      )}

      {response && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Erfolgreich gesendet!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Backend-Antwort:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Anleitung */}
      <Paper sx={{ p: 3, bgcolor: 'info.50' }}>
        <Typography variant="h6" gutterBottom>
          💡 So funktioniert's:
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li><strong>Daten eingeben:</strong> Füllen Sie die Felder aus</li>
            <li><strong>Senden:</strong> Klicken Sie auf einen der Buttons</li>
            <li><strong>Backend prüfen:</strong> Schauen Sie in die Backend-Konsole</li>
            <li><strong>Antwort:</strong> Die Server-Antwort wird hier angezeigt</li>
          </ol>
        </Typography>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>🔍 Backend-Logs prüfen:</strong><br/>
            Öffnen Sie das Backend-Terminal-Fenster um zu sehen, welche Daten ankommen!
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default DataTestPage;