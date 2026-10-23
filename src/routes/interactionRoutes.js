const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { requireAuth } = require('../middleware/auth');
const { verifyPatientAccess } = require('../middleware/authorization');

router.post('/check', requireAuth, interactionController.checkCandidate);
router.get('/patient/:id', requireAuth, verifyPatientAccess('canViewMedications'), interactionController.getPatientInteractions);

module.exports = router;
