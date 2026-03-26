const AdminDocument = require('../models/AdminDocument');
const AdminDocumentRenderService = require('../services/AdminDocumentRenderService');
const InvoiceTemplate = require('../models/InvoiceTemplate');
const Portfolio = require('../models/Portfolio');
const {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_GUIDANCE,
  DOCUMENT_TYPE_CLASSIFICATION,
  DOCUMENT_FAMILY_MATRIX,
  getTemplateDefinition,
  getDefaultProductGroups
} = require('../config/adminDocumentTemplates');

function getUserId(req) {
  return req.user?.id || req.user?.userId || 'admin';
}

function bumpVersion(version = '1.0') {
  const [majorRaw, minorRaw] = String(version).split('.');
  const major = Number.isFinite(Number(majorRaw)) ? Number(majorRaw) : 1;
  const minor = Number.isFinite(Number(minorRaw)) ? Number(minorRaw) : 0;
  return `${major}.${minor + 1}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeGroups(groups, fallback = ['seife', 'werkstuck', 'schmuck']) {
  const allowed = ['seife', 'werkstuck', 'schmuck'];
  const cleaned = (Array.isArray(groups) ? groups : []).filter((item) => allowed.includes(item));
  return cleaned.length > 0 ? [...new Set(cleaned)] : fallback;
}

function getField(sections, key) {
  for (const section of sections || []) {
    for (const field of section.fields || []) {
      if (field.key === key) {
        return field;
      }
    }
  }
  return null;
}

function setFieldValue(sections, key, value) {
  const field = getField(sections, key);
  if (field) {
    field.value = value;
  }
}

function extractApplicability(contentJson, documentType) {
  const groupsField = getField(contentJson?.sections || [], 'anwendungsbereich_produktgruppen');
  const noteField = getField(contentJson?.sections || [], 'anwendungsbereich_hinweis');

  return {
    groups: sanitizeGroups(groupsField?.value, getDefaultProductGroups(documentType)),
    note: String(noteField?.value || '')
  };
}

async function getPrefillData(documentType) {
  let template = await InvoiceTemplate.findOne({ isDefault: true }).lean();
  if (!template) {
    template = await InvoiceTemplate.findOne().sort({ createdAt: -1 }).lean();
  }

  const companyInfo = template?.companyInfo || {};
  const address = companyInfo.address || {};
  const contact = companyInfo.contact || {};
  const taxInfo = companyInfo.taxInfo || {};

  const categories = await Portfolio.distinct('kategorie', { aktiv: true });
  const mappedGroups = sanitizeGroups(categories, getDefaultProductGroups(documentType));

  return {
    herstellerName: companyInfo.name || '',
    addressText: [address.street, `${address.postalCode || ''} ${address.city || ''}`.trim(), address.country].filter(Boolean).join(', '),
    email: contact.email || '',
    verantwortlichePerson: taxInfo.ceo || '',
    produktgruppen: documentType === 'webshop_compliance_schmuck' ? ['schmuck'] : mappedGroups
  };
}

function applyPrefill(templateContent, prefill, documentType) {
  const sections = deepClone(templateContent.sections || []);
  const groups = documentType === 'webshop_compliance_schmuck' ? ['schmuck'] : prefill.produktgruppen;
  const labels = {
    seife: 'Seife',
    werkstuck: 'Werkstuecke',
    schmuck: 'Schmuck'
  };
  const groupsLabel = groups.map((item) => labels[item] || item).join(', ');

  setFieldValue(sections, 'hersteller_name', prefill.herstellerName);
  setFieldValue(sections, 'adresse', prefill.addressText);
  setFieldValue(sections, 'kontakt_email', prefill.email);
  setFieldValue(sections, 'verantwortliche_person', prefill.verantwortlichePerson);
  setFieldValue(sections, 'produktgruppe', groupsLabel);
  setFieldValue(sections, 'datum', new Date().toISOString().slice(0, 10));
  setFieldValue(sections, 'anwendungsbereich_produktgruppen', groups);
  setFieldValue(
    sections,
    'anwendungsbereich_hinweis',
    `Anzuwenden fuer: ${groups.join(', ')}. Anwendung nur, soweit fuer die Produktgruppe erforderlich.`
  );

  return {
    sections,
    legal_guardrail: templateContent.legal_guardrail || ''
  };
}

async function ensureBlankoTemplates() {
  const types = Object.keys(DOCUMENT_TYPES);

  for (const type of types) {
    const existing = await AdminDocument.findOne({
      document_type: type,
      status: 'blanko',
      is_template: true
    }).sort({ updated_at: -1 });

    const template = getTemplateDefinition(type);
    if (!template) {
      continue;
    }

    const prefill = await getPrefillData(type);
    const prefilledContent = applyPrefill(
      {
        sections: template.sections,
        legal_guardrail: template.legal_guardrail
      },
      prefill,
      type
    );
    const applicability = extractApplicability(prefilledContent, type);

    if (existing) {
      existing.title = template.title;
      existing.version = existing.version || '1.0';
      existing.content_json = prefilledContent;
      existing.applicable_product_groups = applicability.groups;
      existing.applicability_note = applicability.note;
      existing.is_template = true;
      existing.is_editable = false;
      existing.rendered_html = AdminDocumentRenderService.buildHtml(existing);
      existing.rendered_pdf_url = `/api/admin/documents/${existing._id}/pdf`;
      await existing.save();
      continue;
    }

    const blanko = new AdminDocument({
      document_type: type,
      title: template.title,
      version: '1.0',
      status: 'blanko',
      content_json: prefilledContent,
      rendered_html: '',
      rendered_pdf_url: '',
      applicable_product_groups: applicability.groups,
      applicability_note: applicability.note,
      created_by: 'system',
      is_template: true,
      is_editable: false
    });

    blanko.rendered_html = AdminDocumentRenderService.buildHtml(blanko);
    await blanko.save();
    blanko.rendered_pdf_url = `/api/admin/documents/${blanko._id}/pdf`;
    await blanko.save();
  }
}

async function listBlanko(req, res) {
  try {
    await ensureBlankoTemplates();

    const docs = await AdminDocument.find({ status: 'blanko', is_template: true })
      .sort({ document_type: 1, version: -1 })
      .select('-__v');

    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Blanko-Dokumente konnten nicht geladen werden', error: error.message });
  }
}

async function listFilled(req, res) {
  try {
    const docs = await AdminDocument.find({ status: 'filled' })
      .sort({ updated_at: -1 })
      .select('-__v');

    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokumente konnten nicht geladen werden', error: error.message });
  }
}

async function getDocument(req, res) {
  try {
    await ensureBlankoTemplates();

    const doc = await AdminDocument.findById(req.params.id).select('-__v');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokument konnte nicht geladen werden', error: error.message });
  }
}

async function createFilled(req, res) {
  try {
    await ensureBlankoTemplates();

    const { documentType } = req.params;
    const { title, version, content_json } = req.body || {};

    if (!DOCUMENT_TYPES[documentType]) {
      return res.status(400).json({ success: false, message: 'Unbekannter Dokumenttyp' });
    }

    const blanko = await AdminDocument.findOne({
      document_type: documentType,
      status: 'blanko',
      is_template: true
    }).sort({ created_at: -1 });

    if (!blanko) {
      return res.status(404).json({ success: false, message: 'Blanko-Template nicht gefunden' });
    }

    const baseContent = content_json && typeof content_json === 'object' ? content_json : deepClone(blanko.content_json);
    const applicability = extractApplicability(baseContent, documentType);

    const newDoc = new AdminDocument({
      document_type: documentType,
      title: DOCUMENT_TYPES[documentType],
      version: version?.trim() || '1.0',
      status: 'filled',
      content_json: baseContent,
      rendered_html: '',
      rendered_pdf_url: '',
      applicable_product_groups: applicability.groups,
      applicability_note: applicability.note,
      created_by: getUserId(req),
      is_template: false,
      is_editable: true,
      base_template_id: blanko._id
    });

    newDoc.rendered_html = AdminDocumentRenderService.buildHtml(newDoc);
    await newDoc.save();
    newDoc.rendered_pdf_url = `/api/admin/documents/${newDoc._id}/pdf`;
    await newDoc.save();

    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokument konnte nicht erstellt werden', error: error.message });
  }
}

async function deleteFilled(req, res) {
  try {
    const doc = await AdminDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    if (doc.status !== 'filled' || doc.is_template) {
      return res.status(400).json({ success: false, message: 'Nur ausgefuellte Dokumente koennen geloescht werden' });
    }

    await AdminDocument.deleteOne({ _id: doc._id });

    res.json({ success: true, message: 'Dokument geloescht' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokument konnte nicht geloescht werden', error: error.message });
  }
}

async function updateFilled(req, res) {
  try {
    const doc = await AdminDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    if (doc.status === 'blanko' || doc.is_template || doc.is_editable === false) {
      return res.status(400).json({ success: false, message: 'Blanko-Dokumente sind nicht editierbar' });
    }

    const { version, content_json } = req.body || {};

    doc.title = DOCUMENT_TYPES[doc.document_type] || doc.title;

    if (typeof version === 'string' && version.trim()) {
      doc.version = version.trim();
    }

    if (content_json && typeof content_json === 'object') {
      doc.content_json = content_json;
    }

    const applicability = extractApplicability(doc.content_json, doc.document_type);
    doc.applicable_product_groups = applicability.groups;
    doc.applicability_note = applicability.note;

    doc.rendered_html = AdminDocumentRenderService.buildHtml(doc);
    doc.rendered_pdf_url = `/api/admin/documents/${doc._id}/pdf`;

    await doc.save();

    res.json({ success: true, message: 'Dokument aktualisiert', data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokument konnte nicht aktualisiert werden', error: error.message });
  }
}

async function createNewVersion(req, res) {
  try {
    const current = await AdminDocument.findById(req.params.id);

    if (!current) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    if (current.status !== 'filled') {
      return res.status(400).json({ success: false, message: 'Neue Version nur fuer ausgefuellte Dokumente moeglich' });
    }

    const applicability = extractApplicability(current.content_json, current.document_type);

    const next = new AdminDocument({
      document_type: current.document_type,
      title: DOCUMENT_TYPES[current.document_type] || current.title,
      version: bumpVersion(current.version),
      status: 'filled',
      content_json: deepClone(current.content_json),
      rendered_html: '',
      rendered_pdf_url: '',
      applicable_product_groups: applicability.groups,
      applicability_note: applicability.note,
      created_by: getUserId(req),
      is_template: false,
      is_editable: true,
      base_template_id: current.base_template_id || null
    });

    next.rendered_html = AdminDocumentRenderService.buildHtml(next);
    await next.save();
    next.rendered_pdf_url = `/api/admin/documents/${next._id}/pdf`;
    await next.save();

    res.status(201).json({ success: true, message: 'Neue Version erstellt', data: next });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Neue Version konnte nicht erstellt werden', error: error.message });
  }
}

async function getPdf(req, res) {
  try {
    const doc = await AdminDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    const html = AdminDocumentRenderService.buildHtml(doc);
    const pdfBuffer = await AdminDocumentRenderService.generatePdfBuffer(doc, html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.document_type}-${doc.version}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'PDF konnte nicht erzeugt werden', error: error.message });
  }
}

async function getRenderedHtml(req, res) {
  try {
    const doc = await AdminDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }

    const html = AdminDocumentRenderService.buildHtml(doc);
    doc.rendered_html = html;
    await doc.save();

    res.json({ success: true, data: { id: doc._id, html } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Vorschau konnte nicht erstellt werden', error: error.message });
  }
}

async function getDocumentTypes(req, res) {
  try {
    const data = Object.entries(DOCUMENT_TYPES).map(([key, label]) => ({
      key,
      label,
      ...(DOCUMENT_TYPE_GUIDANCE[key] || {}),
      ...(DOCUMENT_TYPE_CLASSIFICATION[key] || { complianceLevel: 'optional', complianceLabel: 'Anlassbezogen' }),
      matrixStatus: DOCUMENT_FAMILY_MATRIX[key] || {
        seife: 'entfällt',
        werkstuck: 'entfällt',
        schmuck: 'entfällt',
        kosmetik: 'entfällt'
      }
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dokumenttypen konnten nicht geladen werden', error: error.message });
  }
}

module.exports = {
  listBlanko,
  listFilled,
  getDocument,
  createFilled,
  updateFilled,
  deleteFilled,
  createNewVersion,
  getPdf,
  getRenderedHtml,
  getDocumentTypes
};