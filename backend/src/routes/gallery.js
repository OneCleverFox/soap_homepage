const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Admin-Routen (geschützt) - MÜSSEN VOR dynamischen Routen stehen
 */

// GET /api/gallery/admin/all - Alle Bilder für Admin abrufen (inkl. inaktive)
router.get('/admin/all', authenticateToken, requireAdmin, galleryController.getAllImagesAdmin);

// POST /api/gallery/admin/upload - Neues Bild hochladen
router.post('/admin/upload', authenticateToken, requireAdmin, galleryController.uploadImage);

// POST /api/gallery/admin/reorder - Reihenfolge neu ordnen
router.post('/admin/reorder', authenticateToken, requireAdmin, galleryController.reorderImages);

// PUT /api/gallery/admin/settings - Galerie-Einstellungen aktualisieren
router.put('/admin/settings', authenticateToken, requireAdmin, galleryController.updateSettings);

// PUT /api/gallery/admin/:id - Bild aktualisieren
router.put('/admin/:id', authenticateToken, requireAdmin, galleryController.updateImage);

// DELETE /api/gallery/admin/:id - Bild löschen
router.delete('/admin/:id', authenticateToken, requireAdmin, galleryController.deleteImage);

/**
 * Öffentliche Routen
 */

// GET /api/gallery/settings - Galerie-Einstellungen abrufen
router.get('/settings', galleryController.getSettings);

// GET /api/gallery - Alle aktiven Galerie-Bilder abrufen
router.get('/', galleryController.getAllImages);

// GET /api/gallery/:id - Einzelnes Bild abrufen (MUSS ZULETZT sein)
router.get('/:id', galleryController.getImageById);

module.exports = router;
