import React, { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  Autocomplete,
  InputAdornment,
  Snackbar,
  Switch,
  FormControlLabel,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  ArchiveOutlined as InactiveIcon,
  AutoFixHigh as PlotterIcon,
  BuildCircleOutlined as ServiceIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  CardGiftcard as GiftIcon,
  Person as PersonIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import ProductCatalog from './ProductCatalog';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getEffectiveProductPrice = (product) => {
  const base = Number(product?.preis || 0);
  const isOnSale = Boolean(product?.sale?.isOnSale);
  const discountPercent = Number(product?.sale?.discountPercent || 0);

  if (!isOnSale || discountPercent <= 0) {
    return base;
  }

  const discounted = base * (1 - discountPercent / 100);
  return Math.max(0, Math.round((discounted + Number.EPSILON) * 100) / 100);
};

const extractProductDescription = (product) => {
  const candidates = [product?.beschreibung, product?.description, product?.produktbeschreibung];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (typeof candidate === 'string') {
      const cleaned = candidate.trim();
      if (cleaned) {
        return cleaned;
      }
      continue;
    }

    if (typeof candidate === 'object') {
      const fromObject = [candidate.kurz, candidate.lang, candidate.short, candidate.long]
        .find((value) => typeof value === 'string' && value.trim());
      if (fromObject) {
        return fromObject.trim();
      }
    }
  }

  return '';
};

const normalizePriceInput = (rawValue) => {
  const normalized = String(rawValue ?? '').replace(',', '.').trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  }
}));

const SERVICE_CATEGORY_ORDER = ['standard', 'plotterarbeiten'];
const SERVICE_CATEGORY_LABELS = {
  standard: '🛠️ Leistungen',
  plotterarbeiten: '✂️ Plotterarbeiten',
  inactive: '🗄️ Inaktive Leistungen'
};

const normalizeServiceType = (value) =>
  String(value || '').toLowerCase() === 'plotterarbeiten' ? 'plotterarbeiten' : 'standard';

const isPlotterService = (serviceEntry) => normalizeServiceType(serviceEntry?.serviceType) === 'plotterarbeiten';

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
        {isInactive ? (
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
        ) : null}
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
            {service.sku ? (
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
            ) : null}
          </Box>

          {service.description || service.invoiceNote ? (
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
          ) : null}

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
    if (servicesToShow.length === 0 && !isInactive) {
      return null;
    }

    const categoryLabel = isInactive ? SERVICE_CATEGORY_LABELS.inactive : SERVICE_CATEGORY_LABELS[category];
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
            <Chip label={`${servicesToShow.length}`} size="small" color={isInactive ? 'default' : 'primary'} variant="outlined" sx={{ ml: 1 }} />
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
          endAdornment: searchTerm ? (
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
          ) : null
        }}
      />

      {searchTerm ? (
        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
          Suchbegriff: "{searchTerm}" (Treffer: {filteredCount})
        </Typography>
      ) : null}

      {SERVICE_CATEGORY_ORDER.map((category) => (
        <CategorySection key={`active-${category}`} category={category} isInactive={false} />
      ))}

      {totalInactive > 0 ? <CategorySection key="inactive" category="all" isInactive={true} /> : null}

      {searchTerm && filterServices(allServices).length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">❌ Keine Leistungen gefunden für "{searchTerm}"</Typography>
        </Box>
      ) : null}
    </Box>
  );
};

const CreateInvoice = () => {
  // Responsive Detection
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State Management
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [serviceLeistungen, setServiceLeistungen] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Rechnung Daten
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    company: '',
    street: '',
    postalCode: '',
    city: '',
    email: '',
    phone: ''
  });
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [includeVat, setIncludeVat] = useState(false);
  const [notes, setNotes] = useState({ internal: '', customer: '' });
  const [sendEmail, setSendEmail] = useState(true); // Toggle für E-Mail-Versand
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [selectedServiceLeistung, setSelectedServiceLeistung] = useState(null);
  const [plotterWidthCm, setPlotterWidthCm] = useState('');
  const [plotterHeightCm, setPlotterHeightCm] = useState('');
  const [plotterCustomPrice, setPlotterCustomPrice] = useState('');
  const [plotterDetailText, setPlotterDetailText] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [unitPriceDrafts, setUnitPriceDrafts] = useState({});

  // Lade initiale Daten
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [FRONTEND] useEffect wird ausgeführt');
    }
    loadCustomers();
    loadProducts();
    loadServiceLeistungen();
    loadTemplates();
  }, []);

  // Lade Produkte wenn Dialog geöffnet wird
  useEffect(() => {
    if (productSearchOpen && products.length === 0) {
      console.log('🔍 [FRONTEND] Dialog geöffnet, lade Produkte...');
      loadProducts();
    }
  }, [productSearchOpen]);

  const selectedTemplateConfig = useMemo(
    () => templates.find((template) => template._id === selectedTemplate) || null,
    [selectedTemplate, templates]
  );

  const templateIsSmallBusiness = Boolean(selectedTemplateConfig?.companyInfo?.isSmallBusiness);

  useEffect(() => {
    if (templateIsSmallBusiness) {
      setIncludeVat(false);
    }
  }, [templateIsSmallBusiness]);

  useEffect(() => {
    if (!isPlotterService(selectedServiceLeistung)) {
      setPlotterWidthCm('');
      setPlotterHeightCm('');
      setPlotterCustomPrice('');
      setPlotterDetailText('');
      return;
    }
  }, [selectedServiceLeistung]);

  const loadCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/kunden`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    }
  };

  const loadProducts = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [FRONTEND] Lade Produkte...');
    }
    setIsLoadingProducts(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [FRONTEND] Sende Request an /api/portfolio');
      }
      const response = await fetch(`${API_BASE_URL}/portfolio?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('🔍 [FRONTEND] Response Status:', response.status);
      console.log('🔍 [FRONTEND] Response OK:', response.ok);
      
      if (!response.ok) {
        console.error('🔍 [FRONTEND] Response nicht OK:', response.status, response.statusText);
        setIsLoadingProducts(false);
        return;
      }
      
      const data = await response.json();
      console.log('🔍 [FRONTEND] Response Data:', data);
      
      // Die Portfolio-API gibt direkt ein Array zurück
      if (Array.isArray(data)) {
        console.log('🔍 [FRONTEND] Setze Produkte:', data.length);
        setProducts(data);
      } else if (data.success) {
        // Fallback für andere API-Formate
        console.log('🔍 [FRONTEND] Setze Produkte:', data.data?.length || 0);
        setProducts(data.data || []);
      } else {
        console.error('🔍 [FRONTEND] Unerwartetes Datenformat:', data);
      }
    } catch (error) {
      console.error('🔍 [FRONTEND] Netzwerk Fehler beim Laden der Produkte:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invoice/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
        // Standard-Template auswählen
        const defaultTemplate = data.data.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate._id);
          setIncludeVat(!(defaultTemplate.companyInfo?.isSmallBusiness));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    }
  };

  const loadServiceLeistungen = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/service-leistungen`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setServiceLeistungen(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden von Service & Leistung:', error);
    }
  };

  const addProduct = (product) => {
    const existingItem = invoiceItems.find(item => 
      item.productId === product._id
    );

    const description = extractProductDescription(product);

    if (existingItem) {
      setInvoiceItems(items => 
        items.map(item => 
          item.productId === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem = {
        productId: product._id,
        name: product.name,
        description: description,
        sku: product.sku || product.artikelNummer || product.artikelnummer || product.article_number || '',
        category: product.kategorie || '',
        quantity: 1,
        unitPrice: getEffectiveProductPrice(product)
      };
      setInvoiceItems(prev => [...prev, newItem]);
    }
    setProductSearchOpen(false);
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, quantity: parseInt(quantity) } : item
      )
    );
  };

  const updateItemPrice = (index, price) => {
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, unitPrice: normalizePriceInput(price) ?? 0 } : item
      )
    );
  };

  const updateItemField = (index, field, value) => {
    setInvoiceItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const getUnitPriceInputValue = (index, fallback) => {
    if (Object.prototype.hasOwnProperty.call(unitPriceDrafts, index)) {
      return unitPriceDrafts[index];
    }
    return fallback ?? '';
  };

  const handleUnitPriceFocus = (index) => {
    setUnitPriceDrafts(prev => ({ ...prev, [index]: '' }));
  };

  const handleUnitPriceChange = (index, value) => {
    setUnitPriceDrafts(prev => ({ ...prev, [index]: value }));
  };

  const handleUnitPriceBlur = (index) => {
    const draftValue = unitPriceDrafts[index];
    const parsed = normalizePriceInput(draftValue);

    if (parsed !== null) {
      updateItemPrice(index, parsed);
    }

    setUnitPriceDrafts(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const removeItem = (index) => {
    setInvoiceItems(items => items.filter((_, i) => i !== index));
    setUnitPriceDrafts({});
  };

  const addCustomProduct = () => {
    const newItem = {
      productId: null,
      name: 'Neues Produkt',
      description: '',
      sku: '',
      category: '',
      quantity: 1,
      unitPrice: 0
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  const getPlotterCalculationDetails = (serviceEntry) => {
    const foliePerSqm = Number(serviceEntry?.plotterBasePricePerSqm || 0);
    const transferfoliePerSqm = Number(serviceEntry?.plotterMaterialCostPerSqm || 0);
    const laborCostPerSqm = Number(serviceEntry?.plotterLaborCostPerSqm || 0);
    const overheadFactor = Number(serviceEntry?.plotterOverheadFactor ?? 3);

    const baseMaterialPerSqm = foliePerSqm + transferfoliePerSqm;
    const overheadAppliedMaterialPerSqm = baseMaterialPerSqm * overheadFactor;
    const effectivePricePerSqm = overheadAppliedMaterialPerSqm + laborCostPerSqm;

    return {
      foliePerSqm,
      transferfoliePerSqm,
      baseMaterialPerSqm,
      overheadFactor,
      overheadAppliedMaterialPerSqm,
      laborCostPerSqm,
      effectivePricePerSqm
    };
  };

  const getPlotterCalculatedPrice = (serviceEntry) => {
    if (!isPlotterService(serviceEntry)) {
      return Number(serviceEntry?.defaultPrice || 0);
    }

    const customPrice = normalizePriceInput(plotterCustomPrice);
    if (customPrice !== null) {
      return customPrice;
    }

    const width = normalizePriceInput(plotterWidthCm);
    const height = normalizePriceInput(plotterHeightCm);
    const { effectivePricePerSqm } = getPlotterCalculationDetails(serviceEntry);
    const minimumPrice = Number(serviceEntry.plotterMinimumPrice || 0);

    if (width !== null && height !== null && width > 0 && height > 0 && effectivePricePerSqm > 0) {
      const areaSqm = (width * height) / 10000;
      return Math.max(minimumPrice, areaSqm * effectivePricePerSqm);
    }

    return Number(serviceEntry.defaultPrice || 0);
  };

  const buildPlotterDescription = (serviceEntry) => {
    const baseDescription = serviceEntry.description || serviceEntry.invoiceNote || '';
    if (!isPlotterService(serviceEntry)) {
      return baseDescription;
    }

    const descriptionParts = [];

    if (baseDescription) {
      descriptionParts.push(baseDescription);
    }

    const width = normalizePriceInput(plotterWidthCm);
    const height = normalizePriceInput(plotterHeightCm);
    if (width !== null && height !== null && width > 0 && height > 0) {
      descriptionParts.push(`Größe: ${width}x${height} cm`);
    }

    if (plotterDetailText.trim()) {
      descriptionParts.push(`Anhang: ${plotterDetailText.trim()}`);
    }

    return descriptionParts.join(' | ');
  };

  const addServiceLeistung = (serviceEntry) => {
    if (!serviceEntry) {
      showSnackbar('Bitte zuerst einen Service oder eine Leistung auswählen', 'warning');
      return;
    }

    const calculatedPrice = getPlotterCalculatedPrice(serviceEntry);

    const newItem = {
      productId: null,
      serviceLeistungId: serviceEntry._id,
      name: serviceEntry.name,
      description: buildPlotterDescription(serviceEntry),
      sku: serviceEntry.sku || '',
      category: serviceEntry.serviceType || 'dienstleistung',
      quantity: 1,
      unitPrice: Math.max(0, calculatedPrice)
    };

    setInvoiceItems(prev => [...prev, newItem]);
    setSelectedServiceLeistung(null);
    setPlotterWidthCm('');
    setPlotterHeightCm('');
    setPlotterCustomPrice('');
    setPlotterDetailText('');
    setServiceSearchOpen(false);
  };

  const handleServiceSelect = (serviceEntry) => {
    setSelectedServiceLeistung(serviceEntry);

    if (!isPlotterService(serviceEntry)) {
      addServiceLeistung(serviceEntry);
      return;
    }

    setServiceSearchOpen(false);
  };

  const updateCustomProduct = (index, field, value) => {
    updateItemField(index, field, value);
  };

  // Berechnungen
  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(shippingCost) || 0;
    const vatAmount = includeVat ? (subtotal + shipping) * 0.19 : 0;
    return subtotal + shipping + vatAmount;
  };

  const calculateVatAmount = () => {
    if (!includeVat) {
      return 0;
    }
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(shippingCost) || 0;
    return (subtotal + shipping) * 0.19;
  };

  const createInvoice = async () => {
    // Validierung
    if (invoiceItems.length === 0) {
      showSnackbar('Mindestens ein Artikel muss hinzugefügt werden', 'error');
      return;
    }

    if (!useNewCustomer && !selectedCustomer) {
      showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
      return;
    }

    // Validierung abhängig von Kundenwahl
    if (useNewCustomer) {
      if (!newCustomer.street || !newCustomer.postalCode || !newCustomer.city) {
        showSnackbar('Bitte füllen Sie alle Pflichtfelder für den neuen Kunden aus', 'error');
        return;
      }
    } else {
      if (!selectedCustomer) {
        showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
        return;
      }
      
      // Prüfung der Kundendaten auf Vollständigkeit
      if (!selectedCustomer.adresse?.strasse || !selectedCustomer.adresse?.plz || !selectedCustomer.adresse?.stadt) {
        showSnackbar('Gewählter Kunde hat unvollständige Adressdaten', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const invoiceData = {
        customerId: useNewCustomer ? null : selectedCustomer?._id,
        customerData: useNewCustomer ? {
          salutation: newCustomer.salutation || 'Herr',
          firstName: newCustomer.firstName || '',
          lastName: newCustomer.lastName || '',
          company: newCustomer.company || '',
          street: newCustomer.street,
          postalCode: newCustomer.postalCode,
          city: newCustomer.city,
          country: newCustomer.country || 'Deutschland',
          email: newCustomer.email || '',
          phone: newCustomer.phone || ''
        } : {
          salutation: selectedCustomer?.anrede || 'Herr',
          firstName: selectedCustomer?.vorname || '',
          lastName: selectedCustomer?.nachname || '',
          company: selectedCustomer?.firma || '',
          street: selectedCustomer?.adresse?.strasse || '',
          postalCode: selectedCustomer?.adresse?.plz || '',
          city: selectedCustomer?.adresse?.stadt || '',
          country: selectedCustomer?.adresse?.land || 'Deutschland',
          email: selectedCustomer?.email || '',
          phone: selectedCustomer?.telefon || ''
        },
        items: invoiceItems.map(item => ({
          productId: item.productId,
          serviceLeistungId: item.serviceLeistungId || null,
          name: item.name,
          description: item.description,
          sku: item.sku,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        shippingCost: parseFloat(shippingCost) || 0,
        includeVat,
        templateId: selectedTemplate,
        notes,
        sendEmailToCustomer: sendEmail && (useNewCustomer ? newCustomer.email : selectedCustomer?.email) // E-Mail nur wenn Toggle aktiv und E-Mail vorhanden
      };

      const response = await fetch(`${API_BASE_URL}/admin/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar(`Rechnung ${result.data.invoiceNumber} erfolgreich erstellt!`, 'success');
        // Formular zurücksetzen
        resetForm();
      } else {
        showSnackbar(result.message || 'Fehler beim Erstellen der Rechnung', 'error');
      }

    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      showSnackbar('Fehler beim Erstellen der Rechnung', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = async () => {
    // Gleiche Validierung wie createInvoice
    if (invoiceItems.length === 0) {
      showSnackbar('Mindestens ein Artikel muss hinzugefügt werden', 'error');
      return;
    }

    if (!useNewCustomer && !selectedCustomer) {
      showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
      return;
    }

    if (useNewCustomer) {
      if (!newCustomer.street || !newCustomer.postalCode || !newCustomer.city) {
        showSnackbar('Bitte füllen Sie alle Pflichtfelder für den neuen Kunden aus', 'error');
        return;
      }
    } else {
      if (!selectedCustomer) {
        showSnackbar('Bitte wählen Sie einen Kunden aus', 'error');
        return;
      }
      
      if (!selectedCustomer.adresse?.strasse || !selectedCustomer.adresse?.plz || !selectedCustomer.adresse?.stadt) {
        showSnackbar('Gewählter Kunde hat unvollständige Adressdaten', 'error');
        return;
      }
    }

    try {
      const invoiceData = {
        customerData: useNewCustomer ? {
          salutation: newCustomer.salutation || 'Herr',
          firstName: newCustomer.firstName || '',
          lastName: newCustomer.lastName || '',
          company: newCustomer.company || '',
          street: newCustomer.street,
          postalCode: newCustomer.postalCode,
          city: newCustomer.city,
          country: newCustomer.country || 'Deutschland',
          email: newCustomer.email || '',
          phone: newCustomer.phone || ''
        } : {
          salutation: selectedCustomer?.anrede || 'Herr',
          firstName: selectedCustomer?.vorname || '',
          lastName: selectedCustomer?.nachname || '',
          company: selectedCustomer?.firma || '',
          street: selectedCustomer?.adresse?.strasse || '',
          postalCode: selectedCustomer?.adresse?.plz || '',
          city: selectedCustomer?.adresse?.stadt || '',
          country: selectedCustomer?.adresse?.land || 'Deutschland',
          email: selectedCustomer?.email || '',
          phone: selectedCustomer?.telefon || ''
        },
        items: invoiceItems.map(item => ({
          productId: item.productId,
          serviceLeistungId: item.serviceLeistungId || null,
          name: item.name,
          description: item.description,
          sku: item.sku,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        shippingCost: parseFloat(shippingCost) || 0,
        includeVat,
        templateId: selectedTemplate,
        notes
      };

      const response = await fetch(`${API_BASE_URL}/admin/invoices/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (result.success) {
        setPreviewHtml(result.data.html);
        setPreviewOpen(true);
      } else {
        showSnackbar(result.message || 'Fehler bei der Rechnungsvorschau', 'error');
      }

    } catch (error) {
      console.error('Fehler bei der Rechnungsvorschau:', error);
      showSnackbar('Fehler bei der Rechnungsvorschau', 'error');
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setUseNewCustomer(false);
    setNewCustomer({
      salutation: 'Herr',
      firstName: '',
      lastName: '',
      company: '',
      street: '',
      postalCode: '',
      city: '',
      email: '',
      phone: ''
    });
    setInvoiceItems([]);
    setUnitPriceDrafts({});
    setSelectedServiceLeistung(null);
    setPlotterWidthCm('');
    setPlotterHeightCm('');
    setPlotterCustomPrice('');
    setPlotterDetailText('');
    setShippingCost(0);
    setIncludeVat(false);
    setNotes({ internal: '', customer: '' });
    setSendEmail(true); // E-Mail-Toggle zurücksetzen
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <Box sx={{ 
      maxWidth: '100vw', 
      margin: 'auto', 
      padding: isMobile ? 1 : 2,
      pb: isMobile ? 4 : 2,
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        gutterBottom
        sx={{ 
          mb: isMobile ? 2 : 3,
          fontSize: isMobile ? '1.5rem' : '2.125rem'
        }}
      >
        <ReceiptIcon sx={{ 
          mr: isMobile ? 1 : 2, 
          verticalAlign: 'middle',
          fontSize: isMobile ? '1.5rem' : '2rem'
        }} />
        Rechnung erstellen
      </Typography>

      {/* Kunde auswählen */}
      <StyledPaper>
        <Box sx={{ p: isMobile ? 2 : 0 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0,
            mb: isMobile ? 2 : 3
          }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h2">
              1. Kunde auswählen
            </Typography>
            <Button
              variant={useNewCustomer ? 'contained' : 'outlined'}
              onClick={() => setUseNewCustomer(!useNewCustomer)}
              startIcon={<PersonIcon />}
              size={isMobile ? "medium" : "small"}
              sx={{ 
                alignSelf: isMobile ? 'flex-end' : 'auto',
                minWidth: isMobile ? 140 : 'auto' 
              }}
            >
              {useNewCustomer ? (isMobile ? 'Bestehend' : 'Bestehender Kunde') : (isMobile ? 'Neu' : 'Neuer Kunde')}
            </Button>
          </Box>
        </Box>
        <CardContent sx={{ pt: isMobile ? 0 : 2 }}>
          {!useNewCustomer ? (
            <Autocomplete
              options={customers}
              getOptionLabel={(customer) => 
                `${customer.firma || `${customer.vorname} ${customer.nachname}`} (${customer.adresse?.ort || 'Unbekannt'})`
              }
              isOptionEqualToValue={(option, value) => option._id === value._id}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Kunde suchen..."
                  placeholder="Name, Firma oder Ort eingeben"
                  variant="outlined"
                />
              )}
            />
          ) : (
            <Grid container spacing={isSmallMobile ? 1 : 2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Anrede</InputLabel>
                  <Select
                    value={newCustomer.salutation}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, salutation: e.target.value }))}
                  >
                    <MenuItem value="Herr">Herr</MenuItem>
                    <MenuItem value="Frau">Frau</MenuItem>
                    <MenuItem value="Firma">Firma</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  fullWidth
                  label="Vorname"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Nachname"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Firma (optional)"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Straße und Hausnummer"
                  value={newCustomer.street}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, street: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  fullWidth
                  required
                  label="PLZ"
                  value={newCustomer.postalCode}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, postalCode: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={8} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Ort"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="E-Mail"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </StyledPaper>

      {/* Artikel hinzufügen */}
      <StyledPaper>
        <Box sx={{ p: isMobile ? 2 : 0 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexDirection: 'column',
            gap: isMobile ? 2 : 3,
            mb: isMobile ? 2 : 3
          }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h2">
              2. Artikel hinzufügen
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              width: '100%',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setProductSearchOpen(true)}
                size="medium"
                fullWidth={isMobile}
                sx={{ fontSize: '0.9rem' }}
              >
                Produkt suchen
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addCustomProduct}
                size="medium"
                fullWidth={isMobile}
                sx={{ fontSize: '0.9rem' }}
              >
                Eigenes Produkt
              </Button>
              <Button
                variant="outlined"
                startIcon={<GiftIcon />}
                onClick={() => setServiceSearchOpen(true)}
                size="medium"
                fullWidth={isMobile}
                sx={{ fontSize: '0.9rem' }}
              >
                Service hinzufügen
              </Button>
            </Box>

            {selectedServiceLeistung ? (
              <Alert
                severity={isPlotterService(selectedServiceLeistung) ? 'info' : 'success'}
                action={
                  <Button color="inherit" size="small" onClick={() => setSelectedServiceLeistung(null)}>
                    Entfernen
                  </Button>
                }
              >
                {selectedServiceLeistung.name}
                {!isPlotterService(selectedServiceLeistung) && selectedServiceLeistung.defaultPrice != null
                  ? ` - ${Number(selectedServiceLeistung.defaultPrice).toFixed(2)} €`
                  : ''}
              </Alert>
            ) : null}

            {isPlotterService(selectedServiceLeistung) ? (
              <Grid container spacing={1}>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Breite (cm)"
                    value={plotterWidthCm}
                    onChange={(event) => setPlotterWidthCm(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Höhe (cm)"
                    value={plotterHeightCm}
                    onChange={(event) => setPlotterHeightCm(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Preis überschreiben (optional)"
                    value={plotterCustomPrice}
                    onChange={(event) => setPlotterCustomPrice(event.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText={`Berechneter Preis: ${getPlotterCalculatedPrice(selectedServiceLeistung).toFixed(2)} €`}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Zusatztext (optional)"
                    value={plotterDetailText}
                    onChange={(event) => setPlotterDetailText(event.target.value)}
                    helperText="Beschreibt optional, was genau hergestellt wurde"
                  />
                </Grid>
                <Grid item xs={12}>
                  {(() => {
                    const details = getPlotterCalculationDetails(selectedServiceLeistung);
                    return (
                  <Alert severity="info">
                    Folie/m²: {details.foliePerSqm.toFixed(2)} €
                    {' · '}
                    Transferfolie/m²: {details.transferfoliePerSqm.toFixed(2)} €
                    {` · Grundpreis/m² ${(details.baseMaterialPerSqm).toFixed(2)} €`}
                    {` · GK-Faktor x${details.overheadFactor.toFixed(2)} = ${details.overheadAppliedMaterialPerSqm.toFixed(2)} €`}
                    {details.laborCostPerSqm > 0
                      ? ` · Arbeit/m² ${details.laborCostPerSqm.toFixed(2)} €`
                      : ''}
                    {` · Summe/m² ${details.effectivePricePerSqm.toFixed(2)} €`}
                    {Number(selectedServiceLeistung.plotterMinimumPrice || 0) > 0
                      ? ` · Mindestpreis ${Number(selectedServiceLeistung.plotterMinimumPrice || 0).toFixed(2)} €`
                      : ''}
                  </Alert>
                    );
                  })()}
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={() => addServiceLeistung(selectedServiceLeistung)}>
                    Plotterarbeit hinzufügen
                  </Button>
                </Grid>
              </Grid>
            ) : null}
          </Box>
        </Box>
        <CardContent sx={{ pt: 0 }}>
          {!isMobile ? (
            // Desktop Tabellen-Ansicht
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Artikel</TableCell>
                    <TableCell width={420}>Beschreibung</TableCell>
                    <TableCell width={100}>Menge</TableCell>
                    <TableCell width={120}>Einzelpreis</TableCell>
                    <TableCell width={120}>Gesamtpreis</TableCell>
                    <TableCell width={60}>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.productId ? (
                          <Box>
                            <Typography variant="subtitle2">{item.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              SKU: {item.sku}
                            </Typography>
                          </Box>
                        ) : (
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={(e) => updateCustomProduct(index, 'name', e.target.value)}
                            placeholder="Produktname"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          maxRows={6}
                          value={item.description || ''}
                          onChange={(e) => updateItemField(index, 'description', e.target.value)}
                          placeholder="Beschreibung"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, e.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={getUnitPriceInputValue(index, item.unitPrice)}
                          onFocus={() => handleUnitPriceFocus(index)}
                          onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                          onBlur={() => handleUnitPriceBlur(index)}
                          inputProps={{ step: 0.01, min: 0 }}
                          InputProps={{ endAdornment: '€' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {(item.quantity * item.unitPrice).toFixed(2)}€
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoiceItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Noch keine Artikel hinzugefügt
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // Mobile Karten-Ansicht
            <Box>
              {invoiceItems.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  Noch keine Artikel hinzugefügt
                </Typography>
              ) : (
                invoiceItems.map((item, index) => (
                  <Card 
                    key={index} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      background: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          {item.productId ? (
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                SKU: {item.sku}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              value={item.name}
                              onChange={(e) => updateCustomProduct(index, 'name', e.target.value)}
                              placeholder="Produktname"
                              sx={{ mb: 1 }}
                            />
                          )}
                        </Box>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(index)}
                          size="large"
                          sx={{ 
                            minWidth: 44,
                            minHeight: 44
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        maxRows={6}
                        value={item.description || ''}
                        onChange={(e) => updateItemField(index, 'description', e.target.value)}
                        placeholder="Beschreibung"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Menge
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, e.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Einzelpreis
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={getUnitPriceInputValue(index, item.unitPrice)}
                          onFocus={() => handleUnitPriceFocus(index)}
                          onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                          onBlur={() => handleUnitPriceBlur(index)}
                          inputProps={{ step: 0.01, min: 0 }}
                          InputProps={{ endAdornment: '€' }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Gesamtpreis
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {(item.quantity * item.unitPrice).toFixed(2)}€
                        </Typography>
                      </Grid>
                    </Grid>
                  </Card>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </StyledPaper>

      {/* Summen und Optionen */}
      <Grid container spacing={2}>
        {/* Mobile: Zusammenfassung zuerst */}
        <Grid item xs={12} md={4} order={{ xs: 1, md: 2 }}>
          <StyledPaper>
            <CardHeader title="Zusammenfassung" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Zwischensumme: {calculateSubtotal().toFixed(2)}€
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Versandkosten: {parseFloat(shippingCost || 0).toFixed(2)}€
                </Typography>
                <Typography variant="body2" gutterBottom>
                  MwSt (19%): {calculateVatAmount().toFixed(2)}€
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  Gesamtsumme: {calculateTotal().toFixed(2)}€
                </Typography>
              </Box>
              
              {/* E-Mail Versand Toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: isMobile ? 'wrap' : 'nowrap'
                    }}>
                      <span>📧 E-Mail an Kunde senden</span>
                      {(useNewCustomer ? newCustomer.email : selectedCustomer?.email) && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            wordBreak: isMobile ? 'break-all' : 'normal',
                            fontSize: isMobile ? '0.7rem' : '0.75rem'
                          }}
                        >
                          ({useNewCustomer ? newCustomer.email : selectedCustomer?.email})
                        </Typography>
                      )}
                    </Box>
                  }
                  disabled={!(useNewCustomer ? newCustomer.email : selectedCustomer?.email)}
                />
                {!(useNewCustomer ? newCustomer.email : selectedCustomer?.email) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Keine E-Mail-Adresse für den ausgewählten Kunden vorhanden
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={previewInvoice}
                  disabled={saving || invoiceItems.length === 0}
                  startIcon={<ReceiptIcon />}
                  sx={{ 
                    minHeight: isMobile ? 56 : 'auto',
                    fontSize: isMobile ? '1rem' : '0.95rem'
                  }}
                >
                  Vorschau
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={createInvoice}
                  disabled={saving || invoiceItems.length === 0}
                  startIcon={<ReceiptIcon />}
                  sx={{ 
                    minHeight: isMobile ? 56 : 'auto',
                    fontSize: isMobile ? '1.1rem' : '1rem'
                  }}
                >
                  {saving ? 'Erstelle Rechnung...' : 'Rechnung erstellen'}
                </Button>
              </Box>
            </CardContent>
          </StyledPaper>
        </Grid>

        {/* Mobile: Optionen danach */}
        <Grid item xs={12} md={8} order={{ xs: 2, md: 1 }}>
          <StyledPaper>
            <CardHeader title="3. Zusätzliche Optionen" />
            <CardContent>
              <Grid container spacing={isSmallMobile ? 1 : 2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Versandkosten"
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    inputProps={{ step: 0.01, min: 0 }}
                    InputProps={{ endAdornment: '€' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rechnungsvorlage</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      {templates.map(template => (
                        <MenuItem key={template._id} value={template._id}>
                          {template.name} {template.isDefault && '(Standard)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeVat}
                        onChange={(e) => setIncludeVat(e.target.checked)}
                        disabled={templateIsSmallBusiness}
                      />
                    }
                    label={templateIsSmallBusiness ? 'MwSt ausweisen (deaktiviert wegen Kleinunternehmerregelung)' : 'MwSt ausweisen (optional)'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 3}
                    label="Notizen für Kunde (erscheint auf der Rechnung)"
                    value={notes.customer}
                    onChange={(e) => setNotes(prev => ({ ...prev, customer: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 2}
                    label="Interne Notizen (nicht sichtbar für Kunde)"
                    value={notes.internal}
                    onChange={(e) => setNotes(prev => ({ ...prev, internal: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Produkt-Auswahl Dialog */}
      <Dialog 
        open={productSearchOpen} 
        onClose={() => setProductSearchOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            <Typography variant="h6">📦 Produkt aus Katalog</Typography>
          </Box>
          {isSmallMobile && (
            <IconButton onClick={() => setProductSearchOpen(false)}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <ProductCatalog 
            products={products}
            isLoadingProducts={isLoadingProducts}
            onProductSelect={addProduct}
            isMobile={isMobile}
            isSmallMobile={isSmallMobile}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => setProductSearchOpen(false)} variant="outlined">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={serviceSearchOpen}
        onClose={() => {
          setServiceSearchOpen(false);
        }}
        maxWidth="md"
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GiftIcon />
            <Typography variant="h6">Leistung suchen</Typography>
          </Box>
          {isSmallMobile && (
            <IconButton onClick={() => {
              setServiceSearchOpen(false);
            }}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <ServiceCatalog
            services={serviceLeistungen}
            onServiceSelect={handleServiceSelect}
            isMobile={isMobile}
            isSmallMobile={isSmallMobile}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => {
            setServiceSearchOpen(false);
          }} variant="outlined">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isSmallMobile}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            <Typography variant="h6">Rechnungsvorschau</Typography>
          </Box>
          {isSmallMobile && (
            <IconButton onClick={() => setPreviewOpen(false)}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 0, height: '600px', overflow: 'auto' }}>
          {previewHtml && (
            <Box
              sx={{
                '& *': {
                  maxWidth: '100%'
                }
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #eee', p: 2 }}>
          <Button onClick={() => setPreviewOpen(false)} variant="outlined">
            Schließen
          </Button>
          <Button onClick={() => {
            setPreviewOpen(false);
            createInvoice();
          }} variant="contained" startIcon={<ReceiptIcon />}>
            Rechnung erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateInvoice;