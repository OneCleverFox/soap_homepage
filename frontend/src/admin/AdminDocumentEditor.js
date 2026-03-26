import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { adminDocumentsService } from '../services/adminDocumentsService';

const AdminDocumentEditor = ({ isNew = false }) => {
  const navigate = useNavigate();
  const { id, document_type } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);

  const isEditable = useMemo(() => doc && doc.status === 'filled' && doc.is_editable !== false, [doc]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        if (isNew) {
          const blankoDocs = await adminDocumentsService.getBlanko();
          const blanko = (blankoDocs || []).find((item) => item.document_type === document_type);

          if (!blanko) {
            throw new Error('Blanko-Vorlage fuer diesen Dokumenttyp nicht gefunden');
          }

          const created = {
            _id: null,
            document_type,
            title: blanko.title,
            version: '1.0',
            status: 'filled',
            content_json: JSON.parse(JSON.stringify(blanko.content_json || {})),
            is_editable: true
          };
          if (!mounted) return;
          setDoc(created);
          return;
        }

        const loaded = await adminDocumentsService.getById(id);
        if (!mounted) return;
        setDoc(loaded);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Dokument konnte nicht geladen werden');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [id, document_type, isNew]);

  const updateField = (sectionIndex, fieldIndex, value) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = { ...prev, content_json: { ...prev.content_json } };
      next.content_json.sections = [...(prev.content_json.sections || [])];
      next.content_json.sections[sectionIndex] = { ...next.content_json.sections[sectionIndex] };
      next.content_json.sections[sectionIndex].fields = [...(next.content_json.sections[sectionIndex].fields || [])];
      next.content_json.sections[sectionIndex].fields[fieldIndex] = {
        ...next.content_json.sections[sectionIndex].fields[fieldIndex],
        value
      };
      return next;
    });
  };

  const onSave = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      setError('');

      const payload = {
        version: doc.version,
        content_json: doc.content_json
      };

      const saved = isNew
        ? await adminDocumentsService.createFilledFromType(document_type, payload)
        : await adminDocumentsService.updateFilled(doc._id, payload);

      setDoc(saved);
        navigate(`/admin-dokumente/ansehen/${saved._id}`);
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2, py: 3 }}>
        <Typography color="error">Dokument nicht verfuegbar.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Dokument bearbeiten</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/admin-dokumente/ausgefuellt')}>Zurueck</Button>
          <Button variant="contained" disabled={!isEditable || saving} onClick={onSave}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid #d32f2f' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField label="Dokumenttyp" value={doc.title || doc.document_type || ''} fullWidth disabled />
          <TextField
            label="Version"
            value={doc.version || '1.0'}
            onChange={(e) => setDoc((prev) => ({ ...prev, version: e.target.value }))}
            sx={{ maxWidth: 220 }}
            disabled={!isEditable}
          />
        </Stack>
      </Paper>

      {(doc.content_json?.sections || []).map((section, sectionIndex) => (
        <Paper key={section.id || sectionIndex} sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, pb: 1, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0 }}>{section.title}</Typography>
          </Box>
          <Table sx={{ borderCollapse: 'collapse' }}>
            <TableBody>
              {(section.fields || []).map((field, fieldIndex) => {
                const isCheckbox = field.type === 'checkbox';
                const isTextarea = field.type === 'textarea';
                const isSelect = field.type === 'select';
                const isDate = field.type === 'date';
                const isMultiselect = field.type === 'multiselect';

                return (
                  <TableRow key={field.key || fieldIndex} sx={{ '&:nth-of-type(even)': { backgroundColor: '#fafafa' } }}>
                    <TableCell
                      sx={{
                        width: '38%',
                        backgroundColor: '#f4f4f4',
                        fontWeight: 600,
                        padding: '10px 12px',
                        borderRight: '1px solid #d0d0d0',
                        verticalAlign: 'top',
                        fontSize: '0.95rem'
                      }}
                    >
                      {field.label}
                    </TableCell>
                    <TableCell
                      sx={{
                        width: '62%',
                        padding: '10px 12px',
                        verticalAlign: 'top'
                      }}
                    >
                      {isCheckbox && (
                        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          <FormControlLabel
                            control={<Checkbox checked={Boolean(field.value)} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.checked)} disabled={!isEditable} />}
                            label="Ja"
                            sx={{ m: 0 }}
                          />
                          <FormControlLabel
                            control={<Checkbox checked={!Boolean(field.value)} onChange={(e) => updateField(sectionIndex, fieldIndex, !e.target.checked)} disabled={!isEditable} />}
                            label="Nein"
                            sx={{ m: 0 }}
                          />
                        </Box>
                      )}
                      {isTextarea && (
                        <TextField fullWidth multiline minRows={3} value={field.value || ''} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.value)} disabled={!isEditable} variant="outlined" size="small" />
                      )}
                      {isSelect && (
                        <Select fullWidth value={field.value || ''} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.value)} disabled={!isEditable} variant="outlined" size="small">
                          <MenuItem value="">-- Bitte auswählen --</MenuItem>
                          {(field.options || []).map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </Select>
                      )}
                      {isMultiselect && (
                        <Select fullWidth multiple value={Array.isArray(field.value) ? field.value : []} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.value)} disabled={!isEditable} variant="outlined" size="small">
                          {(field.options || []).map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </Select>
                      )}
                      {isDate && (
                        <TextField type="date" fullWidth value={field.value || ''} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.value)} disabled={!isEditable} variant="outlined" size="small" InputLabelProps={{ shrink: true }} />
                      )}
                      {!isCheckbox && !isTextarea && !isSelect && !isDate && !isMultiselect && (
                        <TextField fullWidth type="text" value={field.value || ''} onChange={(e) => updateField(sectionIndex, fieldIndex, e.target.value)} disabled={!isEditable} variant="outlined" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      ))}

      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Rechtliche Leitplanke: Keine pauschalen Aussagen wie "konform", "zertifiziert" oder "geprueft". Nur dokumentierten Status und belegbare Informationen eintragen.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdminDocumentEditor;
