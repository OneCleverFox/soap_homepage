import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminDocumentsService } from '../services/adminDocumentsService';

const tabFromPath = (pathname) => (pathname.includes('/ausgefuellt') ? 1 : 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('de-DE');
};

const formatGroups = (groups = []) => {
  const labels = {
    seife: 'Seife',
    werkstuck: 'Werkstuecke',
    schmuck: 'Schmuck'
  };

  const valid = (Array.isArray(groups) ? groups : []).filter(Boolean);
  if (valid.length === 0) return '-';
  return valid.map((item) => labels[item] || item).join(', ');
};

const groupsFromContent = (doc) => {
  const sections = doc?.content_json?.sections || [];
  for (const section of sections) {
    for (const field of section.fields || []) {
      if (field.key === 'anwendungsbereich_produktgruppen') {
        return Array.isArray(field.value) ? field.value : [];
      }
    }
  }
  return [];
};

const AdminDocumentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blankoDocs, setBlankoDocs] = useState([]);
  const [filledDocs, setFilledDocs] = useState([]);
  const [types, setTypes] = useState([]);
  const [hintDialog, setHintDialog] = useState({ open: false, docType: null });
  const [complianceFilter, setComplianceFilter] = useState('all');

  const tab = tabFromPath(location.pathname);

  const typeLabelMap = useMemo(() => {
    return Object.fromEntries((types || []).map((item) => [item.key, item.label]));
  }, [types]);

  const typeMetaMap = useMemo(() => {
    return Object.fromEntries((types || []).map((item) => [item.key, item]));
  }, [types]);

  const activeHint = hintDialog.docType ? typeMetaMap[hintDialog.docType] : null;

  const getComplianceLevel = (docType) => typeMetaMap[docType]?.complianceLevel || 'optional';
  const getComplianceLabel = (docType) => typeMetaMap[docType]?.complianceLabel || 'Anlassbezogen';

  const matchesComplianceFilter = (doc) => {
    if (complianceFilter === 'all') return true;
    return getComplianceLevel(doc.document_type) === complianceFilter;
  };

  const filteredBlankoDocs = blankoDocs.filter(matchesComplianceFilter);
  const filteredFilledDocs = filledDocs.filter(matchesComplianceFilter);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [blanko, filled, allTypes] = await Promise.all([
        adminDocumentsService.getBlanko(),
        adminDocumentsService.getFilled(),
        adminDocumentsService.getTypes()
      ]);
      setBlankoDocs(blanko || []);
      setFilledDocs(filled || []);
      setTypes(allTypes || []);
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDownload = async (doc) => {
    try {
      await adminDocumentsService.downloadPdf(doc._id, `${doc.document_type}-${doc.version}.pdf`);
    } catch (err) {
      setError(err.message || 'PDF-Download fehlgeschlagen');
    }
  };

  const onDeleteFilled = async (doc) => {
    const confirmed = window.confirm(`Dokument "${doc.title}" wirklich loeschen?`);
    if (!confirmed) {
      return;
    }

    try {
      setError('');
      await adminDocumentsService.deleteFilled(doc._id);
      await loadData();
    } catch (err) {
      setError(err.message || 'Dokument konnte nicht geloescht werden');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: 2, py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>
          Admin-Dokumente
        </Typography>
        <Button variant="outlined" onClick={loadData}>Aktualisieren</Button>
      </Stack>

      {error ? (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid #d32f2f' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : null}

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => navigate(value === 0 ? '/admin-dokumente/blanko' : '/admin-dokumente/ausgefuellt')}
          variant="fullWidth"
        >
          <Tab label="Blanko-Dokumente" />
          <Tab label="Gespeicherte Dokumente" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography variant="body2" sx={{ minWidth: 210 }}>
            Anzeige nach Dokumentstatus:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="compliance-filter-label">Pflicht / Anlassbezogen</InputLabel>
            <Select
              labelId="compliance-filter-label"
              value={complianceFilter}
              label="Pflicht / Anlassbezogen"
              onChange={(e) => setComplianceFilter(e.target.value)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="pflicht">Nur Pflichtdokumente</MenuItem>
              <MenuItem value="optional">Nur Anlassbezogene</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Pflicht-Matrix - NUR auf Blanko-Tab */}
      {tab === 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📋 Erforderliche Dokumentation nach Produktgruppe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Übersicht: Welche Dokumente sind für welche Produktgruppe erforderlich
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#e3f2fd' }}>Dokument</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, backgroundColor: '#fce4ec' }}>🧼 Seife</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, backgroundColor: '#e8f5e9' }}>🏺 Werkstücke</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, backgroundColor: '#f3e5f5' }}>💍 Schmuck</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, backgroundColor: '#fff3e0' }}>💄 Kosmetik</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {types.map((type) => {
                  // Abrufen der Status für jede Produktgruppe aus der Matrix
                  const matrix = {
                    seife: type.matrixStatus?.seife || 'entfällt',
                    werkstuck: type.matrixStatus?.werkstuck || 'entfällt',
                    schmuck: type.matrixStatus?.schmuck || 'entfällt',
                    kosmetik: type.matrixStatus?.kosmetik || 'entfällt'
                  };
                  
                  const getCellColor = (status) => {
                    if (status === 'pflicht') return '#ffcdd2'; // Rot für Pflicht
                    if (status === 'optional') return '#ffe0b2'; // Orange für Optional
                    return '#f5f5f5'; // Grau für entfällt
                  };
                  
                  const getCellLabel = (status) => {
                    if (status === 'pflicht') return '🔴 Pflicht';
                    if (status === 'optional') return '🟡 Optional';
                    return '⚪ entfällt';
                  };

                  return (
                    <TableRow key={type.key} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{type.label}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor: getCellColor(matrix.seife),
                          fontWeight: matrix.seife === 'pflicht' ? 700 : 500
                        }}
                      >
                        {getCellLabel(matrix.seife)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor: getCellColor(matrix.werkstuck),
                          fontWeight: matrix.werkstuck === 'pflicht' ? 700 : 500
                        }}
                      >
                        {getCellLabel(matrix.werkstuck)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor: getCellColor(matrix.schmuck),
                          fontWeight: matrix.schmuck === 'pflicht' ? 700 : 500
                        }}
                      >
                        {getCellLabel(matrix.schmuck)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor: getCellColor(matrix.kosmetik),
                          fontWeight: matrix.kosmetik === 'pflicht' ? 700 : 500
                        }}
                      >
                        {getCellLabel(matrix.kosmetik)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#ffcdd2', borderRadius: 1 }} />
              <Typography variant="caption">= Pflichtdokument (muss ausfüllt werden)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#ffe0b2', borderRadius: 1 }} />
              <Typography variant="caption">= Optional (je nach Bedarf)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: 1 }} />
              <Typography variant="caption">= Entfällt (nicht notwendig)</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {tab === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dokumenttyp</TableCell>
                <TableCell>Einstufung</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Anwendungsbereich</TableCell>
                <TableCell>Hinweis</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBlankoDocs.map((doc) => (
                <TableRow key={doc._id} hover>
                  <TableCell>{typeLabelMap[doc.document_type] || doc.document_type}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={getComplianceLevel(doc.document_type) === 'pflicht' ? 'error' : 'default'}
                      variant={getComplianceLevel(doc.document_type) === 'pflicht' ? 'filled' : 'outlined'}
                      label={getComplianceLabel(doc.document_type)}
                    />
                  </TableCell>
                  <TableCell>{doc.version}</TableCell>
                  <TableCell>{formatGroups(doc.applicable_product_groups?.length ? doc.applicable_product_groups : groupsFromContent(doc))}</TableCell>
                  <TableCell>
                    <Tooltip title="Wann brauche ich dieses Dokument?">
                      <IconButton
                        size="small"
                        onClick={() => setHintDialog({ open: true, docType: doc.document_type })}
                      >
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => navigate(`/admin-dokumente/ansehen/${doc._id}`)}>Vorschau</Button>
                      <Button size="small" variant="outlined" onClick={() => onDownload(doc)}>PDF</Button>
                      <Button size="small" variant="contained" onClick={() => navigate(`/admin-dokumente/neu/${doc.document_type}`)}>
                        Ausfuellen
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dokumenttyp</TableCell>
                <TableCell>Einstufung</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Anwendungsbereich</TableCell>
                <TableCell>Letzte Aenderung</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFilledDocs.map((doc) => (
                <TableRow key={doc._id} hover>
                  <TableCell>{typeLabelMap[doc.document_type] || doc.document_type}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={getComplianceLevel(doc.document_type) === 'pflicht' ? 'error' : 'default'}
                      variant={getComplianceLevel(doc.document_type) === 'pflicht' ? 'filled' : 'outlined'}
                      label={getComplianceLabel(doc.document_type)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color="primary" variant="outlined" label={doc.status} />
                  </TableCell>
                  <TableCell>{doc.version}</TableCell>
                  <TableCell>{formatGroups(doc.applicable_product_groups?.length ? doc.applicable_product_groups : groupsFromContent(doc))}</TableCell>
                  <TableCell>{formatDate(doc.updated_at)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => navigate(`/admin-dokumente/ansehen/${doc._id}`)}>Ansehen</Button>
                      <Button size="small" onClick={() => navigate(`/admin-dokumente/bearbeiten/${doc._id}`)}>Bearbeiten</Button>
                      <Button size="small" variant="outlined" onClick={() => onDownload(doc)}>PDF</Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          try {
                            const created = await adminDocumentsService.createNewVersion(doc._id);
                            navigate(`/admin-dokumente/bearbeiten/${created._id}`);
                          } catch (err) {
                            setError(err.message || 'Neue Version konnte nicht erstellt werden');
                          }
                        }}
                      >
                        Neue Version
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => onDeleteFilled(doc)}
                      >
                        Loeschen
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog
        open={hintDialog.open}
        onClose={() => setHintDialog({ open: false, docType: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Hinweis: {activeHint?.label || ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2">Wofuer?</Typography>
            <Typography variant="body2">{activeHint?.purpose || 'Kein Hinweis verfuegbar.'}</Typography>

            <Typography variant="subtitle2">Wann verwenden?</Typography>
            <Typography variant="body2">{activeHint?.whenToUse || '-'}</Typography>

            <Typography variant="subtitle2">Rechtsbezug</Typography>
            <Typography variant="body2">{activeHint?.legalReference || '-'}</Typography>

            <Typography variant="subtitle2">Einstufung</Typography>
            <Typography variant="body2">{activeHint?.complianceLabel || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">{activeHint?.complianceHint || ''}</Typography>

            <Typography variant="subtitle2">Typische Anlaesse</Typography>
            {Array.isArray(activeHint?.practicalExamples) && activeHint.practicalExamples.length > 0 ? (
              <Box component="ul" sx={{ my: 0, pl: 3 }}>
                {activeHint.practicalExamples.map((item) => (
                  <li key={item}>
                    <Typography variant="body2">{item}</Typography>
                  </li>
                ))}
              </Box>
            ) : (
              <Typography variant="body2">-</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHintDialog({ open: false, docType: null })}>Schliessen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocumentsPage;