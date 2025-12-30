import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CompanyContext = createContext(null);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/company-info');
      
      // Die Axios-Response hat die Daten in response.data
      const responseData = response.data;
      
      if (responseData.success && responseData.data) {
        setCompanyData(responseData.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Unternehmensdaten:', err);
      setError(err.message || 'Fehler beim Laden der Unternehmensdaten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const value = {
    companyData,
    loading,
    error,
    refetch: fetchCompanyData,
    
    // Convenience getters for common data
    get name() {
      return companyData?.name || '';
    },
    get address() {
      return companyData?.address || {};
    },
    get contact() {
      return companyData?.contact || {};
    },
    get vatId() {
      return companyData?.vatId || '';
    },
    get ceo() {
      return companyData?.ceo || '';
    },
    get legalForm() {
      return companyData?.legalForm || '';
    },
    get fullAddress() {
      const addr = companyData?.address;
      if (!addr) return '';
      return `${addr.street}, ${addr.postalCode} ${addr.city}, ${addr.country}`;
    },
    get phone() {
      return companyData?.contact?.phone || '';
    },
    get email() {
      return companyData?.contact?.email || '';
    },
    get website() {
      return companyData?.contact?.website || '';
    }
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyContext;