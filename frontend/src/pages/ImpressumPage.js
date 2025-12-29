import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Grid,
  Divider
} from '@mui/material';

const ImpressumPage = () => {
  const { name, email, ceo } = useCompany();
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Impressum
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              Angaben gemäß § 5 TMG
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" paragraph>
                <strong>{name || 'Glücksmomente Manufaktur'}</strong><br />
                {ceo || 'Ralf Jacob'}<br />                
                68642 Bürstadt
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Kontakt
              </Typography>
              <Typography variant="body1" paragraph>                
                E-Mail: {email || 'info@gluecksmomente-manufaktur.de'}
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Umsatzsteuer-ID
              </Typography>
              <Typography variant="body1" paragraph>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                [Ihre USt-IdNr.]
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              Rechtliche Hinweise
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </Typography>
            <Typography variant="body1" paragraph>
              Ralf Jacob<br />
              68642 Bürstadt
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Haftung für Inhalte
            </Typography>
            <Typography variant="body2" paragraph>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf 
              diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG 
              sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte 
              oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu 
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Haftung für Links
            </Typography>
            <Typography variant="body2" paragraph>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir 
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine 
              Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige 
              Anbieter oder Betreiber der Seiten verantwortlich.
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Urheberrecht
            </Typography>
            <Typography variant="body2" paragraph>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten 
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, 
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes 
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ImpressumPage;