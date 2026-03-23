import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ReachPage = () => {
  const {
    name,
    address,
    email,
    phone,
    ceo,
    loading
  } = useCompany();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h6">Lade REACH-Informationen...</Typography>
        </Paper>
      </Container>
    );
  }

  const firmenname = name || 'Glücksmomente Manufaktur';
  const inhaber = ceo || 'Ralf Jacob';
  const anschrift =
    address?.street && address?.houseNumber && address?.postalCode && address?.city
      ? `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`
      : '68642 Bürstadt, Deutschland';
  const kontaktEmail = email || 'info@gluecksmomente-manufaktur.de';
  const kontaktTelefon = phone || null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          REACH-Information / SVHC-Auskunft
        </Typography>

        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 3 }}>
          Informationen gemäß Art. 33 der REACH-Verordnung (EG) Nr. 1907/2006
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Ihr Auskunftsrecht nach Art. 33 REACH
          </Typography>

          <Typography variant="body1" paragraph>
            Nach Art. 33 der REACH-Verordnung (EG) Nr. 1907/2006 haben Verbraucherinnen
            und Verbraucher das Recht, auf Anfrage kostenlos Auskunft darüber zu erhalten,
            ob ein von uns gelieferter Artikel einen besonders besorgniserregenden Stoff
            (SVHC – Substance of Very High Concern) in einer Konzentration von mehr als
            0,1 Massenprozent (w/w) enthält.
          </Typography>

          <Typography variant="body1" paragraph>
            Besonders besorgniserregende Stoffe (SVHC) sind Stoffe, die auf der sogenannten
            Kandidatenliste der Europäischen Chemikalienagentur (ECHA) aufgeführt sind und
            beispielsweise krebserregende, erbgutverändernde oder reproduktionstoxische
            Eigenschaften aufweisen können.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            So stellen Sie eine Anfrage
          </Typography>

          <Typography variant="body1" paragraph>
            Wenn Sie eine Auskunft zu einem unserer Produkte wünschen, wenden Sie sich bitte
            schriftlich an uns. Bitte geben Sie in Ihrer Anfrage das betreffende Produkt
            möglichst genau an (z. B. Produktname, Bestellnummer, Datum des Kaufs).
          </Typography>

          <Paper
            variant="outlined"
            sx={{ p: 3, mt: 2, mb: 3, borderColor: 'primary.light', bgcolor: 'grey.50' }}
          >
            <Typography variant="h6" gutterBottom>
              Kontakt für REACH-Anfragen
            </Typography>
            <Typography variant="body1">
              <strong>{firmenname}</strong><br />
              Inhaber: {inhaber}<br />
              {anschrift}<br />
              E-Mail:{' '}
              <a href={`mailto:${kontaktEmail}`} style={{ color: 'inherit' }}>
                {kontaktEmail}
              </a>
              {kontaktTelefon && (
                <>
                  <br />Telefon: {kontaktTelefon}
                </>
              )}
            </Typography>
          </Paper>

          <Typography variant="body1" paragraph>
            Wir beantworten Ihre Anfrage innerhalb von 45 Tagen nach Eingang.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Alert
            icon={<InfoOutlinedIcon />}
            severity="info"
            variant="outlined"
          >
            <Typography variant="body2">
              <strong>Hinweis:</strong> Wir treffen keine pauschalen Aussagen über die
              SVHC-Freiheit unserer Produkte. Angaben werden produktbezogen auf Grundlage
              der verfügbaren Lieferantendokumentation und Sicherheitsdatenblätter erteilt.
              Maßgeblich ist stets die zum Zeitpunkt der Auskunft aktuelle Kandidatenliste
              der ECHA.
            </Typography>
          </Alert>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Weiterführende Informationen
          </Typography>
          <Typography variant="body1" paragraph>
            Weitere Informationen zur REACH-Verordnung und zur aktuellen Kandidatenliste der
            SVHC finden Sie auf der Website der Europäischen Chemikalienagentur (ECHA):
          </Typography>
          <Typography variant="body2">
            <a
              href="https://echa.europa.eu/de/candidate-list-table"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2' }}
            >
              https://echa.europa.eu/de/candidate-list-table
            </a>
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          Stand: März 2026
        </Typography>
      </Paper>
    </Container>
  );
};

export default ReachPage;
