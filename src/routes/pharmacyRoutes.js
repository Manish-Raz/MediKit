const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public catalog search
router.get('/search', pharmacyController.searchPublicInventory);

// Pharmacy owner inventory management
router.get('/inventory', requireAuth, requireRole('pharmacy'), pharmacyController.getMyInventory);
router.post('/inventory', requireAuth, requireRole('pharmacy'), pharmacyController.addInventoryItem);
router.patch('/inventory/:id', requireAuth, requireRole('pharmacy'), pharmacyController.updateInventoryItem);

module.exports = router;
