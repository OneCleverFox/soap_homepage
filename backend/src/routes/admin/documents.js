const express = require('express');
const controller = require('../../controllers/adminDocumentsController');

const router = express.Router();

router.get('/types', controller.getDocumentTypes);
router.get('/blanko', controller.listBlanko);
router.get('/filled', controller.listFilled);
router.post('/filled/:documentType', controller.createFilled);
router.get('/:id', controller.getDocument);
router.put('/:id', controller.updateFilled);
router.delete('/:id', controller.deleteFilled);
router.post('/:id/new-version', controller.createNewVersion);
router.get('/:id/pdf', controller.getPdf);
router.get('/:id/html', controller.getRenderedHtml);

module.exports = router;