import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Inventory,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  Factory,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Info,
  Assessment
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';

const ProductionCapacityAnalysis = () => {
  const [kapazitaetsData, setKapazitaetsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    ladeProduktionsKapazitaet();
  }, []);

  const ladeProduktionsKapazitaet = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getProductionCapacity();
      setKapazitaetsData(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Produktionskapazität:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const getLimitierungColor = (faktor) => {
    const colors = {
      rohseife: theme.palette.error.main,
      duftoel: theme.palette.warning.main,
      verpackung: theme.palette.info.main
    };
    return colors[faktor] || theme.palette.grey[500];
  };

  const getLimitierungIcon = (faktor) => {
    const icons = {
      rohseife: <Inventory />,
      duftoel: <Assessment />,
      verpackung: <Factory />
    };
    return icons[faktor] || <Info />;
  };

  const getLimitierungLabel = (faktor) => {
    const labels = {
      rohseife: 'Rohseife',
      duftoel: 'Duftöl',
      verpackung: 'Verpackung'
    };
    return labels[faktor] || faktor;
  };

  const getRohstoffIcon = (typ) => {
    const icons = {
      rohseife: '🧼',
      duftoel: '🌿', 
      verpackung: '📦'
    };
    return icons[typ] || '📋';
  };

  const handleExpandProduct = (produktId) => {
    setExpandedProduct(expandedProduct === produktId ? null : produktId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!kapazitaetsData) {
    return (
      <Alert severity="info">
        Keine Produktionskapazitäts-Daten verfügbar.
      </Alert>
    );
  }

  const { zusammenfassung, produkte } = kapazitaetsData;

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Factory color="primary" />
        Produktionskapazitäts-Analyse
      </Typography>

      {/* Übersicht Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Gesamt Produkte
              </Typography>
              <Typography variant="h4">
                {zusammenfassung.uebersicht.gesamtProdukte}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Produzierbar
              </Typography>
              <Typography variant="h4" color="success.main">
                {zusammenfassung.uebersicht.produzierbar}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ({zusammenfassung.uebersicht.produktionsrate}%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Nicht produzierbar
              </Typography>
              <Typography variant="h4" color="error.main">
                {zusammenfassung.uebersicht.nichtProduzierbar}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Kritische Produkte
              </Typography>
              <Typography variant="h4" color="warning.main">
                {zusammenfassung.kritischeProdukte.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                (≤5 Stück)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Limitierende Faktoren */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning color="warning" />
                Limitierende Faktoren
              </Typography>
              
              {Object.entries(zusammenfassung.limitierungen).length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Keine Limitierungen erkannt
                </Typography>
              ) : (
                <List dense>
                  {Object.entries(zusammenfassung.limitierungen).map(([faktor, anzahl]) => (
                    <ListItem key={faktor}>
                      <ListItemIcon sx={{ color: getLimitierungColor(faktor) }}>
                        {getLimitierungIcon(faktor)}
                      </ListItemIcon>
                      <ListItemText
                        primary={getLimitierungLabel(faktor)}
                        secondary={`${anzahl} Produkte betroffen`}
                      />
                      <Chip 
                        label={anzahl} 
                        size="small" 
                        sx={{ backgroundColor: getLimitierungColor(faktor), color: 'white' }} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Produktion */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="success" />
                Top Produktionskapazität
              </Typography>
              
              {zusammenfassung.topProduktion.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Keine Produkte produzierbar
                </Typography>
              ) : (
                <List dense>
                  {zusammenfassung.topProduktion.map((produkt, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Typography variant="h6" color="primary">
                          #{index + 1}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={produkt.name}
                        secondary={`Limitiert durch ${getLimitierungLabel(produkt.limitierenderFaktor)}`}
                      />
                      <Chip 
                        label={`${produkt.maxProduktion} Stück`}
                        color="success" 
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Kritische Produkte */}
        {zusammenfassung.kritischeProdukte.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Error color="error" />
                  Kritische Produkte (≤5 Stück)
                </Typography>
                
                <List>
                  {zusammenfassung.kritischeProdukte.map((produkt, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemIcon>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={produkt.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                Max. Produktion: {produkt.maxProduktion} Stück
                              </Typography>
                              {produkt.probleme.length > 0 && (
                                <Typography variant="body2" color="error">
                                  Probleme: {produkt.probleme.join(', ')}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        {produkt.maxProduktion > 0 && (
                          <Chip 
                            label={`Limitiert: ${getLimitierungLabel(produkt.limitierenderFaktor)}`}
                            size="small" 
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Detaillierte Produktanalyse */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="info" />
                Detaillierte Produktanalyse
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell><strong>Produkt</strong></TableCell>
                      <TableCell align="center"><strong>Max. Produktion</strong></TableCell>
                      <TableCell align="center"><strong>Limitierender Faktor</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produkte.map((produkt) => (
                      <React.Fragment key={produkt.produktId}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleExpandProduct(produkt.produktId)}
                            >
                              {expandedProduct === produkt.produktId ? 
                                <KeyboardArrowUp /> : <KeyboardArrowDown />
                              }
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {produkt.produktName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {produkt.grammProEinheit}g • {produkt.seife}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="h6" 
                              color={produkt.maxProduktion > 0 ? "success.main" : "error.main"}
                            >
                              {produkt.maxProduktion}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {produkt.limitierenderFaktor ? (
                              <Chip 
                                label={getLimitierungLabel(produkt.limitierenderFaktor)}
                                size="small"
                                sx={{ backgroundColor: getLimitierungColor(produkt.limitierenderFaktor), color: 'white' }}
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {produkt.maxProduktion > 5 ? (
                              <CheckCircle color="success" />
                            ) : produkt.maxProduktion > 0 ? (
                              <Warning color="warning" />
                            ) : (
                              <Error color="error" />
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandierbare Details */}
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0 }}>
                            <Collapse in={expandedProduct === produkt.produktId}>
                              <Box sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Rohstoffbedarf und Verfügbarkeit
                                </Typography>
                                
                                {produkt.probleme.length > 0 && (
                                  <Alert severity="error" sx={{ mb: 2 }}>
                                    <strong>Probleme:</strong> {produkt.probleme.join(', ')}
                                  </Alert>
                                )}
                                
                                <Grid container spacing={2}>
                                  {produkt.rohstoffBedarf.map((rohstoff, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                      <Card variant="outlined" sx={{ height: '100%' }}>
                                        <CardContent sx={{ p: 2 }}>
                                          <Typography variant="subtitle2" gutterBottom>
                                            {getRohstoffIcon(rohstoff.typ)} {rohstoff.name}
                                          </Typography>
                                          
                                          <Box sx={{ mb: 1 }}>
                                            <Typography variant="body2" color="textSecondary">
                                              Bedarf: {rohstoff.benoetigt} {rohstoff.einheit}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                              Verfügbar: {rohstoff.verfuegbar} {rohstoff.einheit}
                                            </Typography>
                                            {rohstoff.dosierung && (
                                              <Typography variant="caption" color="textSecondary">
                                                {rohstoff.dosierung}
                                              </Typography>
                                            )}
                                          </Box>
                                          
                                          <LinearProgress
                                            variant="determinate"
                                            value={Math.min((rohstoff.benoetigt / rohstoff.verfuegbar) * 100, 100)}
                                            color={rohstoff.ausreichend ? "success" : "error"}
                                            sx={{ mb: 1 }}
                                          />
                                          
                                          <Typography 
                                            variant="body2" 
                                            color={rohstoff.ausreichend ? "success.main" : "error.main"}
                                            fontWeight="medium"
                                          >
                                            Max: {rohstoff.maxProduktion} Stück
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Zuletzt aktualisiert: {new Date(kapazitaetsData.generiert).toLocaleString('de-DE')}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProductionCapacityAnalysis;