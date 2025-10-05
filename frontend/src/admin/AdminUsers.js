import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Box,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  Snackbar,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  Search as SearchIcon,
  VpnKey as PasswordIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { kundenAPI } from '../services/api';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState({});
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user',
    geschlecht: '',
    geburtsdatum: '',
    kundennummer: '',
    notizen: '',
    // Adresse
    strasse: '',
    hausnummer: '',
    zusatz: '',
    plz: '',
    stadt: '',
    land: 'Deutschland',
    // Kommunikation
    newsletter: false,
    sms: false,
  });
  const [newPassword, setNewPassword] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleFilter !== 'all') params.role = roleFilter;
      
      const response = await kundenAPI.getKunden(params);
      setUsers(response.data.data || response.data.users || []);
      setTotalCount(response.data.total || response.data.pagination?.total || 0);
    } catch (error) {
      showSnackbar('Fehler beim Laden der Benutzer', 'error');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, roleFilter, showSnackbar]);

  const loadStats = useCallback(async () => {
    try {
      const response = await kundenAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers, loadStats]);

  const handleUpdateUser = async () => {
    try {
      const updateData = { ...formData };
      delete updateData.password; // Password not in update
      
      // Map frontend role values to backend values
      // Frontend: "customer", "user", "admin"
      // Backend: "kunde", "admin"
      const rolleMapping = {
        'customer': 'kunde',
        'user': 'kunde', 
        'admin': 'admin'
      };
      
      // Prepare data for backend
      const kundeData = {
        vorname: updateData.firstName,
        nachname: updateData.lastName,
        email: updateData.email,
        telefon: updateData.phone,
        geschlecht: updateData.geschlecht,
        geburtsdatum: updateData.geburtsdatum,
        rolle: rolleMapping[updateData.role] || updateData.role, // Map role
        adresse: {
          strasse: updateData.strasse,
          hausnummer: updateData.hausnummer,
          zusatz: updateData.zusatz,
          plz: updateData.plz,
          stadt: updateData.stadt,
          land: updateData.land
        },
        kommunikation: {
          newsletter: updateData.newsletter,
          sms: updateData.sms
        }
      };
      
      console.log('🔄 Aktualisiere Kunde mit Daten:', kundeData);
      await kundenAPI.updateKunde(selectedUser._id, kundeData);
      showSnackbar('Benutzer erfolgreich aktualisiert', 'success');
      setOpenEditDialog(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren:', error);
      showSnackbar(error.response?.data?.message || 'Fehler beim Aktualisieren', 'error');
    }
  };

  const handleCreateUser = async () => {
    // Kunden registrieren sich selbst über die Registrierungsseite
    showSnackbar('Neue Kunden registrieren sich über die Registrierungsseite', 'info');
  };

  const handleChangePassword = async () => {
    // Password reset wird über das Kunden-Portal gehandhabt
    showSnackbar('Passwort-Änderung erfolgt über das Kunden-Portal', 'info');
    setOpenPasswordDialog(false);
    setNewPassword('');
  };

  const handleBlockUser = async (user) => {
    // TODO: Implement kunde status update (aktiv/inaktiv)
    showSnackbar('Kunden-Status-Änderung noch nicht implementiert', 'warning');
  };

  const handleUnblockUser = async (user) => {
    // TODO: Implement kunde status update (aktiv/inaktiv)
    showSnackbar('Kunden-Status-Änderung noch nicht implementiert', 'warning');
  };

  const handleDeleteUser = async (user) => {
    // Kunden sollten nicht gelöscht werden (DSGVO: Archivierung statt Löschung)
    showSnackbar('Kunden können nicht gelöscht werden. Bitte deaktivieren Sie stattdessen.', 'warning');
  };

  const openEditUserDialog = (user) => {
    setSelectedUser(user);
    
    // Map backend role to frontend values
    const rolleMapping = {
      'kunde': 'customer',
      'admin': 'admin'
    };
    
    setFormData({
      username: user.username || user.email,
      email: user.email,
      firstName: user.firstName || user.vorname || '',
      lastName: user.lastName || user.nachname || '',
      phone: user.phone || user.telefon || '',
      role: rolleMapping[user.rolle] || user.role || 'customer',
      geschlecht: user.geschlecht || '',
      geburtsdatum: user.geburtsdatum ? user.geburtsdatum.split('T')[0] : '',
      kundennummer: user.kundennummer || '',
      notizen: user.notizen || '',
      // Adresse
      strasse: user.adresse?.strasse || '',
      hausnummer: user.adresse?.hausnummer || '',
      zusatz: user.adresse?.zusatz || '',
      plz: user.adresse?.plz || '',
      stadt: user.adresse?.stadt || '',
      land: user.adresse?.land || 'Deutschland',
      // Kommunikation
      newsletter: user.kommunikation?.newsletter || false,
      sms: user.kommunikation?.sms || false,
    });
    setOpenEditDialog(true);
  };

  const openChangePasswordDialog = (user) => {
    setSelectedUser(user);
    setOpenPasswordDialog(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'customer',
      geschlecht: '',
      geburtsdatum: '',
      kundennummer: '',
      notizen: '',
      strasse: '',
      hausnummer: '',
      zusatz: '',
      plz: '',
      stadt: '',
      land: 'Deutschland',
      newsletter: false,
      sms: false
    });
    setSelectedUser(null);
    setShowPassword(false);
  };

  const getStatusColor = (status) => {
    // Kunden haben ein status-Objekt, nicht einen String
    if (typeof status === 'object' && status !== null) {
      if (status.gesperrt) return 'error';      // Rot für gesperrt
      if (!status.aktiv) return 'error';        // Rot für inaktiv
      return 'success';                         // Grün für aktiv
    }
    
    // Fallback für String-Status (alte User)
    switch (status) {
      case 'active': return 'success';
      case 'blocked': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    // Backend sendet 'kunde' oder 'admin', Frontend zeigt 'customer', 'user', 'admin'
    switch (role) {
      case 'admin': return 'Administrator';
      case 'kunde': return 'Kunde';
      case 'user': return 'Benutzer';
      case 'customer': return 'Kunde';
      default: return role || 'Kunde';
    }
  };

  const getStatusLabel = (status) => {
    // Kunden haben ein status-Objekt, nicht einen String
    if (typeof status === 'object' && status !== null) {
      if (status.gesperrt) return `Gesperrt${status.sperrgrund ? ': ' + status.sperrgrund : ''}`;
      if (!status.aktiv) return 'Inaktiv';
      return 'Aktiv';
    }
    
    // Fallback für String-Status (alte User)
    switch (status) {
      case 'active': return 'Aktiv';
      case 'blocked': return 'Gesperrt';
      case 'pending': return 'Ausstehend';
      default: return status || 'Unbekannt';
    }
  };

  const toggleRowExpand = (userId) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Benutzerverwaltung
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gesamt
              </Typography>
              <Typography variant="h4">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Aktive
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.active || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gesperrt
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.blocked || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Administratoren
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.admins || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Suchen..."
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
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="active">Aktiv</MenuItem>
                <MenuItem value="blocked">Gesperrt</MenuItem>
                <MenuItem value="pending">Ausstehend</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                value={roleFilter}
                label="Rolle"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
                <MenuItem value="user">Benutzer</MenuItem>
                <MenuItem value="customer">Kunde</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Neu
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="50px"></TableCell>
              <TableCell>Benutzer</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Kundennummer</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Rolle</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Registriert</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">Laden...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">Keine Benutzer gefunden</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <React.Fragment key={user._id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleRowExpand(user._id)}>
                        {expandedRows[user._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar>
                          {(user.firstName || user.vorname)?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {(user.firstName || user.vorname) && (user.lastName || user.nachname) 
                              ? `${user.firstName || user.vorname} ${user.lastName || user.nachname}` 
                              : user.email}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {user.geschlecht && `${user.geschlecht}`}
                            {user.geburtsdatum && ` • ${new Date(user.geburtsdatum).getFullYear()}`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {user.kundennummer || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.phone || user.telefon || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleLabel(user.rolle || user.role)} 
                        size="small" 
                        color={(user.rolle === 'admin' || user.role === 'admin') ? 'primary' : 'default'} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(user.status)} size="small" color={getStatusColor(user.status)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Bearbeiten">
                        <IconButton size="small" onClick={() => openEditUserDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Passwort ändern">
                        <IconButton size="small" onClick={() => openChangePasswordDialog(user)}>
                          <PasswordIcon />
                        </IconButton>
                      </Tooltip>
                      {user.status === 'blocked' ? (
                        <Tooltip title="Entsperren">
                          <IconButton size="small" color="success" onClick={() => handleUnblockUser(user)}>
                            <UnblockIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Sperren">
                          <IconButton size="small" color="warning" onClick={() => handleBlockUser(user)}>
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Löschen">
                        <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  
                  {/* Erweiterte Detailzeile */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                      <Collapse in={expandedRows[user._id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Weitere Details
                          </Typography>
                          <Grid container spacing={2}>
                            {/* Adressinformationen */}
                            {user.adresse && (
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                      Rechnungsadresse
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.adresse.strasse} {user.adresse.hausnummer}
                                      {user.adresse.zusatz && `, ${user.adresse.zusatz}`}
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.adresse.plz} {user.adresse.stadt}
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.adresse.land}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            )}
                            
                            {/* Lieferadresse falls vorhanden */}
                            {user.lieferadresse?.verwendet && (
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                      Lieferadresse
                                    </Typography>
                                    {user.lieferadresse.firmenname && (
                                      <Typography variant="body2" fontWeight="bold">
                                        {user.lieferadresse.firmenname}
                                      </Typography>
                                    )}
                                    <Typography variant="body2">
                                      {user.lieferadresse.vorname} {user.lieferadresse.nachname}
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.lieferadresse.strasse} {user.lieferadresse.hausnummer}
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.lieferadresse.plz} {user.lieferadresse.stadt}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            )}
                            
                            {/* Kommunikation */}
                            {user.kommunikation && (
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                      Kommunikationspräferenzen
                                    </Typography>
                                    <Typography variant="body2">
                                      Newsletter: {user.kommunikation.newsletter ? 'Ja' : 'Nein'}
                                    </Typography>
                                    <Typography variant="body2">
                                      SMS: {user.kommunikation.sms ? 'Ja' : 'Nein'}
                                    </Typography>
                                    {user.kommunikation.bevorzugterKanal && (
                                      <Typography variant="body2">
                                        Bevorzugter Kanal: {user.kommunikation.bevorzugterKanal}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            )}
                            
                            {/* Notizen */}
                            {user.notizen && (
                              <Grid item xs={12}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                      Notizen
                                    </Typography>
                                    <Typography variant="body2">
                                      {user.notizen || 'Keine Notizen vorhanden'}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            )}
                            
                            {/* Zusätzliche Infos */}
                            <Grid item xs={12} md={6}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Kontodetails
                                  </Typography>
                                  <Typography variant="body2">
                                    Anmeldeversuche: {user.anmeldeversuche || 0}
                                  </Typography>
                                  <Typography variant="body2">
                                    Letzter Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString('de-DE') : 'Noch nie'}
                                  </Typography>
                                  <Typography variant="body2">
                                    Aktualisiert: {user.updatedAt ? new Date(user.updatedAt).toLocaleString('de-DE') : '-'}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Zeilen pro Seite:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
        />
      </TableContainer>

      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Passwort"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                helperText="Mindestens 8 Zeichen"
                error={formData.password && formData.password.length < 8}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label="Passwort anzeigen"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vorname"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nachname"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={formData.role}
                  label="Rolle"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="customer">Kunde</MenuItem>
                  <MenuItem value="user">Benutzer</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenCreateDialog(false); resetForm(); }}>Abbrechen</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained"
            disabled={!formData.email || !formData.password || formData.password.length < 8 || !formData.firstName || !formData.lastName}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Benutzer bearbeiten</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Persönliche Daten */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Persönliche Daten
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vorname"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nachname"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Geschlecht</InputLabel>
                <Select
                  value={formData.geschlecht}
                  label="Geschlecht"
                  onChange={(e) => setFormData({ ...formData, geschlecht: e.target.value })}
                >
                  <MenuItem value="">Nicht angegeben</MenuItem>
                  <MenuItem value="männlich">Männlich</MenuItem>
                  <MenuItem value="weiblich">Weiblich</MenuItem>
                  <MenuItem value="divers">Divers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Geburtsdatum"
                type="date"
                value={formData.geburtsdatum}
                onChange={(e) => setFormData({ ...formData, geburtsdatum: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Kundennummer"
                value={formData.kundennummer}
                onChange={(e) => setFormData({ ...formData, kundennummer: e.target.value })}
                disabled
                helperText="Wird automatisch generiert"
              />
            </Grid>
            
            {/* Adresse */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                Rechnungsadresse
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Straße"
                value={formData.strasse}
                onChange={(e) => setFormData({ ...formData, strasse: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Hausnummer"
                value={formData.hausnummer}
                onChange={(e) => setFormData({ ...formData, hausnummer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresszusatz"
                value={formData.zusatz}
                onChange={(e) => setFormData({ ...formData, zusatz: e.target.value })}
                placeholder="z.B. c/o, 2. Stock, etc."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="PLZ"
                value={formData.plz}
                onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Stadt"
                value={formData.stadt}
                onChange={(e) => setFormData({ ...formData, stadt: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Land"
                value={formData.land}
                onChange={(e) => setFormData({ ...formData, land: e.target.value })}
              />
            </Grid>
            
            {/* Kommunikation */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                Kommunikationspräferenzen
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <Box display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  <Typography>Newsletter abonnieren</Typography>
                </Box>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <Box display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    checked={formData.sms}
                    onChange={(e) => setFormData({ ...formData, sms: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  <Typography>SMS-Benachrichtigungen</Typography>
                </Box>
              </FormControl>
            </Grid>
            
            {/* Rolle */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                Kontoeinstellungen
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={formData.role}
                  label="Rolle"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="customer">Kunde</MenuItem>
                  <MenuItem value="user">Benutzer</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Notizen */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={3}
                value={formData.notizen}
                onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                placeholder="Interne Notizen zum Kunden..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenEditDialog(false); resetForm(); }}>Abbrechen</Button>
          <Button onClick={handleUpdateUser} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Passwort ändern</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Neues Passwort"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPasswordDialog(false); setNewPassword(''); }}>Abbrechen</Button>
          <Button onClick={handleChangePassword} variant="contained">Ändern</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AdminUsers;