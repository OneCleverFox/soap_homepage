import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
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
  CheckCircle as CheckCircleIcon
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
    menge: '',
    einheit: 'g',
    mindestbestand: '',
    notizen: ''
  });
  
  const [produktionForm, setProduktionForm] = useState({
    produktId: '',
    anzahl: ''
  });
  
  const [korrekturForm, setKorrekturForm] = useState({
    typ: 'rohseife',
    artikelId: '',
    menge: '',
    aktion: 'hinzufuegen', // 'hinzufuegen' oder 'entnehmen'
    notizen: '',
    aktuellerBestand: 0, // Für Anzeige
    mindestbestand: 0 // Für Farb-Logik
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
      const token = localStorage.getItem('token');
      console.log('🔐 Token vorhanden:', !!token);
      console.log('🔐 Token (first 20 chars):', token?.substring(0, 20));
      
      const response = await fetch(`${API_URL}/lager/bestand`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 Response Status:', response.status);
      const data = await response.json();
      console.log('📦 Bestand API Response:', data);
      
      if (data.success) {
        console.log('✅ Setting bestand:', data.data);
        console.log('   Rohseifen:', data.data.rohseifen?.length);
        console.log('   Duftöle:', data.data.duftoele?.length);
        console.log('   Verpackungen:', data.data.verpackungen?.length);
        console.log('   Produkte:', data.data.produkte?.length);
        setBestand(data.data);
      } else {
        console.error('❌ API returned error:', data.message);
        setMessage({ type: 'error', text: data.message || 'Fehler beim Laden des Bestands' });
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
      // Konvertiere Strings zu Zahlen
      const payload = {
        ...inventurForm,
        menge: Number(inventurForm.menge) || 0,
        mindestbestand: Number(inventurForm.mindestbestand) || 0
      };
      
      const response = await fetch(`${API_URL}/lager/inventur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
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
          menge: '',
          einheit: 'g',
          mindestbestand: '',
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
      // Konvertiere String zu Zahl
      const payload = {
        ...produktionForm,
        anzahl: Number(produktionForm.anzahl) || 0
      };
      
      const response = await fetch(`${API_URL}/lager/produktion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        // Rohstoffverbrauch anzeigen (falls vorhanden)
        const rohstoffInfo = data.data?.verwendeteRohstoffe && data.data.verwendeteRohstoffe.length > 0
          ? `\n\nVerwendete Rohstoffe:\n${data.data.verwendeteRohstoffe.map(r => 
              `- ${r.name}: ${r.menge} ${r.einheit} (Neuer Bestand: ${r.neuerBestand})`
            ).join('\n')}`
          : '';
        
        setMessage({ 
          type: 'success', 
          text: `${data.message}${rohstoffInfo}`
        });
        
        // REACTIVE UPDATE: Aktualisiere Produkt-Bestand direkt in UI
        const produzierteAnzahl = Number(produktionForm.anzahl) || 0;
        setBestand(prevBestand => ({
          ...prevBestand,
          produkte: prevBestand.produkte.map(p => 
            p.artikelId === produktionForm.produktId
              ? { ...p, menge: p.menge + produzierteAnzahl }
              : p
          )
        }));
        
        setProduktionDialog(false); // Dialog schließen
        loadBestand(); // Hintergrund-Reload für Datenkonsistenz
        loadWarnungen();
        
        // Reset form mit leerem Wert
        setProduktionForm({
          produktId: '',
          anzahl: ''
        });
      } else {
        // Zeige auch die detaillierten Fehler an
        const fehlerText = data.fehler && data.fehler.length > 0
          ? `${data.message}\n\nFehler:\n${data.fehler.map(f => `• ${f}`).join('\n')}`
          : data.message;
        setMessage({ type: 'error', text: fehlerText });
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
      // Berechne die Änderung basierend auf Aktion
      const menge = Number(korrekturForm.menge) || 0;
      const aenderung = korrekturForm.aktion === 'hinzufuegen' 
        ? menge 
        : -menge;
      
      const response = await fetch(`${API_URL}/lager/korrektur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          typ: korrekturForm.typ,
          artikelId: korrekturForm.artikelId,
          aenderung: aenderung,
          notizen: korrekturForm.notizen
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setKorrekturDialog(false);
        loadBestand();
        loadWarnungen();
        // Reset form
        setKorrekturForm({
          typ: 'rohseife',
          artikelId: '',
          menge: '',
          aktion: 'hinzufuegen',
          notizen: '',
          aktuellerBestand: 0,
          mindestbestand: 0
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
                          typ: item.typ,
                          // Für Produkte verwenden wir die Bestand-ID (_id), für andere die artikelId
                          artikelId: item.typ === 'produkt' ? item._id : item.artikelId,
                          menge: 0,
                          aktion: 'hinzufuegen',
                          notizen: '',
                          aktuellerBestand: item.menge,
                          mindestbestand: item.mindestbestand || 0
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
                            typ: item.typ,
                            artikelId: item.artikelId,
                            menge: 0,
                            aktion: 'hinzufuegen',
                            notizen: '',
                            aktuellerBestand: item.menge,
                            mindestbestand: item.mindestbestand || 0
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
          <Alert severity="info" sx={{ mb: 2 }}>
            Bei der Inventur wird der <strong>tatsächlich gezählte Bestand</strong> eingetragen. 
            Der aktuelle Bestand wird auf diese Menge gesetzt.
          </Alert>
          
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
                    einheit: e.target.value === 'rohseife' ? 'g' : 
                             e.target.value === 'duftoil' ? 'tropfen' : 
                             e.target.value === 'verpackung' ? 'Stück' : 'Stück'
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
                {inventurForm.typ === 'rohseife' && availableItems.rohseifen?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Aktuell: {item.vorrat}g)
                  </MenuItem>
                ))}
                {inventurForm.typ === 'duftoil' && availableItems.duftoele?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Aktuell: {item.vorrat} Tropfen)
                  </MenuItem>
                ))}
                {inventurForm.typ === 'verpackung' && availableItems.verpackungen?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Aktuell: {item.vorrat} Stück)
                  </MenuItem>
                ))}
                {inventurForm.typ === 'produkt' && availableItems.produkte?.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Gezählte Menge (absoluter Bestand)"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.menge}
              onChange={(e) => setInventurForm({ ...inventurForm, menge: e.target.value })}
              helperText={`Trage hier die tatsächlich gezählte Menge in ${inventurForm.einheit} ein`}
            />

            <TextField
              label="Einheit"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.einheit}
              disabled
              InputProps={{
                readOnly: true,
              }}
            />

            <TextField
              label="Mindestbestand (optional)"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={inventurForm.mindestbestand}
              onChange={(e) => setInventurForm({ ...inventurForm, mindestbestand: e.target.value })}
              helperText="Wenn gesetzt, erscheint eine Warnung bei Unterschreitung"
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
            Bestand aktualisieren
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
            <Alert severity="info">
              Tragen Sie die <strong>Menge</strong> ein und wählen Sie, ob Sie diese hinzufügen oder entnehmen möchten.
            </Alert>

            {korrekturForm.aktuellerBestand >= 0 && korrekturForm.artikelId && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: korrekturForm.aktuellerBestand < korrekturForm.mindestbestand 
                    ? 'warning.light' 
                    : 'grey.100',
                  color: korrekturForm.aktuellerBestand < korrekturForm.mindestbestand 
                    ? 'warning.contrastText' 
                    : 'text.primary',
                  borderRadius: 1,
                  border: korrekturForm.aktuellerBestand < korrekturForm.mindestbestand 
                    ? '2px solid' 
                    : '1px solid',
                  borderColor: korrekturForm.aktuellerBestand < korrekturForm.mindestbestand 
                    ? 'warning.main' 
                    : 'grey.300'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Aktueller Bestand:
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {korrekturForm.aktuellerBestand} {
                        korrekturForm.typ === 'rohseife' ? 'g' :
                        korrekturForm.typ === 'duftoil' ? 'Tropfen' :
                        korrekturForm.typ === 'verpackung' ? 'Stück' :
                        'Stück'
                      }
                    </Typography>
                  </Box>
                  {korrekturForm.aktuellerBestand < korrekturForm.mindestbestand && (
                    <Chip 
                      label="Unter Mindestbestand!" 
                      color="warning" 
                      size="small" 
                      icon={<WarningIcon />}
                    />
                  )}
                </Stack>
              </Paper>
            )}

            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={korrekturForm.typ}
                label="Typ"
                onChange={(e) => {
                  setKorrekturForm({
                    ...korrekturForm,
                    typ: e.target.value,
                    artikelId: '',
                    aktuellerBestand: 0,
                    mindestbestand: 0
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
                value={korrekturForm.artikelId}
                label="Artikel"
                onChange={(e) => {
                  const selectedItem = korrekturForm.typ === 'rohseife' ? availableItems.rohseifen?.find(i => i.id === e.target.value) :
                                      korrekturForm.typ === 'duftoil' ? availableItems.duftoele?.find(i => i.id === e.target.value) :
                                      korrekturForm.typ === 'verpackung' ? availableItems.verpackungen?.find(i => i.id === e.target.value) :
                                      availableItems.produkte?.find(i => i.id === e.target.value);
                  
                  setKorrekturForm({ 
                    ...korrekturForm, 
                    artikelId: e.target.value,
                    aktuellerBestand: selectedItem?.vorrat || 0,
                    mindestbestand: selectedItem?.mindestbestand || 0
                  });
                }}
              >
                {korrekturForm.typ === 'rohseife' && availableItems.rohseifen?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Vorrat: {item.vorrat}g)
                  </MenuItem>
                ))}
                {korrekturForm.typ === 'duftoil' && availableItems.duftoele?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Vorrat: {item.vorrat} Tropfen)
                  </MenuItem>
                ))}
                {korrekturForm.typ === 'verpackung' && availableItems.verpackungen?.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (Vorrat: {item.vorrat} Stück)
                  </MenuItem>
                ))}
                {korrekturForm.typ === 'produkt' && availableItems.produkte?.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Menge"
              type="number"
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={korrekturForm.menge}
              onChange={(e) => setKorrekturForm({ ...korrekturForm, menge: Math.abs(parseFloat(e.target.value) || 0) })}
              helperText="Geben Sie nur die Menge ein (immer positiv)"
              inputProps={{ min: 0, step: 1 }}
            />

            <TextField
              label="Grund / Notizen"
              multiline
              rows={3}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
              value={korrekturForm.notizen}
              onChange={(e) => setKorrekturForm({ ...korrekturForm, notizen: e.target.value })}
              placeholder="z.B. Inventur-Korrektur, Beschädigung, Retoure..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button 
            onClick={() => setKorrekturDialog(false)}
            variant="outlined"
            sx={{ borderColor: 'grey.400', color: 'grey.700' }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={() => {
              setKorrekturForm({ ...korrekturForm, aktion: 'hinzufuegen' });
              setTimeout(handleKorrektur, 0);
            }}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={loading || !korrekturForm.artikelId || korrekturForm.menge <= 0}
            sx={{
              bgcolor: '#22C55E !important',
              color: 'white !important',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
              '&:hover': {
                bgcolor: '#16A34A !important',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
              },
              '&:disabled': {
                bgcolor: 'rgba(34, 197, 94, 0.3) !important',
                color: 'rgba(255, 255, 255, 0.5) !important'
              }
            }}
          >
            Hinzufügen
          </Button>
          <Button 
            onClick={() => {
              setKorrekturForm({ ...korrekturForm, aktion: 'entnehmen' });
              setTimeout(handleKorrektur, 0);
            }}
            variant="contained"
            startIcon={<EditIcon />}
            disabled={loading || !korrekturForm.artikelId || korrekturForm.menge <= 0}
            sx={{
              bgcolor: '#EF4444 !important',
              color: 'white !important',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              '&:hover': {
                bgcolor: '#DC2626 !important',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
              },
              '&:disabled': {
                bgcolor: 'rgba(239, 68, 68, 0.3) !important',
                color: 'rgba(255, 255, 255, 0.5) !important'
              }
            }}
          >
            Entnehmen
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
