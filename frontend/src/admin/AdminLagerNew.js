import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Stack,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const AdminLager = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false); // Neuer State für Speichern-Loading
  
  // Dialog States
  const [inventurDialog, setInventurDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form States
  const [inventurForm, setInventurForm] = useState({
    typ: '',
    artikelId: '',
    neuerBestand: '',
    notizen: '',
    aktuellerBestand: 0,
    einheit: '',
    produktDetails: {
      name: '',
      beschreibung: '',
      preis: 0,
      mindestbestand: 0,
      verfuegbar: true,
      zusatzinfo: {}
    }
  });
  
  const [historie, setHistorie] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Data states für alle Produkttypen
  const [data, setData] = useState({
    fertigprodukte: [],
    rohseifen: [],
    duftoele: [],
    verpackungen: []
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Auth-Header für API-Aufrufe
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Alle Daten laden
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const endpoints = [
        { key: 'fertigprodukte', url: '/portfolio' },
        { key: 'rohseifen', url: '/rohseife?includeUnavailable=true' },
        { key: 'duftoele', url: '/duftoele?includeUnavailable=true' },
        { key: 'verpackungen', url: '/verpackungen?includeUnavailable=true' }
      ];

      const promises = endpoints.map(endpoint =>
        fetch(`${API_BASE}${endpoint.url}`, {
          headers: getAuthHeaders()
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      
      const newData = {};
      endpoints.forEach((endpoint, index) => {
        const result = results[index];
        if (result.success) {
          newData[endpoint.key] = result.data;
        } else {
          console.error(`Fehler beim Laden von ${endpoint.key}:`, result.message);
          newData[endpoint.key] = [];
        }
      });

      setData(newData);
    } catch (error) {
      console.error('Fehler beim Laden der Lagerdaten:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Inventur-Dialog öffnen
  const openInventurDialog = (item, typ) => {
    console.log('📋 Inventur für:', item);
    console.log('🔍 Debug - Item Eigenschaften:', {
      verfuegbareMenge: item.verfuegbareMenge,
      aktuellVorrat: item.aktuellVorrat,
      menge: item.menge,
      bestand: item.bestand,
      alle_eigenschaften: Object.keys(item)
    });
    setSelectedItem(item);
    
    // Ermittle die richtige Maßeinheit basierend auf dem Produkttyp
    let einheit = '';
    let aktuellerBestand = 0;
    
    switch (typ) {
      case 'fertigprodukte':
        einheit = 'Stück';
        aktuellerBestand = item.verfuegbareMenge || 0;
        break;
      case 'rohseifen':
        einheit = 'g (Gramm)';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      case 'duftoele':
        einheit = 'ml (Milliliter)';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      case 'verpackungen':
        einheit = 'Stück';
        aktuellerBestand = item.aktuellVorrat || 0;
        break;
      default:
        einheit = 'Einheiten';
        aktuellerBestand = item.verfuegbareMenge || item.aktuellVorrat || 0;
    }
    
    setInventurForm({
      typ: typ === 'fertigprodukte' ? 'fertigprodukt' : typ.slice(0, -1),
      artikelId: item._id,
      neuerBestand: aktuellerBestand.toString(),
      notizen: '',
      aktuellerBestand: aktuellerBestand,
      einheit: einheit,
      produktDetails: {
        name: item.name || item.bezeichnung,
        beschreibung: item.beschreibung || item.aroma || item.seife || '',
        preis: item.preis || item.preis_pro_kg || item.preis_pro_ml || item.preis_pro_stueck || 0,
        mindestbestand: item.mindestbestand || 0,
        verfuegbar: item.aktiv !== undefined ? item.aktiv : item.verfuegbar,
        zusatzinfo: getZusatzinfo(item, typ)
      }
    });
    setInventurDialog(true);
  };

  // Hilfsfunktion für zusätzliche Produktinformationen
  const getZusatzinfo = (item, typ) => {
    switch (typ) {
      case 'fertigprodukte':
        return {
          seife: item.seife || '',
          aroma: item.aroma || '',
          gramm: item.gramm || '',
          reihenfolge: item.reihenfolge || ''
        };
      case 'rohseifen':
      case 'duftoele':
      case 'verpackungen':
        return {
          kategorie: item.kategorie || '',
          lieferant: item.lieferant || '',
          chargenNr: item.chargenNr || ''
        };
      default:
        return {};
    }
  };

  // Historie-Dialog öffnen
  const openHistoryDialog = async (item, typ) => {
    setSelectedItem(item);
    setHistoryLoading(true);
    setHistoryDialog(true);
    
    try {
      const response = await fetch(`${API_BASE}/lager/bewegungen/${item._id}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        setHistorie(result.data || []);
      } else {
        console.error('Fehler beim Laden der Historie');
        setHistorie([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error);
      setHistorie([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Inventur speichern
  const saveInventur = async () => {
    if (saving) return; // Verhindere Doppel-Speichern
    
    try {
      setSaving(true);
      const payload = {
        typ: inventurForm.typ,
        artikelId: inventurForm.artikelId,
        neuerBestand: parseFloat(inventurForm.neuerBestand),
        notizen: inventurForm.notizen
      };

      // Optimistisches Update: UI sofort aktualisieren
      const optimisticUpdate = () => {
        const newBestandValue = parseFloat(inventurForm.neuerBestand);
        const artikelId = inventurForm.artikelId;
        const produktTyp = inventurForm.typ === 'fertigprodukt' ? 'fertigprodukte' : `${inventurForm.typ}${inventurForm.typ.endsWith('e') ? '' : 'e'}`;
        
        setData(prevData => ({
          ...prevData,
          [produktTyp]: prevData[produktTyp].map(item => {
            if (item._id === artikelId) {
              return {
                ...item,
                verfuegbareMenge: newBestandValue,
                aktuellVorrat: newBestandValue
              };
            }
            return item;
          })
        }));
      };

      // UI sofort aktualisieren
      optimisticUpdate();
      setInventurDialog(false);
      
      // Kurzes visuelles Feedback für sofortige Bestätigung
      toast.loading('Inventur wird gespeichert...', { 
        id: 'inventur-save',
        duration: 2000 
      });

      const response = await fetch(`${API_BASE}/lager/inventur-new`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Erfolg: Daten sind bereits optimistisch aktualisiert
        toast.success('Inventur erfolgreich gespeichert!', { id: 'inventur-save' });
        
        // Wenn der Historie-Dialog für das gleiche Item offen ist, aktualisiere die Historie
        if (historyDialog && selectedItem && selectedItem._id === inventurForm.artikelId) {
          await openHistoryDialog(selectedItem, currentTab.key);
        }
      } else {
        // Fehler: Rollback der optimistischen Änderungen
        await loadAllData();
        const error = await response.json();
        toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'), { id: 'inventur-save' });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Inventur:', error);
      toast.error('Fehler beim Speichern der Inventur', { id: 'inventur-save' });
      // Bei Netzwerkfehler: Daten neu laden für Konsistenz
      await loadAllData();
    } finally {
      setSaving(false);
    }
  };

  // Filter-Funktion für Suche
  const filterItems = (items, searchTerm) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      (item.bezeichnung || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.beschreibung || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.seife || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.aroma || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Status-Chip-Komponente
  const StatusChip = ({ isActive, productType = 'fertigprodukt' }) => {
    if (productType === 'fertigprodukt') {
      return isActive ? (
        <Chip
          icon={<CheckCircleIcon />}
          label="Aktiv"
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          icon={<CancelIcon />}
          label="Inaktiv"
          color="error"
          size="small"
          variant="outlined"
        />
      );
    } else {
      // Für Rohstoffe, Duftöle, Verpackungen
      return isActive ? (
        <Chip
          icon={<VisibilityIcon />}
          label="Verfügbar"
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          icon={<VisibilityOffIcon />}
          label="Nicht verfügbar"
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }
  };

  // Tab-Inhalte definieren
  const tabs = [
    {
      label: 'Fertigprodukte',
      key: 'fertigprodukte',
      icon: '🧼',
      columns: [
        { key: 'bilder', label: 'Bild', width: '80px' },
        { key: 'name', label: 'Produktname', width: '200px' },
        { key: 'seife', label: 'Seife', width: '120px' },
        { key: 'aroma', label: 'Aroma', width: '120px' },
        { key: 'gramm', label: 'Gewicht', width: '80px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis', label: 'Preis', width: '80px' },
        { key: 'aktiv', label: 'Status', width: '100px' },
        { key: 'reihenfolge', label: 'Reihenfolge', width: '80px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Rohseifen',
      key: 'rohseifen',
      icon: '🥥',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_kg', label: 'Preis/kg', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Duftöle',
      key: 'duftoele',
      icon: '🌸',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_ml', label: 'Preis/ml', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    },
    {
      label: 'Verpackungen',
      key: 'verpackungen',
      icon: '📦',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', width: '200px' },
        { key: 'beschreibung', label: 'Beschreibung', width: '300px' },
        { key: 'bestand', label: 'Bestand', width: '100px' },
        { key: 'preis_pro_stueck', label: 'Preis/Stück', width: '100px' },
        { key: 'verfuegbar', label: 'Status', width: '120px' },
        { key: 'mindestbestand', label: 'Mindestbestand', width: '120px' },
        { key: 'actions', label: 'Aktionen', width: '120px' }
      ]
    }
  ];

  const currentTab = tabs[activeTab];
  const currentData = filterItems(data[currentTab.key] || [], searchTerm);

  // Render-Funktionen für verschiedene Zellentypen
  const renderCell = (item, column) => {
    switch (column.key) {
      case 'bilder':
        return (
          <Avatar
            src={item.bilder?.hauptbild}
            sx={{ width: 50, height: 50 }}
            variant="rounded"
          >
            {item.name?.[0] || '?'}
          </Avatar>
        );
      
      case 'aktiv':
        return <StatusChip isActive={item.aktiv} productType="fertigprodukt" />;
      
      case 'verfuegbar':
        return <StatusChip isActive={item.verfuegbar} productType="rohstoff" />;
      
      case 'preis':
        return item.preis ? `€${item.preis.toFixed(2)}` : '-';
      
      case 'preis_pro_kg':
        return item.preis_pro_kg ? `€${item.preis_pro_kg.toFixed(2)}` : '-';
      
      case 'preis_pro_ml':
        return item.preis_pro_ml ? `€${item.preis_pro_ml.toFixed(2)}` : '-';
      
      case 'preis_pro_stueck':
        return item.preis_pro_stueck ? `€${item.preis_pro_stueck.toFixed(2)}` : '-';
      
      case 'gramm':
        return item.gramm ? `${item.gramm}g` : '-';
      
      case 'bestand':
        // Je nach Produkttyp verschiedene Bestandsfelder und Einheiten anzeigen
        if (currentTab.key === 'fertigprodukte') {
          const bestand = item.verfuegbareMenge || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand} Stück
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'rohseifen') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand}g
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'duftoele') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand}ml
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        } else if (currentTab.key === 'verpackungen') {
          const bestand = item.aktuellVorrat || 0;
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: bestand <= (item.mindestbestand || 0) ? 'error.main' : 'text.primary',
              fontWeight: bestand <= (item.mindestbestand || 0) ? 'bold' : 'normal'
            }}>
              {bestand} Stück
              {bestand <= (item.mindestbestand || 0) && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 0.5, 
                    fontSize: '12px',
                    color: 'error.main'
                  }}
                >
                  ⚠️
                </Box>
              )}
            </Box>
          );
        }
        return '-';
      
      case 'mindestbestand':
        return item.mindestbestand || '-';
      
      case 'reihenfolge':
        return item.reihenfolge || '-';
      
      case 'actions':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Inventur">
              <IconButton
                size="small"
                color="primary"
                onClick={() => openInventurDialog(item, currentTab.key)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Historie">
              <IconButton
                size="small"
                color="secondary"
                onClick={() => openHistoryDialog(item, currentTab.key)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      
      case 'beschreibung':
        if (typeof item.beschreibung === 'object' && item.beschreibung !== null) {
          return item.beschreibung.kurz || item.beschreibung.lang || '-';
        }
        return item.beschreibung || '-';
      
      default:
        const value = item[column.key];
        if (typeof value === 'object' && value !== null) {
          // Für Objekte versuchen wir einen String-Wert zu finden
          if (value.kurz) return value.kurz;
          if (value.lang) return value.lang;
          if (value.name) return value.name;
          if (value.titel) return value.titel;
          return JSON.stringify(value);
        }
        return value || '-';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <InventoryIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Lagerverwaltung
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadAllData}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </Box>

      {/* Info-Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Hier sehen Sie alle Ihre Produkte aus der MongoDB. Fertigprodukte mit "Aktiv" (grün) 
            sind für Kunden im Frontend sichtbar. "Inaktiv" (rot) bedeutet nicht sichtbar für Kunden.
          </Alert>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body1">
              <strong>Gesamt:</strong>
            </Typography>
            {tabs.map((tab, index) => (
              <Chip
                key={tab.key}
                label={`${tab.icon} ${tab.label}: ${data[tab.key]?.length || 0}`}
                variant={activeTab === index ? "filled" : "outlined"}
                color={activeTab === index ? "primary" : "default"}
                size="small"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <Chip
                    label={data[tab.key]?.length || 0}
                    size="small"
                    color={activeTab === index ? "primary" : "default"}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Suchfeld */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder={`Suche in ${currentTab.label}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {currentTab.columns.map((column) => {
                  // Definiere welche Spalten auf mobilen Geräten ausgeblendet werden sollen
                  const hiddenOnMobile = ['beschreibung', 'preis_pro_kg', 'preis_pro_ml', 'preis_pro_stueck', 'reihenfolge', 'mindestbestand'];
                  const isHiddenOnMobile = hiddenOnMobile.includes(column.key);
                  
                  return (
                    <TableCell
                      key={column.key}
                      sx={{ 
                        width: column.width,
                        fontWeight: 'bold',
                        backgroundColor: 'grey.50',
                        display: isMobile && isHiddenOnMobile ? 'none' : 'table-cell'
                      }}
                    >
                      {column.label}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={currentTab.columns.length} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : currentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currentTab.columns.length} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ p: 3 }}>
                      {searchTerm ? 
                        `Keine ${currentTab.label} gefunden, die "${searchTerm}" entsprechen.` :
                        `Keine ${currentTab.label} vorhanden.`
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((item, index) => (
                  <TableRow
                    key={item._id || index}
                    hover
                    sx={{ 
                      '&:hover': { backgroundColor: 'grey.50' },
                      opacity: (currentTab.key === 'fertigprodukte' && !item.aktiv) || 
                              (currentTab.key !== 'fertigprodukte' && !item.verfuegbar) ? 0.6 : 1
                    }}
                  >
                    {currentTab.columns.map((column) => {
                      // Gleiche Logik wie bei den Headern
                      const hiddenOnMobile = ['beschreibung', 'preis_pro_kg', 'preis_pro_ml', 'preis_pro_stueck', 'reihenfolge', 'mindestbestand'];
                      const isHiddenOnMobile = hiddenOnMobile.includes(column.key);
                      
                      return (
                        <TableCell 
                          key={column.key}
                          sx={{
                            display: isMobile && isHiddenOnMobile ? 'none' : 'table-cell'
                          }}
                        >
                          {renderCell(item, column)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Footer Info */}
      {!loading && currentData.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 
              `${currentData.length} von ${data[currentTab.key]?.length || 0} ${currentTab.label} angezeigt` :
              `${currentData.length} ${currentTab.label} angezeigt`
            }
          </Typography>
          
          {currentTab.key === 'fertigprodukte' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Aktiv: ${currentData.filter(item => item.aktiv).length}`}
                color="success"
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<CancelIcon />}
                label={`Inaktiv: ${currentData.filter(item => !item.aktiv).length}`}
                color="error"
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Inventur Dialog */}
      <Dialog 
        open={inventurDialog} 
        onClose={() => setInventurDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            Inventur für {inventurForm.produktDetails?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Produktinformationen */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Produktinformationen
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Produktname:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {inventurForm.produktDetails?.name || '-'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Status:
                      </Typography>
                      <StatusChip 
                        isActive={inventurForm.produktDetails?.verfuegbar} 
                        productType={inventurForm.typ === 'fertigprodukt' ? 'fertigprodukt' : 'rohstoff'} 
                      />
                    </Box>
                  </Box>

                  {inventurForm.produktDetails?.beschreibung && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Beschreibung:
                      </Typography>
                      <Typography variant="body1">
                        {typeof inventurForm.produktDetails.beschreibung === 'object' 
                          ? (inventurForm.produktDetails.beschreibung.kurz || inventurForm.produktDetails.beschreibung.lang || '-')
                          : inventurForm.produktDetails.beschreibung
                        }
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Preis:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        €{inventurForm.produktDetails?.preis?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Mindestbestand:
                      </Typography>
                      <Typography variant="body1">
                        {inventurForm.produktDetails?.mindestbestand || 0} {inventurForm.einheit}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Maßeinheit:
                      </Typography>
                      <Chip 
                        label={inventurForm.einheit} 
                        color="info" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {/* Zusätzliche Produktspezifische Informationen */}
                  {inventurForm.typ === 'fertigprodukt' && inventurForm.produktDetails?.zusatzinfo && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                      {inventurForm.produktDetails.zusatzinfo.seife && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Seife:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.seife}</Typography>
                        </Box>
                      )}
                      {inventurForm.produktDetails.zusatzinfo.aroma && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Aroma:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.aroma}</Typography>
                        </Box>
                      )}
                      {inventurForm.produktDetails.zusatzinfo.gramm && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Gewicht:</Typography>
                          <Typography variant="body1">{inventurForm.produktDetails.zusatzinfo.gramm}g</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Bestandsinformationen */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  📦 Bestandsinformationen
                </Typography>
                
                <Alert 
                  severity={inventurForm.aktuellerBestand <= (inventurForm.produktDetails?.mindestbestand || 0) ? "warning" : "info"}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body1">
                    <strong>Aktueller Bestand:</strong> {inventurForm.aktuellerBestand} {inventurForm.einheit}
                  </Typography>
                  {inventurForm.aktuellerBestand <= (inventurForm.produktDetails?.mindestbestand || 0) && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      ⚠️ Bestand ist unter dem Mindestbestand von {inventurForm.produktDetails?.mindestbestand || 0} {inventurForm.einheit}
                    </Typography>
                  )}
                </Alert>

                <TextField
                  label={`Neuer Bestand (${inventurForm.einheit})`}
                  type="number"
                  fullWidth
                  value={inventurForm.neuerBestand}
                  onChange={(e) => setInventurForm({
                    ...inventurForm,
                    neuerBestand: e.target.value
                  })}
                  inputProps={{ 
                    min: 0, 
                    step: inventurForm.typ === 'fertigprodukt' || inventurForm.typ === 'verpackungen' ? 1 : 0.1 
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip label={inventurForm.einheit} size="small" />
                      </InputAdornment>
                    ),
                  }}
                  helperText={`Geben Sie den korrekten Bestand in ${inventurForm.einheit} ein`}
                />

                {/* Änderungsvorschau */}
                {inventurForm.neuerBestand && parseFloat(inventurForm.neuerBestand) !== inventurForm.aktuellerBestand && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      📊 Bestandsänderung:
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body1">
                        {inventurForm.aktuellerBestand} {inventurForm.einheit}
                      </Typography>
                      <Typography variant="body1">→</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {inventurForm.neuerBestand} {inventurForm.einheit}
                      </Typography>
                      <Chip
                        label={`${parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand > 0 ? '+' : ''}${(parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand).toFixed(1)} ${inventurForm.einheit}`}
                        color={parseFloat(inventurForm.neuerBestand) - inventurForm.aktuellerBestand > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* Notizen */}
            <TextField
              label="Notizen zur Inventur"
              multiline
              rows={3}
              fullWidth
              value={inventurForm.notizen}
              onChange={(e) => setInventurForm({
                ...inventurForm,
                notizen: e.target.value
              })}
              placeholder="Grund für Bestandsänderung, Bemerkungen, etc..."
              helperText="Optional: Dokumentieren Sie den Grund für diese Bestandsänderung"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setInventurDialog(false)} 
            startIcon={<CloseIcon />}
            size="large"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={saveInventur} 
            variant="contained" 
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={saving || !inventurForm.neuerBestand || inventurForm.neuerBestand === inventurForm.aktuellerBestand.toString()}
            size="large"
          >
            {saving ? 'Speichern...' : 'Inventur speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Historie Dialog */}
      <Dialog 
        open={historyDialog} 
        onClose={() => setHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            Bestandshistorie für {selectedItem?.bezeichnung || selectedItem?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : historie.length === 0 ? (
            <Alert severity="info">
              Keine Bestandsbewegungen gefunden.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell>Aktion</TableCell>
                    <TableCell align="right">Vorher</TableCell>
                    <TableCell align="right">Nachher</TableCell>
                    <TableCell align="right">Änderung</TableCell>
                    <TableCell>Notizen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historie.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(entry.datum).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{entry.aktion}</TableCell>
                      <TableCell align="right">{entry.vorherBestand}</TableCell>
                      <TableCell align="right">{entry.nachherBestand}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${entry.aenderung > 0 ? '+' : ''}${entry.aenderung}`}
                          color={entry.aenderung > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{entry.notizen || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminLager;