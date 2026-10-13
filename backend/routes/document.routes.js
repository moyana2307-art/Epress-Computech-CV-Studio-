const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const documents = require('../controllers/document.controller');

const router = express.Router();

// Every document route requires a signed-in staff member.
router.use(requireAuth);

router.post('/', asyncHandler(documents.createDocument));
router.get('/', asyncHandler(documents.listDocuments));
router.get('/:id', asyncHandler(documents.getDocument));
router.put('/:id', asyncHandler(documents.saveNewVersion));
router.post('/:id/pdf', asyncHandler(documents.attachPdf));
router.get('/:id/pdf', asyncHandler(documents.downloadPdf));

module.exports = router;
