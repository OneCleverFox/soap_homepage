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
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Production as ProductionIcon,
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  LocalShipping as ShippingIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Farben für Charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State Management
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
      <Container maxWidth=\"xl\" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant=\"h6\" sx={{ mt: 2 }}>
          Dashboard wird geladen...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth=\"xl\" sx={{ py: 4 }}>
        <Alert 
          severity=\"error\" 
          action={
            <Button color=\"inherit\" size=\"small\" onClick={loadDashboardData}>
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
      <Container maxWidth=\"xl\" sx={{ py: 4 }}>
        <Alert severity=\"info\">
          Keine Dashboard-Daten verfügbar
        </Alert>
      </Container>
    );
  }

  const {
    warnungen,
    produktion,
    verkauf,
    lager,
    overview
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
      action: () => navigate('/admin/rohstoffe')
    },
    {
      title: 'Bestellungen (30 Tage)',
      value: verkauf.bestellungen.bestellungenLetzter30Tage,
      icon: <ShoppingCartIcon />,
      color: 'info',
      subtitle: formatCurrency(verkauf.bestellungen.umsatzLetzter30Tage),
      action: () => navigate('/admin/bestellungen')
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
    <Container maxWidth=\"xl\" sx={{ py: isMobile ? 2 : 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant={isMobile ? \"h4\" : \"h3\"} 
            component=\"h1\" 
            sx={{ fontWeight: 'bold' }}
          >
            📊 Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant=\"body2\" color=\"text.secondary\">
              Letzte Aktualisierung: {lastRefresh.toLocaleTimeString('de-DE')}
            </Typography>
            <Tooltip title=\"Dashboard aktualisieren\">
              <IconButton onClick={loadDashboardData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography 
          variant=\"subtitle1\" 
          color=\"text.secondary\" 
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
                  <Typography color=\"text.secondary\" gutterBottom variant=\"body2\">
                    {kpi.title}
                  </Typography>
                  <Box sx={{ color: `${kpi.color}.main` }}>
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography variant={isMobile ? \"h4\" : \"h3\"} component=\"div\" sx={{ fontWeight: 'bold', color: `${kpi.color}.main` }}>
                  {kpi.value}
                </Typography>
                {kpi.subtitle && (
                  <Typography variant=\"body2\" color=\"text.secondary\">
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
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
                Sofortiger Handlungsbedarf
              </Typography>
              
              {warnungen.fertigprodukteOhneBestand === 0 && warnungen.rohstoffeUnterMindestbestand === 0 ? (
                <Alert severity=\"success\">
                  ✅ Alle Bestände sind ausreichend vorhanden
                </Alert>
              ) : (
                <Box>
                  {warnungen.fertigprodukteOhneBestand > 0 && (
                    <Alert severity=\"error\" sx={{ mb: 2 }}>
                      <strong>{warnungen.fertigprodukteOhneBestand} Fertigprodukte</strong> sind nicht auf Lager
                      <Button 
                        size=\"small\" 
                        onClick={() => navigate('/admin/lager')}
                        sx={{ ml: 2 }}
                      >
                        Zur Lagerverwaltung
                      </Button>
                    </Alert>
                  )}
                  
                  {warnungen.rohstoffeUnterMindestbestand > 0 && (
                    <Alert severity=\"warning\">
                      <strong>{warnungen.rohstoffeUnterMindestbestand} Rohstoffe</strong> sind unter Mindestbestand
                      <Button 
                        size=\"small\" 
                        onClick={() => navigate('/admin/rohstoffe')}
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
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <StoreIcon sx={{ mr: 1, color: 'info.main' }} />
                Lager-Übersicht
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <Typography variant=\"h4\" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {lager.fertigprodukte.gesamt}
                    </Typography>
                    <Typography variant=\"body2\" sx={{ color: 'white' }}>
                      Fertigprodukte gesamt
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant=\"h4\" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {lager.fertigprodukte.aufLager}
                    </Typography>
                    <Typography variant=\"body2\" sx={{ color: 'white' }}>
                      Auf Lager
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 1 }}>
                      Lagerstand: {Math.round((lager.fertigprodukte.aufLager / lager.fertigprodukte.gesamt) * 100)}%
                    </Typography>
                    <LinearProgress 
                      variant=\"determinate\" 
                      value={(lager.fertigprodukte.aufLager / lager.fertigprodukte.gesamt) * 100} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 1 }}>
                Rohstoffe: {lager.rohstoffe.gesamtRohstoffe} ({lager.rohstoffe.unterMindestbestand} unter Mindestbestand)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Produktionspriorität */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ProductionIcon sx={{ mr: 1, color: 'warning.main' }} />
                Produkte zur Produktion (Top 10)
              </Typography>
              
              <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 2 }}>
                Basierend auf Bestand und Verkaufshäufigkeit der letzten 90 Tage
              </Typography>
              
              <TableContainer component={Paper} variant=\"outlined\">
                <Table size=\"small\">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Produkt</strong></TableCell>
                      <TableCell align=\"center\"><strong>Aktueller Bestand</strong></TableCell>
                      <TableCell align=\"center\"><strong>Verkäufe (90T)</strong></TableCell>
                      <TableCell align=\"center\"><strong>Reichweite (Tage)</strong></TableCell>
                      <TableCell align=\"center\"><strong>Priorität</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produktion.produkteZurProduktion.map((product, index) => (
                      <TableRow key={product._id || index}>
                        <TableCell>
                          <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
                            {product.produktName || product.portfolio?.name || 'Unbekannt'}
                          </Typography>
                          {product.portfolio?.seife && (
                            <Typography variant=\"caption\" color=\"text.secondary\">
                              {product.portfolio.seife} • {product.portfolio.aroma}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align=\"center\">
                          <Chip 
                            label={product.aktuellerBestand}
                            color={product.aktuellerBestand <= product.mindestbestand ? 'error' : 'default'}
                            size=\"small\"
                          />
                        </TableCell>
                        <TableCell align=\"center\">{product.verkaufteMenge90Tage}</TableCell>
                        <TableCell align=\"center\">
                          <Chip 
                            label={product.voraussichtlicheReichweite > 999 ? '∞' : `${product.voraussichtlicheReichweite}d`}
                            color={product.voraussichtlicheReichweite < 30 ? 'error' : product.voraussichtlicheReichweite < 60 ? 'warning' : 'success'}
                            size=\"small\"
                          />
                        </TableCell>
                        <TableCell align=\"center\">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant=\"body2\" sx={{ mr: 1 }}>
                              {product.prioritaetsScore}
                            </Typography>
                            <LinearProgress 
                              variant=\"determinate\" 
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
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                Meistverkaufte Produkte
              </Typography>
              
              {verkauf.meistverkaufte && verkauf.meistverkaufte.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width=\"100%\" height=\"100%\">
                    <PieChart>
                      <Pie
                        data={verkauf.meistverkaufte.slice(0, 5)}
                        dataKey=\"verkaufteMenge\"
                        nameKey=\"produktName\"
                        cx=\"50%\"
                        cy=\"50%\"
                        outerRadius={80}
                        fill=\"#8884d8\"
                        label={({ produktName, verkaufteMenge }) => `${produktName}: ${verkaufteMenge}`}
                      >
                        {verkauf.meistverkaufte.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Alert severity=\"info\">
                  Keine Verkaufsdaten verfügbar
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bestellungsstatistiken */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
                Bestellungen & Anfragen
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant=\"h5\" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {verkauf.bestellungen.gesamtBestellungen}
                    </Typography>
                    <Typography variant=\"body2\" color=\"text.secondary\">
                      Bestellungen gesamt
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Typography variant=\"h5\" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(verkauf.bestellungen.umsatzLetzter30Tage)}
                    </Typography>
                    <Typography variant=\"body2\" color=\"text.secondary\">
                      Umsatz (30 Tage)
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 1 }}>
                    Bestellstatus-Verteilung:
                  </Typography>
                  {verkauf.bestellungen.nachStatus && verkauf.bestellungen.nachStatus.map((status, index) => (
                    <Box key={status._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip 
                        label={status._id || 'Unbekannt'} 
                        size=\"small\" 
                        color={status._id === 'completed' ? 'success' : status._id === 'pending' ? 'warning' : 'default'}
                      />
                      <Typography variant=\"body2\">
                        {status.anzahl} ({formatCurrency(status.gesamtwert)})
                      </Typography>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Rohstoff-Status */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <InventoryIcon sx={{ mr: 1, color: 'secondary.main' }} />
                Rohstoff-Status
              </Typography>
              
              {produktion.rohstoffeBenoetigt && produktion.rohstoffeBenoetigt.length > 0 ? (
                <Box>
                  <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mb: 2 }}>
                    Kritische Rohstoffe (unter Mindestbestand):
                  </Typography>
                  
                  {produktion.rohstoffeBenoetigt.map((rohstoff, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                      <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
                        {rohstoff.artikel?.bezeichnung || 'Unbekannt'}
                      </Typography>
                      <Typography variant=\"caption\" color=\"text.secondary\">
                        {rohstoff.typ} • Aktuell: {rohstoff.menge} {rohstoff.einheit} • 
                        Mindest: {rohstoff.mindestbestand} {rohstoff.einheit} • 
                        Fehlen: {rohstoff.differenz} {rohstoff.einheit}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Button 
                    variant=\"contained\" 
                    size=\"small\"
                    onClick={() => navigate('/admin/rohstoffe')}
                    sx={{ mt: 1 }}
                  >
                    Rohstoffe verwalten
                  </Button>
                </Box>
              ) : (
                <Alert severity=\"success\">
                  ✅ Alle Rohstoffe sind ausreichend vorhanden
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schnellzugriff Aktionen */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <AnalyticsIcon sx={{ mr: 1, color: 'info.main' }} />
                Schnellzugriff
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant=\"outlined\" 
                    fullWidth 
                    onClick={() => navigate('/admin/portfolio')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
                        Neues Produkt erstellen
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant=\"outlined\" 
                    fullWidth 
                    onClick={() => navigate('/admin/bestellungen')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
                        Bestellungen verwalten
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant=\"outlined\" 
                    fullWidth 
                    onClick={() => navigate('/admin/anfragen')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
                        Anfragen bearbeiten
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant=\"outlined\" 
                    fullWidth 
                    onClick={() => navigate('/admin/rohstoffe')}
                    sx={{ p: 2, height: '100%' }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant=\"body2\" sx={{ fontWeight: 'bold' }}>
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