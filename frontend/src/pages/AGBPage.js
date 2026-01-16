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
  const { name, email } = useCompanyInfo();
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Allgemeine Geschäftsbedingungen (AGB)
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h4" gutterBottom>
          I. Allgemeine Geschäftsbedingungen
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            § 1 Grundlegende Bestimmungen
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die nachstehenden Geschäftsbedingungen gelten für Verträge, die Sie mit uns als Anbieter 
            ({name || 'Glücksmomente Manufaktur'}) über unsere Internetseite schließen. Soweit nicht anders 
            vereinbart, wird der Einbeziehung gegebenenfalls von Ihnen verwendeter eigener Bedingungen widersprochen.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Verbraucher im Sinne der nachstehenden Regelungen ist jede natürliche Person, die ein 
            Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer 
            selbständigen beruflichen Tätigkeit zugerechnet werden kann. Unternehmer ist jede natürliche 
            oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines 
            Rechtsgeschäfts in Ausübung ihrer selbständigen beruflichen oder gewerblichen Tätigkeit handelt.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 2 Zustandekommen des Vertrages
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Gegenstand des Vertrages ist der Verkauf von handgefertigten Produkten, insbesondere Seifen, 
            Kosmetik- und Pflegeprodukte, Dekorationsartikel, Gipsabdrücke und Bilder.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Bereits mit dem Einstellen des jeweiligen Produkts auf unserer Internetseite unterbreiten 
            wir Ihnen ein verbindliches Angebot zum Abschluss eines Vertrages zu den in der Artikelbeschreibung 
            angegebenen Bedingungen.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Der Vertrag kommt auf eine der folgenden Arten zustande:
          </Typography>
          
          <Box sx={{ ml: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              a) Klassische Bestellung über das Online-Warenkorbsystem:
            </Typography>
            <Typography variant="body1" paragraph>
              • Die zum Kauf beabsichtigten Waren werden im "Warenkorb" abgelegt<br />
              • Über die entsprechende Schaltfläche können Sie den "Warenkorb" aufrufen und jederzeit Änderungen vornehmen<br />
              • Nach Aufrufen der Seite "Kasse" und der Eingabe der persönlichen Daten werden alle Bestelldaten 
              auf der Bestellübersichtsseite angezeigt<br />
              • Sie werden zu PayPal weitergeleitet, wo Sie die Zahlung vornehmen<br />
              • Mit dem Absenden der Bestellung über die Schaltfläche "zahlungspflichtig bestellen" oder 
              "jetzt kaufen" erklären Sie rechtsverbindlich die Annahme des Angebotes, wodurch der Vertrag zustande kommt
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              b) Anfrage-System:
            </Typography>
            <Typography variant="body1" paragraph>
              • Sie stellen eine unverbindliche Anfrage für gewünschte Produkte<br />
              • Wir prüfen Ihre Anfrage und senden Ihnen ein verbindliches Angebot in Textform (E-Mail) zu<br />
              • Sie können dieses Angebot innerhalb von 5 Tagen annehmen<br />
              • Bei Annahme des Angebotes erhalten Sie einen PayPal-Zahlungslink<br />
              • Der Vertrag kommt mit der erfolgreichen PayPal-Zahlung zustande
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            (4) Die Abwicklung der Bestellung und Übermittlung aller im Zusammenhang mit dem Vertragsschluss 
            erforderlichen Informationen erfolgt per E-Mail zum Teil automatisiert. Sie haben deshalb 
            sicherzustellen, dass die von Ihnen hinterlegte E-Mail-Adresse zutreffend ist, der Empfang der 
            E-Mails technisch sichergestellt und insbesondere nicht durch SPAM-Filter verhindert wird.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 3 Preise und Zahlungsbedingungen
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die in den jeweiligen Angeboten angeführten Preise sowie die Versandkosten stellen 
            Gesamtpreise dar. Sie beinhalten alle Preisbestandteile einschließlich aller anfallenden Steuern.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Die anfallenden Versandkosten sind nicht im Kaufpreis enthalten. Sie werden im Laufe des 
            Bestellvorganges gesondert ausgewiesen und sind von Ihnen zusätzlich zu tragen, soweit nicht 
            die versandkostenfreie Lieferung zugesagt ist.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Als Zahlungsart steht Ihnen ausschließlich PayPal zur Verfügung. Die Zahlungsansprüche 
            aus dem geschlossenen Vertrag sind sofort zur Zahlung fällig.
          </Typography>
          <Typography variant="body1" paragraph>
            (4) Die Zahlung erfolgt über den Zahlungsdienstleister PayPal. Für die Abwicklung gelten 
            die AGB und Datenschutzbestimmungen von PayPal.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 4 Lieferbedingungen
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Die Lieferung erfolgt innerhalb Deutschlands und in EU-Länder, soweit nicht anders angegeben.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Die Lieferzeit beträgt in der Regel 3-7 Werktage nach Zahlungseingang, da alle Produkte 
            handgefertigt sind.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Als Verbraucher ist gesetzlich geregelt, dass die Gefahr des zufälligen Untergangs und 
            der zufälligen Verschlechterung der verkauften Sache während der Versendung erst mit der 
            Übergabe der Ware an Sie übergeht, unabhängig davon, ob die Versendung versichert oder 
            unversichert erfolgt.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 5 Widerrufsrecht
          </Typography>
          <Typography variant="body1" paragraph>
            Verbrauchern steht ein Widerrufsrecht nach folgender Maßgabe zu:
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
              Erklärung (z.B. ein mit der Post versandter Brief oder E-Mail an {email || 'info@gluecksmomente-manufaktur.de'}) 
              über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Widerrufsfolgen</strong><br />
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von 
              Ihnen erhalten haben, einschließlich der Lieferkosten unverzüglich und spätestens 
              binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren 
              Widerruf dieses Vertrags bei uns eingegangen ist.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 6 Gewährleistung
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Es bestehen die gesetzlichen Mängelhaftungsrechte.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Als Verbraucher werden Sie gebeten, die Ware bei Lieferung umgehend auf 
            Vollständigkeit, offensichtliche Mängel und Transportschäden zu überprüfen und 
            uns Beanstandungen schnellstmöglich mitzuteilen. Kommen Sie dem nicht nach, 
            hat dies keine Auswirkung auf Ihre gesetzlichen Gewährleistungsansprüche.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            § 7 Rechtswahl
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Es gilt deutsches Recht. Bei Verbrauchern gilt diese Rechtswahl nur, 
            soweit hierdurch der durch zwingende Bestimmungen des Rechts des Staates des 
            gewöhnlichen Aufenthaltes des Verbrauchers gewährte Schutz nicht entzogen wird 
            (Günstigkeitsprinzip).
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Die Bestimmungen des UN-Kaufrechts finden ausdrücklich keine Anwendung.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Typography variant="h4" gutterBottom>
          II. Kundeninformationen
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            1. Vertragssprache, Vertragstextspeicherung
          </Typography>
          <Typography variant="body1" paragraph>
            (1) Vertragssprache ist deutsch.
          </Typography>
          <Typography variant="body1" paragraph>
            (2) Der vollständige Vertragstext wird von uns nicht gespeichert. Vor Absenden der 
            Bestellung über das Online-Warenkorbsystem können die Vertragsdaten über die 
            Druckfunktion des Browsers ausgedruckt oder elektronisch gesichert werden. Nach 
            Zugang der Bestellung bei uns werden die Bestelldaten und die Allgemeinen 
            Geschäftsbedingungen nochmals per E-Mail an Sie übersandt.
          </Typography>
          <Typography variant="body1" paragraph>
            (3) Bei Anfragen außerhalb des Online-Warenkorbsystems erhalten Sie alle Vertragsdaten 
            im Rahmen eines verbindlichen Angebotes in Textform per E-Mail übersandt, welche Sie 
            ausdrucken oder elektronisch sichern können.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            2. Wesentliche Merkmale der Ware
          </Typography>
          <Typography variant="body1" paragraph>
            Die wesentlichen Merkmale unserer handgefertigten Produkte (Seifen, Kosmetik- und Pflegeprodukte, 
            Dekorationsartikel, Gipsabdrücke, Bilder) finden sich in der jeweiligen Produktbeschreibung auf unserer Website.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            3. EU-Streitschlichtung
          </Typography>
          <Typography variant="body1" paragraph>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:<br />
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
              https://ec.europa.eu/consumers/odr/
            </a><br />
            Unsere E-Mail-Adresse: {email || 'info@gluecksmomente-manufaktur.de'}
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            4. Verbraucherstreitbeilegung
          </Typography>
          <Typography variant="body1" paragraph>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
            Verbraucherschlichtungsstelle teilzunehmen.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Stand: Januar 2026
        </Typography>
      </Paper>
    </Container>
  );
};

export default AGBPage;