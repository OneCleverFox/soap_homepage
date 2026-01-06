/* eslint-disable no-unused-vars */
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Switch,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { 
  Person,
  Email,
  Phone,
  Edit,
  Save,
  Cancel,
  Delete,
  Warning,
  Security,
  AccountCircle,
  ExpandMore,
  ContactMail,
  LocationOn,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { API_URL } from '../services/api';
import { ordersAPI } from '../services/api';

const AccordionProfilePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    telefon: '',
    adresse: {
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: '',
      land: 'Deutschland'
    },
    kommunikation: {
      emailBenachrichtigungen: true,
      smsBenachrichtigungen: false,
      newsletterAbonniert: true
    }
  });
  const [editMode, setEditMode] = useState({
    personal: false,
    address: false,
    communication: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [canDeleteAccount, setCanDeleteAccount] = useState(false);
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    email: '',
    reason: ''
  });

    // Render-Funktionen für mobile Ansicht
  const renderMobilePersonalDataSection = () => (
    <AccordionDetails sx={{ p: 1 }}>
      <Box sx={{ space: 1 }}>
        <TextField
          fullWidth
          label="Name"
          value={profileData.name}
          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
          disabled={!editMode.personal}
          size="small"
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        <TextField
          fullWidth
          label="E-Mail"
          value={profileData.email}
          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
          disabled={!editMode.personal}
          size="small"
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        <TextField
          fullWidth
          label="Telefon"
          value={profileData.telefon || ''}
          onChange={(e) => setProfileData(prev => ({ ...prev, telefon: e.target.value }))}
          disabled={!editMode.personal}
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode.personal ? (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleSave('personal')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                sx={{ flex: 1 }}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEditMode(prev => ({ ...prev, personal: false }))}
                startIcon={<Cancel />}
                sx={{ flex: 1 }}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => setEditMode(prev => ({ ...prev, personal: true }))}
              startIcon={<Edit />}
              fullWidth
            >
              Bearbeiten
            </Button>
          )}
        </Box>
      </Box>
    </AccordionDetails>
  );

  const renderMobileAddressSection = () => (
    <AccordionDetails sx={{ p: 1 }}>
      <Box sx={{ space: 1 }}>
        <TextField
          fullWidth
          label="Straße"
          value={profileData.adresse?.strasse || ''}
          onChange={(e) => setProfileData(prev => ({ 
            ...prev, 
            adresse: { ...prev.adresse, strasse: e.target.value }
          }))}
          disabled={!editMode.address}
          size="small"
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          label="Hausnummer"
          value={profileData.adresse?.hausnummer || ''}
          onChange={(e) => setProfileData(prev => ({ 
            ...prev, 
            adresse: { ...prev.adresse, hausnummer: e.target.value }
          }))}
          disabled={!editMode.address}
          size="small"
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="PLZ"
            value={profileData.adresse?.plz || ''}
            onChange={(e) => setProfileData(prev => ({ 
              ...prev, 
              adresse: { ...prev.adresse, plz: e.target.value }
            }))}
            disabled={!editMode.address}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Ort"
            value={profileData.adresse?.ort || ''}
            onChange={(e) => setProfileData(prev => ({ 
              ...prev, 
              adresse: { ...prev.adresse, ort: e.target.value }
            }))}
            disabled={!editMode.address}
            size="small"
            sx={{ flex: 2 }}
          />
        </Box>
        <TextField
          fullWidth
          label="Land"
          value={profileData.adresse?.land || 'Deutschland'}
          onChange={(e) => setProfileData(prev => ({ 
            ...prev, 
            adresse: { ...prev.adresse, land: e.target.value }
          }))}
          disabled={!editMode.address}
          size="small"
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode.address ? (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleSave('address')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                sx={{ flex: 1 }}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEditMode(prev => ({ ...prev, address: false }))}
                startIcon={<Cancel />}
                sx={{ flex: 1 }}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => setEditMode(prev => ({ ...prev, address: true }))}
              startIcon={<Edit />}
              fullWidth
            >
              Bearbeiten
            </Button>
          )}
        </Box>
      </Box>
    </AccordionDetails>
  );

  const renderMobileCommunicationSection = () => (
    <AccordionDetails sx={{ p: 2 }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Wählen Sie, welche Benachrichtigungen Sie erhalten möchten:
        </Typography>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={profileData.kommunikation?.emailBenachrichtigungen}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  kommunikation: { 
                    ...prev.kommunikation, 
                    emailBenachrichtigungen: e.target.checked 
                  }
                }))}
                disabled={!editMode.communication}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">E-Mail Benachrichtigungen</Typography>
                <Typography variant="caption" color="text.secondary">
                  E-Mail bei neuen Bestellungen
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={profileData.kommunikation?.smsBenachrichtigungen}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  kommunikation: { 
                    ...prev.kommunikation, 
                    smsBenachrichtigungen: e.target.checked 
                  }
                }))}
                disabled={!editMode.communication}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">SMS Benachrichtigungen</Typography>
                <Typography variant="caption" color="text.secondary">
                  SMS bei wichtigen Updates
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={profileData.kommunikation?.newsletterAbonniert}
                onChange={(e) => setProfileData(prev => ({ 
                  ...prev, 
                  kommunikation: { 
                    ...prev.kommunikation, 
                    newsletterAbonniert: e.target.checked 
                  }
                }))}
                disabled={!editMode.communication}
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2">Newsletter</Typography>
                <Typography variant="caption" color="text.secondary">
                  Neuigkeiten und Angebote
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />
        </FormGroup>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode.communication ? (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleSave('communication')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                sx={{ flex: 1 }}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEditMode(prev => ({ ...prev, communication: false }))}
                startIcon={<Cancel />}
                sx={{ flex: 1 }}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => setEditMode(prev => ({ ...prev, communication: true }))}
              startIcon={<Edit />}
              fullWidth
            >
              Bearbeiten
            </Button>
          )}
        </Box>
      </Box>
    </AccordionDetails>
  );
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
      fetchProfile();
      checkAccountDeletionEligibility();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('🔍 AccordionProfile: Profile laden - Token vorhanden:', !!token);
      console.log('🔍 AccordionProfile: API_URL:', API_URL);
      
      // Versuche zuerst die Kunden-spezifische API
      let response = await fetch(`${API_URL}/kunden/profil`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 AccordionProfile: Kunden-API Response Status:', response.status);

      // Falls Kunden-API fehlschlägt, versuche die Auth-API
      if (!response.ok && response.status === 401) {
        console.log('🔄 AccordionProfile: Kunden-API nicht zugänglich, versuche Auth-API');
        response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('📋 AccordionProfile: Profile Response Status:', response.status);
      
      const data = await response.json();
      console.log('📋 AccordionProfile: RAW Response Data:', JSON.stringify(data, null, 2));
      
      if (response.ok && data.success) {
        console.log('✅ AccordionProfile: Profile erfolgreich geladen');
        
        // Prüfe ob es Kunden-API Antwort ist (deutsche Feldnamen) oder Auth-API
        const isKundenAPI = data.data.vorname !== undefined;
        console.log('🔍 AccordionProfile: Kunden-API Response:', isKundenAPI);
        
        if (isKundenAPI) {
          // Kunden-API: Deutsche Feldnamen mappen
          setProfileData(prev => ({
            ...prev,
            name: `${data.data.vorname || ''} ${data.data.nachname || ''}`.trim(),
            email: data.data.email || '',
            telefon: data.data.telefon || '',
            adresse: {
              strasse: data.data.adresse?.strasse || '',
              hausnummer: data.data.adresse?.hausnummer || '',
              plz: data.data.adresse?.plz || '',
              ort: data.data.adresse?.stadt || '',
              land: data.data.adresse?.land || 'Deutschland'
            },
            kommunikation: {
              emailBenachrichtigungen: data.data.praeferenzen?.newsletter !== false,
              smsBenachrichtigungen: data.data.praeferenzen?.sms || false,
              newsletterAbonniert: data.data.praeferenzen?.newsletter || false
            }
          }));
        } else {
          // Auth-API: Direkt verwenden
          setProfileData(prev => ({
            ...prev,
            ...data.data,
            adresse: {
              ...prev.adresse,
              ...data.data.adresse
            },
            kommunikation: {
              ...prev.kommunikation,
              ...data.data.kommunikation
            }
          }));
        }
        console.log('✅ AccordionProfile: ProfileData gesetzt');
      } else {
        console.error('❌ AccordionProfile: Fehler beim Laden des Profils:', data.message || response.statusText);
        setError('Fehler beim Laden der Profildaten');
      }
    } catch (error) {
      console.error('❌ AccordionProfile: Fehler beim Laden des Profils:', error);
      setError('Netzwerkfehler beim Laden der Profildaten');
    } finally {
      setLoading(false);
    }
  };

  // Prüfe, ob Account gelöscht werden kann (alle Bestellungen zugestellt)
  const checkAccountDeletionEligibility = async () => {
    try {
      const result = await ordersAPI.getCustomerOrders({
        limit: 100, // Alle Bestellungen laden
        sortBy: 'bestelldatum',
        sortOrder: 'desc'
      });

      if (result.success && result.data.bestellungen) {
        const bestellungen = result.data.bestellungen;
        
        // Prüfe, ob alle Bestellungen zugestellt sind
        const undeliveredOrders = bestellungen.filter(order => 
          order.status !== 'zugestellt' && 
          order.status !== 'storniert' && 
          order.status !== 'rueckerstattung'
        );
        
        setCanDeleteAccount(undeliveredOrders.length === 0);
        console.log('🔍 Account deletion check:', {
          totalOrders: bestellungen.length,
          undeliveredOrders: undeliveredOrders.length,
          canDelete: undeliveredOrders.length === 0
        });
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Account-Löschung:', error);
      setCanDeleteAccount(false);
    }
  };

  const handleSave = async (section) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('💾 AccordionProfile: Speichere Sektion:', section);
      console.log('💾 AccordionProfile: ProfileData:', JSON.stringify(profileData, null, 2));

      const token = localStorage.getItem('token');
      
      // Versuche zuerst die Kunden-API für das Speichern, da diese normalerweise funktioniert
      const kundenData = {
        // AccordionProfile structure zu Kunden-API mapping
        vorname: profileData.name.split(' ')[0] || '',
        nachname: profileData.name.split(' ').slice(1).join(' ') || '',
        email: profileData.email,
        telefon: profileData.telefon,
        adresse: {
          strasse: profileData.adresse.strasse,
          hausnummer: profileData.adresse.hausnummer,
          plz: profileData.adresse.plz,
          stadt: profileData.adresse.ort,
          land: profileData.adresse.land
        },
        praeferenzen: {
          newsletter: profileData.kommunikation.newsletterAbonniert,
          sms: profileData.kommunikation.smsBenachrichtigungen,
          werbung: profileData.kommunikation.emailBenachrichtigungen
        }
      };

      console.log('💾 AccordionProfile: Mapped Kunden Data:', JSON.stringify(kundenData, null, 2));

      let response = await fetch(`${API_URL}/kunden/profil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(kundenData)
      });

      console.log('📋 AccordionProfile: Kunden-API Save Response Status:', response.status);

      // Falls Kunden-API fehlschlägt, versuche Auth-API
      if (!response.ok && response.status === 401) {
        console.log('🔄 AccordionProfile: Kunden-API Save fehlgeschlagen, versuche Auth-API');
        response = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        });
      }

      const data = await response.json();
      console.log('📋 AccordionProfile: Save Response Data:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        console.log('✅ AccordionProfile: Speichern erfolgreich');
        setSuccess(`${section} erfolgreich aktualisiert!`);
        setEditMode(prev => ({ ...prev, [section]: false }));
        setTimeout(() => setSuccess(''), 3000);
        
        // Profil neu laden um sicherzustellen dass die Daten aktuell sind
        await fetchProfile();
      } else {
        console.error('❌ AccordionProfile: Speichern fehlgeschlagen:', data.message);
        setError(data.message || 'Fehler beim Aktualisieren der Daten');
      }
    } catch (error) {
      console.error('❌ AccordionProfile: Fehler beim Speichern:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logout();
        navigate('/', { 
          replace: true,
          state: { message: 'Ihr Account wurde erfolgreich gelöscht.' }
        });
      } else {
        setError(data.message || 'Fehler beim Löschen des Accounts');
      }
    } catch (error) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
      setDeleteDialog(false);
    }
  };

  const renderPersonalDataSection = () => (
    <AccordionDetails>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            value={profileData.name}
            disabled={!editMode.personal}
            onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
            InputProps={{
              startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="E-Mail"
            value={profileData.email}
            disabled={!editMode.personal}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Telefon"
            value={profileData.telefon || ''}
            disabled={!editMode.personal}
            onChange={(e) => setProfileData(prev => ({ ...prev, telefon: e.target.value }))}
            InputProps={{
              startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {editMode.personal ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(prev => ({ ...prev, personal: false }))}
                  startIcon={<Cancel />}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSave('personal')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                >
                  Speichern
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setEditMode(prev => ({ ...prev, personal: true }))}
                startIcon={<Edit />}
              >
                Bearbeiten
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </AccordionDetails>
  );

  const renderAddressSection = () => (
    <AccordionDetails>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Straße"
            value={profileData.adresse?.strasse || ''}
            disabled={!editMode.address}
            onChange={(e) => setProfileData(prev => ({
              ...prev,
              adresse: { ...prev.adresse, strasse: e.target.value }
            }))}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Hausnummer"
            value={profileData.adresse?.hausnummer || ''}
            disabled={!editMode.address}
            onChange={(e) => setProfileData(prev => ({
              ...prev,
              adresse: { ...prev.adresse, hausnummer: e.target.value }
            }))}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="PLZ"
            value={profileData.adresse?.plz || ''}
            disabled={!editMode.address}
            onChange={(e) => setProfileData(prev => ({
              ...prev,
              adresse: { ...prev.adresse, plz: e.target.value }
            }))}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Ort"
            value={profileData.adresse?.ort || ''}
            disabled={!editMode.address}
            onChange={(e) => setProfileData(prev => ({
              ...prev,
              adresse: { ...prev.adresse, ort: e.target.value }
            }))}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Land"
            value={profileData.adresse?.land || 'Deutschland'}
            disabled={!editMode.address}
            onChange={(e) => setProfileData(prev => ({
              ...prev,
              adresse: { ...prev.adresse, land: e.target.value }
            }))}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {editMode.address ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(prev => ({ ...prev, address: false }))}
                  startIcon={<Cancel />}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSave('address')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                >
                  Speichern
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setEditMode(prev => ({ ...prev, address: true }))}
                startIcon={<Edit />}
              >
                Bearbeiten
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </AccordionDetails>
  );

  const renderCommunicationSection = () => (
    <AccordionDetails>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Verwalten Sie Ihre Kommunikationseinstellungen
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={profileData.kommunikation?.emailBenachrichtigungen || false}
                  disabled={!editMode.communication}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    kommunikation: {
                      ...prev.kommunikation,
                      emailBenachrichtigungen: e.target.checked
                    }
                  }))}
                />
              }
              label="E-Mail-Benachrichtigungen"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={profileData.kommunikation?.smsBenachrichtigungen || false}
                  disabled={!editMode.communication}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    kommunikation: {
                      ...prev.kommunikation,
                      smsBenachrichtigungen: e.target.checked
                    }
                  }))}
                />
              }
              label="SMS-Benachrichtigungen"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={profileData.kommunikation?.newsletterAbonniert || false}
                  disabled={!editMode.communication}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    kommunikation: {
                      ...prev.kommunikation,
                      newsletterAbonniert: e.target.checked
                    }
                  }))}
                />
              }
              label="Newsletter abonniert"
            />
          </FormGroup>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {editMode.communication ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(prev => ({ ...prev, communication: false }))}
                  startIcon={<Cancel />}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSave('communication')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                >
                  Speichern
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setEditMode(prev => ({ ...prev, communication: true }))}
                startIcon={<Edit />}
              >
                Bearbeiten
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </AccordionDetails>
  );

  const renderAccountDeletionSection = () => (
    <AccordionDetails>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert 
            severity={canDeleteAccount ? "warning" : "info"} 
            sx={{ mb: 2 }}
          >
            {canDeleteAccount ? (
              "Ihr Account kann gelöscht werden, da alle Ihre Bestellungen zugestellt wurden."
            ) : (
              "Ihr Account kann erst gelöscht werden, wenn alle Ihre Bestellungen zugestellt wurden."
            )}
          </Alert>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Die Löschung Ihres Accounts ist unwiderruflich. Alle Ihre Daten werden permanent entfernt.
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <Button
            variant="outlined"
            color="error"
            disabled={!canDeleteAccount}
            onClick={() => setDeleteDialog(true)}
            startIcon={<Delete />}
          >
            Account löschen
          </Button>
        </Grid>
      </Grid>
    </AccordionDetails>
  );

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Bitte melden Sie sich an.</Typography>
        </Paper>
      </Container>
    );
  }

  // Mobile Header
  const MobileHeader = () => (
    <AppBar 
      position="sticky" 
      sx={{ 
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important' }}>
        <IconButton 
          edge="start" 
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>
        <AccountCircle sx={{ mr: 2 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Mein Profil
        </Typography>
      </Toolbar>
    </AppBar>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <Box>
        <MobileHeader />
        
        <Box sx={{ p: 1 }}>
          {/* Persönliche Daten */}
          <Accordion sx={{ mb: 1 }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ minHeight: 64 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Person sx={{ mr: 2, color: 'primary.main' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Persönliche Daten
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.name} • {user.email}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            {renderMobilePersonalDataSection()}
          </Accordion>

          {/* Adresse */}
          <Accordion sx={{ mb: 1 }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ minHeight: 64 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <LocationOn sx={{ mr: 2, color: 'primary.main' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Adresse
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Liefer- und Rechnungsadresse
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            {renderMobileAddressSection()}
          </Accordion>

          {/* Kommunikation */}
          <Accordion sx={{ mb: 1 }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ minHeight: 64 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <ContactMail sx={{ mr: 2, color: 'primary.main' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Kommunikation
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Benachrichtigungen & Newsletter
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            {renderMobileCommunicationSection()}
          </Accordion>

          {/* Account-Verwaltung */}
          <Accordion sx={{ mb: 1 }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ minHeight: 64 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Security sx={{ mr: 2, color: 'error.main' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Account-Verwaltung
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Account löschen
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            {renderAccountDeletionSection()}
          </Accordion>
        </Box>

        {/* Account-Löschung Dialog */}
        <Dialog 
          open={deleteDialog} 
          onClose={() => setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { m: 1, maxHeight: 'calc(100vh - 64px)' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warning sx={{ mr: 2, color: 'error.main' }} />
              Account löschen
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" gutterBottom>
              Sind Sie sicher, dass Sie Ihren Account löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Passwort bestätigen"
                type="password"
                value={deleteForm.password}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, password: e.target.value }))}
                sx={{ mb: 2 }}
                size="small"
              />
              <TextField
                fullWidth
                label="E-Mail zur Bestätigung"
                value={deleteForm.email}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, email: e.target.value }))}
                sx={{ mb: 2 }}
                size="small"
              />
              <TextField
                fullWidth
                label="Grund für die Löschung (optional)"
                multiline
                rows={3}
                value={deleteForm.reason}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
                size="small"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="contained"
              color="error"
              onClick={handleDeleteAccount}
              disabled={loading || !deleteForm.password || !deleteForm.email}
              startIcon={loading ? <CircularProgress size={20} /> : <Delete />}
              size="small"
            >
              Account löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Desktop Layout (Original)
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <AccountCircle sx={{ mr: 2 }} />
        Mein Profil
      </Typography>

      {/* Persönliche Daten */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">Persönliche Daten</Typography>
              <Typography variant="body2" color="text.secondary">
                Name, E-Mail und Telefonnummer
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        {renderPersonalDataSection()}
      </Accordion>

      {/* Adresse */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">Adresse</Typography>
              <Typography variant="body2" color="text.secondary">
                Lieferadresse und Rechnungsadresse
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        {renderAddressSection()}
      </Accordion>

      {/* Kommunikation */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ContactMail sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">Kommunikation</Typography>
              <Typography variant="body2" color="text.secondary">
                E-Mail-Benachrichtigungen und Newsletter
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        {renderCommunicationSection()}
      </Accordion>

      {/* Account-Verwaltung */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Security sx={{ mr: 2, color: 'error.main' }} />
            <Box>
              <Typography variant="h6">Account-Verwaltung</Typography>
              <Typography variant="body2" color="text.secondary">
                Account löschen und Sicherheitseinstellungen
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        {renderAccountDeletionSection()}
      </Accordion>

      {/* Account-Löschung Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 2, color: 'error.main' }} />
            Account löschen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Sind Sie sicher, dass Sie Ihren Account löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Passwort bestätigen"
              type="password"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm(prev => ({ ...prev, password: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="E-Mail zur Bestätigung"
              value={deleteForm.email}
              onChange={(e) => setDeleteForm(prev => ({ ...prev, email: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Grund für die Löschung (optional)"
              multiline
              rows={3}
              value={deleteForm.reason}
              onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="contained"
            color="error"
            onClick={handleDeleteAccount}
            disabled={loading || !deleteForm.password || !deleteForm.email}
            startIcon={loading ? <CircularProgress size={20} /> : <Delete />}
          >
            Account löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AccordionProfilePage;