import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Card,
  CardMedia,
  Skeleton,
  useMediaQuery,
  Fade,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const GalleryPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState(5000);
  const [showInfo, setShowInfo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageKey, setImageKey] = useState(0);
  
  const autoPlayRef = useRef(null);
  const progressRef = useRef(null);
  const thumbnailRef = useRef(null);

  // Bilder laden
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/gallery`);
      
      console.log('Gallery API Response:', response.data);
      
      if (response.data.success) {
        // Nur aktive Bilder anzeigen
        const activeImages = response.data.images.filter(img => img.isActive);
        console.log('Active images:', activeImages.length);
        setImages(activeImages);
        setAutoPlayInterval(response.data.settings?.autoPlayInterval || 5000);
        setAutoPlay(response.data.settings?.autoPlayEnabled !== false);
        setError(null);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Galerie:', err);
      setError('Fehler beim Laden der Galerie. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Progress Bar Animation
  useEffect(() => {
    if (autoPlay && images.length > 1) {
      setProgress(0);
      const startTime = Date.now();
      
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / autoPlayInterval) * 100;
        
        if (newProgress >= 100) {
          setProgress(100);
        } else {
          setProgress(newProgress);
        }
      }, 50);
    } else {
      setProgress(0);
    }

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [autoPlay, currentIndex, images.length, autoPlayInterval]);

  // Auto-Play Timer
  useEffect(() => {
    if (autoPlay && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setImageKey(prev => prev + 1);
      }, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, images.length, autoPlayInterval]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
    setImageKey(prev => prev + 1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setImageKey(prev => prev + 1);
  }, [images.length]);

  const goToImage = useCallback((index) => {
    setCurrentIndex(index);
    setImageKey(prev => prev + 1);
    
    // Scroll to thumbnail
    if (thumbnailRef.current) {
      const thumbnail = thumbnailRef.current.children[index];
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, []);

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setAutoPlay(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToPrevious, goToNext]);

  // Touch-Gesten für Mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={isMobile ? 300 : 600} />
        <Box sx={{ mt: 2, display: 'flex', gap: 2, overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} variant="rectangular" width={140} height={100} />
          ))}
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (images.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">
          Derzeit sind keine Bilder in der Galerie verfügbar.
        </Alert>
      </Container>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography
              variant={isMobile ? 'h3' : 'h2'}
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 2
              }}
            >
              Galerie
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              Entdecken Sie unsere Bildergalerie
            </Typography>
          </Box>
        </Fade>

        {/* Hauptbild-Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            mb: 4,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Hauptbild mit Ken Burns Effekt */}
          <Fade in key={imageKey} timeout={800}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: isMobile ? 350 : isTablet ? 450 : 550,
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            >
              <Box
                component="img"
                src={currentImage.imageData || currentImage.url}
                alt={currentImage.title || `Bild ${currentIndex + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  animation: 'kenBurns 20s ease-in-out infinite',
                  '@keyframes kenBurns': {
                    '0%': {
                      transform: 'scale(1)',
                    },
                    '50%': {
                      transform: 'scale(1.05)',
                    },
                    '100%': {
                      transform: 'scale(1)',
                    },
                  },
                }}
              />

              {/* Overlay-Gradient */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          </Fade>

          {/* Navigations-Pfeile - nur Desktop */}
          {!isMobile && (
            <>
              <IconButton
                onClick={goToPrevious}
                sx={{
                  position: 'absolute',
                  left: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,1)',
                    transform: 'translateY(-50%) scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <PrevIcon sx={{ fontSize: 36 }} />
              </IconButton>

              <IconButton
                onClick={goToNext}
                sx={{
                  position: 'absolute',
                  right: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,1)',
                    transform: 'translateY(-50%) scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <NextIcon sx={{ fontSize: 36 }} />
              </IconButton>
            </>
          )}

          {/* Bildinfo */}
          <Fade in={showInfo || isMobile} timeout={500}>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: isMobile ? 2 : 3,
                color: 'white',
                zIndex: 1,
              }}
            >
              {currentImage.title && (
                <Typography 
                  variant={isMobile ? 'h6' : 'h5'} 
                  sx={{ 
                    fontWeight: 600,
                    mb: 0.5,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}
                >
                  {currentImage.title}
                </Typography>
              )}
              {currentImage.description && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.9,
                    textShadow: '0 1px 5px rgba(0,0,0,0.5)'
                  }}
                >
                  {currentImage.description}
                </Typography>
              )}
            </Box>
          </Fade>

          {/* Info-Toggle Button (Desktop) */}
          {!isMobile && (
            <IconButton
              onClick={() => setShowInfo(!showInfo)}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                },
                transition: 'all 0.3s ease',
                zIndex: 2,
              }}
            >
              <InfoIcon />
            </IconButton>
          )}

          {/* Auto-Play Toggle & Counter */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              gap: 1,
              zIndex: 2,
            }}
          >
            <IconButton
              onClick={toggleAutoPlay}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {autoPlay ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                px: 2,
                py: 1,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {currentIndex + 1} / {images.length}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Thumbnail-Leiste mit Scroll-Pfeilen */}
        <Box sx={{ position: 'relative', px: isMobile ? 2 : 6, mb: 6 }}>
          {/* Navigation Links - nur Desktop */}
          {!isMobile && (
            <IconButton
              onClick={() => {
                if (thumbnailRef.current) {
                  thumbnailRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
              sx={{
                position: 'absolute',
                left: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                boxShadow: 3,
                zIndex: 5
              }}
            >
              <PrevIcon />
            </IconButton>
          )}

          <Box
            ref={thumbnailRef}
            sx={{
              display: isMobile ? 'grid' : 'flex',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : undefined,
              gap: 2,
              overflowX: isMobile ? 'visible' : 'auto',
              overflowY: isMobile ? 'auto' : 'visible',
              maxHeight: isMobile ? 300 : 'none',
              pb: 2,
              px: isMobile ? 0 : 0,
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                height: isMobile ? 0 : 8,
                width: isMobile ? 8 : 0,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.primary.main,
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              },
            }}
          >
            {images.map((image, index) => (
              <Card
                key={image._id || index}
                onClick={() => goToImage(index)}
                sx={{
                  minWidth: isMobile ? 'auto' : 140,
                  maxWidth: isMobile ? 'none' : 140,
                  height: isMobile ? 120 : 100,
                  width: isMobile ? '100%' : 'auto',
                  flexShrink: isMobile ? 'auto' : 0,
                  cursor: 'pointer',
                  border: currentIndex === index 
                    ? `3px solid ${theme.palette.primary.main}` 
                    : '3px solid transparent',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  transform: currentIndex === index ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: currentIndex === index 
                    ? '0 8px 24px rgba(0,0,0,0.3)' 
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  opacity: currentIndex === index ? 1 : 0.6,
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  image={image.imageData || image.url}
                  alt={image.title || `Thumbnail ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Card>
            ))}
          </Box>

          {/* Navigation Rechts - nur Desktop */}
          {!isMobile && (
            <IconButton
              onClick={() => {
                if (thumbnailRef.current) {
                  thumbnailRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
              sx={{
                position: 'absolute',
                right: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                boxShadow: 3,
                zIndex: 5
              }}
            >
              <NextIcon />
            </IconButton>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default GalleryPage;
