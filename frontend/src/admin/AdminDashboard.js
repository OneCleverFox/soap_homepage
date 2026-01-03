import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Build as ProductionIcon,
  Storefront as StoreIcon,
  LocalShipping as ShippingIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { dashboardAPI } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Farben für visuelle Unterscheidung
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State Management
  const [dashboardData, setDashboardData] = useState(null);
  const [produktionsKapazitaet, setProduktionsKapazitaet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [rohstoffFilter, setRohstoffFilter] = useState('alle'); // 'alle', 'rohseife', 'duftoil', 'verpackung'
  const [verkaufJahr, setVerkaufJahr] = useState(new Date().getFullYear()); // Jahr für Verkaufsfilter

  // Dashboard Data laden
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/dashboard/overview`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
        setLastRefresh(new Date());
        
        // Produktionskapazität parallel laden
        try {
          const produktionsResponse = await dashboardAPI.getProductionCapacity();
          setProduktionsKapazitaet(produktionsResponse.data);
        } catch (prodError) {
          console.warn('Produktionskapazität konnte nicht geladen werden:', prodError);
        }
      } else {
        throw new Error('Dashboard-Daten konnten nicht geladen werden');
      }
    } catch (error) {
      console.error('❌ Dashboard Load Error:', error);
      setError('Fehler beim Laden der Dashboard-Daten: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-Refresh alle 5 Minuten
    const interval = setInterval(loadDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Dashboard wird geladen...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadDashboardData}>
              <RefreshIcon sx={{ mr: 1 }} />
              Erneut versuchen
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">
          Keine Dashboard-Daten verfügbar
        </Alert>
      </Container>
    );
  }

  const {
    warnungen,
    produktion,
    verkauf,
    lager
  } = dashboardData;

  // Formatierung für Währung
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount || 0);
  };

  // KPI-Karten Daten
  const kpiCards = [
    {
      title: 'Fertigprodukte ohne Bestand',
      value: warnungen.fertigprodukteOhneBestand,
      icon: <WarningIcon />,
      color: warnungen.fertigprodukteOhneBestand > 0 ? 'error' : 'success',
      action: () => navigate('/admin/lager')
    },
    {
      title: 'Rohstoffe unter Mindestbestand',
      value: warnungen.rohstoffeUnterMindestbestand,
      icon: <InventoryIcon />,
      color: warnungen.rohstoffeUnterMindestbestand > 0 ? 'warning' : 'success',
      action: () => navigate('/admin/lager')
    },
    {
      title: 'Rechnungen (30 Tage)',
      value: verkauf.rechnungen?.rechnungenLetzter30Tage || 0,
      icon: <ShoppingCartIcon />,
      color: 'info',
      subtitle: formatCurrency(verkauf.rechnungen?.umsatzLetzter30Tage || 0),
      action: () => navigate('/admin/rechnungen')
    },
    {
      title: 'Offene Anfragen',
      value: verkauf.anfragen.offeneAnfragen,
      icon: <EmailIcon />,
      color: 'primary',
      action: () => navigate('/admin/anfragen')
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant={isMobile ? "h4" : "h3"} 
            component="h1" 
            sx={{ fontWeight: 'bold' }}
          >
            📊 Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Letzte Aktualisierung: {lastRefresh.toLocaleTimeString('de-DE')}
            </Typography>
            <Tooltip title="Dashboard aktualisieren">
              <IconButton onClick={loadDashboardData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography 
          variant="subtitle1" 
          color="text.secondary" 
          sx={{ mb: 3 }}
        >
          Wichtige Kennzahlen und Aktionen für Ihre administrative Tätigkeit
        </Typography>
      </Box>
      {/* KPI Übersicht */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                borderLeft: 6,
                borderLeftColor: `${kpi.color}.main`
              }}
              onClick={kpi.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    {kpi.title}
                  </Typography>
                  <Box sx={{ color: `${kpi.color}.main` }}>
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography variant={isMobile ? "h4" : "h3"} component="div" sx={{ fontWeight: 'bold', color: `${kpi.color}.main` }}>
                  {kpi.value}
                </Typography>
                {kpi.subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {kpi.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Haupt-Dashboard Grid */}
      <Grid container spacing={3}>
        
        {/* Kritische Warnungen */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
                Sofortiger Handlungsbedarf
              </Typography>
              
              {warnungen.fertigprodukteOhneBestand === 0 && warnungen.rohstoffeUnterMindestbestand === 0 ? (
                <Alert severity="success">
                  ✅ Alle Bestände sind ausreichend vorhanden
                </Alert>
              ) : (
                <Box>
                  {warnungen.fertigprodukteOhneBestand > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <strong>{warnungen.fertigprodukteOhneBestand} Fertigprodukte</strong> sind nicht auf Lager
                      <Button 
                        size="small" 
                        onClick={() => navigate('/admin/lager')}
                        sx={{ ml: 2 }}
                      >
                        Zur Lagerverwaltung
                      </Button>
                    </Alert>
                  )}
                  
                  {warnungen.rohstoffeUnterMindestbestand > 0 && (
                    <Alert severity="warning">
                      <strong>{warnungen.rohstoffeUnterMindestbestand} Rohstoffe</strong> sind unter Mindestbestand
                      <Button 
                        size="small" 
                        onClick={() => navigate('/admin/lager')}
                        sx={{ ml: 2 }}
                      >
                        Zu Rohstoffen
                      </Button>
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Lager-Übersicht */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <StoreIcon sx={{ mr: 1, color: 'info.main' }} />
                Lager-Übersicht
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {lager.fertigprodukte.gesamt}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Fertigprodukte gesamt
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {lager.fertigprodukte.aufLager}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Auf Lager
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Lagerstand: {Math.round((lager.fertigprodukte.aufLager / lager.fertigprodukte.gesamt) * 100)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(lager.fertigprodukte.aufLager / lager.fertigprodukte.gesamt) * 100} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Rohstoffe: {lager.rohstoffe.gesamtRohstoffe} ({lager.rohstoffe.unterMindestbestand} unter Mindestbestand)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Produktionskapazität */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ProductionIcon sx={{ mr: 1, color: 'primary.main' }} />
                Produktionskapazität
              </Typography>
              
              {produktionsKapazitaet ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {produktionsKapazitaet.zusammenfassung.uebersicht.produzierbar}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        Produzierbare Produkte
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                        von {produktionsKapazitaet.zusammenfassung.uebersicht.gesamtProdukte} gesamt
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {produktionsKapazitaet.zusammenfassung.kritischeProdukte.length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        Kritische Produkte
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                        ≤5 Stück produzierbar
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {produktionsKapazitaet.zusammenfassung.uebersicht.produktionsrate}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        Produktionsrate
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                        Anteil produzierbar
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {produktionsKapazitaet.zusammenfassung.topProduktion.length > 0 
                          ? produktionsKapazitaet.zusammenfassung.topProduktion[0].maxProduktion
                          : '0'
                        }
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        Höchste Kapazität
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                        {produktionsKapazitaet.zusammenfassung.topProduktion.length > 0
                          ? produktionsKapazitaet.zusammenfassung.topProduktion[0].name.split(' ').slice(0, 2).join(' ')
                          : 'Kein Produkt'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Limitierende Faktoren */}
                  {Object.keys(produktionsKapazitaet.zusammenfassung.limitierungen).length > 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <strong>Hauptlimitierung:</strong> {
                          Object.entries(produktionsKapazitaet.zusammenfassung.limitierungen)
                            .sort(([,a], [,b]) => b - a)[0][0] === 'rohseife' ? 'Rohseife' :
                          Object.entries(produktionsKapazitaet.zusammenfassung.limitierungen)
                            .sort(([,a], [,b]) => b - a)[0][0] === 'duftoel' ? 'Duftöle' : 'Verpackungen'
                        } ({Object.entries(produktionsKapazitaet.zusammenfassung.limitierungen)
                            .sort(([,a], [,b]) => b - a)[0][1]} Produkte betroffen)
                        <Button 
                          size="small" 
                          onClick={() => navigate('/admin/produktionsanalyse')}
                          sx={{ ml: 2 }}
                        >
                          Details anzeigen
                        </Button>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Alert severity="info">
                  Produktionskapazität wird geladen...
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Rechnungen & Anfragen */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
                Rechnungen & Anfragen
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {verkauf.rechnungen?.gesamtRechnungen || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rechnungen gesamt
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {verkauf.rechnungen?.rechnungenLetzter30Tage || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rechnungen (30 Tage)
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(verkauf.rechnungen?.umsatzLetzter30Tage || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Umsatz (30 Tage)
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {verkauf.rechnungen?.nachStatus?.find(s => s._id === 'paid')?.anzahl || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bezahlte Rechnungen
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({formatCurrency(verkauf.rechnungen?.nachStatus?.find(s => s._id === 'paid')?.gesamtwert || 0)})
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Produkt</strong></TableCell>
                      <TableCell align="center"><strong>Aktueller Bestand</strong></TableCell>
                      <TableCell align="center"><strong>Verkäufe (90T)</strong></TableCell>
                      <TableCell align="center"><strong>Reichweite (Tage)</strong></TableCell>
                      <TableCell align="center"><strong>Priorität</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produktion.produkteZurProduktion.map((product, index) => (
                      <TableRow key={product._id || index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {product.produktName || product.portfolio?.name || 'Unbekannt'}
                          </Typography>
                          {product.portfolio?.seife && (
                            <Typography variant="caption" color="text.secondary">
                              {product.portfolio.seife} • {product.portfolio.aroma}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={product.aktuellerBestand}
                            color={product.aktuellerBestand <= product.mindestbestand ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">{product.verkaufteMenge90Tage}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={product.voraussichtlicheReichweite > 999 ? '∞' : `${product.voraussichtlicheReichweite}d`}
                            color={product.voraussichtlicheReichweite < 30 ? 'error' : product.voraussichtlicheReichweite < 60 ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {product.prioritaetsScore}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(product.prioritaetsScore * 2, 100)} 
                              sx={{ width: 40, height: 4 }}
                              color={product.prioritaetsScore > 20 ? 'error' : product.prioritaetsScore > 10 ? 'warning' : 'info'}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Meistverkaufte Produkte Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                  Meistverkaufte Produkte
                </Typography>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Jahr</InputLabel>
                  <Select
                    value={verkaufJahr}
                    label="Jahr"
                    onChange={(e) => setVerkaufJahr(e.target.value)}
                  >
                    <MenuItem value={2025}>2025</MenuItem>
                    <MenuItem value={2026}>2026</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {verkauf.meistverkaufte && verkauf.meistverkaufte.filter(p => p.jahr === verkaufJahr).length > 0 ? (
                <Box>
                  {verkauf.meistverkaufte.filter(p => p.jahr === verkaufJahr).slice(0, 5).map((produkt, index) => (
                    <Box key={produkt.produktName} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 2, 
                      mb: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 2,
                      borderLeft: `4px solid ${COLORS[index % COLORS.length]}`
                    }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {produkt.produktName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Verkäufe: {produkt.verkaufteMenge} Stück
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {formatCurrency(produkt.verkaufsWert)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          aus {produkt.anzahlRechnungen} Rechnungen
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  Keine Verkaufsdaten für {verkaufJahr} verfügbar
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Produktionspriorität */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ProductionIcon sx={{ mr: 1, color: 'warning.main' }} />
                Produkte zur Produktion (Top 10)
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Basierend auf Bestand und Verkaufshäufigkeit der letzten 90 Tage
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Produkt</strong></TableCell>
                      <TableCell align="center"><strong>Aktueller Bestand</strong></TableCell>
                      <TableCell align="center"><strong>Verkäufe (90T)</strong></TableCell>
                      <TableCell align="center"><strong>Reichweite (Tage)</strong></TableCell>
                      <TableCell align="center"><strong>Priorität</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produktion.produkteZurProduktion.map((product, index) => (
                      <TableRow key={product._id || index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {product.produktName || product.portfolio?.name || 'Unbekannt'}
                          </Typography>
                          {product.portfolio?.seife && (
                            <Typography variant="caption" color="text.secondary">
                              {product.portfolio.seife} • {product.portfolio.aroma}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={product.aktuellerBestand}
                            color={product.aktuellerBestand <= product.mindestbestand ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">{product.verkaufteMenge90Tage}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={product.voraussichtlicheReichweite > 999 ? '∞' : `${product.voraussichtlicheReichweite}d`}
                            color={product.voraussichtlicheReichweite < 30 ? 'error' : product.voraussichtlicheReichweite < 60 ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {product.prioritaetsScore}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(product.prioritaetsScore * 2, 100)} 
                              sx={{ width: 40, height: 4 }}
                              color={product.prioritaetsScore > 20 ? 'error' : product.prioritaetsScore > 10 ? 'warning' : 'info'}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Rohstoff-Status */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <InventoryIcon sx={{ mr: 1, color: 'secondary.main' }} />
                  Rohstoff-Status
                </Typography>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={rohstoffFilter}
                    label="Filter"
                    onChange={(e) => setRohstoffFilter(e.target.value)}
                  >
                    <MenuItem value="alle">Alle</MenuItem>
                    <MenuItem value="rohseife">Rohseife</MenuItem>
                    <MenuItem value="duftoil">Duftöle</MenuItem>
                    <MenuItem value="verpackung">Verpackung</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {(() => {
                const gefilterte = produktion.rohstoffeBenoetigt?.filter(rohstoff => 
                  rohstoffFilter === 'alle' || rohstoff.typ === rohstoffFilter
                ) || [];
                
                return gefilterte.length > 0 ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {rohstoffFilter === 'alle' 
                        ? `Alle Rohstoffe unter Mindestbestand: ${gefilterte.length}`
                        : `${rohstoffFilter === 'duftoil' ? 'Duftöle' : rohstoffFilter === 'rohseife' ? 'Rohseifen' : 'Verpackungen'} unter Mindestbestand: ${gefilterte.length}`
                      }
                    </Typography>
                    
                    {gefilterte.map((rohstoff, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {rohstoff.bezeichnung || 'Unbekannt'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rohstoff.typ} • Aktuell: {rohstoff.menge} {rohstoff.einheit} • 
                          Mindest: {rohstoff.mindestbestand} {rohstoff.einheit} • 
                          Fehlen: {rohstoff.differenz} {rohstoff.einheit}
                        </Typography>
                      </Box>
                    ))}
                    
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => navigate('/admin/lager')}
                      sx={{ mt: 1 }}
                    >
                      Rohstoffe verwalten
                    </Button>
                  </Box>
                ) : (
                  <Alert severity="success">
                    {rohstoffFilter === 'alle' 
                      ? '✅ Alle Rohstoffe sind ausreichend vorhanden'
                      : `✅ Alle ${rohstoffFilter === 'duftoil' ? 'Duftöle' : rohstoffFilter === 'rohseife' ? 'Rohseifen' : 'Verpackungen'} sind ausreichend vorhanden`
                    }
                  </Alert>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        {/* Fertigprodukte mit niedrigstem Bestand */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ProductionIcon sx={{ mr: 1, color: 'primary.main' }} />
                Produktionspriorität
              </Typography>
              
              {produktion.fertigprodukteNiedrigerBestand && produktion.fertigprodukteNiedrigerBestand.length > 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Top 3 Fertigprodukte mit niedrigstem Bestand:
                  </Typography>
                  
                  {produktion.fertigprodukteNiedrigerBestand.map((produkt, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        #{index + 1} {produkt.name}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {produkt.seife} • {produkt.aroma} • {produkt.gramm}g
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        🏭 Bestand: {produkt.aktuelleMenge} Stück • Mindest: {produkt.mindestbestand} Stück
                        {produkt.istNiedrig && ' • ⚠️ Niedrig'}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => navigate('/admin/portfolio')}
                    sx={{ mt: 1 }}
                  >
                    Zur Produktion
                  </Button>
                </Box>
              ) : (
                <Alert severity="info">
                  📊 Alle Fertigprodukte haben ausreichend Bestand
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schnellzugriff Aktionen */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <AnalyticsIcon sx={{ mr: 1, color: 'info.main' }} />
                Schnellzugriff
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/admin/portfolio')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Neues Produkt erstellen
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/admin/bestellungen')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Bestellungen verwalten
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/admin/anfragen')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Anfragen bearbeiten
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/admin/lager')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Rohstoff bestellen
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;