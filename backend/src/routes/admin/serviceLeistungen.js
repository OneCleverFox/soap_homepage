const express = require('express');
const mongoose = require('mongoose');
const ServiceLeistung = require('../../models/ServiceLeistung');

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeServiceType = (rawType) => {
  const value = String(rawType || '').toLowerCase().trim();
  if (value === 'plotterarbeiten') {
    return 'plotterarbeiten';
  }
  return 'standard';
};

const sanitizeSizeProfiles = (profiles) => {
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles
    .map((profile) => ({
      label: String(profile?.label || '').trim(),
      widthCm: toNumber(profile?.widthCm, 0),
      heightCm: toNumber(profile?.heightCm, 0),
      salePrice: toNumber(profile?.salePrice, 0),
      materialCost: toNumber(profile?.materialCost, 0),
      laborCost: toNumber(profile?.laborCost, 0),
      isDefault: Boolean(profile?.isDefault)
    }))
    .filter((profile) => profile.label && profile.widthCm > 0 && profile.heightCm > 0);
};

const resolveCreatedBy = (user) => {
  const candidate = user?.userId || user?.id;
  if (!candidate) {
    return undefined;
  }
  return mongoose.Types.ObjectId.isValid(candidate) ? candidate : undefined;
};

const normalizeSkuBase = (name) => {
  const cleaned = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return cleaned || 'SERVICE';
};

const generateUniqueSku = async (name) => {
  const base = normalizeSkuBase(name);
  let counter = 0;

  while (counter < 500) {
    const candidate = counter === 0 ? base : `${base}-${String(counter).padStart(2, '0')}`;
    const exists = await ServiceLeistung.exists({ sku: candidate });

    if (!exists) {
      return candidate;
    }

    counter += 1;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
};

// @route   GET /api/admin/service-leistungen
// @desc    Alle Services und Leistungen abrufen
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const search = String(req.query.search || '').trim();

    const filter = includeInactive ? {} : { isActive: true };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { serviceType: new RegExp(search, 'i') }
      ];
    }

    const entries = await ServiceLeistung.find(filter).sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Fehler beim Laden von Service & Leistung:', error);
    res.status(500).json({
      success: false,
      message: 'Service- und Leistungsdaten konnten nicht geladen werden.',
      error: error.message
    });
  }
});

// @route   GET /api/admin/service-leistungen/:id
// @desc    Einzelnen Service/Leistung abrufen
// @access  Private (Admin)
router.get('/:id', async (req, res) => {
  try {
    const entry = await ServiceLeistung.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Eintrag nicht gefunden.'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Fehler beim Laden des Eintrags:', error);
    res.status(500).json({
      success: false,
      message: 'Eintrag konnte nicht geladen werden.',
      error: error.message
    });
  }
});

// @route   POST /api/admin/service-leistungen
// @desc    Neuen Service/Leistung anlegen
// @access  Private (Admin)
router.post('/', async (req, res) => {
  try {
    const generatedSku = await generateUniqueSku(req.body.name);

    const payload = {
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      sku: generatedSku,
      serviceType: normalizeServiceType(req.body.serviceType),
      unit: String(req.body.unit || 'Stück').trim(),
      defaultPrice: toNumber(req.body.defaultPrice, 0),
      taxRate: toNumber(req.body.taxRate, 19),
      invoiceNote: String(req.body.invoiceNote || '').trim(),
      plotterBasePricePerSqm: toNumber(req.body.plotterBasePricePerSqm, 0),
      plotterMaterialCostPerSqm: toNumber(req.body.plotterMaterialCostPerSqm, 0),
      plotterLaborCostPerSqm: toNumber(req.body.plotterLaborCostPerSqm, 0),
      plotterOverheadFactor: toNumber(req.body.plotterOverheadFactor, 3),
      plotterMinimumPrice: toNumber(req.body.plotterMinimumPrice, 0),
      sizeProfiles: sanitizeSizeProfiles(req.body.sizeProfiles),
      sortOrder: Number.parseInt(req.body.sortOrder, 10) || 0,
      isActive: req.body.isActive !== false,
      createdBy: resolveCreatedBy(req.user)
    };

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Bitte einen Namen angeben.'
      });
    }

    if (payload.defaultPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Der Preis darf nicht negativ sein.'
      });
    }

    const entry = await ServiceLeistung.create(payload);

    res.status(201).json({
      success: true,
      message: 'Eintrag erfolgreich angelegt.',
      data: entry
    });
  } catch (error) {
    console.error('Fehler beim Anlegen von Service/Leistung:', error);
    res.status(500).json({
      success: false,
      message: 'Eintrag konnte nicht angelegt werden.',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/service-leistungen/:id
// @desc    Service/Leistung bearbeiten
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      sku: String(req.body.sku || '').trim().toUpperCase(),
      serviceType: normalizeServiceType(req.body.serviceType),
      unit: String(req.body.unit || 'Stück').trim(),
      defaultPrice: toNumber(req.body.defaultPrice, 0),
      taxRate: toNumber(req.body.taxRate, 19),
      invoiceNote: String(req.body.invoiceNote || '').trim(),
      plotterBasePricePerSqm: toNumber(req.body.plotterBasePricePerSqm, 0),
      plotterMaterialCostPerSqm: toNumber(req.body.plotterMaterialCostPerSqm, 0),
      plotterLaborCostPerSqm: toNumber(req.body.plotterLaborCostPerSqm, 0),
      plotterOverheadFactor: toNumber(req.body.plotterOverheadFactor, 3),
      plotterMinimumPrice: toNumber(req.body.plotterMinimumPrice, 0),
      sizeProfiles: sanitizeSizeProfiles(req.body.sizeProfiles),
      sortOrder: Number.parseInt(req.body.sortOrder, 10) || 0,
      isActive: req.body.isActive !== false
    };

    if (!updateData.name) {
      return res.status(400).json({
        success: false,
        message: 'Bitte einen Namen angeben.'
      });
    }

    if (updateData.defaultPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Der Preis darf nicht negativ sein.'
      });
    }

    const entry = await ServiceLeistung.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Eintrag nicht gefunden.'
      });
    }

    res.json({
      success: true,
      message: 'Eintrag erfolgreich aktualisiert.',
      data: entry
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren von Service/Leistung:', error);
    res.status(500).json({
      success: false,
      message: 'Eintrag konnte nicht aktualisiert werden.',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/service-leistungen/:id
// @desc    Service/Leistung löschen
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const entry = await ServiceLeistung.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Eintrag nicht gefunden.'
      });
    }

    res.json({
      success: true,
      message: 'Eintrag erfolgreich gelöscht.'
    });
  } catch (error) {
    console.error('Fehler beim Löschen von Service/Leistung:', error);
    res.status(500).json({
      success: false,
      message: 'Eintrag konnte nicht gelöscht werden.',
      error: error.message
    });
  }
});

module.exports = router;
