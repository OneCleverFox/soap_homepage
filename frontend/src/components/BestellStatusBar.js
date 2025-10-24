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

  // Mobile vertikale Timeline (Best Practice)
  if (isMobile) {
    const activeStep = currentStatus.step;
    
    return (
      <Paper sx={{ 
        p: 2, 
        border: '1px solid #f0f0f0', 
        borderRadius: 2,
        backgroundColor: '#fafafa'
      }}>
        {/* Current Status Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          p: 1.5,
          bgcolor: currentStatus.chipColor,
          borderRadius: 1,
          color: 'white'
        }}>
          <CustomStepIconRoot ownerState={{ 
            completed: true, 
            active: false, 
            mobile: true 
          }} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
            {React.createElement(
              [FiberNew, CheckCircle, Payment, Inventory, LocalShipping, Home][activeStep],
              { fontSize: "small" }
            )}
          </CustomStepIconRoot>
          <Box sx={{ ml: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {currentStatus.label}
            </Typography>
            {showDescription && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {currentStatus.description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Compact Progress Indicator */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 1
          }}>
            <Typography variant="caption" color="text.secondary">
              Fortschritt
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeStep + 1} / {normalSteps.length}
            </Typography>
          </Box>
          
          {/* Progress Bar */}
          <Box sx={{ 
            width: '100%', 
            height: 8, 
            bgcolor: 'grey.200', 
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              width: `${((activeStep + 1) / normalSteps.length) * 100}%`,
              height: '100%',
              bgcolor: currentStatus.chipColor,
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Box>

        {/* Vertical Timeline - Only Next Steps */}
        <Box>
          <Typography variant="body2" sx={{ 
            fontWeight: 'bold', 
            mb: 1.5,
            color: 'text.primary'
          }}>
            Nächste Schritte
          </Typography>
          
          <Box sx={{ position: 'relative' }}>
            {normalSteps.slice(activeStep + 1, activeStep + 3).map((stepStatus, index) => {
              const stepConfig = statusConfig[stepStatus];
              
              return (
                <Box 
                  key={stepStatus}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: index === 1 ? 0 : 1.5,
                    position: 'relative',
                    pl: 1
                  }}
                >
                  {/* Timeline Dot */}
                  <Box sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: index === 0 ? 'primary.main' : 'grey.300',
                    mr: 2,
                    position: 'relative',
                    zIndex: 1
                  }} />
                  
                  {/* Timeline Line */}
                  {index === 0 && (
                    <Box sx={{
                      position: 'absolute',
                      left: 11,
                      top: 12,
                      width: 2,
                      height: 20,
                      bgcolor: 'grey.300'
                    }} />
                  )}
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: index === 0 ? 'bold' : 'normal',
                        color: index === 0 ? 'text.primary' : 'text.secondary'
                      }}
                    >
                      {stepConfig.label}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {stepConfig.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            
            {/* Show completion message if at final step */}
            {activeStep === normalSteps.length - 1 && (
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                bgcolor: 'success.light',
                borderRadius: 1,
                mt: 1
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                  🎉 Bestellung erfolgreich abgeschlossen!
                </Typography>
              </Box>
            )}
          </Box>
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