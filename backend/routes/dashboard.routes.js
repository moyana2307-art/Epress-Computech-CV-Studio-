const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const documents = require('../controllers/document.controller');

const router = express.Router();

// GET /api/dashboard - totals and recent activity for the dashboard page.
router.get('/', requireAuth, asyncHandler(documents.dashboard));

module.exports = router;
