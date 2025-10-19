import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Typography,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  Person,
  Email,
  Home
} from '@mui/icons-material';
import BestellungenAPI from '../services/bestellungenAPI';

const BestellungsAccordion = ({ bestellungen, onFetchDetails }) => {
  const [expandedBestellung, setExpandedBestellung] = useState(null);
  const [bestellungDetails, setBestellungDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAccordionChange = async (bestellungId) => {
    if (expandedBestellung === bestellungId) {
      // Schließen
      setExpandedBestellung(null);
      setBestellungDetails(null);
    } else {
      // Öffnen und Details laden
      setExpandedBestellung(bestellungId);
      setLoading(true);
      
      try {
        const response = await BestellungenAPI.getBestellung(bestellungId);
        if (response.success) {
          setBestellungDetails(response.data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Bestelldetails:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      {bestellungen.map((bestellung) => {
        const status = BestellungenAPI.formatStatus(bestellung.status);
        const isExpanded = expandedBestellung === bestellung._id;
        
        return (
          <Accordion 
            key={bestellung._id}
            expanded={isExpanded}
            onChange={() => handleAccordionChange(bestellung._id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {bestellung.bestellnummer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {BestellungenAPI.formatDate(bestellung.bestelldatum)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Chip
                    label={status.text}
                    size="small"
                    sx={{
                      backgroundColor: status.color,
                      color: 'white'
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    {bestellung.artikel?.length || 0} Artikel
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="h6" color="primary" align="right">
                    {BestellungenAPI.formatPrice(bestellung.preise?.gesamtsumme || bestellung.gesamt?.brutto)}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionSummary>
            <AccordionDetails>
              {loading && isExpanded ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : bestellungDetails && isExpanded ? (
                <Grid container spacing={3}>
                  {/* Bestellinformationen */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Bestellinformationen
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><Person /></ListItemIcon>
                        <ListItemText 
                          primary="Besteller"
                          secondary={`${bestellungDetails.besteller?.vorname} ${bestellungDetails.besteller?.nachname}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Email /></ListItemIcon>
                        <ListItemText 
                          primary="E-Mail"
                          secondary={bestellungDetails.besteller?.email}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Home /></ListItemIcon>
                        <ListItemText 
                          primary="Lieferadresse"
                          secondary={`${bestellungDetails.rechnungsadresse?.strasse} ${bestellungDetails.rechnungsadresse?.hausnummer}, ${bestellungDetails.rechnungsadresse?.plz} ${bestellungDetails.rechnungsadresse?.stadt}`}
                        />
                      </ListItem>
                    </List>
                  </Grid>

                  {/* Bestellte Artikel */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Bestellte Artikel
                    </Typography>
                    <List dense>
                      {bestellungDetails.artikel?.map((artikel, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={artikel.produktSnapshot?.name}
                            secondary={`${artikel.menge}x à ${BestellungenAPI.formatPrice(artikel.einzelpreis)}`}
                          />
                          <Typography variant="body2" color="primary">
                            {BestellungenAPI.formatPrice(artikel.gesamtpreis)}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Preisaufschlüsselung */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Zwischensumme:</Typography>
                        <Typography variant="body2">
                          {BestellungenAPI.formatPrice(bestellungDetails.preise?.zwischensumme)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Versandkosten:</Typography>
                        <Typography variant="body2">
                          {BestellungenAPI.formatPrice(bestellungDetails.preise?.versandkosten)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">MwSt. ({bestellungDetails.preise?.mwst?.satz}%):</Typography>
                        <Typography variant="body2">
                          {BestellungenAPI.formatPrice(bestellungDetails.preise?.mwst?.betrag)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="h6">Gesamtsumme:</Typography>
                        <Typography variant="h6" color="primary">
                          {BestellungenAPI.formatPrice(bestellungDetails.preise?.gesamtsumme)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              ) : isExpanded ? (
                <Typography color="error">
                  Fehler beim Laden der Bestelldetails
                </Typography>
              ) : null}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default BestellungsAccordion;