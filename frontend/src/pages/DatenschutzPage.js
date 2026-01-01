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
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
              </Typography>
              <Typography variant="body2" paragraph>
                Diese Daten verwenden wir zur Abwicklung Ihrer Bestellung und zur 
                Kommunikation mit Ihnen. Die Daten werden für die Dauer der Geschäftsbeziehung 
                sowie zur Erfüllung gesetzlicher Aufbewahrungspflichten gespeichert.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">5. PayPal-Zahlungsabwicklung</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Bei der Auswahl von PayPal als Zahlungsart werden Ihre Daten an PayPal 
                (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxembourg 
                übertragen.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Übertragene Daten:</strong>
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li>Name und Anschrift</li>
                  <li>E-Mail-Adresse</li>
                  <li>Bestelldetails (Artikel, Preise, Bestellnummer)</li>
                  <li>Rechnungs- und Lieferadresse</li>
                </ul>
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
              </Typography>
              <Typography variant="body2" paragraph>
                PayPal verarbeitet Ihre Daten entsprechend der PayPal-Datenschutzerklärung: 
                <a href="https://www.paypal.com/de/legalhub/privacy-full" target="_blank" rel="noopener noreferrer">
                  https://www.paypal.com/de/legalhub/privacy-full
                </a>
              </Typography>
              <Typography variant="body2" paragraph>
                Die Datenübertragung erfolgt verschlüsselt und PayPal ist durch EU-Standardvertragsklauseln 
                angemessen abgesichert.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">6. Drittanbieter-Services</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Wir nutzen folgende vertrauenswürdige Drittanbieter zur Bereitstellung unserer Services:
              </Typography>
              
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>MongoDB Atlas (Datenspeicherung)</strong><br />
                Anbieter: MongoDB, Inc., 1633 Broadway, 38th Floor, New York, NY 10019, USA<br />
                Zweck: Sichere Speicherung von Bestell-, Kunden- und Produktdaten<br />
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)<br />
                Absicherung: EU-Standardvertragsklauseln, SOC 2 Type 2 zertifiziert
              </Typography>
              
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Resend (E-Mail-Versand)</strong><br />
                Anbieter: Resend, Inc., 2261 Market Street #4008, San Francisco, CA 94114, USA<br />
                Zweck: Versand von Bestätigungen, Rechnungen und Service-E-Mails<br />
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)<br />
                Übertragene Daten: E-Mail-Adresse, Name, E-Mail-Inhalte
              </Typography>
              
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Railway/Vercel (Hosting)</strong><br />
                Anbieter: Railway Corp. / Vercel Inc., USA<br />
                Zweck: Bereitstellung und Betrieb der Website<br />
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)<br />
                Absicherung: EU-Standardvertragsklauseln, SSL-Verschlüsselung
              </Typography>
              
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                Alle Drittanbieter sind vertraglich verpflichtet, Ihre Daten DSGVO-konform zu verarbeiten 
                und nur für die vereinbarten Zwecke zu nutzen.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">7. Aufbewahrungsfristen</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die 
                jeweiligen Zwecke erforderlich ist:
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li><strong>Bestelldaten:</strong> 10 Jahre (gem. § 147 AO)</li>
                  <li><strong>Rechnungsunterlagen:</strong> 10 Jahre (gem. § 147 AO)</li>
                  <li><strong>Kundendaten:</strong> Bis zur Löschung des Kundenkontos oder 3 Jahre nach letzter Aktivität</li>
                  <li><strong>E-Mail-Logs:</strong> 3 Monate (für technische Nachverfolgung)</li>
                  <li><strong>Server-Logs:</strong> 30 Tage (für Sicherheit und Fehleranalyse)</li>
                  <li><strong>Cookie-Einstellungen:</strong> 12 Monate oder bis zum Widerruf</li>
                  <li><strong>Anfragen:</strong> 3 Jahre nach Bearbeitung (Nachweis der ordnungsgemäßen Bearbeitung)</li>
                </ul>
              </Typography>
              <Typography variant="body2" paragraph>
                Nach Ablauf der Aufbewahrungsfristen werden die Daten automatisch gelöscht oder anonymisiert, 
                sofern nicht gesetzliche Aufbewahrungspflichten entgegenstehen.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">8. Ihre Rechte</Typography>
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
              <Typography variant="h6">9. Datensicherheit</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen:
              </Typography>
              <Typography component="div" variant="body2">
                <ul>
                  <li><strong>SSL/TLS-Verschlüsselung:</strong> 256-Bit-Verschlüsselung für alle Datenübertragungen</li>
                  <li><strong>Sichere Server:</strong> Hosting in ISO 27001 zertifizierten Rechenzentren</li>
                  <li><strong>Zugriffskontrolle:</strong> Strenge Berechtigungskonzepte und Multi-Faktor-Authentifizierung</li>
                  <li><strong>Datensicherung:</strong> Regelmäßige, verschlüsselte Backups</li>
                  <li><strong>Monitoring:</strong> Kontinuierliche Überwachung auf Sicherheitsvorfälle</li>
                  <li><strong>Pseudonymisierung:</strong> IP-Adressen werden nach 30 Tagen anonymisiert</li>
                </ul>
              </Typography>
              <Typography variant="body2" paragraph>
                Bei Verdacht auf Datenschutzverletzungen informieren wir Sie und die zuständigen 
                Behörden unverzüglich gemäß Art. 33/34 DSGVO.
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