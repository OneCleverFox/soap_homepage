import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Card,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Slider,
  Fade,
  useMediaQuery,
  Paper,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// SortableThumbnail Component
const SortableThumbnail = ({ image, index, currentIndex, isMobile, theme, goToImage, handleDelete, toggleVisibility, handleEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        minWidth: isMobile ? 'auto' : 140,
        maxWidth: isMobile ? 'none' : 140,
        width: isMobile ? '100%' : 'auto',
        flexShrink: isMobile ? 'auto' : 0
      }}
    >
      <Card
        sx={{
          border: currentIndex === index 
            ? `3px solid ${theme.palette.primary.main}` 
            : '3px solid transparent',
          borderRadius: 2,
          overflow: 'visible',
          transition: 'all 0.3s ease',
          transform: isDragging 
            ? 'scale(1.1) rotate(2deg)' 
            : currentIndex === index ? 'scale(1.05)' : 'scale(1)',
          boxShadow: currentIndex === index 
            ? '0 8px 24px rgba(0,0,0,0.4)' 
            : '0 2px 8px rgba(0,0,0,0.2)',
          opacity: isDragging ? 0.5 : (image.isActive ? 1 : 0.5),
          position: 'relative'
        }}
      >
        <Box 
          sx={{ position: 'relative', cursor: 'grab' }}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
            goToImage(index);
          }}
        >
          <CardMedia
            component="img"
            image={image.imageData}
            alt={image.title || `Thumbnail ${index + 1}`}
            loading="lazy"
            sx={{
              height: isMobile ? 100 : 120,
              objectFit: 'cover',
              filter: currentIndex === index ? 'brightness(1)' : 'brightness(0.7)',
              transition: 'filter 0.3s ease',
              pointerEvents: 'none'
            }}
          />
          <Chip
            label={index + 1}
            size="small"
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontWeight: 600,
              pointerEvents: 'none'
            }}
          />
        </Box>
        
        {/* Admin-Buttons unterhalb des Bildes */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1 : 0.5, 
          p: isMobile ? 1 : 0.5,
          backgroundColor: 'rgba(255,255,255,0.95)'
        }}>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(image, e);
            }}
            sx={{ flex: 1, minHeight: isMobile ? 44 : 'auto' }}
            title="Bearbeiten"
          >
            <EditIcon fontSize={isMobile ? 'medium' : 'small'} />
          </IconButton>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            color={image.isActive ? 'success' : 'warning'}
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(image, e);
            }}
            sx={{ flex: 1, minHeight: isMobile ? 44 : 'auto' }}
            title={image.isActive ? 'Deaktivieren' : 'Aktivieren'}
          >
            {image.isActive ? <VisibilityIcon fontSize={isMobile ? 'medium' : 'small'} /> : <VisibilityOffIcon fontSize={isMobile ? 'medium' : 'small'} />}
          </IconButton>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(image._id, e);
            }}
            sx={{ flex: 1, minHeight: isMobile ? 44 : 'auto' }}
            title="Löschen"
          >
            <DeleteIcon fontSize={isMobile ? 'medium' : 'small'} />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
};

const AdminGallery = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 8,
      },
    })
  );
  
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [autoPlay, setAutoPlay] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageKey, setImageKey] = useState(0);
  
  const autoPlayRef = useRef(null);
  const progressRef = useRef(null);
  const thumbnailRef = useRef(null);
  const thumbnailScrollRef = useRef(null);

  // Upload State
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    imageData: null,
    imagePreview: null,
    isActive: true
  });

  // Edit State
  const [editData, setEditData] = useState({
    _id: null,
    title: '',
    description: '',
    isActive: true
  });

  // Settings State
  const [settings, setSettings] = useState({
    autoPlayInterval: 5000,
    autoPlayEnabled: true
  });

  // Token aus localStorage
  const getAuthToken = () => localStorage.getItem('token');

  // Bilder laden
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/gallery/admin/all`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      
      if (response.data.success) {
        setImages(response.data.images);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Bilder:', error);
      showSnackbar('Fehler beim Laden der Bilder', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Einstellungen laden
  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/gallery/settings`);
      
      if (response.data.success) {
        setSettings(response.data.settings);
        setAutoPlay(response.data.settings.autoPlayEnabled);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    }
  }, []);

  useEffect(() => {
    loadImages();
    loadSettings();
  }, [loadImages, loadSettings]);

  // Progress Bar Animation
  useEffect(() => {
    if (autoPlay && images.length > 1) {
      setProgress(0);
      const startTime = Date.now();
      
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / settings.autoPlayInterval) * 100;
        
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
  }, [autoPlay, currentIndex, images.length, settings.autoPlayInterval]);

  // Auto-Play Timer
  useEffect(() => {
    if (autoPlay && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setImageKey(prev => prev + 1);
      }, settings.autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, images.length, settings.autoPlayInterval]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setAutoPlay(false);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
    setImageKey(prev => prev + 1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setAutoPlay(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setImageKey(prev => prev + 1);
  }, [images.length]);

  const goToImage = useCallback((index) => {
    setAutoPlay(false);
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

  // Snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Bild-Upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Dateigrößen-Check (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showSnackbar('Datei ist zu groß (max 10MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadData({
        ...uploadData,
        imageData: reader.result,
        imagePreview: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadData.imageData) {
      showSnackbar('Bitte wählen Sie ein Bild aus', 'error');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/gallery/admin/upload`,
        uploadData,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      if (response.data.success) {
        showSnackbar('Bild erfolgreich hochgeladen');
        setUploadDialogOpen(false);
        setUploadData({ title: '', description: '', imageData: null, imagePreview: null, isActive: true });
        loadImages();
      }
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      showSnackbar('Fehler beim Hochladen des Bildes', 'error');
    }
  };

  // Bild löschen
  const handleDelete = async (imageId, event) => {
    event.stopPropagation();
    if (!window.confirm('Möchten Sie dieses Bild wirklich löschen?')) return;

    try {
      // Merke die aktuelle Position für die Anpassung nach dem Löschen
      const wasLastImage = currentIndex >= images.length - 1;
      
      const response = await axios.delete(
        `${API_BASE_URL}/gallery/admin/${imageId}`,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      if (response.data.success) {
        showSnackbar('Bild erfolgreich gelöscht');
        
        // Wenn das letzte Bild gelöscht wurde, gehe eins zurück
        if (wasLastImage && images.length > 1) {
          setCurrentIndex(images.length - 2);
          setRotation(prev => prev - (360 / images.length));
        }
        
        // Bilder neu laden
        await loadImages();
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      showSnackbar('Fehler beim Löschen des Bildes', 'error');
    }
  };

  // Sichtbarkeit umschalten
  const toggleVisibility = async (image, event) => {
    event.stopPropagation();
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/gallery/admin/${image._id}`,
        { isActive: !image.isActive },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      if (response.data.success) {
        showSnackbar(`Bild ${!image.isActive ? 'aktiviert' : 'deaktiviert'}`);
        loadImages();
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      showSnackbar('Fehler beim Aktualisieren des Bildes', 'error');
    }
  };

  // Bild bearbeiten öffnen
  const handleEdit = (image, event) => {
    event.stopPropagation();
    setEditData({
      _id: image._id,
      title: image.title || '',
      description: image.description || '',
      isActive: image.isActive
    });
    setEditDialogOpen(true);
  };

  // Bild-Änderungen speichern
  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/gallery/admin/${editData._id}`,
        {
          title: editData.title,
          description: editData.description,
          isActive: editData.isActive
        },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      if (response.data.success) {
        showSnackbar('Bild erfolgreich aktualisiert');
        setEditDialogOpen(false);
        setEditData({ _id: null, title: '', description: '', isActive: true });
        loadImages();
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      showSnackbar('Fehler beim Aktualisieren des Bildes', 'error');
    }
  };

  // Reihenfolge ändern (Drag & Drop)
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(img => img._id === active.id);
    const newIndex = images.findIndex(img => img._id === over.id);

    const items = arrayMove(images, oldIndex, newIndex);
    setImages(items);

    try {
      const imageIds = items.map(img => img._id);
      await axios.post(
        `${API_BASE_URL}/gallery/admin/reorder`,
        { imageIds },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );
      showSnackbar('Reihenfolge erfolgreich aktualisiert');
    } catch (error) {
      console.error('Fehler beim Neuordnen:', error);
      showSnackbar('Fehler beim Neuordnen der Bilder', 'error');
      loadImages();
    }
  };

  // Einstellungen speichern
  const handleSaveSettings = async () => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/gallery/admin/settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      if (response.data.success) {
        showSnackbar('Einstellungen erfolgreich gespeichert');
        setSettingsDialogOpen(false);
        setAutoPlay(settings.autoPlayEnabled);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showSnackbar('Fehler beim Speichern der Einstellungen', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={1000}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant={isMobile ? 'h4' : 'h3'}
                sx={{
                  fontWeight: 700,
                  color: 'text.primary'
                }}
              >
                Galerie-Verwaltung
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                {images.length} Bild{images.length !== 1 ? 'er' : ''} in der Galerie
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setSettingsDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ flex: isMobile ? 1 : 'auto', minWidth: isMobile ? 0 : 'auto' }}
              >
                {isMobile ? 'Settings' : 'Einstellungen'}
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{ flex: isMobile ? 1 : 'auto', minWidth: isMobile ? 0 : 'auto' }}
              >
                {isMobile ? 'Upload' : 'Bild hochladen'}
              </Button>
            </Box>
          </Box>
        </Fade>

        {/* Galerie-Ansicht */}
        {images.length > 0 ? (
          <>
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
            >
              {/* Hauptbild mit Ken Burns Effekt */}
              <Fade in key={imageKey} timeout={800}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: isMobile ? 300 : isTablet ? 450 : 600,
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Box
                    component="img"
                    src={images[currentIndex].imageData}
                    alt={images[currentIndex].title || `Bild ${currentIndex + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      animation: 'kenBurns 20s ease-in-out infinite',
                      '@keyframes kenBurns': {
                        '0%': {
                          transform: 'scale(1)',
                        },
                        '50%': {
                          transform: 'scale(1.08)',
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

              {/* Navigations-Pfeile */}
              <IconButton
                onClick={goToPrevious}
                sx={{
                  position: 'absolute',
                  left: isMobile ? 8 : 24,
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
                <PrevIcon sx={{ fontSize: isMobile ? 28 : 36 }} />
              </IconButton>

              <IconButton
                onClick={goToNext}
                sx={{
                  position: 'absolute',
                  right: isMobile ? 8 : 24,
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
                <NextIcon sx={{ fontSize: isMobile ? 28 : 36 }} />
              </IconButton>

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
                  {images[currentIndex].title && (
                    <Typography 
                      variant={isMobile ? 'h6' : 'h5'} 
                      sx={{ 
                        fontWeight: 600,
                        mb: 0.5,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                      }}
                    >
                      {images[currentIndex].title}
                    </Typography>
                  )}
                  {images[currentIndex].description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.9,
                        textShadow: '0 1px 5px rgba(0,0,0,0.5)'
                      }}
                    >
                      {images[currentIndex].description}
                    </Typography>
                  )}
                  
                  {/* Sichtbarkeits-Badge */}
                  <Chip
                    label={images[currentIndex].isActive ? 'Sichtbar' : 'Versteckt'}
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: images[currentIndex].isActive 
                        ? 'rgba(76, 175, 80, 0.9)' 
                        : 'rgba(244, 67, 54, 0.9)',
                      color: 'white',
                    }}
                  />
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
                    color: showInfo ? theme.palette.primary.main : 'rgba(0,0,0,0.7)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,1)',
                    },
                    transition: 'all 0.3s ease',
                    zIndex: 2,
                  }}
                >
                  {showInfo ? <VisibilityIcon /> : <VisibilityOffIcon />}
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

            {/* Thumbnail-Leiste mit Drag & Drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Box
                sx={{
                  position: 'relative',
                  mb: 4,
                  px: isMobile ? 2 : 0,
                }}
              >
                {/* Scroll-Pfeil Links - nur Desktop */}
                {!isMobile && (
                  <IconButton
                    onClick={() => {
                      if (thumbnailScrollRef.current) {
                        thumbnailScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                      }
                    }}
                    sx={{
                      position: 'absolute',
                      left: -20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,1)',
                        boxShadow: '0 6px 30px rgba(0,0,0,0.2)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <PrevIcon />
                  </IconButton>
                )}

                <SortableContext
                  items={images.map(img => img._id)}
                  strategy={isMobile ? rectSortingStrategy : horizontalListSortingStrategy}
                >
                  <Box
                    ref={(el) => {
                      thumbnailRef.current = el;
                      thumbnailScrollRef.current = el;
                    }}
                    sx={{
                      display: isMobile ? 'grid' : 'flex',
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : undefined,
                      gridAutoRows: isMobile ? 'auto' : undefined,
                      gap: 2,
                      overflowX: isMobile ? 'visible' : 'auto',
                      overflowY: isMobile ? 'auto' : 'visible',
                      maxHeight: isMobile ? 400 : 'none',
                      pb: 2,
                      px: isMobile ? 0 : 1,
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
                      <SortableThumbnail
                        key={image._id}
                        image={image}
                        index={index}
                        currentIndex={currentIndex}
                        isMobile={isMobile}
                        theme={theme}
                        goToImage={goToImage}
                        handleDelete={handleDelete}
                        toggleVisibility={toggleVisibility}
                        handleEdit={handleEdit}
                      />
                    ))}
                  </Box>
                </SortableContext>

                {/* Scroll-Pfeil Rechts - nur Desktop */}
                {!isMobile && (
                  <IconButton
                    onClick={() => {
                      if (thumbnailScrollRef.current) {
                        thumbnailScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                      }
                    }}
                    sx={{
                      position: 'absolute',
                      right: -20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,1)',
                      boxShadow: '0 6px 30px rgba(0,0,0,0.2)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <NextIcon />
                </IconButton>
                )}
              </Box>
            </DndContext>
          </>
        ) : (
          <Alert severity="info">
            Keine Bilder vorhanden. Laden Sie Ihr erstes Bild hoch!
          </Alert>
        )}
      </Container>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neues Bild hochladen</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
              sx={{ mb: 2 }}
            >
              Bild auswählen
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageSelect}
              />
            </Button>

            {uploadData.imagePreview && (
              <Box sx={{ mb: 2 }}>
                <img
                  src={uploadData.imagePreview}
                  alt="Vorschau"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="Titel (optional)"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Beschreibung (optional)"
              multiline
              rows={3}
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={uploadData.isActive}
                  onChange={(e) => setUploadData({ ...uploadData, isActive: e.target.checked })}
                />
              }
              label="Sofort sichtbar"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!uploadData.imageData}
          >
            Hochladen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bild bearbeiten</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Titel"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Beschreibung"
              multiline
              rows={3}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editData.isActive}
                  onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                />
              }
              label="Sichtbar"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Galerie-Einstellungen</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoPlayEnabled}
                  onChange={(e) => setSettings({ ...settings, autoPlayEnabled: e.target.checked })}
                />
              }
              label="Auto-Play aktiviert"
              sx={{ mb: 3 }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography gutterBottom>
              Wechsel-Intervall: {settings.autoPlayInterval / 1000} Sekunden
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Zeit bis zum automatischen Wechsel zum nächsten Bild
            </Typography>
            <Slider
              value={settings.autoPlayInterval}
              onChange={(e, value) => setSettings({ ...settings, autoPlayInterval: value })}
              min={1000}
              max={30000}
              step={1000}
              marks={[
                { value: 1000, label: '1s' },
                { value: 5000, label: '5s' },
                { value: 10000, label: '10s' },
                { value: 15000, label: '15s' },
                { value: 30000, label: '30s' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value / 1000}s`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveSettings} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminGallery;
