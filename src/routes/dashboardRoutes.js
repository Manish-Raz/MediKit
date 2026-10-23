const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

router.get('/summary', requireAuth, dashboardController.getDashboardSummary);

module.exports = router;
