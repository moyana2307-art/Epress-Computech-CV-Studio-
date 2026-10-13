const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const client = require('../controllers/client.controller');

const router = express.Router();

// Every client route requires a signed-in staff member.
router.use(requireAuth);

router.post('/', asyncHandler(client.createClient));
router.get('/', asyncHandler(client.listClients));
router.get('/:id', asyncHandler(client.getClient));
router.put('/:id', asyncHandler(client.updateClient));
router.delete('/:id', asyncHandler(client.deleteClient));

module.exports = router;
