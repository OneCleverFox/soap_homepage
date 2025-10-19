import React from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  styled,
  Chip,
  useMediaQuery,
  useTheme,
  Paper
} from '@mui/material';
import {
  FiberNew,
  CheckCircle,
  Payment,
  Inventory,
  LocalShipping,
  Home,
  Cancel,
  MoneyOff
} from '@mui/icons-material';

// Styled Components für eine schöne Stepper-Darstellung
const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  '&.Mui-active': {
    '& .MuiStepConnector-line': {
      backgroundImage: `linear-gradient(136deg, ${theme.palette.primary.main} 0%, ${theme.palette.accent.main} 100%)`,
    },
  },
  '&.Mui-completed': {
    '& .MuiStepConnector-line': {
      backgroundImage: `linear-gradient(136deg, ${theme.palette.success.main} 0%, ${theme.palette.accent.main} 100%)`,
    },
  },
}));

const CustomStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: ownerState.completed ? theme.palette.success.main : 
                   ownerState.active ? theme.palette.primary.main : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: ownerState.mobile ? 32 : 50,
  height: ownerState.mobile ? 32 : 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  boxShadow: ownerState.active || ownerState.completed ? 
    `0 4px 10px 0 rgba(${theme.palette.primary.main.slice(1).match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.3)` : 
    'none',
}));

function CustomStepIcon(props) {
  const { active, completed, className, icon, mobile } = props;

  const icons = {
    1: <FiberNew fontSize={mobile ? "small" : "medium"} />,
    2: <CheckCircle fontSize={mobile ? "small" : "medium"} />,
    3: <Payment fontSize={mobile ? "small" : "medium"} />,
    4: <Inventory fontSize={mobile ? "small" : "medium"} />,
    5: <LocalShipping fontSize={mobile ? "small" : "medium"} />,
    6: <Home fontSize={mobile ? "small" : "medium"} />,
    7: <Cancel fontSize={mobile ? "small" : "medium"} />,
    8: <MoneyOff fontSize={mobile ? "small" : "medium"} />,
  };

  return (
    <CustomStepIconRoot ownerState={{ completed, active, mobile }} className={className}>
      {icons[String(icon)]}
    </CustomStepIconRoot>
  );
}

// Status-Konfiguration
const statusConfig = {
  'neu': { 
    step: 0, 
    label: 'Neu', 
    description: 'Bestellung eingegangen',
    color: 'info',
    chipColor: '#2196F3'
  },
  'bestaetigt': { 
    step: 1, 
    label: 'Bestätigt', 
    description: 'Bestellung bestätigt',
    color: 'primary',
    chipColor: '#8B4B61'
  },
  'bezahlt': { 
    step: 2, 
    label: 'Bezahlt', 
    description: 'Zahlung erhalten',
    color: 'success',
    chipColor: '#4CAF50'
  },
  'verpackt': { 
    step: 3, 
    label: 'Verpackt', 
    description: 'Produkte verpackt',
    color: 'info',
    chipColor: '#A8D5B5'
  },
  'verschickt': { 
    step: 4, 
    label: 'Versendet', 
    description: 'Paket unterwegs',
    color: 'primary',
    chipColor: '#FF9800'
  },
  'zugestellt': { 
    step: 5, 
    label: 'Zugestellt', 
    description: 'Erfolgreich geliefert',
    color: 'success',
    chipColor: '#4CAF50'
  },
  'storniert': { 
    step: 6, 
    label: 'Storniert', 
    description: 'Bestellung storniert',
    color: 'error',
    chipColor: '#D32F2F'
  },
  'rueckerstattung': { 
    step: 7, 
    label: 'Rückerstattung', 
    description: 'Geld zurückerstattet',
    color: 'warning',
    chipColor: '#FF9800'
  }
};

// Normale Bestellschritte (ohne Stornierung/Rückerstattung)
const normalSteps = [
  'neu',
  'bestaetigt', 
  'bezahlt',
  'verpackt',
  'verschickt',
  'zugestellt'
];

const BestellStatusBar = ({ status, compact = false, showDescription = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const currentStatus = statusConfig[status] || statusConfig['neu'];
  
  // Für kompakte Ansicht nur Chip anzeigen
  if (compact) {
    return (
      <Chip
        label={currentStatus.label}
        size="small"
        sx={{
          backgroundColor: currentStatus.chipColor,
          color: 'white',
          fontWeight: 'bold',
          '& .MuiChip-label': {
            fontSize: { xs: '0.7rem', sm: '0.75rem' }
          }
        }}
      />
    );
  }

  // Für stornierte oder rückerstattete Bestellungen andere Darstellung
  if (status === 'storniert' || status === 'rueckerstattung') {
    return (
      <Paper sx={{ 
        p: { xs: 1, sm: 2 }, 
        border: '1px solid #f0f0f0', 
        borderRadius: 2,
        backgroundColor: '#fafafa'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CustomStepIconRoot ownerState={{ completed: true, active: false, mobile: isMobile }}>
            {status === 'storniert' ? <Cancel /> : <MoneyOff />}
          </CustomStepIconRoot>
          <Box sx={{ ml: 2 }}>
            <Typography variant={isMobile ? "body2" : "h6"} color={currentStatus.color}>
              {currentStatus.label}
            </Typography>
            {showDescription && (
              <Typography variant="caption" color="text.secondary">
                {currentStatus.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    );
  }

  // Mobile horizontaler Scrollable Stepper
  if (isMobile) {
    const activeStep = currentStatus.step;
    
    return (
      <Paper sx={{ 
        p: 2, 
        border: '1px solid #f0f0f0', 
        borderRadius: 2,
        backgroundColor: '#fafafa'
      }}>
        <Typography variant="body2" gutterBottom sx={{ 
          color: 'text.primary',
          fontWeight: 'bold',
          mb: 2
        }}>
          Status: <span style={{ color: currentStatus.chipColor }}>
            {currentStatus.label}
          </span>
        </Typography>
        
        {showDescription && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {currentStatus.description}
          </Typography>
        )}

        {/* Mobile optimierter horizontaler Stepper */}
        <Box sx={{ 
          display: 'flex', 
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': {
            height: 4,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.primary.main,
            borderRadius: 4,
          }
        }}>
          {normalSteps.map((stepStatus, index) => {
            const stepConfig = statusConfig[stepStatus];
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            
            return (
              <Box 
                key={stepStatus}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  minWidth: 80,
                  mx: 0.5
                }}
              >
                <CustomStepIconRoot ownerState={{ 
                  completed: isCompleted, 
                  active: isActive, 
                  mobile: true 
                }}>
                  {React.createElement(
                    [FiberNew, CheckCircle, Payment, Inventory, LocalShipping, Home][index],
                    { fontSize: "small" }
                  )}
                </CustomStepIconRoot>
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 1,
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: isActive || isCompleted ? 'text.primary' : 'text.secondary',
                    fontWeight: isActive ? 'bold' : 'normal'
                  }}
                >
                  {stepConfig.label}
                </Typography>
                
                {/* Verbindungslinie für Mobile */}
                {index < normalSteps.length - 1 && (
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    left: '60%',
                    width: 40,
                    height: 2,
                    bgcolor: isCompleted ? 'success.main' : 'grey.300',
                    zIndex: 0
                  }} />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Progress Info für Mobile */}
        <Box sx={{ 
          mt: 2, 
          textAlign: 'center',
          bgcolor: 'background.default',
          p: 1,
          borderRadius: 1
        }}>
          <Typography variant="caption" color="text.secondary">
            Schritt {activeStep + 1} von {normalSteps.length}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Desktop Layout (Original)
  const activeStep = currentStatus.step;

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2 }, 
      border: '1px solid #f0f0f0', 
      borderRadius: 2,
      backgroundColor: '#fafafa'
    }}>
      <Typography variant="h6" gutterBottom sx={{ 
        color: 'text.primary',
        fontSize: { xs: '1rem', sm: '1.25rem' },
        mb: 2
      }}>
        Bestellstatus: <span style={{ color: currentStatus.chipColor, fontWeight: 'bold' }}>
          {currentStatus.label}
        </span>
      </Typography>
      
      {showDescription && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {currentStatus.description}
        </Typography>
      )}

      <Stepper 
        activeStep={activeStep} 
        connector={<CustomStepConnector />}
        orientation="horizontal"
        sx={{
          '& .MuiStepLabel-root': {
            cursor: 'default'
          },
          '& .MuiStepLabel-label': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            marginTop: { xs: '4px', sm: '8px' }
          }
        }}
      >
        {normalSteps.map((stepStatus, index) => {
          const stepConfig = statusConfig[stepStatus];
          return (
            <Step key={stepStatus} completed={index < activeStep}>
              <StepLabel 
                StepIconComponent={(props) => <CustomStepIcon {...props} mobile={false} />}
                sx={{
                  '& .MuiStepLabel-label': {
                    color: index <= activeStep ? 'text.primary' : 'text.secondary',
                    fontWeight: index === activeStep ? 'bold' : 'normal'
                  }
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" display="block">
                    {stepConfig.label}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {/* Zusätzliche Info für mobil */}
      <Box sx={{ 
        mt: 2, 
        display: { xs: 'block', sm: 'none' },
        textAlign: 'center' 
      }}>
        <Typography variant="caption" color="text.secondary">
          Schritt {activeStep + 1} von {normalSteps.length}
        </Typography>
      </Box>
    </Box>
  );
};

export default BestellStatusBar;