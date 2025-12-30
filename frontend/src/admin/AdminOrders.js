import React, { useState, useEffect, useCallback } from 'react';
import { useAdminState } from '../hooks/useAdminState';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Badge,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
  Collapse
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Edit,
  Receipt,
  LocalShipping,
  Payment,
  Person,
  LocationOn,
  ShoppingCart,
  CheckCircle,
  Schedule,
  Cancel,
  Warning
} from '@mui/icons-material';
import adminOrdersService from '../services/adminOrdersService';

const AdminOrders = () => {
  // Standardisierte Admin-States
  const {
    loading, setLoading,
    error, setError,
    success, setSuccess
  } = useAdminState();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    sortBy: 'bestelldatum',
    sortOrder: 'desc'
  });

  const fetchOrders = useCallback(async () => {
    await handleAsyncOperation(async () => {
      const data = await adminOrdersService.getOrders({
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 100
      });
      
      if (data && Array.isArray(data)) {
        setOrders(data);
        setSuccess(`${data.length} Bestellungen geladen`);
      }
    }, 'Bestellungen werden geladen...');
  }, [filters, handleAsyncOperation, setSuccess]);
      });
      
      setOrders(data.data);
      console.log(`✅ ${data.data.length} Bestellungen geladen`);

    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellungen:', error);
      setError(error.message || 'Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async () => {
    try {
      await adminOrdersService.updateOrderStatus(
        selectedOrder._id,
        newStatus,
        updateNote
      );

      console.log('✅ Bestellstatus aktualisiert');
      setStatusUpdateOpen(false);
      setNewStatus('');
      setUpdateNote('');
      fetchOrders(); // Neu laden

    } catch (error) {
      console.error('❌ Fehler beim Status-Update:', error);
      setError(error.message || 'Fehler beim Aktualisieren des Status');
    }
  };

  const formatPrice = (price) => {
    return adminOrdersService.formatPrice(price);
  };

  const formatDate = (date) => {
    return adminOrdersService.formatDate(date);
  };

  const getStatusColor = (status) => {
    const statusStyling = adminOrdersService.getStatusStyling(status);
    const colorMap = {
      '#ff9800': 'warning',
      '#4caf50': 'success', 
      '#2196f3': 'primary',
      '#9c27b0': 'secondary',
      '#8bc34a': 'success',
      '#f44336': 'error',
      '#607d8b': 'default'
    };
    return colorMap[statusStyling.color] || 'default';
  };

  const getStatusIcon = (status) => {
    const statusStyling = adminOrdersService.getStatusStyling(status);
    const iconMap = {
      '⏳': <Schedule />,
      '💳': <Payment />,
      '⚙️': <Edit />,
      '📦': <LocalShipping />,
      '✅': <CheckCircle />,
      '❌': <Cancel />,
      '💸': <Warning />
    };
    return iconMap[statusStyling.icon] || <Schedule />;
  };

  const getOrderStats = () => {
    return adminOrdersService.calculateStats(orders);
  };

  const stats = getOrderStats();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        📦 Bestellverwaltung
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiken */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt Bestellungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.statusCounts.ausstehend || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ausstehend
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {stats.statusCounts.bezahlt || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bezahlt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.statusCounts.in_bearbeitung || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Bearbeitung
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.statusCounts.versendet || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Versendet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {formatPrice(stats.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamtumsatz
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter & Sortierung
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">Alle</MenuItem>
                {adminOrdersService.getStatusOptions().map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.icon} {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Sortieren nach</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sortieren nach"
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              >
                <MenuItem value="bestelldatum">Bestelldatum</MenuItem>
                <MenuItem value="gesamt.brutto">Bestellwert</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Reihenfolge</InputLabel>
              <Select
                value={filters.sortOrder}
                label="Reihenfolge"
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
              >
                <MenuItem value="desc">Neueste zuerst</MenuItem>
                <MenuItem value="asc">Älteste zuerst</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Bestellungen */}
      <Paper sx={{ mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Keine Bestellungen gefunden
            </Typography>
          </Box>
        ) : (
          <Box>
            {orders.map((order, index) => (
              <Accordion key={order._id} sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(order.status)}
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {order.bestellnummer}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(order.bestelldatum)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box>
                        <Typography variant="subtitle2">
                          {order.rechnungsadresse?.vorname} {order.rechnungsadresse?.nachname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.kontakt?.email}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                        icon={getStatusIcon(order.status)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {formatPrice(order.gesamt?.brutto)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Details anzeigen">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              // Details in Accordion anzeigen
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Status ändern">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                              setStatusUpdateOpen(true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {/* Artikel */}
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6" gutterBottom>
                        🛍️ Bestellte Artikel
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Artikel</TableCell>
                              <TableCell align="center">Menge</TableCell>
                              <TableCell align="right">Einzelpreis</TableCell>
                              <TableCell align="right">Gesamt</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {order.artikel?.map((artikel, artikelIndex) => (
                              <TableRow key={artikelIndex}>
                                <TableCell>
                                  <Typography variant="subtitle2">
                                    {artikel.name}
                                  </Typography>
                                  {artikel.typ && (
                                    <Typography variant="caption" color="text.secondary">
                                      {artikel.typ}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">{artikel.menge}</TableCell>
                                <TableCell align="right">
                                  {formatPrice(artikel.preis)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatPrice(artikel.preis * artikel.menge)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    {/* Kundendaten */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="h6" gutterBottom>
                        👤 Kundendaten
                      </Typography>
                      
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            📍 Rechnungsadresse
                          </Typography>
                          <Typography variant="body2">
                            {order.rechnungsadresse?.vorname} {order.rechnungsadresse?.nachname}<br />
                            {order.rechnungsadresse?.strasse} {order.rechnungsadresse?.hausnummer}<br />
                            {order.rechnungsadresse?.plz} {order.rechnungsadresse?.stadt}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            🚚 Lieferadresse
                          </Typography>
                          <Typography variant="body2">
                            {order.lieferadresse?.vorname} {order.lieferadresse?.nachname}<br />
                            {order.lieferadresse?.strasse} {order.lieferadresse?.hausnummer}<br />
                            {order.lieferadresse?.plz} {order.lieferadresse?.stadt}
                          </Typography>
                        </CardContent>
                      </Card>

                      {order.notizen?.kunde && (
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              💬 Kundennotizen
                            </Typography>
                            <Typography variant="body2">
                              {order.notizen.kunde}
                            </Typography>
                          </CardContent>
                        </Card>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateOpen} onClose={() => setStatusUpdateOpen(false)}>
        <DialogTitle>Status ändern</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Neuer Status</InputLabel>
            <Select
              value={newStatus}
              label="Neuer Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {adminOrdersService.getStatusOptions().map(status => (
                <MenuItem key={status.value} value={status.value}>
                  {status.icon} {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notiz (optional)"
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
            placeholder="Zusätzliche Informationen zum Status-Update..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateOpen(false)}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={updateOrderStatus}
            disabled={!newStatus}
          >
            Status aktualisieren
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminOrders;