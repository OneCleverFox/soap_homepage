import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const INITIAL_FORM = {
  name: '',
  description: '',
  sku: '',
  serviceType: 'standard',
  unit: 'Stück',
  defaultPrice: '0',
  taxRate: '19',
  invoiceNote: '',
  plotterBasePricePerSqm: '0',
  plotterMaterialCostPerSqm: '0',
  plotterLaborCostPerSqm: '0',
  plotterOverheadFactor: '3',
  plotterMinimumPrice: '0',
  sizeProfiles: [],
  sortOrder: '0',
  isActive: true
};

const SERVICE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Leistung' },
  { value: 'plotterarbeiten', label: 'Plotterarbeiten' }
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(amount || 0));

const normalizeServiceType = (value) =>
  String(value || '').toLowerCase() === 'plotterarbeiten' ? 'plotterarbeiten' : 'standard';

const AdminServiceLeistungen = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);

  const activeCount = useMemo(() => entries.filter((entry) => entry.isActive).length, [entries]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/service-leistungen?includeInactive=${includeInactive}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Service & Leistungen konnten nicht geladen werden.');
      }

      setEntries(data.data || []);
    } catch (loadError) {
      console.error('Fehler beim Laden von Service & Leistung:', loadError);
      setError(loadError.message || 'Service & Leistungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openCreateDialog = useCallback(() => {
    setEditingEntry(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((entry) => {
    setEditingEntry(entry);
    setForm({
      name: entry.name || '',
      description: entry.description || '',
      sku: entry.sku || '',
      serviceType: normalizeServiceType(entry.serviceType),
      unit: entry.unit || 'Stück',
      defaultPrice: String(entry.defaultPrice ?? '0'),
      taxRate: String(entry.taxRate ?? '19'),
      invoiceNote: entry.invoiceNote || '',
      plotterBasePricePerSqm: String(entry.plotterBasePricePerSqm ?? '0'),
      plotterMaterialCostPerSqm: String(entry.plotterMaterialCostPerSqm ?? '0'),
      plotterLaborCostPerSqm: String(entry.plotterLaborCostPerSqm ?? '0'),
      plotterOverheadFactor: String(entry.plotterOverheadFactor ?? '3'),
      plotterMinimumPrice: String(entry.plotterMinimumPrice ?? '0'),
      sizeProfiles: Array.isArray(entry.sizeProfiles)
        ? entry.sizeProfiles.map((profile) => ({
            label: profile.label || '',
            widthCm: String(profile.widthCm ?? ''),
            heightCm: String(profile.heightCm ?? ''),
            salePrice: String(profile.salePrice ?? ''),
            materialCost: String(profile.materialCost ?? ''),
            laborCost: String(profile.laborCost ?? ''),
            isDefault: Boolean(profile.isDefault)
          }))
        : [],
      sortOrder: String(entry.sortOrder ?? '0'),
      isActive: entry.isActive !== false
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingEntry(null);
    setForm(INITIAL_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('Bitte einen Namen eingeben.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      sku: form.sku.trim().toUpperCase(),
      serviceType: form.serviceType,
      unit: form.unit.trim() || 'Stück',
      defaultPrice: Number.parseFloat(String(form.defaultPrice).replace(',', '.')) || 0,
      taxRate: Number.parseFloat(String(form.taxRate).replace(',', '.')) || 0,
      invoiceNote: form.invoiceNote.trim(),
      plotterBasePricePerSqm: Number.parseFloat(String(form.plotterBasePricePerSqm).replace(',', '.')) || 0,
      plotterMaterialCostPerSqm:
        Number.parseFloat(String(form.plotterMaterialCostPerSqm).replace(',', '.')) || 0,
      plotterLaborCostPerSqm: Number.parseFloat(String(form.plotterLaborCostPerSqm).replace(',', '.')) || 0,
      plotterOverheadFactor: Number.parseFloat(String(form.plotterOverheadFactor).replace(',', '.')) || 0,
      plotterMinimumPrice: Number.parseFloat(String(form.plotterMinimumPrice).replace(',', '.')) || 0,
      sizeProfiles: [],
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      isActive: Boolean(form.isActive)
    };

    if (payload.defaultPrice < 0) {
      toast.error('Der Preis darf nicht negativ sein.');
      return;
    }

    setSaving(true);

    try {
      const isEdit = Boolean(editingEntry?._id);
      const endpoint = isEdit
        ? `${API_BASE_URL}/admin/service-leistungen/${editingEntry._id}`
        : `${API_BASE_URL}/admin/service-leistungen`;

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Eintrag konnte nicht gespeichert werden.');
      }

      toast.success(isEdit ? 'Eintrag aktualisiert.' : 'Eintrag angelegt.');
      closeDialog();
      loadEntries();
    } catch (saveError) {
      console.error('Fehler beim Speichern:', saveError);
      toast.error(saveError.message || 'Eintrag konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }, [closeDialog, editingEntry?._id, form, loadEntries]);

  const handleDelete = useCallback(
    async (entry) => {
      if (!entry?._id) {
        return;
      }

      const confirmed = window.confirm(`Eintrag "${entry.name}" wirklich löschen?`);
      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin/service-leistungen/${entry._id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Löschen fehlgeschlagen.');
        }

        toast.success('Eintrag gelöscht.');
        loadEntries();
      } catch (deleteError) {
        console.error('Fehler beim Löschen:', deleteError);
        toast.error(deleteError.message || 'Löschen fehlgeschlagen.');
      }
    },
    [loadEntries]
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography variant="h4" component="h1" fontWeight={700} sx={{ fontSize: { xs: '1.45rem', sm: '2.125rem' } }}>
            Service&Leistung
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Konfiguration von Service- und Leistungspositionen für die Rechnungsverwaltung.
          </Typography>
        </Box>

        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Aktiv
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {activeCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={8} md={9}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent={{ sm: 'flex-end' }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadEntries}>
                Aktualisieren
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                Neu anlegen
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Inaktive anzeigen
            </Typography>
            <Switch checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
          </Stack>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Beschreibung</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>SKU</TableCell>
                  <TableCell align="right">Preis</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Einheit</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                        Lade Einträge...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                        Keine Services oder Leistungen gefunden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading
                  ? entries.map((entry) => (
                      <TableRow key={entry._id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {entry.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', md: 'none' } }} noWrap>
                              {entry.description || '-'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 340 }}>
                          <Stack spacing={0.35}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {entry.description || '-'}
                            </Typography>
                            {normalizeServiceType(entry.serviceType) === 'plotterarbeiten' ? (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                Folie/m² {Number(entry.plotterBasePricePerSqm || 0).toFixed(2)} · Transferfolie/m² {Number(entry.plotterMaterialCostPerSqm || 0).toFixed(2)} · Arbeit/m² {Number(entry.plotterLaborCostPerSqm || 0).toFixed(2)}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              SERVICE_TYPE_OPTIONS.find(
                                (option) => option.value === normalizeServiceType(entry.serviceType)
                              )?.label || 'Leistung'
                            }
                            color={
                              normalizeServiceType(entry.serviceType) === 'plotterarbeiten'
                                ? 'primary'
                                : 'default'
                            }
                          />
                          {normalizeServiceType(entry.serviceType) === 'plotterarbeiten' ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              GK-Faktor {Number(entry.plotterOverheadFactor || 3).toFixed(2)}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography variant="caption" color="text.secondary">
                            {entry.sku || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(entry.defaultPrice)}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{entry.unit || '-'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            {!entry.isActive ? <Chip size="small" label="Inaktiv" color="warning" sx={{ mr: 0.5 }} /> : null}
                            <Tooltip title="Bearbeiten">
                              <IconButton size="small" onClick={() => openEditDialog(entry)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Löschen">
                              <IconButton size="small" color="error" onClick={() => handleDelete(entry)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingEntry ? 'Service/Leistung bearbeiten' : 'Service/Leistung anlegen'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                required
                value={form.name}
                onChange={(event) => handleFormChange('name', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="service-type-label">Typ</InputLabel>
                <Select
                  labelId="service-type-label"
                  label="Typ"
                  value={form.serviceType}
                  onChange={(event) => handleFormChange('serviceType', event.target.value)}
                >
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="SKU"
                value={form.sku}
                onChange={(event) => handleFormChange('sku', event.target.value)}
                disabled={!editingEntry}
                helperText={editingEntry ? 'Kann bei Bedarf angepasst werden' : 'Wird beim Anlegen automatisch generiert'}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Beschreibung"
                value={form.description}
                onChange={(event) => handleFormChange('description', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Einheit"
                value={form.unit}
                onChange={(event) => handleFormChange('unit', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Standardpreis"
                type="number"
                value={form.defaultPrice}
                onChange={(event) => handleFormChange('defaultPrice', event.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Steuersatz (%)"
                type="number"
                value={form.taxRate}
                onChange={(event) => handleFormChange('taxRate', event.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sortierung"
                type="number"
                value={form.sortOrder}
                onChange={(event) => handleFormChange('sortOrder', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Rechnungshinweis"
                value={form.invoiceNote}
                onChange={(event) => handleFormChange('invoiceNote', event.target.value)}
                helperText="Optionaler Hinweis für den Positionstext auf der Rechnung"
              />
            </Grid>

            {form.serviceType === 'plotterarbeiten' ? (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Plotter-Kalkulation
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Folie / m²"
                    type="number"
                    value={form.plotterBasePricePerSqm}
                    onChange={(event) => handleFormChange('plotterBasePricePerSqm', event.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Transferfolie / m²"
                    type="number"
                    value={form.plotterMaterialCostPerSqm}
                    onChange={(event) => handleFormChange('plotterMaterialCostPerSqm', event.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Arbeit / m²"
                    type="number"
                    value={form.plotterLaborCostPerSqm}
                    onChange={(event) => handleFormChange('plotterLaborCostPerSqm', event.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Mindestpreis"
                    type="number"
                    value={form.plotterMinimumPrice}
                    onChange={(event) => handleFormChange('plotterMinimumPrice', event.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Gemeinkostenzuschlag Faktor"
                    type="number"
                    value={form.plotterOverheadFactor}
                    onChange={(event) => handleFormChange('plotterOverheadFactor', event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    helperText="Standard 3: Grundpreis (Folie + Transferfolie) wird damit multipliziert"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    Größenprofile sind aktuell deaktiviert. Die Rechnungskalkulation für Plotterarbeiten läuft direkt über Breite/Höhe und die m²-Werte.
                  </Alert>
                </Grid>
              </>
            ) : null}

            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Aktiv
                </Typography>
                <Switch
                  checked={form.isActive}
                  onChange={(event) => handleFormChange('isActive', event.target.checked)}
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminServiceLeistungen;
