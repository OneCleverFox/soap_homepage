import { useState, useCallback, useMemo } from 'react';

/**
 * Hook für Formular-Validierung in Admin-Komponenten
 * Standardisiert Validierung und Error-Handling
 */
export const useFormValidation = (validationRules = {}, initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Einzelne Validierungsregeln
  const validators = {
    required: (value) => {
      if (value === null || value === undefined || value === '') {
        return 'Dieses Feld ist erforderlich';
      }
      return null;
    },
    
    email: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
      }
      return null;
    },
    
    minLength: (min) => (value) => {
      if (value && value.length < min) {
        return `Mindestens ${min} Zeichen erforderlich`;
      }
      return null;
    },
    
    maxLength: (max) => (value) => {
      if (value && value.length > max) {
        return `Maximal ${max} Zeichen erlaubt`;
      }
      return null;
    },
    
    numeric: (value) => {
      if (value && isNaN(Number(value))) {
        return 'Bitte geben Sie eine gültige Zahl ein';
      }
      return null;
    },
    
    positiveNumber: (value) => {
      const num = Number(value);
      if (value && (isNaN(num) || num <= 0)) {
        return 'Bitte geben Sie eine positive Zahl ein';
      }
      return null;
    },
    
    url: (value) => {
      try {
        if (value) {
          new URL(value);
        }
        return null;
      } catch {
        return 'Bitte geben Sie eine gültige URL ein';
      }
    },
    
    phone: (value) => {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
      if (value && !phoneRegex.test(value)) {
        return 'Bitte geben Sie eine gültige Telefonnummer ein';
      }
      return null;
    }
  };

  // Validierung für ein einzelnes Feld
  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
      let validator;
      let params = [];

      if (typeof rule === 'string') {
        validator = validators[rule];
      } else if (typeof rule === 'object' && rule.type) {
        validator = validators[rule.type];
        params = rule.params || [];
      } else if (typeof rule === 'function') {
        validator = rule;
      }

      if (validator) {
        const validatorFunc = params.length > 0 ? validator(...params) : validator;
        const error = validatorFunc(value);
        if (error) {
          return error;
        }
      }
    }
    
    return null;
  }, [validationRules]);

  // Alle Felder validieren
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  // Wert setzen
  const setValue = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validierung bei Änderung (nur wenn bereits touched)
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [touched, validateField]);

  // Mehrere Werte setzen
  const setValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // Field als touched markieren
  const setFieldTouched = useCallback((fieldName, isTouched = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
    
    if (isTouched) {
      const error = validateField(fieldName, values[fieldName]);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [values, validateField]);

  // Reset Form
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Helper für Input-Props
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    onChange: (e) => setValue(fieldName, e.target.value),
    onBlur: () => setFieldTouched(fieldName),
    error: touched[fieldName] && !!errors[fieldName],
    helperText: touched[fieldName] && errors[fieldName]
  }), [values, errors, touched, setValue, setFieldTouched]);

  // Form-Status
  const isFormValid = useMemo(() => {
    return Object.keys(validationRules).every(fieldName => !errors[fieldName]);
  }, [errors, validationRules]);

  const hasErrors = Object.values(errors).some(error => error);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    // Values
    values,
    setValue,
    setValues,
    
    // Errors
    errors,
    setErrors,
    
    // Touched
    touched,
    setFieldTouched,
    
    // Validation
    validateField,
    validateForm,
    
    // Helpers
    getFieldProps,
    resetForm,
    
    // Status
    isFormValid,
    hasErrors,
    isDirty
  };
};

/**
 * Vordefinierte Validierungssets für häufige Anwendungsfälle
 */
export const validationSets = {
  user: {
    firstName: ['required'],
    lastName: ['required'],
    email: ['required', 'email'],
    phone: ['phone']
  },
  
  product: {
    name: ['required'],
    preis: ['required', 'positiveNumber'],
    beschreibung: [{ type: 'maxLength', params: [500] }]
  },
  
  customer: {
    vorname: ['required'],
    nachname: ['required'],
    email: ['required', 'email'],
    telefon: ['phone'],
    strasse: ['required'],
    plz: ['required', { type: 'minLength', params: [4] }],
    stadt: ['required']
  }
};

export default useFormValidation;