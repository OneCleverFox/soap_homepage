import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';

export const useCompanyInfo = () => {
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    address: {
      street: '',
      postalCode: '',
      city: '',
      country: 'Deutschland'
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    taxInfo: {
      taxNumber: '',
      vatId: '',
      ceo: '',
      legalForm: '',
      taxOffice: '',
      registrationCourt: ''
    },
    bankDetails: {
      bankName: '',
      iban: '',
      bic: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/invoice/company-info`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setCompanyInfo(data.data);
            console.log('🏢 Firmenangaben geladen:', data.data);
          }
        } else {
          console.warn('⚠️ Firmenangaben konnten nicht geladen werden, verwende Fallback-Daten');
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Firmenangaben:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyInfo();
  }, []);

  return { companyInfo, loading, error };
};