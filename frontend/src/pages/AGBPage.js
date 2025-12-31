import React from 'react';
import { useCompanyInfo } from '../hooks/useCompanyInfo';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Divider
} from '@mui/material';

const AGBPage = () => {
  const { companyInfo } = useCompanyInfo();
  const name = companyInfo.name || 'Glücksmomente Manufaktur';
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Allgemeine Geschäftsbedingungen (AGB)
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            § 1 Geltungsbereich
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") der 
            {name || 'Glücksmomente Manufaktur'} (nachfolgend "Verkäufer") gelten für alle 
            Verträge über die Lieferung von Waren, die ein Verbraucher oder Unternehmer 
            (nachfolgend "Kunde") mit dem Verkäufer hinsichtlich der vom Verkäufer 
            in seinem Online-Shop dargestellten Waren abschließt.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Entgegenstehende oder von diesen AGB abweichende Bedingungen des Kunden 
            werden nicht anerkannt, es sei denn, der Verkäufer stimmt ihrer Geltung 
            ausdrücklich schriftlich zu.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 2 Vertragsschluss
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die im Online-Shop des Verkäufers enthaltenen Produktbeschreibungen 
            stellen keine verbindlichen Angebote seitens des Verkäufers dar, sondern 
            dienen zur Abgabe eines verbindlichen Angebots durch den Kunden.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Der Kunde kann das Angebot über das in den Online-Shop des Verkäufers 
            integrierte Online-Bestellformular abgeben. Dabei gibt der Kunde, nachdem 
            er die ausgewählten Waren in den virtuellen Warenkorb gelegt und den 
            elektronischen Bestellvorgang durchlaufen hat, durch Klicken des den 
            Bestellvorgang abschließenden Buttons ein rechtlich verbindliches 
            Vertragsangebot ab.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Der Verkäufer kann das Angebot des Kunden innerhalb von fünf Tagen annehmen, 
            indem er dem Kunden eine schriftliche Auftragsbestätigung oder eine 
            Auftragsbestätigung in Textform (Fax oder E-Mail) übermittelt oder indem 
            er dem Kunden die bestellte Ware liefert.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 3 Preise und Zahlungsbedingungen
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die angegebenen Preise enthalten die gesetzliche Umsatzsteuer und 
            sonstige Preisbestandteile. Hinzu kommen etwaige Versandkosten.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Die Zahlung erfolgt per Vorkasse, PayPal oder Kreditkarte.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Bei Zahlung per Vorkasse wird die Ware nach Zahlungseingang versandt.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 4 Lieferung
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die Lieferung erfolgt nur innerhalb Deutschlands.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Die Lieferzeit beträgt in der Regel 3-5 Werktage nach Zahlungseingang.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Versandkosten werden gesondert ausgewiesen und sind vom Kunden zu tragen.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 5 Widerrufsrecht
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Verbrauchern steht ein Widerrufsrecht nach folgender Maßgabe zu, 
            wobei Verbraucher jede natürliche Person ist, die ein Rechtsgeschäft zu 
            Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer 
            selbständigen beruflichen Tätigkeit zugerechnet werden können:
          </Typography>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Widerrufsbelehrung
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Widerrufsrecht</strong><br />
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen 
              diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage 
              ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht 
              der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
            </Typography>
            <Typography variant="body2" paragraph>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen 
              Erklärung (z.B. ein mit der Post versandter Brief, Telefax oder E-Mail) 
              über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 6 Gewährleistung
          </Typography>
          <Typography variant="body1" paragraph>
            Es gelten die gesetzlichen Gewährleistungsregelungen.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 7 Schlussbestimmungen
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Auf Verträge zwischen dem Verkäufer und dem Kunden findet das Recht 
            der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts Anwendung.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Sofern es sich beim Kunden um einen Kaufmann, eine juristische Person 
            des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen handelt, 
            ist Gerichtsstand für alle Streitigkeiten aus Vertragsverhältnissen zwischen 
            dem Kunden und dem Verkäufer der Sitz des Verkäufers.
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 4, fontStyle: 'italic' }}>
          Stand: Oktober 2025
        </Typography>
      </Paper>
    </Container>
  );
};

export default AGBPage;