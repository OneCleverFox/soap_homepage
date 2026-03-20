import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Pagination,
  Tooltip,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function formatDateTime(isoString) {
  if (!isoString) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(isoString));
}

const STATUS_CONFIG = {
  received:  { label: 'Eingegangen',  color: 'info' },
  confirmed: { label: 'Bestätigt',    color: 'primary' },
  processed: { label: 'Abgeschlossen', color: 'success' },
  rejected:  { label: 'Abgelehnt',   color: 'error' }
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label
}));

const EMPTY_MANUAL_FORM = {
  customerName: '', customerEmail: '', customerAddress: '',
  orderNumber: '', contractRef: '', statementText: '', adminNote: ''
};

// ── Statusänderungs-Dialog ───────────────────────────────────────────────────
function StatusDialog({ open, widerruf, onClose, onSave }) {
  const [status, setStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (widerruf) {
      setStatus(widerruf.status || 'received');
      setAdminNote(widerruf.adminNote || '');
    }
    setError('');
  }, [widerruf]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/widerruf/admin/${widerruf._id}/status`, { status, adminNote });
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Status aktualisieren</DialogTitle>
      <DialogContent>
        {widerruf && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Kunde: <strong>{widerruf.customerName || '–'}</strong> | Bestellnr.:{' '}
              <strong>{widerruf.orderNumber || widerruf.contractRef || '–'}</strong>
            </Typography>
          </Box>
        )}
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Interne Notiz"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          fullWidth
          multiline
          rows={3}
          helperText="Nur intern sichtbar. Z. B. Rückgabe-Tracking-Nr. oder Erstattungsdatum."
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Manueller Widerruf-Dialog (postalische Eingabe) ──────────────────────────
function ManualDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_MANUAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setForm(EMPTY_MANUAL_FORM); setError(''); }
  }, [open]);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/widerruf/admin/manual', form);
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const valid = form.customerName.trim() && (form.orderNumber.trim() || form.contractRef.trim());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Postalischen Widerruf erfassen</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tragen Sie die Daten eines postalisch eingegangenen Widerrufs manuell ein.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Kundenname *" value={form.customerName} onChange={handleChange('customerName')} fullWidth />
          <TextField label="Kunden-E-Mail" value={form.customerEmail} onChange={handleChange('customerEmail')} fullWidth type="email" />
          <TextField label="Anschrift des Kunden" value={form.customerAddress} onChange={handleChange('customerAddress')} fullWidth multiline rows={2} />
          <Divider />
          <TextField
            label="Bestellnummer"
            value={form.orderNumber}
            onChange={handleChange('orderNumber')}
            fullWidth
            helperText="Bestellnummer ODER Vertragsreferenz ist Pflicht."
          />
          <TextField label="Vertragsreferenz (alternativ)" value={form.contractRef} onChange={handleChange('contractRef')} fullWidth />
          <TextField label="Inhalt der Widerrufserklärung" value={form.statementText} onChange={handleChange('statementText')} fullWidth multiline rows={3} />
          <TextField label="Interne Notiz" value={form.adminNote} onChange={handleChange('adminNote')} fullWidth multiline rows={2} helperText="Z. B. Posteingang-Datum, Sendungsnummer." />
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !valid}>
          {saving ? <CircularProgress size={18} /> : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────
export default function AdminWiderruf() {
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const [widerrufe, setWiderrufe] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [statusDialog, setStatusDialog] = useState({ open: false, widerruf: null });
  const [manualDialog, setManualDialog] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const statusFilterValue = tab === 0 ? '' : ['received', 'confirmed', 'processed', 'rejected'][tab - 1];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: PER_PAGE };
      const filterVal = statusFilter || statusFilterValue;
      if (filterVal) params.status = filterVal;
      const res = await api.get('/widerruf/admin/list', { params });
      setWiderrufe(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Fehler beim Laden der Widerrufe');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, statusFilterValue]);

  useEffect(() => {
    fetchData();
    // Badge in der Navbar zur\u00fccksetzen sobald Admin die Seite \u00f6ffnet
    window.dispatchEvent(new Event('widerrufViewed'));
  }, [fetchData]);

  const handleStatusSave = () => {
    setSuccessMsg('Status erfolgreich aktualisiert.');
    setTimeout(() => setSuccessMsg(''), 4000);
    fetchData();
  };

  const handleManualSave = () => {
    setSuccessMsg('Widerruf erfolgreich gespeichert.');
    setTimeout(() => setSuccessMsg(''), 4000);
    fetchData();
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Widerrufe verwalten</Typography>
          <Typography variant="body2" color="text.secondary">
            Übersicht aller eingegangenen Widerrufserklärungen (online + postalisch)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Aktualisieren">
            <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setManualDialog(true)}>
            Postalischen Widerruf erfassen
          </Button>
        </Box>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {/* Status-Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(1); setStatusFilter(''); }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`Alle (${total})`} />
          <Tab label="Eingegangen" />
          <Tab label="Bestätigt" />
          <Tab label="Abgeschlossen" />
          <Tab label="Abgelehnt" />
        </Tabs>
      </Paper>

      {/* Tabelle */}
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>Eingegangen</TableCell>
              <TableCell>Kunde</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Bestellnr.</TableCell>
              <TableCell>Kanal</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notiz</TableCell>
              <TableCell align="center">Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : widerrufe.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Keine Einträge gefunden.
                </TableCell>
              </TableRow>
            ) : (
              widerrufe.map((w) => {
                const statusCfg = STATUS_CONFIG[w.status] || { label: w.status, color: 'default' };
                return (
                  <TableRow key={w._id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.createdAt)}</TableCell>
                    <TableCell>{w.customerName || '–'}</TableCell>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.customerEmail || '–'}
                    </TableCell>
                    <TableCell>{w.orderNumber || w.contractRef || '–'}</TableCell>
                    <TableCell>
                      <Chip
                        label={w.channel === 'online' ? 'Online' : w.channel === 'postal' ? 'Post' : w.channel}
                        size="small"
                        variant="outlined"
                        color={w.channel === 'online' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title={w.adminNote || ''}>
                        <span>{w.adminNote ? w.adminNote.substring(0, 30) + (w.adminNote.length > 30 ? '…' : '') : '–'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Status bearbeiten">
                        <IconButton
                          size="small"
                          onClick={() => setStatusDialog({ open: true, widerruf: w })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}

      {/* Dialoge */}
      <StatusDialog
        open={statusDialog.open}
        widerruf={statusDialog.widerruf}
        onClose={() => setStatusDialog({ open: false, widerruf: null })}
        onSave={handleStatusSave}
      />
      <ManualDialog
        open={manualDialog}
        onClose={() => setManualDialog(false)}
        onSave={handleManualSave}
      />
    </Container>
  );
}
