import React, { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Fade
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
  Analytics as AnalyticsIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { dashboardAPI } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Farben für visuelle Unterscheidung
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// ⚡ SKELETON COMPONENT für KPI Cards
const KpiCardSkeleton = () => (
  <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'grey.300' }}>
    <CardContent sx={{ py: 2, px: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Skeleton variant="text" width="70%" height={24} />
          <Skeleton variant="circular" width={32} height={32} />
        </Box>
        <Skeleton variant="text" width="40%" height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} />
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 🛡️ REACT STRICT MODE GUARD - Verhindert doppelte API-Calls
  const hasLoadedRef = useRef(false);
  const timeoutsRef = useRef([]);

  // ⚡ PROGRESSIVE LOADING STATE - Separate states für jede Datenquelle
  const [kpiData, setKpiData] = useState(null);
  const [anfrageData, setAnfrageData] = useState(null);
  const [bestellungData, setBestellungData] = useState(null);
  const [produktionsKapazitaet, setProduktionsKapazitaet] = useState(null);
  const [verkaufData, setVerkaufData] = useState(null);
  const [rohstoffData, setRohstoffData] = useState(null);
  const [lagerData, setLagerData] = useState(null);
  
  // Loading states für jede Section
  const [kpiLoading, setKpiLoading] = useState(true);
  const [anfrageLoading, setAnfrageLoading] = useState(true);
  const [bestellungLoading, setBestellungLoading] = useState(true);
  const [produktionLoading, setProduktionLoading] = useState(true);
  const [verkaufLoading, setVerkaufLoading] = useState(true);
  const [rohstoffLoading, setRohstoffLoading] = useState(true);
  const [lagerLoading, setLagerLoading] = useState(true);
  
  // Legacy states für Kompatibilität
  const [produktionsFilter, setProduktionsFilter] = useState('alle');
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [rohstoffFilter, setRohstoffFilter] = useState('alle');
  const [verkaufJahr, setVerkaufJahr] = useState(new Date().getFullYear());
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [produktionInfoOpen, setProduktionInfoOpen] = useState(false);

  // ⚡ PROGRESSIVE DATA LOADING - EINER API-Call, progressive UI-Updates
  const loadDashboardDataProgressive = async () => {
    const token = localStorage.getItem('token');
    const overallStart = performance.now();
    
    console.log('🚀 Dashboard-Laden gestartet...');
    
    try {
      setError(null);
      
      // 📡 API-CALL: Haupt-Dashboard-Daten laden (ein Request für alles außer Produktion)
      const apiStart = performance.now();
      const response = await axios.get(`${API_BASE}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.success) {
        throw new Error('Backend returned success=false');
      }
      
      const data = response.data.data;
      const apiDuration = Math.round(performance.now() - apiStart);
      console.log(`📡 Backend-Response erhalten (${apiDuration}ms) - starte progressive UI-Updates...`);
      
      // ⚡ PHASE 1: KPI Cards nach 100ms anzeigen (damit User sofort was sieht)
      timeoutsRef.current.push(setTimeout(() => {
        const phaseStart = performance.now();
        
        setKpiData({
          warnungen: data.warnungen,
          verkauf: {
            rechnungen: data.verkauf?.rechnungen,
            anfragen: data.verkauf?.anfragen,
            bestellungen: data.verkauf?.bestellungen
          }
        });
        setKpiLoading(false);
        
        const phaseDuration = Math.round(performance.now() - phaseStart);
        console.log(`✅ Phase 1 (${phaseDuration}ms): KPI Cards sichtbar`);
      }, 100));
      
      // ⚡ PHASE 2: Anfragen & Bestellungen nach 500ms (progressive Anzeige)
      timeoutsRef.current.push(setTimeout(() => {
        const phase2Start = performance.now();
        
        setAnfrageData(data.verkauf?.anfragen || null);
        setAnfrageLoading(false);
        
        setBestellungData(data.verkauf?.bestellungen || null);
        setBestellungLoading(false);
        
        const phase2Duration = Math.round(performance.now() - phase2Start);
        console.log(`✅ Phase 2 (${phase2Duration}ms): Anfragen & Bestellungen sichtbar`);
      }, 500));
      
      // ⚡ PHASE 3: Produktionskapazität separat laden (900ms nach Overview-Response)
      timeoutsRef.current.push(setTimeout(async () => {
        const phase3Start = performance.now();
        try {
          const prodResponse = await dashboardAPI.getProductionCapacity();
          setProduktionsKapazitaet(prodResponse.data?.data || null);
          setProduktionLoading(false);
          
          const phase3Duration = Math.round(performance.now() - phase3Start);
          console.log(`✅ Phase 3 (${phase3Duration}ms): Produktionskapazität sichtbar`);
        } catch (prodError) {
          console.warn('⚠️ Produktionskapazität konnte nicht geladen werden:', prodError);
          setProduktionsKapazitaet(null);
          setProduktionLoading(false);
        }
      }, 900));
      
      // ⚡ PHASE 4: Verkauf, Rohstoffe, Lager nach 1300ms (alles stufenweise)
      timeoutsRef.current.push(setTimeout(() => {
        const phase4Start = performance.now();
        
        setVerkaufData({
          meistverkaufte: data.verkauf?.meistverkaufte || [],
          rechnungen: data.verkauf?.rechnungen || {}
        });
        setVerkaufLoading(false);
        
        setRohstoffData({
          rohstoffeBenoetigt: data.produktion?.rohstoffeBenoetigt || [],
          produkteZurProduktion: data.produktion?.produkteZurProduktion || []
        });
        setRohstoffLoading(false);
        
        setLagerData({
          fertigprodukte: data.lager?.fertigprodukte || { gesamt: 0, aufLager: 0 },
          rohstoffe: data.lager?.rohstoffe || { gesamtRohstoffe: 0, unterMindestbestand: 0 }
        });
        setLagerLoading(false);
        
        const phase4Duration = Math.round(performance.now() - phase4Start);
        const totalDuration = Math.round(performance.now() - overallStart);
        console.log(`✅ Phase 4 (${phase4Duration}ms): Verkauf, Rohstoffe, Lager sichtbar`);
        console.log(`🎉 Dashboard komplett! Gesamt: ${totalDuration}ms (Backend: ${apiDuration}ms)`);
      }, 1300));
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('❌ Dashboard Load Error:', error);
      setError('Fehler beim Laden der Dashboard-Daten: ' + (error.response?.data?.message || error.message));
      
      // Bei Fehler alle Loading-Flags zurücksetzen
      setKpiLoading(false);
      setAnfrageLoading(false);
      setBestellungLoading(false);
      setProduktionLoading(false);
      setVerkaufLoading(false);
      setRohstoffLoading(false);
      setLagerLoading(false);
    }
  };

  useEffect(() => {
    // 🛡️ STRICT MODE GUARD - Verhindert doppelte Aufrufe
    if (hasLoadedRef.current) {
      console.log('⏭️ useEffect bereits ausgeführt - überspringe Reload (Strict Mode)');
      return;
    }
    hasLoadedRef.current = true;
    
    console.log('🚀 Dashboard wird geladen...');
    loadDashboardDataProgressive();
    
    // Auto-Refresh alle 5 Minuten
    const interval = setInterval(() => {
      console.log('🔄 Auto-Refresh Dashboard...');
      loadDashboardDataProgressive();
    }, 300000);
    
    return () => {
      console.log('🧹 Dashboard cleanup...');
      clearInterval(interval);
      // Cleanup pending timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, []);

  // Hilfsfunktion für intelligente Farblogik
  const getCardColor = (title, value) => {
    switch (title) {
      case 'Fertigprodukte ohne Bestand':
        return value > 0 ? 'error' : 'success';
      
      case 'Rohstoffe unter Mindestbestand':
        if (value > 5) return 'error';
        if (value > 0) return 'warning';
        return 'success';
      
      case 'Zu verpacken':
        if (value > 5) return 'error';
        if (value > 0) return 'warning';
        return 'success';
      
      case 'Anfragen zur Genehmigung':
        if (value > 10) return 'error';
        if (value > 0) return 'warning';
        return 'success';
      
      case 'Zu bestätigen':
        if (value > 5) return 'error';
        if (value > 0) return 'warning';
        return 'success';
      
      case 'Zu versenden':
        if (value > 3) return 'error';
        if (value > 0) return 'info';
        return 'success';
      
      case 'Neue Bestellungen':
        if (value > 10) return 'warning';
        if (value > 0) return 'info';
        return 'success';
        
      case 'Überfällige Rechnungen':
        if (value > 5) return 'error';
        if (value > 0) return 'warning';
        return 'success';
      
      default:
        return value > 0 ? 'warning' : 'success';
    }
  };

  // ⚡ KPI-Karten Daten - Nutzt kpiData statt dashboardData
  const kpiCards = kpiData ? [
    {
      title: 'Fertigprodukte ohne Bestand',
      value: kpiData.warnungen?.fertigprodukteOhneBestand || 0,
      icon: <WarningIcon />,
      color: getCardColor('Fertigprodukte ohne Bestand', kpiData.warnungen?.fertigprodukteOhneBestand || 0),
      action: () => navigate('/admin/lager')
    },
    {
      title: 'Rohstoffe unter Mindestbestand',
      value: kpiData.warnungen?.rohstoffeUnterMindestbestand || 0,
      icon: <InventoryIcon />,
      color: getCardColor('Rohstoffe unter Mindestbestand', kpiData.warnungen?.rohstoffeUnterMindestbestand || 0),
      action: () => navigate('/admin/lager')
    },
    {
      title: 'Überfällige Rechnungen',
      value: kpiData.verkauf?.rechnungen?.overdue || 0,
      icon: <WarningIcon />,
      color: getCardColor('Überfällige Rechnungen', kpiData.verkauf?.rechnungen?.overdue || 0),
      subtitle: (kpiData.verkauf?.rechnungen?.overdue || 0) > 0 ? 'Mahnung erforderlich' : undefined,
      action: () => navigate('/admin/invoice-list?status=overdue')
    },
    {
      title: 'Anfragen zur Genehmigung',
      value: kpiData.verkauf?.anfragen?.benoetigtGenehmigung?.length || 0,
      icon: <EmailIcon />,
      color: getCardColor('Anfragen zur Genehmigung', kpiData.verkauf?.anfragen?.benoetigtGenehmigung?.length || 0),
      subtitle: (kpiData.verkauf?.anfragen?.benoetigtGenehmigung?.length || 0) > 0 ? 'Handlung erforderlich' : undefined,
      action: () => navigate('/admin/anfragen')
    },
    {
      title: 'Neue Bestellungen',
      value: kpiData.verkauf?.bestellungen?.nachStatus?.find(s => s._id === 'neu')?.count || 0,
      icon: <ShoppingCartIcon />,
      color: getCardColor('Neue Bestellungen', kpiData.verkauf?.bestellungen?.nachStatus?.find(s => s._id === 'neu')?.count || 0),
      action: () => navigate('/admin/bestellungen?status=neu')
    },
    {
      title: 'Zu bestätigen',
      value: kpiData.verkauf?.bestellungen?.zuBestaetigen?.length || 0,
      icon: <ShoppingCartIcon />,
      color: getCardColor('Zu bestätigen', kpiData.verkauf?.bestellungen?.zuBestaetigen?.length || 0),
      subtitle: (kpiData.verkauf?.bestellungen?.zuBestaetigen?.length || 0) > 0 ? 'Aus Anfragen - zur Bestätigung' : undefined,
      action: () => navigate('/admin/bestellungen?status=neu')
    },
    {
      title: 'Zu verpacken',
      value: kpiData.verkauf?.bestellungen?.zuVerpacken?.length || 0,
      icon: <InventoryIcon />,
      color: getCardColor('Zu verpacken', kpiData.verkauf?.bestellungen?.zuVerpacken?.length || 0),
      subtitle: (kpiData.verkauf?.bestellungen?.zuVerpacken?.length || 0) > 0 ? 'Bezahlt - bereit zum Verpacken' : undefined,
      action: () => navigate('/admin/bestellungen?status=bezahlt')
    },
    {
      title: 'Zu versenden',
      value: kpiData.verkauf?.bestellungen?.zuVersenden?.length || 0,
      icon: <ShippingIcon />,
      color: getCardColor('Zu versenden', kpiData.verkauf?.bestellungen?.zuVersenden?.length || 0),
      action: () => navigate('/admin/bestellungen?status=verpackt')
    }
  ] : [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount || 0);
  };

  // Produktionskapazitäts-Filter
  const getFilteredProdukte = () => {
    if (!produktionsKapazitaet || !produktionsKapazitaet.produkte) return [];
    
    const alleProdukte = [...produktionsKapazitaet.produkte].sort((a, b) => b.maxProduktion - a.maxProduktion);
    
    switch (produktionsFilter) {
      case 'werkstuck':
        return alleProdukte.filter(p => p.kategorie === 'werkstuck');
      case 'seife':
        return alleProdukte.filter(p => p.kategorie === 'seife');
      case 'kritisch':
        return alleProdukte.filter(p => p.maxProduktion > 0 && p.maxProduktion <= 5);
      case 'alle':
      default:
        return alleProdukte.slice(0, 20); // Top 20 alle Kategorien
    }
  };

  const getFilterTitle = () => {
    switch (produktionsFilter) {
      case 'werkstuck':
        return '🏺 Werkstücke - Produktionskapazität:';
      case 'seife':
        return '🧴 Seifen - Produktionskapazität:';
      case 'kritisch':
        return '⚠️ Kritische Produkte (≤5 Stück):';
      case 'alle':
      default:
        return '📦 Alle Produkte - Produktionskapazität (Top 20):';
    }
  };

  // ⚠️ ERROR HANDLING - Zeige Fehler falls vorhanden
  if (error && !kpiData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadDashboardDataProgressive}>
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


  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 1 : 2 }}>
      {/* Header */}
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
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
            <Tooltip title={kpiLoading ? "Dashboard wird geladen..." : "Dashboard aktualisieren"}>
              <span>
                <IconButton onClick={loadDashboardDataProgressive} disabled={kpiLoading}>
                  <RefreshIcon />
                </IconButton>
              </span>
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
      
      {/* ⚡ KPI Übersicht - Mit Progressive Loading */}
      <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 4 }}>
        {/* Zeige IMMER 8 Slots - entweder Skeleton oder Daten */}
        {Array.from({ length: 8 }).map((_, index) => (
          <Grid item xs={6} sm={6} md={3} key={index}>
            {kpiLoading ? (
              // 🔲 SKELETON: Zeige Skelette während Daten laden
              <KpiCardSkeleton />
            ) : kpiCards[index] ? (
              // ✅ DATEN: Zeige echte KPI Cards mit Fade-In Animation
              <Fade in={true} timeout={300} style={{ transitionDelay: `${index * 50}ms` }}>
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
                    borderLeftColor: `${kpiCards[index].color}.main`
                  }}
                  onClick={kpiCards[index].action}
                >
                  <CardContent sx={{ 
                    py: isMobile ? 1.5 : 2, 
                    px: isMobile ? 1.5 : 2,
                    '&:last-child': { pb: isMobile ? 1.5 : 2 }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'row' : 'column',
                      alignItems: isMobile ? 'center' : 'flex-start',
                      justifyContent: isMobile ? 'space-between' : 'flex-start',
                      height: '100%'
                    }}>
                      {/* Title und Icon Container */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'center', 
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        width: isMobile ? 'auto' : '100%',
                        mb: isMobile ? 0 : 1
                      }}>
                        <Typography 
                          color="text.secondary" 
                          gutterBottom={!isMobile} 
                          variant={isMobile ? "caption" : "body2"}
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : undefined,
                            lineHeight: isMobile ? 1.2 : undefined,
                            mb: isMobile ? 0.5 : 0
                          }}
                        >
                          {kpiCards[index].title}
                        </Typography>
                        {!isMobile && (
                          <Box sx={{ color: `${kpiCards[index].color}.main` }}>
                            {kpiCards[index].icon}
                          </Box>
                        )}
                      </Box>
                      
                      {/* Value - rechts auf Mobile, unter Title auf Desktop */}
                      <Box sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMobile ? 'flex-end' : 'flex-start'
                      }}>
                        <Typography 
                          variant={isMobile ? "h4" : "h2"} 
                          component="div" 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: `${kpiCards[index].color}.main`,
                            fontSize: isMobile ? '2rem' : '3rem',
                            lineHeight: 1.1
                          }}
                        >
                          {kpiCards[index].value}
                        </Typography>
                        {kpiCards[index].subtitle && (
                          <Typography 
                            variant={isMobile ? "caption" : "body2"} 
                            color="text.secondary"
                            sx={{ 
                              fontSize: isMobile ? '0.7rem' : undefined,
                              textAlign: isMobile ? 'right' : 'left',
                              mt: isMobile ? 0.25 : 0
                            }}
                          >
                            {kpiCards[index].subtitle}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            ) : null}
          </Grid>
        ))}
      </Grid>

      {/* ⚡ Handlungsbedarf Sektion - Nur bei Bedarf anzeigen */}
      {(anfrageData?.benoetigtGenehmigung?.length > 0 || 
        bestellungData?.zuBestaetigen?.length > 0 || 
        bestellungData?.zuVersenden?.length > 0 || 
        anfrageLoading || bestellungLoading) && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          
          {/* Anfragen zur Genehmigung - nur bei Daten anzeigen */}
          {(anfrageLoading || anfrageData?.benoetigtGenehmigung?.length > 0) && (
            <Grid item xs={12} md={6}>
          {anfrageLoading ? (
            <Card sx={{ height: 400, borderLeft: 6, borderLeftColor: 'grey.300' }}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1, mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              </CardContent>
            </Card>
          ) : anfrageData?.benoetigtGenehmigung && anfrageData.benoetigtGenehmigung.length > 0 ? (
            <Fade in={true} timeout={500}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'warning.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: 'warning.main' }} />
                    Anfragen zur Genehmigung ({anfrageData.benoetigtGenehmigung.length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {anfrageData.benoetigtGenehmigung.map((inquiry) => (
                      <Card key={inquiry._id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {inquiry.inquiryId}
                            </Typography>
                            <Chip 
                              label={`${inquiry.total?.toFixed(2)}€`} 
                              size="small" 
                              color="primary"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Kunde: {inquiry.customer?.name || 'Unbekannt'}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {inquiry.items?.length || 0} Artikel
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="success"
                              onClick={() => navigate(`/admin/anfragen`)}
                            >
                              Genehmigen
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => navigate(`/admin/anfragen`)}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/anfragen')}
                  >
                    Alle Anfragen verwalten
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          ) : (
            <Fade in={true} timeout={500}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'success.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: 'success.main' }} />
                    Anfragen zur Genehmigung
                  </Typography>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ✅ Keine Anfragen zur Genehmigung vorhanden
                  </Alert>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/anfragen')}
                  >
                    Alle Anfragen verwalten
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}
            </Grid>
          )}
          
          {/* Zu bestätigende Bestellungen - nur bei Daten anzeigen */}
          {(bestellungLoading || bestellungData?.zuBestaetigen?.length > 0) && (
            <Grid item xs={12} md={6}>
          {bestellungLoading ? (
            <Card sx={{ height: 400, borderLeft: 6, borderLeftColor: 'grey.300' }}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1, mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              </CardContent>
            </Card>
          ) : bestellungData?.zuBestaetigen && bestellungData.zuBestaetigen.length > 0 ? (
            <Fade in={true} timeout={500} style={{ transitionDelay: '100ms' }}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'success.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartIcon sx={{ mr: 1, color: 'success.main' }} />
                    Bestellungen zu bestätigen ({bestellungData.zuBestaetigen.length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {bestellungData.zuBestaetigen.map((order) => (
                      <Card key={order._id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {order.bestellnummer}
                            </Typography>
                            <Chip 
                              label={`${order.preise?.gesamtsumme?.toFixed(2) || '0.00'}€`} 
                              size="small" 
                              color="success"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Kunde: {order.besteller?.vorname} {order.besteller?.nachname}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Status: Bezahlt - bereit zur Bestätigung
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {order.artikel?.length || 0} Artikel
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="success"
                              onClick={() => navigate(`/admin/bestellungen?status=bezahlt&highlight=${order.bestellnummer}`)}
                            >
                              Bestätigen
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => navigate(`/admin/bestellungen?status=bezahlt&highlight=${order.bestellnummer}`)}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/bestellungen?status=bezahlt')}
                  >
                    Alle bezahlten Bestellungen anzeigen
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          ) : (
            <Fade in={true} timeout={500} style={{ transitionDelay: '100ms' }}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'success.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartIcon sx={{ mr: 1, color: 'success.main' }} />
                    Bestellungen zu bestätigen
                  </Typography>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ✅ Keine Bestellungen zur Bestätigung vorhanden
                  </Alert>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/bestellungen?status=bezahlt')}
                  >
                    Alle bezahlten Bestellungen anzeigen
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}
            </Grid>
          )}
          
          {/* Zu versendende Bestellungen - nur bei Daten anzeigen */}
          {(bestellungLoading || bestellungData?.zuVersenden?.length > 0) && (
            <Grid item xs={12} md={6}>
          {bestellungLoading ? (
            <Card sx={{ height: 400, borderLeft: 6, borderLeftColor: 'grey.300' }}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1, mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              </CardContent>
            </Card>
          ) : bestellungData?.zuVersenden && bestellungData.zuVersenden.length > 0 ? (
            <Fade in={true} timeout={500} style={{ transitionDelay: '200ms' }}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'info.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShippingIcon sx={{ mr: 1, color: 'info.main' }} />
                    Bestellungen zu versenden ({bestellungData.zuVersenden.length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {bestellungData.zuVersenden.map((order) => (
                      <Card key={order._id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {order.bestellnummer}
                            </Typography>
                            <Chip 
                              label={`${order.preise?.gesamtsumme?.toFixed(2) || '0.00'}€`} 
                              size="small" 
                              color="primary"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Kunde: {order.besteller?.vorname} {order.besteller?.nachname}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Status: Verpackt - bereit zum Versenden
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {order.artikel?.length || 0} Artikel
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="primary"
                              onClick={() => navigate(`/admin/bestellungen?status=verpackt&highlight=${order.bestellnummer}`)}
                            >
                              Versenden
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => navigate(`/admin/bestellungen?status=verpackt&highlight=${order.bestellnummer}`)}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/bestellungen?status=verpackt')}
                  >
                    Alle zu versendenden Bestellungen anzeigen
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          ) : (
            <Fade in={true} timeout={500} style={{ transitionDelay: '200ms' }}>
              <Card sx={{ height: '100%', borderLeft: 6, borderLeftColor: 'info.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShippingIcon sx={{ mr: 1, color: 'info.main' }} />
                    Bestellungen zu versenden
                  </Typography>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ✅ Keine Bestellungen zum Versenden vorhanden
                  </Alert>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/admin/bestellungen?status=verpackt')}
                  >
                    Alle zu versendenden Bestellungen anzeigen
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}
            </Grid>
          )}
        </Grid>
      )}

      {/* Haupt-Dashboard Grid */}
      <Grid container spacing={3}>

        {/* Lager-Übersicht */}
        <Grid item xs={12} lg={6}>
          {lagerLoading ? (
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <StoreIcon sx={{ mr: 1, color: 'info.main' }} />
                  Lager-Übersicht
                </Typography>
                <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={120} />
                <Divider sx={{ my: 2 }} />
                <Skeleton variant="text" width="80%" height={30} />
              </CardContent>
            </Card>
          ) : lagerData && (
            <Fade in={true} timeout={500} style={{ transitionDelay: '300ms' }}>
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
                          {lagerData.fertigprodukte.gesamt}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          Fertigprodukte gesamt
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {lagerData.fertigprodukte.aufLager}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          Auf Lager
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Lagerstand: {Math.round((lagerData.fertigprodukte.aufLager / lagerData.fertigprodukte.gesamt) * 100)}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(lagerData.fertigprodukte.aufLager / lagerData.fertigprodukte.gesamt) * 100} 
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Rohstoffe: {lagerData.rohstoffe.gesamtRohstoffe} ({lagerData.rohstoffe.unterMindestbestand} unter Mindestbestand)
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* Produktionskapazität */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                <ProductionIcon sx={{ mr: 1, color: 'primary.main', fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                Produktionskapazität
              </Typography>
              
              {produktionsKapazitaet && produktionsKapazitaet.zusammenfassung ? (
                <Grid container spacing={1}>
                  {/* Seifen-Filter */}
                  <Grid item xs={6} sm={3} md={3}>
                    <Box 
                      sx={{ 
                        p: { xs: 1, sm: 2 }, 
                        bgcolor: produktionsFilter === 'seife' ? 'primary.main' : 'primary.light', 
                        borderRadius: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: { xs: 80, sm: 120 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        },
                        border: produktionsFilter === 'seife' ? '2px solid' : 'none',
                        borderColor: 'primary.dark'
                      }}
                      onClick={() => setProduktionsFilter(produktionsFilter === 'seife' ? 'alle' : 'seife')}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                        {produktionsKapazitaet.produkte?.filter(p => p.kategorie === 'seife').length || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        🧴 Seifen
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Werkstücke-Filter */}
                  <Grid item xs={6} sm={3} md={3}>
                    <Box 
                      sx={{ 
                        p: { xs: 1, sm: 2 }, 
                        bgcolor: produktionsFilter === 'werkstuck' ? 'success.main' : 'success.light', 
                        borderRadius: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: { xs: 80, sm: 120 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        },
                        border: produktionsFilter === 'werkstuck' ? '2px solid' : 'none',
                        borderColor: 'success.dark'
                      }}
                      onClick={() => setProduktionsFilter(produktionsFilter === 'werkstuck' ? 'alle' : 'werkstuck')}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                        {produktionsKapazitaet.produkte?.filter(p => p.kategorie === 'werkstuck').length || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        🏺 Werkstücke
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Kritisch-Filter */}
                  <Grid item xs={6} sm={3} md={3}>
                    <Box 
                      sx={{ 
                        p: { xs: 1, sm: 2 }, 
                        bgcolor: produktionsFilter === 'kritisch' ? 'warning.main' : 'warning.light', 
                        borderRadius: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: { xs: 80, sm: 120 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        },
                        border: produktionsFilter === 'kritisch' ? '2px solid' : 'none',
                        borderColor: 'warning.dark'
                      }}
                      onClick={() => setProduktionsFilter(produktionsFilter === 'kritisch' ? 'alle' : 'kritisch')}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                        {produktionsKapazitaet.produkte?.filter(p => p.maxProduktion > 0 && p.maxProduktion <= 5).length || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        ⚠️ Kritisch
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8, fontSize: { xs: '0.6rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                        ≤5 Stück
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Alle-Filter */}
                  <Grid item xs={6} sm={3} md={3}>
                    <Box 
                      sx={{ 
                        p: { xs: 1, sm: 2 }, 
                        bgcolor: produktionsFilter === 'alle' ? 'info.main' : 'info.light', 
                        borderRadius: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: { xs: 80, sm: 120 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        },
                        border: produktionsFilter === 'alle' ? '2px solid' : 'none',
                        borderColor: 'info.dark'
                      }}
                      onClick={() => setProduktionsFilter('alle')}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                        {produktionsKapazitaet.zusammenfassung.uebersicht.gesamtProdukte || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        📦 Alle
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8, fontSize: { xs: '0.6rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
                        Gesamt
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Produktliste mit konkreten Mengen */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {getFilterTitle()}
                      </Typography>
                      {produktionsFilter !== 'alle' && (
                        <Button 
                          size="small" 
                          onClick={() => setProduktionsFilter('alle')}
                          startIcon={<RefreshIcon />}
                        >
                          Alle anzeigen
                        </Button>
                      )}
                    </Box>
                    {/* Mobile-optimierte Karten-Ansicht für kleine Bildschirme */}
                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                        {getFilteredProdukte().map((produkt, index) => (
                          <Card key={produkt.produktId || index} variant="outlined" sx={{ mb: 1, p: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Box sx={{ flex: 1, mr: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', lineHeight: 1.2 }}>
                                  {produkt.produktName.length > 25 ? `${produkt.produktName.substring(0, 25)}...` : produkt.produktName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                                  {produkt.grammProEinheit}g • {produkt.seife}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontSize: '0.7rem' }}>
                                    Limit:
                                  </Typography>
                                  <Chip 
                                    label={
                                      produkt.limitierenderFaktor === 'rohseife' ? 'Rohseife' :
                                      produkt.limitierenderFaktor === 'duftoel' ? 'Duftöl' :
                                      produkt.limitierenderFaktor === 'zusatzinhaltsstoff' ? 'Zusatzstoff' : 'Verpackung'
                                    }
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.65rem',
                                      height: 18,
                                      backgroundColor: produkt.limitierenderFaktor === 'rohseife' ? 'error.main' :
                                                      produkt.limitierenderFaktor === 'duftoel' ? 'warning.main' : 
                                                      produkt.limitierenderFaktor === 'zusatzinhaltsstoff' ? 'secondary.main' : 'info.main',
                                      color: 'white',
                                      fontWeight: 'medium',
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                      Bestand
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                                      <Chip 
                                        label={produkt.aktuellerBestand || '0'}
                                        size="small"
                                        variant={produkt.aktuellerBestand <= 5 ? 'filled' : 'outlined'}
                                        sx={{ 
                                          fontWeight: 'bold',
                                          fontSize: '0.7rem',
                                          height: 20,
                                          backgroundColor: produkt.aktuellerBestand <= 5 ? 'error.main' : 'transparent',
                                          color: produkt.aktuellerBestand <= 5 ? 'white' : 'text.primary',
                                          borderColor: produkt.aktuellerBestand <= 5 ? 'error.main' : 'grey.300',
                                          '& .MuiChip-label': { px: 1 }
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                  <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>/</Typography>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                      Max. Produktion
                                    </Typography>
                                    <Typography variant="h6" sx={{ 
                                      fontWeight: 'bold', 
                                      color: 'text.primary',
                                      fontSize: '1.1rem'
                                    }}>
                                      {produkt.maxProduktion}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'center', display: 'block' }}>
                                  Stück
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {produkt.maxProduktion === 0 ? (
                                <Chip label="Nicht möglich" sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'medium' }} size="small" />
                              ) : produkt.maxProduktion <= 5 ? (
                                <Chip label="Kritisch" sx={{ backgroundColor: 'warning.main', color: 'white', fontWeight: 'medium' }} size="small" />
                              ) : (
                                <Chip label="Verfügbar" sx={{ backgroundColor: 'success.main', color: 'white', fontWeight: 'medium' }} size="small" />
                              )}
                            </Box>
                            {produkt.probleme && produkt.probleme.length > 0 && (
                              <Box sx={{ mt: 1, p: 1, backgroundColor: 'error.light', borderRadius: 1 }}>
                                <Typography variant="caption" color="error.dark" sx={{ fontSize: '0.7rem', fontWeight: 'medium' }}>
                                  {produkt.probleme[0]}
                                </Typography>
                              </Box>
                            )}
                          </Card>
                        ))}
                      </Box>
                    </Box>
                    
                    {/* Desktop-Tabellen-Ansicht */}
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, display: { xs: 'none', md: 'block' } }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Produkt</strong></TableCell>
                            <TableCell align="center"><strong>Bestand</strong></TableCell>
                            <TableCell align="center"><strong>Max. Produktion</strong></TableCell>
                            <TableCell align="center"><strong>Limitiert durch</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredProdukte().map((produkt, index) => (
                            <TableRow 
                              key={produkt.produktId || index}
                              sx={{ 
                                backgroundColor: (produkt.aktuellerBestand || 0) <= 5 ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                                '&:hover': {
                                  backgroundColor: (produkt.aktuellerBestand || 0) <= 5 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {produkt.produktName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {produkt.grammProEinheit}g • {produkt.seife}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={produkt.aktuellerBestand || '0'}
                                  color={produkt.aktuellerBestand <= 5 ? 'error' : 'default'}
                                  variant={produkt.aktuellerBestand <= 5 ? 'filled' : 'outlined'}
                                  size="small"
                                  sx={{ 
                                    fontWeight: 'bold',
                                    backgroundColor: produkt.aktuellerBestand <= 5 ? 'error.main' : 'transparent',
                                    color: produkt.aktuellerBestand <= 5 ? 'white' : 'text.primary',
                                    borderColor: produkt.aktuellerBestand <= 5 ? 'error.main' : 'grey.300'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="h6" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: 'text.primary'
                                  }}
                                >
                                  {produkt.maxProduktion}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {produkt.limitierenderFaktor && (
                                  <Chip 
                                    label={
                                      produkt.limitierenderFaktor === 'rohseife' ? 'Rohseife' :
                                      produkt.limitierenderFaktor === 'duftoel' ? 'Duftöl' :
                                      produkt.limitierenderFaktor === 'zusatzinhaltsstoff' ? 'Zusatzstoff' : 'Verpackung'
                                    }
                                    size="small"
                                    sx={{
                                      backgroundColor: produkt.limitierenderFaktor === 'rohseife' ? 'error.main' :
                                                      produkt.limitierenderFaktor === 'duftoel' ? 'warning.main' : 
                                                      produkt.limitierenderFaktor === 'zusatzinhaltsstoff' ? 'secondary.main' : 'info.main',
                                      color: 'white',
                                      fontWeight: 'medium'
                                    }}
                                  />
                                )}
                                {produkt.probleme && produkt.probleme.length > 0 && (
                                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 'medium' }}>
                                    {produkt.probleme[0]}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {(produkt.aktuellerBestand || 0) <= 5 ? (
                                  <Chip 
                                    label="Kritisch" 
                                    sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'medium' }}
                                    size="small" 
                                  />
                                ) : (
                                  <Chip 
                                    label="OK" 
                                    sx={{ backgroundColor: 'success.main', color: 'white', fontWeight: 'medium' }}
                                    size="small" 
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {produktionsFilter === 'alle' 
                        ? `Zeige Top 10 von ${produktionsKapazitaet.produkte?.length || 0} Produkten`
                        : `${getFilteredProdukte().length} Produkte gefiltert (${produktionsFilter})`
                      } • Tippen Sie auf die Kacheln zum Filtern
                    </Typography>
                  </Grid>
                  
                  {/* Limitierende Faktoren */}
                  {produktionsKapazitaet.zusammenfassung.limitierungen && Object.keys(produktionsKapazitaet.zusammenfassung.limitierungen).length > 0 && (
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
              ) : produktionsKapazitaet === null ? (
                <Alert severity="warning">
                  <strong>Produktionskapazität nicht verfügbar</strong><br/>
                  Die Produktionsanalyse konnte nicht geladen werden. 
                  Möglicherweise fehlen Rohstoff-Daten oder die API ist nicht verfügbar.
                  <Button 
                    size="small" 
                    onClick={loadDashboardDataProgressive}
                    sx={{ ml: 2 }}
                  >
                    Erneut laden
                  </Button>
                </Alert>
              ) : (
                <Alert severity="info">
                  Produktionskapazität wird geladen...
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Verkaufs- & Produktionsübersicht */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
                  Verkaufs- & Produktionsübersicht
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setInfoDialogOpen(true)}
                  sx={{ color: 'info.main' }}
                >
                  <InfoIcon />
                </IconButton>
              </Box>
              
              {/* Gesamtübersicht */}
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                📊 Gesamtübersicht
                <Chip label="Alle Rechnungen" size="small" sx={{ ml: 1, fontSize: '0.7rem' }} />
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: 2, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {verkaufData?.rechnungen?.gesamtRechnungen || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      Rechnungen gesamt
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'success.main', borderRadius: 2, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {formatCurrency(verkaufData?.rechnungen?.gesamtUmsatz || 0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      Gesamtumsatz
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'info.main', borderRadius: 2, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {formatCurrency(verkaufData?.rechnungen?.gesamtBezahlt || 0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      Bezahlt gesamt
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

{/* Aktuelles Kalenderjahr Kennzahlen */}
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                📈 Verkaufskennzahlen ({new Date().getFullYear()})
                <Chip label="Aktuelles Kalenderjahr" size="small" color="primary" sx={{ ml: 1, fontSize: '0.7rem' }} />
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {verkaufData?.rechnungen?.rechnungenAktuellesJahr || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Rechnungen
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {formatCurrency(verkaufData?.rechnungen?.umsatzAktuellesJahr || 0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Umsatz
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {verkaufData?.rechnungen?.nachStatus?.filter(s => s._id === 'paid').reduce((sum, s) => sum + s.anzahl, 0) || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Bezahlt
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {rohstoffData?.produkteZurProduktion?.filter(p => p.voraussichtlicheReichweite < 30).length || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      Kritische Produkte
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Produktionspriorität - nur anzeigen wenn Daten vorhanden */}
              {rohstoffData?.produkteZurProduktion?.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      🚀 Produktionspriorität (Top 10)
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => setProduktionInfoOpen(true)}
                      sx={{ color: 'info.main' }}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Basierend auf Bestand und Verkaufshäufigkeit der letzten 90 Tage
                  </Typography>
                  
                  {/* Mobile-optimierte Karten-Ansicht für kleine Bildschirme */}
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {(rohstoffData?.produkteZurProduktion || []).slice(0, 8).map((product, index) => (
                        <Card key={product._id || index} variant="outlined" sx={{ mb: 2, p: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1, mr: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', lineHeight: 1.2 }}>
                                {(product.produktName || product.portfolio?.name || 'Unbekannt').length > 25 ? 
                                  `${(product.produktName || product.portfolio?.name || 'Unbekannt').substring(0, 25)}...` : 
                                  (product.produktName || product.portfolio?.name || 'Unbekannt')
                                }
                              </Typography>
                              {product.portfolio?.seife && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                                  {product.portfolio.seife} • {product.portfolio.aroma}
                                </Typography>
                              )}
                            </Box>
                            
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip 
                                label={`Score: ${product.prioritaetsScore}`}
                                size="small"
                                sx={{
                                  backgroundColor: product.prioritaetsScore > 20 ? 'error.main' : 
                                                  product.prioritaetsScore > 10 ? 'warning.main' : 'info.main',
                                  color: 'white',
                                  fontWeight: 'medium',
                                  fontSize: '0.7rem'
                                }}
                              />
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                Bestand
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', color: product.aktuellerBestand <= product.mindestbestand ? 'error.main' : 'text.primary' }}>
                                {product.aktuellerBestand}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                Verkäufe (90T)
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {product.verkaufteMenge90Tage}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                Reichweite
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.8rem',
                                color: product.voraussichtlicheReichweite < 30 ? 'error.main' : 
                                       product.voraussichtlicheReichweite < 60 ? 'warning.main' : 'success.main'
                              }}>
                                {product.voraussichtlicheReichweite > 999 ? '∞' : `${product.voraussichtlicheReichweite}d`}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                  
                  {/* Desktop-Tabellen-Ansicht */}
                  <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Produkt</strong></TableCell>
                          <TableCell align="center"><strong>Bestand</strong></TableCell>
                          <TableCell align="center"><strong>Verkäufe (90T)</strong></TableCell>
                          <TableCell align="center"><strong>Reichweite</strong></TableCell>
                          <TableCell align="center"><strong>Priorität</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(rohstoffData?.produkteZurProduktion || []).slice(0, 8).map((product, index) => (
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
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Meistverkaufte Produkte Chart */}
        <Grid item xs={12} md={4}>
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
              
              {verkaufData?.meistverkaufte && verkaufData.meistverkaufte.filter(p => p.jahr === verkaufJahr).length > 0 ? (
                <Box>
                  {verkaufData.meistverkaufte.filter(p => p.jahr === verkaufJahr).slice(0, 5).map((produkt, index) => (
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

        {/* Rohstoff-Status */}
        <Grid item xs={12} md={4}>
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
                const gefilterte = rohstoffData?.rohstoffeBenoetigt?.filter(rohstoff => 
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
      
      {/* Info-Dialog für Produktionspriorität */}
      <Dialog 
        open={produktionInfoOpen} 
        onClose={() => setProduktionInfoOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
          Produktionspriorität - Was bedeutet das?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Die Produktionspriorität hilft Ihnen dabei, <strong>intelligente Produktionsentscheidungen</strong> zu treffen, 
            indem sie die dringendsten Produkte automatisch identifiziert.
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <StarIcon color="warning" />
              </ListItemIcon>
              <ListItemText 
                primary="Prioritätsscore"
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Ein intelligenter Algorithmus berechnet für jedes Produkt einen Score basierend auf:
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 2, mb: 0.5 }}>• <strong>Aktuellem Bestand</strong> (weniger = höherer Score)</Typography>
                    <Typography variant="body2" sx={{ ml: 2, mb: 0.5 }}>• <strong>Verkaufsgeschwindigkeit</strong> der letzten 90 Tage</Typography>
                    <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>• <strong>Voraussichtlicher Reichweite</strong> (weniger Tage = höherer Score)</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label="Score > 20: SOFORT produzieren!" color="error" size="small" />
                      <Chip label="Score 10-20: Bald produzieren" color="warning" size="small" />
                      <Chip label="Score < 10: Bestand OK" color="success" size="small" />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon color="info" />
              </ListItemIcon>
              <ListItemText 
                primary="Reichweite (Tage)"
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Zeigt an, wie viele Tage Ihr aktueller Bestand bei der durchschnittlichen Verkaufsrate noch reicht.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Beispiel:</strong> 15 Stück Bestand ÷ 0,5 Stück pro Tag = 30 Tage Reichweite
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      ⚠️ Weniger als 30 Tage = Kritisch!
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem>
              <ListItemIcon>
                <TrendingUpIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Geschäftlicher Nutzen"
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>💡 <strong>Nie wieder Stockouts!</strong> - Vermeidung verlorener Verkäufe</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>⚡ <strong>Effiziente Produktion</strong> - Produzieren Sie das Richtige zur richtigen Zeit</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>💰 <strong>Lageroptimierung</strong> - Weniger gebundenes Kapital, mehr Liquidität</Typography>
                    <Typography variant="body2">📈 <strong>Kundenzufriedenheit</strong> - Ihre beliebtesten Produkte sind immer verfügbar</Typography>
                  </Box>
                }
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProduktionInfoOpen(false)} color="primary" variant="contained">
            Verstanden - Jetzt produzieren! 🚀
          </Button>
        </DialogActions>
      </Dialog>
      
      
      {/* Info-Dialog für Kennzahlen-Erklärung */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
          Erklärung der Produktions-Kennzahlen
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon color="warning" />
              </ListItemIcon>
              <ListItemText 
                primary="Reichweite (Tage)"
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Zeigt an, wie viele Tage der aktuelle Bestand bei der aktuellen Verkaufsrate noch reichen wird.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Beispiel:</strong> 15 Stück Bestand ÷ 0,33 Stück/Tag = 45 Tage Reichweite
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Chip label="< 30 Tage: Kritisch" color="error" size="small" />
                      <Chip label="30-60 Tage: Warnung" color="warning" size="small" />
                      <Chip label="> 60 Tage: OK" color="success" size="small" />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem>
              <ListItemIcon>
                <StarIcon color="info" />
              </ListItemIcon>
              <ListItemText 
                primary="Prioritätsscore"
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Berechnet die Dringlichkeit der Produktion basierend auf Bestand, Verkaufsgeschwindigkeit und Reichweite.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Höherer Score = höhere Produktionspriorität</strong>
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>• <strong>Score &gt; 20:</strong> Hohe Priorität - Sofort produzieren</Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>• <strong>Score 10-20:</strong> Mittlere Priorität - Bald produzieren</Typography>
                      <Typography variant="body2">• <strong>Score &lt; 10:</strong> Niedrige Priorität - Bestand ausreichend</Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem>
              <ListItemIcon>
                <TrendingUpIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Geschäftlicher Nutzen"
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>• Vermeidung von Stockouts und verlorenen Verkäufen</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>• Optimale Produktionsplanung und Ressourceneinsatz</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>• Lagerkostenoptimierung</Typography>
                    <Typography variant="body2">• Verbessertes Cashflow-Management</Typography>
                  </Box>
                }
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} color="primary">
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;