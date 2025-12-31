import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  FormGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  Person,
  Email,
  Phone,
  Home,
  Edit,
  Save,
  Cancel,
  Delete,
  Warning,
  CheckCircle,
  Security,
  Notifications,
  AccountCircle,
  LocalShipping
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { API_URL } from '../services/api';
import OrderHistory from '../components/OrderHistory';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    geschlecht: '',
    address: {
      street: '',
      houseNumber: '',
      zusatz: '',
      zipCode: '',
      city: '',
      country: 'Deutschland'
    },
    lieferadresse: {
      verwendet: false,
      firmenname: '',
      vorname: '',
      nachname: '',
      street: '',
      houseNumber: '',
      zusatz: '',
      zipCode: '',
      city: '',
      country: 'Deutschland'
    },
    dateOfBirth: '',
    communicationPreferences: {
      newsletter: false,
      sms: false,
      werbung: false
    }
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    email: '',
    reason: ''
  });

  // Profil-Daten laden
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('🔍 FRONTEND: Profile laden - Token vorhanden:', !!token);
      console.log('🔍 FRONTEND: API_URL:', API_URL);
      
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 FRONTEND: Profile Response Status:', response.status);
      console.log('📋 FRONTEND: Response OK:', response.ok);
      
      if (!response.ok) {
        console.error('❌ FRONTEND: Response nicht OK:', response.status, response.statusText);
        setError(`HTTP Error: ${response.status}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📋 FRONTEND: RAW Backend Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ FRONTEND: Profile erfolgreich geladen');
        console.log('🔍 FRONTEND: Response Data:', data.data);
        console.log('🔍 FRONTEND: AddressDetails in Response:', data.data.addressDetails);
        console.log('🔍 FRONTEND: LieferadresseDetails in Response:', data.data.lieferadresseDetails);
        console.log('🔍 FRONTEND: FirstName in Response:', data.data.firstName);
        console.log('🔍 FRONTEND: LastName in Response:', data.data.lastName);
        console.log('🔍 FRONTEND: Geschlecht in Response:', data.data.geschlecht);
        
        setProfileData(prev => ({
          ...prev,
          username: data.data.username || '',
          email: data.data.email || '',
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          phone: data.data.phone || '',
          geschlecht: data.data.geschlecht || '',
          dateOfBirth: data.data.dateOfBirth ? data.data.dateOfBirth.split('T')[0] : '',
          // Backend sendet addressDetails - mappen zu address
          address: {
            street: data.data.addressDetails?.street || '',
            houseNumber: data.data.addressDetails?.houseNumber || '',
            zusatz: data.data.addressDetails?.zusatz || '',
            zipCode: data.data.addressDetails?.zipCode || '',
            city: data.data.addressDetails?.city || '',
            country: data.data.addressDetails?.country || 'Deutschland'
          },
          // Backend sendet lieferadresseDetails - mappen zu lieferadresse
          lieferadresse: {
            verwendet: data.data.lieferadresseDetails?.verwendet || false,
            firmenname: data.data.lieferadresseDetails?.firmenname || '',
            vorname: data.data.lieferadresseDetails?.vorname || '',
            nachname: data.data.lieferadresseDetails?.nachname || '',
            street: data.data.lieferadresseDetails?.street || '',
            houseNumber: data.data.lieferadresseDetails?.houseNumber || '',
            zusatz: data.data.lieferadresseDetails?.zusatz || '',
            zipCode: data.data.lieferadresseDetails?.zipCode || '',
            city: data.data.lieferadresseDetails?.city || '',
            country: data.data.lieferadresseDetails?.country || 'Deutschland'
          },
          communicationPreferences: {
            newsletter: data.data.communicationPreferences?.newsletter || false,
            sms: data.data.communicationPreferences?.sms || false,
            werbung: data.data.communicationPreferences?.werbung || false
          }
        }));
      } else {
        console.error('❌ Profile Fehler:', data.message);
        setError(data.message || 'Fehler beim Laden der Profil-Daten');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Profils:', error);
      setError('Verbindungsfehler beim Laden der Profil-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('communicationPreferences.')) {
      const prefField = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        communicationPreferences: {
          ...prev.communicationPreferences,
          [prefField]: e.target.checked
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setEditMode(false);
        // Profil neu laden um aktuelle Daten zu haben
        fetchProfile();
      } else {
        setError(data.message || 'Fehler beim Speichern der Profil-Daten');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError('Verbindungsfehler beim Speichern der Profil-Daten');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      setError('');

      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmEmail: deleteConfirmation.email,
          reason: deleteConfirmation.reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setDeleteDialogOpen(false);
        
        // Nach kurzer Verzögerung ausloggen und zur Startseite
        setTimeout(() => {
          logout();
          navigate('/');
        }, 3000);
      } else {
        setError(data.message || 'Fehler beim Löschen des Accounts');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      setError('Verbindungsfehler beim Löschen des Accounts');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <AccountCircle sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Mein Profil
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie Ihre persönlichen Daten und Einstellungen
            </Typography>
          </Box>
          <Chip 
            label={editMode ? 'Bearbeitungsmodus' : 'Ansichtsmodus'} 
            color={editMode ? 'primary' : 'default'}
            variant={editMode ? 'filled' : 'outlined'}
          />
        </Box>

        {/* Nachrichten */}
        {message && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Persönliche Daten */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Persönliche Daten</Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Benutzername"
                  name="username"
                  value={profileData.username}
                  disabled
                  variant="outlined"
                  helperText="Wird automatisch aus Vor- und Nachname generiert"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="E-Mail-Adresse"
                  name="email"
                  value={profileData.email}
                  disabled
                  variant="outlined"
                  helperText="E-Mail kann nicht geändert werden"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vorname"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nachname"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" disabled={!editMode}>
                  <InputLabel>Geschlecht</InputLabel>
                  <Select
                    name="geschlecht"
                    value={profileData.geschlecht}
                    onChange={handleInputChange}
                    label="Geschlecht"
                  >
                    <MenuItem value=""><em>Bitte wählen</em></MenuItem>
                    <MenuItem value="herr">Herr</MenuItem>
                    <MenuItem value="frau">Frau</MenuItem>
                    <MenuItem value="divers">Divers</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Geburtsdatum"
                  name="dateOfBirth"
                  type="date"
                  value={formatDate(profileData.dateOfBirth)}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Adressdaten */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Home sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Adresse</Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Straße"
                  name="address.street"
                  value={profileData.address.street}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Hausnummer"
                  name="address.houseNumber"
                  value={profileData.address.houseNumber}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adresszusatz"
                  name="address.zusatz"
                  value={profileData.address.zusatz}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="PLZ"
                  name="address.zipCode"
                  value={profileData.address.zipCode}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Stadt"
                  name="address.city"
                  value={profileData.address.city}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Land"
                  name="address.country"
                  value={profileData.address.country}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Lieferadresse */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Lieferadresse</Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.lieferadresse.verwendet}
                      onChange={handleInputChange}
                      name="lieferadresse.verwendet"
                      disabled={!editMode}
                    />
                  }
                  label="Abweichende Lieferadresse verwenden"
                />
              </Grid>
              
              {profileData.lieferadresse.verwendet && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Firmenname (optional)"
                      name="lieferadresse.firmenname"
                      value={profileData.lieferadresse.firmenname}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vorname"
                      name="lieferadresse.vorname"
                      value={profileData.lieferadresse.vorname}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nachname"
                      name="lieferadresse.nachname"
                      value={profileData.lieferadresse.nachname}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Straße"
                      name="lieferadresse.street"
                      value={profileData.lieferadresse.street}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Hausnummer"
                      name="lieferadresse.houseNumber"
                      value={profileData.lieferadresse.houseNumber}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Adresszusatz"
                      name="lieferadresse.zusatz"
                      value={profileData.lieferadresse.zusatz}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PLZ"
                      name="lieferadresse.zipCode"
                      value={profileData.lieferadresse.zipCode}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Stadt"
                      name="lieferadresse.city"
                      value={profileData.lieferadresse.city}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Land"
                      name="lieferadresse.country"
                      value={profileData.lieferadresse.country}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      variant="outlined"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Kommunikationseinstellungen */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Notifications sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Kommunikationseinstellungen</Typography>
            </Box>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.communicationPreferences.newsletter}
                    onChange={handleInputChange}
                    name="communicationPreferences.newsletter"
                    disabled={!editMode}
                  />
                }
                label="Newsletter erhalten"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.communicationPreferences.sms}
                    onChange={handleInputChange}
                    name="communicationPreferences.sms"
                    disabled={!editMode}
                  />
                }
                label="SMS-Benachrichtigungen erhalten"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.communicationPreferences.werbung}
                    onChange={handleInputChange}
                    name="communicationPreferences.werbung"
                    disabled={!editMode}
                  />
                }
                label="Werbung per E-Mail erhalten"
              />
            </FormGroup>
          </CardContent>
        </Card>

        {/* Bestellhistorie */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <OrderHistory />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mb: 3 }}>
          {!editMode ? (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditMode(true)}
            >
              Bearbeiten
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => {
                  setEditMode(false);
                  fetchProfile(); // Änderungen verwerfen
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Danger Zone */}
        <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Warning sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6" color="error">
                Danger Zone
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Das Löschen Ihres Accounts ist unwiderruflich. Alle Ihre Daten werden permanent entfernt.
            </Typography>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Account löschen
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warning sx={{ mr: 1 }} />
              Account unwiderruflich löschen
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
              Alle Ihre Daten werden permanent gelöscht.
            </Typography>
            
            <TextField
              fullWidth
              label="Zur Bestätigung E-Mail-Adresse eingeben"
              value={deleteConfirmation.email}
              onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, email: e.target.value }))}
              margin="normal"
              helperText={`Geben Sie "${profileData.email}" ein`}
            />
            
            <TextField
              fullWidth
              label="Grund für die Löschung (optional)"
              value={deleteConfirmation.reason}
              onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, reason: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation.email !== profileData.email || deleting}
              startIcon={deleting ? <CircularProgress size={20} /> : <Delete />}
            >
              {deleting ? 'Lösche Account...' : 'Account löschen'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default ProfilePage;