const express = require('express');
const router = express.Router();
const guvController = require('../controllers/guvController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');

// Multer für Datei-Upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    if (file.mimetype.startsWith('image/') || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder oder PDF-Dateien sind erlaubt'));
    }
  }
});

// Alle Routes erfordern Admin-Authentifizierung
router.use(authenticateToken, requireAdmin);

// ⚠️ WICHTIG: Spezifische Routes MÜSSEN vor parametrizierten Routes kommen!

/**
 * @route POST /guv-rechnung/analyze-image
 * @desc Analysiere eine hochgeladene Rechnung mit KI
 * @access Private - Admin only
 */
router.post('/analyze-image', upload.single('image'), guvController.analyzeReceiptImage);

/**
 * @route POST /guv-rechnung/generate-sequence
 * @desc Fortlaufende Steuer-Referenznummern für ein Jahr neu generieren (Einnahmen/Ausgaben getrennt)
 * @access Private - Admin only
 * @body { geschaeftsjahr? }
 */
router.post('/generate-sequence', guvController.generateSteuerlaufnummern);

/**
 * @route GET /guv-rechnung/summary
 * @desc GuV-Zusammenfassung und Bericht abrufen
 * @access Private - Admin only
 * @query geschaeftsjahr
 */
router.get('/summary', guvController.getGuVSummary);

/**
 * @route POST /guv-rechnung
 * @desc Neue GuV-Rechnung erstellen
 * @access Private - Admin only
 * @body { datum, typ, beschreibung, betrag, referenznummer?, quelle?, notizen?, invoiceId?, image_url? }
 */
router.post('/', guvController.createGuVRechnung);

/**
 * @route GET /guv-rechnung
 * @desc Alle GuV-Rechnungen abrufen
 * @access Private - Admin only
 * @query geschaeftsjahr, typ, skip, limit
 */
router.get('/', guvController.getAllGuVRechnungen);

/**
 * @route GET /guv-rechnung/:id
 * @desc Einzelne GuV-Rechnung abrufen
 * @access Private - Admin only
 */
router.get('/:id', guvController.getGuVRechnung);

/**
 * @route PUT /guv-rechnung/:id
 * @desc GuV-Rechnung aktualisieren
 * @access Private - Admin only
 */
router.put('/:id', guvController.updateGuVRechnung);

/**
 * @route DELETE /guv-rechnung/:id
 * @desc GuV-Rechnung löschen
 * @access Private - Admin only
 */
router.delete('/:id', guvController.deleteGuVRechnung);

module.exports = router;
