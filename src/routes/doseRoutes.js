const express = require('express');
const router = express.Router();
const doseController = require('../controllers/doseController');
const { requireAuth } = require('../middleware/auth');

router.get('/today', requireAuth, doseController.getTodayDoses);
router.get('/', requireAuth, doseController.getDoses);
router.patch('/:id/status', requireAuth, doseController.updateDoseStatus);
router.get('/adherence', requireAuth, doseController.getAdherenceStats);

module.exports = router;
