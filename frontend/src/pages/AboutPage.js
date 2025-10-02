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
import { 
  FavoriteOutlined,
  GroupsOutlined,
  HandymanOutlined,
  DiamondOutlined,
  SpaOutlined,
  BrushOutlined
} from '@mui/icons-material';
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
          Eine Patchwork-Familie mit einer besonderen Vision: Ralf und sein 11-jähriger Sohn Jonas verbinden 
          traditionelle Seifenproduktion mit moderner Schmuckkunst
        </Typography>
      </Box>

      {/* Our Story Section */}
      <Box mb={8}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          textAlign: 'center', 
          mb: 4,
          color: '#333'
        }}>
          <GroupsOutlined sx={{ mr: 2, verticalAlign: 'middle' }} />
          Unsere Geschichte
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Die Idee entsteht
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                  Alles begann mit einem einfachen Wunsch: Jonas träumte von einer eigenen Drohne. 
                  Aus diesem Gedanken heraus entwickelte sich die Idee, gemeinsam etwas Besonderes zu schaffen, 
                  um diesen Traum zu verwirklichen.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  Was als kleines Familienprojekt begann, wurde schnell zu unserer gemeinsamen Leidenschaft.
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Gemeinsame Zeit
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                  Als Patchwork-Familie ist uns die gemeinsame Zeit besonders wertvoll. 
                  Wann immer möglich, verbringen wir diese Zeit zusammen in unserer kleinen Manufaktur.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  Hier entstehen nicht nur unsere Produkte, sondern auch unvergessliche Erinnerungen 
                  und eine noch stärkere Familienbindung.
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
          <HandymanOutlined sx={{ mr: 2, verticalAlign: 'middle' }} />
          Unsere Produktbereiche
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3}>
              <SpaOutlined sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Natürliche Seifen
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Ralf produziert mit jahrelanger Erfahrung hochwertige, natürliche Seifen 
                aus sorgfältig ausgewählten Zutaten für die tägliche Pflege.
              </Typography>
            </ProductCard>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3} sx={{
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            }}>
              <DiamondOutlined sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Individueller Schmuck
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Jonas fertigt mit viel Liebe zum Detail einzigartige <strong>Halsketten</strong>, 
                <strong> Armbänder</strong> und <strong>Ringe</strong>. 
                Jedes Stück ist ein handgefertigtes Unikat.
              </Typography>
            </ProductCard>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ProductCard elevation={3} sx={{
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            }}>
              <BrushOutlined sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Kreative Handwerkskunst
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Unsere Leidenschaft für Handwerk zeigt sich in jedem Detail. 
                Von der Ideenfindung bis zum fertigen Produkt steckt pure Kreativität drin.
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
          <GroupsOutlined sx={{ mr: 2, verticalAlign: 'middle' }} />
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
                  icon={<SpaOutlined />}
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
                Nachwuchs-Schmuckdesigner
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" mb={2} sx={{ flexWrap: 'wrap' }}>
                <Chip 
                  label="Halsketten" 
                  variant="filled" 
                  size="small"
                  icon={<DiamondOutlined />}
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
                Das kreative Talent der Familie! Jonas zeigt erstaunliche Begabung 
                in der Schmuckherstellung und designt einzigartige Accessoires.
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
          <FavoriteOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
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
          Leidenschaft für handwerkliche Perfektion wider.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutPage;