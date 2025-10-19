import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import BestellStatusBar from './BestellStatusBar';

// Demo-Komponente um verschiedene Status zu zeigen
const StatusBarDemo = () => {
  const testStatuses = [
    'neu',
    'bestaetigt', 
    'bezahlt',
    'verpackt',
    'verschickt',
    'zugestellt',
    'storniert',
    'rueckerstattung'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        BestellStatusBar Demo
      </Typography>
      
      <Grid container spacing={3}>
        {testStatuses.map((status) => (
          <Grid item xs={12} key={status}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Status: {status}
              </Typography>
              
              {/* Kompakte Version */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Kompakte Ansicht:
                </Typography>
                <BestellStatusBar status={status} compact={true} />
              </Box>
              
              {/* Vollständige Version */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Vollständige Ansicht:
                </Typography>
                <BestellStatusBar status={status} showDescription={true} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StatusBarDemo;