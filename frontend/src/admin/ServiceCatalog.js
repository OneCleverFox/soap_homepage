import React, { useMemo, useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Grid,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  BuildCircleOutlined as ServiceIcon,
  AutoFixHigh as PlotterIcon,
  ArchiveOutlined as InactiveIcon
} from '@mui/icons-material';

const CATEGORY_ORDER = ['standard', 'plotterarbeiten'];
const CATEGORY_LABELS = {
  standard: '🛠️ Leistungen',
  plotterarbeiten: '✂️ Plotterarbeiten',
  inactive: '🗄️ Inaktive Leistungen'
};

const normalizeServiceType = (value) =>
  String(value || '').toLowerCase() === 'plotterarbeiten' ? 'plotterarbeiten' : 'standard';

const ServiceCatalog = ({
  services = [],
  onServiceSelect,
  isMobile = false,
  isSmallMobile = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    standard: true,
    plotterarbeiten: true,
    inactive: false
  });

  const groupedServices = useMemo(() => {
    const groups = {
      standard: { active: [], inactive: [] },
      plotterarbeiten: { active: [], inactive: [] }
    };

    services.forEach((service) => {
      const isActive = service.isActive !== false;
      const category = normalizeServiceType(service.serviceType);

      if (!groups[category]) {
        return;
      }

      if (isActive) {
        groups[category].active.push(service);
      } else {
        groups[category].inactive.push(service);
      }
    });

    return groups;
  }, [services]);

  const filterServices = (serviceList) => {
    if (!searchTerm.trim()) {
      return serviceList;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return serviceList.filter((service) =>
      service.name?.toLowerCase().includes(lowerSearch) ||
      service.description?.toLowerCase().includes(lowerSearch) ||
      service.invoiceNote?.toLowerCase().includes(lowerSearch) ||
      service.sku?.toLowerCase().includes(lowerSearch)
    );
  };

  const handleCategoryToggle = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const ServiceCard = ({ service, isInactive = false }) => {
    const isPlotter = normalizeServiceType(service.serviceType) === 'plotterarbeiten';

    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-4px)',
            backgroundColor: '#f5f5f5'
          },
          minHeight: isMobile ? 'auto' : 120,
          opacity: isInactive ? 0.7 : 1,
          position: 'relative',
          backgroundColor: isInactive ? '#f5f5f5' : '#fafafa'
        }}
        onClick={() => onServiceSelect(service)}
      >
        {isInactive && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600
            }}
          >
            <InactiveIcon sx={{ fontSize: '0.9rem' }} />
            Inaktiv
          </Box>
        )}
        <CardContent sx={{ p: isSmallMobile ? 1.5 : 2, pb: isSmallMobile ? 1.5 : 2 }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{
              fontSize: isSmallMobile ? '0.95rem' : '0.875rem',
              fontWeight: 'bold',
              mb: 1,
              pr: isInactive ? 3 : 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            {isPlotter ? <PlotterIcon fontSize="small" color="primary" /> : <ServiceIcon fontSize="small" color="action" />}
            {service.name}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{
                fontSize: isSmallMobile ? '1rem' : '0.875rem',
                fontWeight: 'bold'
              }}
            >
              💵 {Number(service.defaultPrice || 0).toFixed(2)}€
            </Typography>
            {service.sku && (
              <Typography
                variant="caption"
                sx={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  px: 1,
                  py: 0.5,
                  borderRadius: '4px',
                  fontSize: '0.65rem'
                }}
              >
                SKU: {service.sku}
              </Typography>
            )}
          </Box>

          {(service.description || service.invoiceNote) && (
            <Typography
              variant="caption"
              display="block"
              color="textSecondary"
              sx={{
                fontSize: '0.75rem',
                mt: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {service.description || service.invoiceNote}
            </Typography>
          )}

          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="caption"
              display="block"
              color="textSecondary"
              sx={{ fontSize: isSmallMobile ? '0.75rem' : '0.7rem', pt: 0.5 }}
            >
              ✓ Anklicken zum Hinzufügen
            </Typography>
            {isPlotter ? (
              <Chip size="small" label={`${(service.sizeProfiles || []).length} Größen`} color="primary" variant="outlined" />
            ) : null}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const CategorySection = ({ category, isInactive = false }) => {
    const activeServices = filterServices(groupedServices[category]?.active || []);
    const inactiveServices = filterServices(
      category === 'all'
        ? Object.values(groupedServices).reduce((acc, cat) => [...acc, ...cat.inactive], [])
        : (groupedServices[category]?.inactive || [])
    );

    const servicesToShow = isInactive ? inactiveServices : activeServices;
    const hasServices = servicesToShow.length > 0;

    if (!hasServices && !isInactive) {
      return null;
    }

    const categoryLabel = isInactive ? CATEGORY_LABELS.inactive : CATEGORY_LABELS[category];
    const expandKey = isInactive ? 'inactive' : category;

    return (
      <Accordion
        key={`section-${category}-${isInactive}`}
        defaultExpanded={expandedCategories[expandKey]}
        onChange={() => handleCategoryToggle(expandKey)}
        sx={{
          mb: 2,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
          '&.Mui-expanded': {
            margin: 0
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: isInactive ? '#fffbf0' : category === 'plotterarbeiten' ? '#e3f2fd' : '#e8f5e9',
            borderBottom: expandedCategories[expandKey] ? '1px solid #e0e0e0' : 'none',
            minHeight: isMobile ? 48 : 56,
            '&:hover': {
              backgroundColor: isInactive ? '#fffaf5' : category === 'plotterarbeiten' ? '#e8f4ff' : '#e0f2f1'
            },
            transition: 'background-color 0.2s ease'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: isMobile ? '0.95rem' : '1rem' }}>
              {categoryLabel}
            </Typography>
            <Chip
              label={`${servicesToShow.length}`}
              size="small"
              color={isInactive ? 'default' : 'primary'}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: isSmallMobile ? 1 : 2, backgroundColor: '#fafafa' }}>
          {servicesToShow.length === 0 ? (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
              {searchTerm ? `Keine Leistungen gefunden für "${searchTerm}"` : 'Keine Leistungen in dieser Kategorie'}
            </Typography>
          ) : (
            <Grid container spacing={isSmallMobile ? 1 : 1.5}>
              {servicesToShow.map((service) => (
                <Grid item xs={12} sm={isMobile ? 6 : 5} md={isMobile && expandedCategories[expandKey] ? 4 : 3} key={service._id}>
                  <ServiceCard service={service} isInactive={isInactive} />
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  const hasAnyServices = Object.values(groupedServices).some((cat) => cat.active.length > 0 || cat.inactive.length > 0);

  if (!hasAnyServices) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 2, fontSize: '3rem' }}>📭</Box>
        <Typography color="textSecondary" variant="body1">
          Keine Leistungen verfügbar
        </Typography>
        <Typography color="textSecondary" variant="caption" sx={{ display: 'block', mt: 1 }}>
          Es werden keine Leistungen im Katalog gefunden.
        </Typography>
      </Box>
    );
  }

  const totalInactive = Object.values(groupedServices).reduce((sum, cat) => sum + cat.inactive.length, 0);
  const allServices = Object.values(groupedServices).reduce((acc, cat) => [...acc, ...cat.active, ...cat.inactive], []);
  const filteredCount = filterServices(allServices).length;

  return (
    <Box>
      <TextField
        fullWidth
        placeholder="🔍 Leistung suchen... (Name, Beschreibung, SKU)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        variant="outlined"
        size={isMobile ? 'small' : 'medium'}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white'
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <Box
                onClick={() => setSearchTerm('')}
                sx={{
                  cursor: 'pointer',
                  p: 0.5,
                  borderRadius: '50%',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                ✕
              </Box>
            </InputAdornment>
          )
        }}
      />

      {searchTerm && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 2,
            color: 'text.secondary',
            fontStyle: 'italic'
          }}
        >
          Suchbegriff: "{searchTerm}" (Treffer: {filteredCount})
        </Typography>
      )}

      {CATEGORY_ORDER.map((category) => (
        <CategorySection key={`active-${category}`} category={category} isInactive={false} />
      ))}

      {totalInactive > 0 && <CategorySection key="inactive" category="all" isInactive={true} />}

      {searchTerm && filterServices(allServices).length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            ❌ Keine Leistungen gefunden für "{searchTerm}"
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ServiceCatalog;
