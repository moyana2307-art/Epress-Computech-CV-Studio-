const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/auth.controller');

const router = express.Router();

// Public: check whether the first account has been created yet.
router.get('/status', asyncHandler(auth.status));

// Public: create the first account / sign in.
router.post('/register', asyncHandler(auth.register));
router.post('/login', asyncHandler(auth.login));

// Protected: the signed-in user's own profile.
router.get('/me', requireAuth, asyncHandler(auth.me));
router.put('/me', requireAuth, asyncHandler(auth.updateMe));

module.exports = router;
