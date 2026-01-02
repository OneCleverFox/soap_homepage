import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Divider,
  Grid
} from '@mui/material';

const WiderrufsrechtPage = () => {
  const { 
    name, 
    address, 
    contact, 
    ceo, 
    fullAddress,
    email,
    phone,
    loading,
    error 
  } = useCompany();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h6">Lade Widerrufsrecht...</Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h6" color="error">
            Fehler beim Laden der Unternehmensdaten: {error}
          </Typography>
        </Paper>
      </Container>
    );
  }

  const firmeName = name || 'Glücksmomente Manufaktur';
  const inhaber = ceo || 'Ralf Jacob';
  const firmAdresse = address?.street && address?.houseNumber && address?.postalCode && address?.city
    ? `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`
    : '68642 Bürstadt';
  const emailAdresse = email || contact?.email || 'info@gluecksmomente-manufaktur.de';
  const telefonnummer = phone || '[Telefonnummer]';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Widerrufsrecht für Verbraucher
        </Typography>
        
        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 3 }}>
          (Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, 
          die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit 
          zugerechnet werden kann.)
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Widerrufsbelehrung
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Widerrufsrecht
          </Typography>
          
          <Typography variant="body1" paragraph>
            Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
            Die Widerrufsfrist beträgt 14 Tage ab dem Tag,
          </Typography>
          
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, 
              die Waren in Besitz genommen haben bzw. hat, sofern Sie eine oder mehrere Waren 
              im Rahmen einer einheitlichen Bestellung bestellt haben und diese einheitlich 
              geliefert wird bzw. werden;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, 
              die letzte Ware in Besitz genommen haben bzw. hat, sofern Sie mehrere Waren 
              im Rahmen einer einheitlichen Bestellung bestellt haben und diese getrennt 
              geliefert werden;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, 
              die letzte Teilsendung oder das letzte Stück in Besitz genommen haben bzw. hat, 
              sofern Sie eine Ware bestellt haben, die in mehreren Teilsendungen oder Stücken 
              geliefert wird;
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({inhaber}, {firmAdresse}, 
            Telefonnr.: {telefonnummer}, E-Mail-Adresse: {emailAdresse}) mittels einer eindeutigen 
            Erklärung (z.B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren 
            Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte 
            Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die 
            Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </Typography>
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Folgen des Widerrufs
          </Typography>
          
          <Typography variant="body1" paragraph>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von 
            Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen 
            Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von 
            uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und 
            spätestens binnen 14 Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über 
            Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung 
            verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion 
            eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; 
            in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben 
            oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, 
            je nachdem, welches der frühere Zeitpunkt ist.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen 14 Tagen ab 
            dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns 
            zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor 
            Ablauf der Frist von 14 Tagen absenden.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser 
            Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise 
            der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
          </Typography>
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Ausschluss- bzw. Erlöschensgründe
          </Typography>
          
          <Typography variant="body1" paragraph>
            Das Widerrufsrecht besteht nicht bei Verträgen
          </Typography>
          
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung 
              eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist 
              oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung von Waren, die schnell verderben können oder deren Verfallsdatum 
              schnell überschritten würde;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung alkoholischer Getränke, deren Preis bei Vertragsschluss vereinbart 
              wurde, die aber frühestens 30 Tage nach Vertragsschluss geliefert werden können 
              und deren aktueller Wert von Schwankungen auf dem Markt abhängt, auf die der 
              Unternehmer keinen Einfluss hat;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung von Zeitungen, Zeitschriften oder Illustrierten mit Ausnahme von 
              Abonnement-Verträgen.
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            Das Widerrufsrecht erlischt vorzeitig bei Verträgen
          </Typography>
          
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung versiegelter Waren, die aus Gründen des Gesundheitsschutzes oder 
              der Hygiene nicht zur Rückgabe geeignet sind, wenn ihre Versiegelung nach der 
              Lieferung entfernt wurde;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung von Waren, wenn diese nach der Lieferung aufgrund ihrer 
              Beschaffenheit untrennbar mit anderen Gütern vermischt wurden;
            </Typography>
            
            <Typography component="li" variant="body1" paragraph>
              zur Lieferung von Ton- oder Videoaufnahmen oder Computersoftware in einer 
              versiegelten Packung, wenn die Versiegelung nach der Lieferung entfernt wurde.
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Muster-Widerrufsformular
          </Typography>
          
          <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
            (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular 
            aus und senden Sie es zurück.)
          </Typography>
          
          <Paper elevation={2} sx={{ p: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="body1" paragraph>
              <strong>An {inhaber}, {firmAdresse}, E-Mail-Adresse: {emailAdresse}:</strong>
            </Typography>
            
            <Typography variant="body1" paragraph>
              Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag 
              über den Kauf der folgenden Waren (*) / die Erbringung der folgenden 
              Dienstleistung (*)
            </Typography>
            
            <Typography variant="body1" paragraph>
              Bestellt am (*) / erhalten am (*)
            </Typography>
            
            <Typography variant="body1" paragraph>
              Name des/der Verbraucher(s)
            </Typography>
            
            <Typography variant="body1" paragraph>
              Anschrift des/der Verbraucher(s)
            </Typography>
            
            <Typography variant="body1" paragraph>
              Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
            </Typography>
            
            <Typography variant="body1" paragraph>
              Datum
            </Typography>
            
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              (*) Unzutreffendes streichen.
            </Typography>
          </Paper>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 4, fontStyle: 'italic', textAlign: 'center' }}>
          Stand: Januar 2026
        </Typography>
      </Paper>
    </Container>
  );
};

export default WiderrufsrechtPage;