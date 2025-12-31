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
        console.log('🔍 Lade Firmenangaben von:', `${API_URL}/invoice/company-info`);
        const response = await fetch(`${API_URL}/invoice/company-info`);
        
        console.log('📡 API Response Status:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 API Response Data:', data);
          
          if (data.success && data.data) {
            setCompanyInfo(data.data);
            console.log('✅ Firmenangaben erfolgreich geladen:', data.data);
          } else {
            console.warn('⚠️ API Response nicht erfolgreich:', data);
          }
        } else {
          console.warn('⚠️ API Request fehlgeschlagen:', response.status, response.statusText);
          const errorText = await response.text();
          console.warn('🔍 Response Body:', errorText);
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