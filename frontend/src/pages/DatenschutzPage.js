import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const DatenschutzPage = () => {
  const { 
    name, 
    address, 
    contact, 
    vatId, 
    ceo, 
    legalForm,
    fullAddress,
    email,
    phone,
    loading,
    error 
  } = useCompany();
  const [expanded, setExpanded] = useState(false);
  
  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h6">Lade Datenschutzerklärung...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Datenschutzerklärung
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mt: 3 }}>
          Wir freuen uns über Ihr Interesse an unserem Onlineshop. Der Schutz Ihrer 
          Privatsphäre ist für uns sehr wichtig. Nachstehend informieren wir Sie 
          ausführlich über den Umgang mit Ihren Daten.
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">1. Verantwortliche Stelle</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der 
                EU-Datenschutzgrundverordnung (DSGVO), ist:
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>{name || 'Glücksmomente Manufaktur'}</strong><br />
                {ceo && `Inhaber: ${ceo}`}{ceo && <br />}
                {legalForm && `Rechtsform: ${legalForm}`}{legalForm && <br />}
                {address?.street && address?.houseNumber ? `${address.street} ${address.houseNumber}` : address?.street || '[Straße wird in Admin-Konfiguration ergänzt]'}<br />
                {address?.postalCode && address?.city ? `${address.postalCode} ${address.city}` : '68642 Bürstadt'}<br />
                {address?.country || 'Deutschland'}<br /><br />
                {phone && (
                  <>
                    Telefon: {phone}<br />
                  </>
                )}
                E-Mail: {email || contact?.email || 'info@gluecksmomente-manufaktur.de'}
                {vatId && (
                  <>
                    <br />USt-IdNr.: {vatId}
                  </>
                )}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">2. Erhebung und Speicherung personenbezogener Daten</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                <strong>Beim Besuch der Website:</strong><br />
                Beim Aufrufen unserer Website werden durch den auf Ihrem Endgerät zum Einsatz 
                kommenden Browser automatisch Informationen an den Server unserer Website gesendet. 
                Diese Informationen werden temporär in einem sog. Logfile gespeichert.
              </Typography>
              <Typography variant="body2" paragraph>
                Folgende Informationen werden dabei ohne Ihr Zutun erfasst und bis zur 
                automatisierten Löschung gespeichert:
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li>IP-Adresse des anfragenden Rechners</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                  <li>Name und URL der abgerufenen Datei</li>
                  <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                  <li>Verwendeter Browser und ggf. das Betriebssystem</li>
                </ul>
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">3. Verwendung von Cookies</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die im 
                Internetbrowser bzw. vom Internetbrowser auf dem Computersystem des Nutzers 
                gespeichert werden. Ruft ein Nutzer eine Website auf, so kann ein Cookie auf 
                dem Betriebssystem des Nutzers gespeichert werden.
              </Typography>
              <Typography variant="body2" paragraph>
                Wir verwenden Cookies, um unsere Website nutzerfreundlicher zu gestalten. 
                Einige Elemente unserer Internetseite erfordern es, dass der aufrufende Browser 
                auch nach einem Seitenwechsel identifiziert werden kann.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">4. Registrierung und Bestellvorgang</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Wenn Sie sich in unserem Shop registrieren oder eine Bestellung aufgeben, 
                erheben wir folgende personenbezogene Daten:
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li>Vor- und Nachname</li>
                  <li>E-Mail-Adresse</li>
                  <li>Lieferadresse</li>
                  <li>Rechnungsadresse</li>
                  <li>Telefonnummer (optional)</li>
                </ul>
              </Typography>
              <Typography variant="body2" paragraph>
                Diese Daten verwenden wir zur Abwicklung Ihrer Bestellung und zur 
                Kommunikation mit Ihnen.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">5. Ihre Rechte</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden 
                personenbezogenen Daten:
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li>Recht auf Auskunft</li>
                  <li>Recht auf Berichtigung oder Löschung</li>
                  <li>Recht auf Einschränkung der Verarbeitung</li>
                  <li>Recht auf Widerspruch gegen die Verarbeitung</li>
                  <li>Recht auf Datenübertragbarkeit</li>
                </ul>
              </Typography>
              <Typography variant="body2" paragraph>
                Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde 
                über die Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">6. Datensicherheit</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Wir verwenden innerhalb des Website-Besuchs das verbreitete SSL-Verfahren 
                (Secure Socket Layer) in Verbindung mit der jeweils höchsten Verschlüsselungsstufe, 
                die von Ihrem Browser unterstützt wird. In der Regel handelt es sich dabei um eine 
                256 Bit Verschlüsselung.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 4, fontStyle: 'italic' }}>
          Stand: Januar 2026
        </Typography>
      </Paper>
    </Container>
  );
};

export default DatenschutzPage;