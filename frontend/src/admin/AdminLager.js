import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  ProductionQuantityLimits as ProductionIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';
import { API_URL } from '../services/api';

const AdminLager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [bestand, setBestand] = useState({
    rohseifen: [],
    duftoele: [],
    verpackungen: [],
    produkte: []
  });
  const [warnungen, setWarnungen] = useState([]);
  const [availableItems, setAvailableItems] = useState({
    rohseifen: [],
    duftoele: [],
    verpackungen: [],
    produkte: []
  });
  
  // Dialog States
  const [inventurDialog, setInventurDialog] = useState(false);
  const [produktionDialog, setProduktionDialog] = useState(false);
  const [korrekturDialog, setKorrekturDialog] = useState(false);
  const [historieDialog, setHistorieDialog] = useState(false);
  
  // Form States
  const [inventurForm, setInventurForm] = useState({
    typ: 'rohseife',
    artikelId: '',
    menge: 0,
    einheit: 'kg',
    mindestbestand: 0,
    notizen: ''
  });
  
  const [produktionForm, setProduktionForm] = useState({
    produktId: '',
    anzahl: 1
  });
  
  const [korrekturForm, setKorrekturForm] = useState({
    bestandId: '',
    aenderung: 0,
    notizen: ''
  });
  
  const [historie, setHistorie] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load data on mount
  useEffect(() => {
    loadBestand();
    loadWarnungen();
    loadAvailableItems();
  }, []);

  const loadBestand = async () => {
    try {
      const response = await fetch(`${API_URL}/lager/bestand`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBestand(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Bestands:', error);
      setMessage({ type: 'error', text: 'Fehler beim Laden des Bestands' });
    }
  };

  const loadWarnungen = async () => {
    try {
      const response = await fetch(`${API_URL}/lager/warnungen`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setWarnungen(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Warnungen:', error);
    }
  };

  const loadAvailableItems = async () => {
    try {
      const response = await fetch(`${API_URL}/lager/artikel`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableItems(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Artikel:', error);
    }
  };

  const handleInventur = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lager/inventur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(inventurForm)
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setInventurDialog(false);
        loadBestand();
        loadWarnungen();
        // Reset form
        setInventurForm({
          typ: 'rohseife',
          artikelId: '',
          menge: 0,
          einheit: 'kg',
          mindestbestand: 0,
          notizen: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Fehler bei Inventur:', error);
      setMessage({ type: 'error', text: 'Fehler bei Inventur' });
    } finally {
      setLoading(false);
    }
  };

  const handleProduktion = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lager/produktion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(produktionForm)
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `${data.message}\n\nRohstoffverbrauch:\n${data.data.rohstoffVerbrauch.map(r => 
            `- ${r.rohstoff}: ${r.menge} ${r.einheit} (Neuer Bestand: ${r.neuerBestand})`
          ).join('\n')}`
        });
        setProduktionDialog(false);
        loadBestand();
        loadWarnungen();
        // Reset form
        setProduktionForm({
          produktId: '',
          anzahl: 1
        });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Fehler bei Produktion:', error);
      setMessage({ type: 'error', text: 'Fehler bei Produktion' });
    } finally {
      setLoading(false);
    }
  };

  const handleKorrektur = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/lager/korrektur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(korrekturForm)
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setKorrekturDialog(false);
        loadBestand();
        loadWarnungen();
        // Reset form
        setKorrekturForm({
          bestandId: '',
          aenderung: 0,
          notizen: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Fehler bei Korrektur:', error);
      setMessage({ type: 'error', text: 'Fehler bei Korrektur' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistorie = async (bestandId) => {
    try {
      const response = await fetch(`${API_URL}/lager/historie/${bestandId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHistorie(data.data);
        setHistorieDialog(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error);
      setMessage({ type: 'error', text: 'Fehler beim Laden der Historie' });
    }
  };

  const getEinheitenFuerTyp = (typ) => {
    switch (typ) {
      case 'rohseife':
        return ['kg', 'g'];
      case 'duftoil':
        return ['ml', 'l'];
      case 'verpackung':
        return ['stück'];
      case 'produkt':
        return ['stück'];
      default:
        return ['stück'];
    }
  };

  const renderBestandsTabelle = (items, typ) => {
    if (!items || items.length === 0) {
      return (
        <Alert severity="info">
          Keine {typ === 'rohseifen' ? 'Rohseifen' : typ === 'duftoele' ? 'Duftöle' : typ === 'verpackungen' ? 'Verpackungen' : 'Produkte'} im Lager.
        </Alert>
      );
    }

    if (isMobile) {
      // Mobile Card View
      return (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item._id} sx={{ bgcolor: item.unterMindestbestand ? 'error.light' : 'background.paper' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">{item.name}</Typography>
                  
                  <Divider />
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Bestand:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {item.menge} {item.einheit}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Mindestbestand:</Typography>
                    <Typography variant="body2">
                      {item.mindestbestand} {item.einheit}
                    </Typography>
                  </Box>
                  
                  {item.unterMindestbestand && (
                    <Chip 
                      label="Unter Mindestbestand!" 
                      color="error" 
                      size="small" 
                      icon={<WarningIcon />}
                    />
                  )}
                  
                  {item.letzteAenderung && (
                    <Typography variant="caption" color="text.secondary">
                      Letzte Änderung: {new Date(item.letzteAenderung.datum).toLocaleDateString('de-DE')}
                      {' '}({item.letzteAenderung.grund})
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setKorrekturForm({
                          bestandId: item._id,
                          aenderung: 0,
                          notizen: ''
                        });
                        setKorrekturDialog(true);
                      }}
                    >
                      Korrigieren
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => loadHistorie(item._id)}
                    >
                      Historie
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      );
    }

    // Desktop Table View
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Artikel</TableCell>
              <TableCell align="right">Bestand</TableCell>
              <TableCell align="right">Mindestbestand</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Letzte Änderung</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item._id}
                sx={{ bgcolor: item.unterMindestbestand ? 'error.light' : 'inherit' }}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">
                  <strong>{item.menge} {item.einheit}</strong>
                </TableCell>
                <TableCell align="right">
                  {item.mindestbestand} {item.einheit}
                </TableCell>
                <TableCell>
                  {item.unterMindestbestand ? (
                    <Chip 
                      label="Unter Mindestbestand!" 
                      color="error" 
                      size="small" 
                      icon={<WarningIcon />}
                    />
                  ) : (
                    <Chip 
                      label="OK" 
                      color="success" 
                      size="small" 
                      icon={<CheckCircleIcon />}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.letzteAenderung && (
                    <Typography variant="caption">
                      {new Date(item.letzteAenderung.datum).toLocaleDateString('de-DE')}
                      <br />
                      {item.letzteAenderung.grund}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Bestand korrigieren">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setKorrekturForm({
                            bestandId: item._id,
                            aenderung: 0,
                            notizen: ''
                          });
                          setKorrekturDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Historie anzeigen">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => loadHistorie(item._id)}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h1">
          <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Lagerverwaltung
        </Typography>
        
        <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setInventurDialog(true)}
            fullWidth={isMobile}
          >
            Inventur
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ProductionIcon />}
            onClick={() => setProduktionDialog(true)}
            fullWidth={isMobile}
          >
            Produktion
          </Button>
        </Stack>
      </Box>

      {/* Messages */}
      {message.text && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage({ type: '', text: '' })}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {/* Warnungen */}
      {warnungen.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {warnungen.length} Artikel unter Mindestbestand!
          </Typography>
          <Stack spacing={0.5}>
            {warnungen.map((w) => (
              <Typography key={w._id} variant="body2">
                • {w.name}: {w.menge} {w.einheit} (Mindestbestand: {w.mindestbestand} {w.einheit}, 
                Fehlmenge: {w.differenz} {w.einheit})
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="Rohseifen" />
          <Tab label="Duftöle" />
          <Tab label="Verpackungen" />
          <Tab label="Fertigprodukte" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && renderBestandsTabelle(bestand.rohseifen, 'rohseifen')}
        {activeTab === 1 && renderBestandsTabelle(bestand.duftoele, 'duftoele')}
        {activeTab === 2 && renderBestandsTabelle(bestand.verpackungen, 'verpackungen')}
        {activeTab === 3 && renderBestandsTabelle(bestand.produkte, 'produkte')}
      </Box>

      {/* Inventur Dialog */}
      <Dialog 
        open={inventurDialog} 
        onClose={() => setInventurDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Inventur durchführen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={inventurForm.typ}
                label="Typ"
                onChange={(e) => {
                  setInventurForm({
                    ...inventurForm,
                    typ: e.target.value,
                    artikelId: '',
                    einheit: e.target.value === 'rohseife' ? 'kg' : 
                             e.target.value === 'duftoil' ? 'ml' : 'stück'
                  });
                }}
              >
                <MenuItem value="rohseife">Rohseife</MenuItem>
                <MenuItem value="duftoil">Duftöl</MenuItem>
                <MenuItem value="verpackung">Verpackung</MenuItem>
                <MenuItem value="produkt">Fertigprodukt</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Artikel</InputLabel>
              <Select
                value={inventurForm.artikelId}
                label="Artikel"
                onChange={(e) => setInventurForm({ ...inventurForm, artikelId: e.target.value })}
              >
                {inventurForm.typ === 'rohseife' && availableItems.rohseifen.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
                {inventurForm.typ === 'duftoil' && availableItems.duftoele.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
                {inventurForm.typ === 'verpackung' && availableItems.verpackungen.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
                {inventurForm.typ === 'produkt' && availableItems.produkte.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Menge"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.menge}
              onChange={(e) => setInventurForm({ ...inventurForm, menge: parseFloat(e.target.value) })}
            />

            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Einheit</InputLabel>
              <Select
                value={inventurForm.einheit}
                label="Einheit"
                onChange={(e) => setInventurForm({ ...inventurForm, einheit: e.target.value })}
              >
                {getEinheitenFuerTyp(inventurForm.typ).map(einheit => (
                  <MenuItem key={einheit} value={einheit}>{einheit}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Mindestbestand"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.mindestbestand}
              onChange={(e) => setInventurForm({ ...inventurForm, mindestbestand: parseFloat(e.target.value) })}
            />

            <TextField
              label="Notizen"
              multiline
              rows={3}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.notizen}
              onChange={(e) => setInventurForm({ ...inventurForm, notizen: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventurDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleInventur} 
            variant="contained"
            disabled={loading || !inventurForm.artikelId}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Produktions Dialog */}
      <Dialog 
        open={produktionDialog} 
        onClose={() => setProduktionDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Produktion verbuchen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Die benötigten Rohstoffe werden automatisch abgebucht und das Fertigprodukt eingebucht.
            </Alert>

            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Produkt</InputLabel>
              <Select
                value={produktionForm.produktId}
                label="Produkt"
                onChange={(e) => setProduktionForm({ ...produktionForm, produktId: e.target.value })}
              >
                {availableItems.produkte.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Anzahl"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={produktionForm.anzahl}
              onChange={(e) => setProduktionForm({ ...produktionForm, anzahl: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProduktionDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleProduktion} 
            variant="contained"
            color="secondary"
            disabled={loading || !produktionForm.produktId || produktionForm.anzahl < 1}
          >
            Produzieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Korrektur Dialog */}
      <Dialog 
        open={korrekturDialog} 
        onClose={() => setKorrekturDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bestand korrigieren</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Geben Sie eine positive Zahl ein um den Bestand zu erhöhen, oder eine negative um ihn zu verringern.
            </Alert>

            <TextField
              label="Änderung"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={korrekturForm.aenderung}
              onChange={(e) => setKorrekturForm({ ...korrekturForm, aenderung: parseFloat(e.target.value) })}
              helperText="Positive Zahl = Erhöhung, Negative Zahl = Verringerung"
            />

            <TextField
              label="Grund / Notizen"
              multiline
              rows={3}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={korrekturForm.notizen}
              onChange={(e) => setKorrekturForm({ ...korrekturForm, notizen: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKorrekturDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleKorrektur} 
            variant="contained"
            disabled={loading || korrekturForm.aenderung === 0}
          >
            Korrigieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Historie Dialog */}
      <Dialog 
        open={historieDialog} 
        onClose={() => setHistorieDialog(false)}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bewegungshistorie</DialogTitle>
        <DialogContent>
          {historie.length === 0 ? (
            <Alert severity="info">Keine Bewegungen vorhanden</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell align="right">Menge</TableCell>
                    <TableCell align="right">Bestand</TableCell>
                    <TableCell>Grund</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historie.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>
                        {new Date(h.createdAt).toLocaleString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={h.typ} 
                          size="small"
                          color={h.typ === 'eingang' ? 'success' : h.typ === 'ausgang' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          color={h.menge > 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {h.menge > 0 ? '+' : ''}{h.menge} {h.einheit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {h.bestandVorher} → {h.bestandNachher} {h.einheit}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{h.grund}</Typography>
                        {h.notizen && (
                          <Typography variant="caption" color="text.secondary">
                            {h.notizen}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistorieDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminLager;
