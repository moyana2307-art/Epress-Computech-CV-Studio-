const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ai = require('../controllers/ai.controller');

const router = express.Router();

router.use(requireAuth);

// GET /api/ai/status  -> is the AI key configured?
router.get('/status', asyncHandler(ai.status));

// POST /api/ai/generate -> turn messy notes into a structured CV.
router.post('/generate', asyncHandler(ai.generate));

module.exports = router;
