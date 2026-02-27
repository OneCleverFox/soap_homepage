import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  CircularProgress,
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
  ArchiveOutlined as InactiveIcon
} from '@mui/icons-material';

// Kategorien sortieren (Seife zuerst, dann Werkstück)
const CATEGORY_ORDER = ['seife', 'werkstuck'];
const CATEGORY_LABELS = {
  seife: '🧼 Seife',
  werkstuck: '🎨 Werkstück',
  inactive: '🗄️ Inaktive Produkte'
};

const ProductCatalog = ({ 
  products = [], 
  isLoadingProducts = false, 
  onProductSelect,
  isMobile = false,
  isSmallMobile = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    seife: true,
    werkstuck: true,
    inactive: false
  });

  // Gruppiere Produkte nach Kategorie und Aktivitätsstatus
  const groupedProducts = useMemo(() => {
    const groups = {
      seife: { active: [], inactive: [] },
      werkstuck: { active: [], inactive: [] }
    };

    products.forEach(product => {
      // Aktiv nur wenn explizit aktiv gesetzt
      const isActive = product.aktiv === true;
      const category = product.kategorie || 'seife';
      
      if (groups[category]) {
        if (isActive) {
          groups[category].active.push(product);
        } else {
          groups[category].inactive.push(product);
        }
      }
    });

    return groups;
  }, [products]);

  // Filtere Produkte nach Suchbegriff
  const filterProducts = (productList) => {
    if (!searchTerm.trim()) return productList;
    
    const lowerSearch = searchTerm.toLowerCase();
    return productList.filter(product =>
      product.name?.toLowerCase().includes(lowerSearch) ||
      product.beschreibung?.toLowerCase?.().includes(lowerSearch) ||
      product.kategorie?.toLowerCase().includes(lowerSearch) ||
      product.sku?.toLowerCase?.().includes(lowerSearch)
    );
  };

  // Toggle Kategorie-Accordion
  const handleCategoryToggle = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Produkt-Karte darstellen
  const ProductCard = ({ product, isInactive = false }) => (
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
      onClick={() => onProductSelect(product)}
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
            pr: isInactive ? 3 : 0
          }}
        >
          {product.name}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography 
            variant="body2" 
            color="primary"
            sx={{ 
              fontSize: isSmallMobile ? '1rem' : '0.875rem',
              fontWeight: 'bold'
            }}
          >
            💵 {product.preis?.toFixed(2)}€
          </Typography>
          {product.sku && (
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
              SKU: {product.sku}
            </Typography>
          )}
        </Box>

        {product.beschreibung && (
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
            {typeof product.beschreibung === 'string' 
              ? product.beschreibung 
              : product.beschreibung?.kurz || ''}
          </Typography>
        )}

        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
          <Typography 
            variant="caption" 
            display="block"
            color="textSecondary"
            sx={{ fontSize: isSmallMobile ? '0.75rem' : '0.7rem', pt: 0.5 }}
          >
            ✓ Anklicken zum Hinzufügen
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  // Kategorie-Sektion darstellen
  const CategorySection = ({ category, isInactive = false }) => {
    const activeProducts = filterProducts(groupedProducts[category]?.active || []);
    const inactiveProducts = filterProducts(
      category === 'all'
        ? Object.values(groupedProducts).reduce((acc, cat) => [...acc, ...cat.inactive], [])
        : (groupedProducts[category]?.inactive || [])
    );
    
    const productsToShow = isInactive ? inactiveProducts : activeProducts;
    const hasProducts = productsToShow.length > 0;

    if (!hasProducts && !isInactive) return null;

    const categoryLabel = isInactive 
      ? CATEGORY_LABELS.inactive 
      : CATEGORY_LABELS[category];

    return (
      <Accordion
        key={`section-${category}-${isInactive}`}
        defaultExpanded={expandedCategories[isInactive ? 'inactive' : category]}
        onChange={() => handleCategoryToggle(isInactive ? 'inactive' : category)}
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
            backgroundColor: isInactive ? '#fffbf0' : '#e8f5e9',
            borderBottom: expandedCategories[isInactive ? 'inactive' : category] ? '1px solid #e0e0e0' : 'none',
            minHeight: isMobile ? 48 : 56,
            '&:hover': {
              backgroundColor: isInactive ? '#fffaf5' : '#e0f2f1'
            },
            transition: 'background-color 0.2s ease'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              pr: 1
            }}
          >
            <Typography 
              sx={{ 
                fontWeight: 600,
                fontSize: isMobile ? '0.95rem' : '1rem'
              }}
            >
              {categoryLabel}
            </Typography>
            <Chip
              label={`${productsToShow.length}`}
              size="small"
              color={isInactive ? 'default' : 'primary'}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails
          sx={{
            p: isSmallMobile ? 1 : 2,
            backgroundColor: '#fafafa'
          }}
        >
          {productsToShow.length === 0 ? (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
              {searchTerm 
                ? `Keine Produkte gefunden für "${searchTerm}"`
                : 'Keine Produkte in dieser Kategorie'}
            </Typography>
          ) : (
            <Grid container spacing={isSmallMobile ? 1 : 1.5}>
              {productsToShow.map(product => (
                <Grid 
                  item 
                  xs={12} 
                  sm={isMobile ? 6 : 5} 
                  md={isMobile && expandedCategories[isInactive ? 'inactive' : category] ? 4 : 3}
                  key={product._id}
                >
                  <ProductCard 
                    product={product} 
                    isInactive={isInactive}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  // Haupt-Rendering
  if (isLoadingProducts) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          py: 6 
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="textSecondary">
          ⏳ Lade Produkte aus Katalog... (dies kann 10-15 Sekunden dauern)
        </Typography>
      </Box>
    );
  }

  const hasAnyProducts = Object.values(groupedProducts).some(cat => 
    cat.active.length > 0 || cat.inactive.length > 0
  );

  if (!hasAnyProducts) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 2, fontSize: '3rem' }}>📭</Box>
        <Typography color="textSecondary" variant="body1">
          Keine Produkte verfügbar
        </Typography>
        <Typography color="textSecondary" variant="caption" sx={{ display: 'block', mt: 1 }}>
          Es werden keine Produkte im Katalog gefunden.
        </Typography>
      </Box>
    );
  }

  // Zähle aktive und inaktive Produkte
  const totalActive = Object.values(groupedProducts).reduce((sum, cat) => sum + cat.active.length, 0);
  const totalInactive = Object.values(groupedProducts).reduce((sum, cat) => sum + cat.inactive.length, 0);
  const allProducts = Object.values(groupedProducts).reduce(
    (acc, cat) => [...acc, ...cat.active, ...cat.inactive],
    []
  );
  const filteredCount = filterProducts(allProducts).length;

  return (
    <Box>
      {/* Suchfeld */}
      <TextField
        fullWidth
        placeholder="🔍 Produkt suchen... (Name, Kategorie, SKU)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        variant="outlined"
        size={isMobile ? "small" : "medium"}
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

      {/* Info-Zeile */}
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

      {/* Aktive Produkte nach Kategorie */}
      {CATEGORY_ORDER.map(category => (
        <CategorySection key={`active-${category}`} category={category} isInactive={false} />
      ))}

      {/* Inaktive Produkte (falls vorhanden) */}
      {totalInactive > 0 && (
        <CategorySection key="inactive" category="all" isInactive={true} />
      )}

      {/* Keine Suchresultate */}
      {searchTerm && filterProducts(
        Object.values(groupedProducts).reduce((acc, cat) => [...acc, ...cat.active, ...cat.inactive], [])
      ).length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            ❌ Keine Produkte gefunden für "{searchTerm}"
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProductCatalog;
