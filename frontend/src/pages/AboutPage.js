import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Avatar,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[8],
  },
}));

const ProductCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  height: '100%',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const TeamCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  height: '100%',
  background: 'linear-gradient(45deg, #f5f7fa 0%, #c3cfe2 100%)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[6],
  },
}));

const AboutPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          mb: 2
        }}>
          Das sind wir
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.8 }}>
          Eine Patchwork-Familie mit einer besonderen Vision: Ralf und sein 11-jähriger Sohn Jonas haben 
          ihre gemeinsame Leidenschaft für die Seifenproduktion und handwerkliche Kunst entdeckt
        </Typography>
      </Box>

      {/* Our Story Section */}
      <Box mb={8}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          textAlign: 'center', 
          mb: 4,
          color: '#333'
        }}>
          <span style={{ marginRight: 16, fontSize: '1.5rem' }}>👨‍👩‍👦</span>
          Unsere Geschichte
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Jonas entdeckt seine Leidenschaft
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                  Alles begann mit Jonas' Neugier auf die Seifenproduktion seines Vaters. 
                  Was zunächst als kindliches Interesse begann, entwickelte sich schnell zu einer 
                  echten Leidenschaft für das traditionelle Handwerk.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  Jonas war fasziniert von der Verwandlung einfacher Zutaten in wunderschöne, 
                  duftende Seifen und wollte unbedingt selbst lernen und mithelfen.
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Vom Lernen zum Lehren
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                  Jonas lernte schnell die Grundlagen der Seifenherstellung und begann, 
                  eigene kreative Ideen einzubringen. Seine natürliche Begabung für 
                  Farben, Düfte und Formen überraschte die ganze Familie.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  Heute ist er nicht nur Schüler, sondern auch kreativer Partner, 
                  der mit seinen frischen Ideen die Seifenproduktion bereichert und 
                  gleichzeitig wunderschönen Schmuck designt.
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>

      {/* Product Areas Section */}
      <Box mb={8}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          textAlign: 'center', 
          mb: 4,
          color: '#333'
        }}>
          <span style={{ marginRight: 16, fontSize: '1.5rem' }}>🛠️</span>
          Unsere Produktbereiche
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3}>
              <span style={{ fontSize: 60, marginBottom: 16, display: 'block' }}>🧼</span>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Natürliche Seifen
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Ralf und Jonas produzieren gemeinsam mit jahrelanger Erfahrung und jugendlicher Kreativität 
                hochwertige, natürliche Seifen aus sorgfältig ausgewählten Zutaten für die tägliche Pflege.
              </Typography>
            </ProductCard>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3} sx={{
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            }}>
              <span style={{ fontSize: 60, marginBottom: 16, display: 'block' }}>💎</span>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Individueller Schmuck
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Jonas fertigt mit viel Liebe zum Detail einzigartige <strong>Halsketten</strong>, 
                <strong> Armbänder</strong> und <strong>Ringe</strong>. 
                Jedes Stück ist ein handgefertigtes Unikat, inspiriert von seiner Leidenschaft für Handwerkskunst.
              </Typography>
            </ProductCard>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3} sx={{
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            }}>
              <span style={{ fontSize: 60, marginBottom: 16, display: 'block' }}>🎨</span>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Familien-Handwerkskunst
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Unsere gemeinsame Leidenschaft für Handwerk zeigt sich in jedem Detail. 
                Von der Ideenfindung bis zum fertigen Produkt - Vater und Sohn arbeiten Hand in Hand 
                und erschaffen einzigartige Kunstwerke.
              </Typography>
            </ProductCard>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 6 }} />

      {/* Team Section */}
      <Box mb={6}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          textAlign: 'center', 
          mb: 4,
          color: '#333'
        }}>
          <span style={{ marginRight: 16, fontSize: '1.5rem' }}>👨‍👩‍👦</span>
          Unser Team
        </Typography>
        
        <Grid container spacing={4}>
          {/* Ralf */}
          <Grid item xs={12} md={4}>
            <TeamCard>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 2,
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                R
              </Avatar>
              <Typography variant="h5" gutterBottom color="primary">
                Ralf (41)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Seifenmeister & Familienvater
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
                <Chip 
                  label="Seifenproduktion" 
                  variant="outlined" 
                  size="small"
                />
                <Chip 
                  label="Qualitätskontrolle" 
                  variant="outlined" 
                  size="small"
                />
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                Der erfahrene Kopf hinter unseren natürlichen Seifen. 
                Ralf bringt Expertise und Leidenschaft für nachhaltige Produkte mit.
              </Typography>
            </TeamCard>
          </Grid>

          {/* Jonas */}
          <Grid item xs={12} md={4}>
            <TeamCard sx={{
              background: 'linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)',
            }}>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 2,
                  background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#333'
                }}
              >
                J
              </Avatar>
              <Typography variant="h5" gutterBottom sx={{ color: '#333' }}>
                Jonas (11)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nachwuchs-Designer & Seifenliebhaber
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" mb={2} sx={{ flexWrap: 'wrap' }}>
                <Chip 
                  label="Seifenproduktion" 
                  variant="filled" 
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#333' }}
                />
                <Chip 
                  label="Halsketten" 
                  variant="filled" 
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#333' }}
                />
                <Chip 
                  label="Armbänder" 
                  variant="filled" 
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#333' }}
                />
                <Chip 
                  label="Ringe" 
                  variant="filled" 
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#333' }}
                />
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                Das kreative Talent der Familie! Jonas entdeckte seine Leidenschaft für die Seifenproduktion 
                und zeigt erstaunliche Begabung sowohl in der traditionellen Seifenherstellung als auch 
                in der Schmuckkunst. Seine frischen Ideen bereichern jedes Projekt.
              </Typography>
            </TeamCard>
          </Grid>

          {/* Sandra */}
          <Grid item xs={12} md={4}>
            <TeamCard>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 2,
                  background: 'linear-gradient(45deg, #a8edea 0%, #fed6e3 100%)',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#333'
                }}
              >
                S
              </Avatar>
              <Typography variant="h5" gutterBottom color="primary">
                Sandra
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Unterstützung & Organisation
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
                <Chip 
                  label="Organisation" 
                  variant="outlined" 
                  size="small"
                />
                <Chip 
                  label="Unterstützung" 
                  variant="outlined" 
                  size="small"
                />
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                Sandra vervollständigt unser Familienteam und sorgt für den 
                reibungslosen Ablauf unserer gemeinsamen Projekte.
              </Typography>
            </TeamCard>
          </Grid>
        </Grid>
      </Box>

      {/* Values Section */}
      <Box textAlign="center" sx={{ 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: 3,
        py: 4,
        px: 3
      }}>
        <Typography variant="h5" gutterBottom color="primary">
          <span style={{ marginRight: 8, fontSize: '1.2rem' }}>💝</span>
          Unsere Werte
        </Typography>
        <Typography variant="body1" sx={{ 
          maxWidth: 800, 
          mx: 'auto', 
          lineHeight: 1.8,
          fontSize: '1.1rem'
        }}>
          Familie, Qualität und Kreativität stehen im Mittelpunkt unseres Schaffens. 
          Jedes Produkt wird mit Liebe gefertigt und spiegelt unsere gemeinsame 
          Leidenschaft für handwerkliche Perfektion und die Freude am Erschaffen schöner Dinge wider.
          Jonas' Begeisterung für die Seifenproduktion hat unser Familienprojekt zu etwas ganz Besonderem gemacht.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutPage;