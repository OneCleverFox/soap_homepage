const { body, param, query, validationResult } = require('express-validator');

// Validierungsergebnisse überprüfen
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: errors.array()
    });
  }
  next();
};

// Produkt Validierungen
const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Produktname ist erforderlich')
    .isLength({ max: 100 })
    .withMessage('Produktname darf maximal 100 Zeichen lang sein'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Produktbeschreibung ist erforderlich')
    .isLength({ max: 1000 })
    .withMessage('Beschreibung darf maximal 1000 Zeichen lang sein'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Preis muss eine positive Zahl sein'),
  
  body('category')
    .isIn(['seifen', 'cremes', 'oele', 'geschenksets', 'zubehoer', 'sonstiges'])
    .withMessage('Ungültige Kategorie'),
  
  body('stock.quantity')
    .isInt({ min: 0 })
    .withMessage('Lagerbestand muss eine positive Ganzzahl sein'),
  
  handleValidationErrors
];

// Bestellung Validierungen
const validateOrder = [
  body('customer.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich'),
  
  body('customer.firstName')
    .trim()
    .notEmpty()
    .withMessage('Vorname ist erforderlich'),
  
  body('customer.lastName')
    .trim()
    .notEmpty()
    .withMessage('Nachname ist erforderlich'),
  
  body('billingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Straße ist erforderlich'),
  
  body('billingAddress.zipCode')
    .matches(/^\d{5}$/)
    .withMessage('PLZ muss 5 Ziffern enthalten'),
  
  body('billingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Stadt ist erforderlich'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Mindestens ein Artikel ist erforderlich'),
  
  body('items.*.product')
    .isMongoId()
    .withMessage('Ungültige Produkt-ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Menge muss mindestens 1 sein'),
  
  body('payment.method')
    .isIn(['paypal', 'stripe', 'bank_transfer', 'cash_on_delivery'])
    .withMessage('Ungültige Zahlungsmethode'),
  
  handleValidationErrors
];

// Benutzer Validierungen
const validateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Benutzername muss zwischen 3 und 30 Zeichen lang sein')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Passwort muss mindestens 6 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Vorname ist erforderlich'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Nachname ist erforderlich'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Ungültige Benutzerrolle'),
  
  handleValidationErrors
];

// Login Validierungen
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Benutzername oder E-Mail ist erforderlich'),
  
  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich'),
  
  handleValidationErrors
];

// ID Parameter Validierung
const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Ungültige ID'),
  
  handleValidationErrors
];

// Paginierung Validierung
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seite muss eine positive Ganzzahl sein'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit muss zwischen 1 und 100 liegen'),
  
  handleValidationErrors
];

// Suchvalidierung
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Suchbegriff muss zwischen 1 und 100 Zeichen lang sein'),
  
  query('category')
    .optional()
    .isIn(['seifen', 'cremes', 'oele', 'geschenksets', 'zubehoer', 'sonstiges'])
    .withMessage('Ungültige Kategorie'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'salesCount'])
    .withMessage('Ungültiges Sortierkriterium'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ungültige Sortierreihenfolge'),
  
  handleValidationErrors
];

module.exports = {
  validateProduct,
  validateOrder,
  validateUser,
  validateLogin,
  validateId,
  validatePagination,
  validateSearch,
  handleValidationErrors
};