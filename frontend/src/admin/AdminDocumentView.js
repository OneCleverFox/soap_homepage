import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { adminDocumentsService } from '../services/adminDocumentsService';

const AdminDocumentView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const [loaded, htmlData] = await Promise.all([
          adminDocumentsService.getById(id),
          adminDocumentsService.getRenderedHtml(id)
        ]);
        if (!mounted) return;
        setDoc(loaded);
        setPreviewHtml(htmlData?.html || '');
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
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2, py: 3 }}>
        <Typography color="error">Dokument nicht gefunden.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2, py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Dokument ansehen</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/admin-dokumente/ausgefuellt')}>Zurueck</Button>
          {doc.status === 'filled' ? (
            <Button variant="outlined" onClick={() => navigate(`/admin-dokumente/bearbeiten/${doc._id}`)}>Bearbeiten</Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => adminDocumentsService.downloadPdf(doc._id, `${doc.document_type}-${doc.version}.pdf`)}
          >
            PDF herunterladen
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Paper sx={{ p: 2, mb: 2, border: '1px solid #d32f2f' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">{doc.title}</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2">Dokumenttyp: {doc.document_type}</Typography>
        <Typography variant="body2">Status: {doc.status}</Typography>
        <Typography variant="body2">Version: {doc.version}</Typography>
        <Typography variant="body2">Letzte Aenderung: {new Date(doc.updated_at).toLocaleString('de-DE')}</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Vorschau</Typography>
        <Box
          sx={{
            border: '1px solid #ddd',
            minHeight: 600,
            overflow: 'auto',
            backgroundColor: '#fff'
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </Paper>
    </Box>
  );
};

export default AdminDocumentView;