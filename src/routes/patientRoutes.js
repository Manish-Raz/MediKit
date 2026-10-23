const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { verifyPatientAccess } = require('../middleware/authorization');

// Patient self profile
router.get('/me', requireAuth, requireRole('patient'), patientController.getMyProfile);
router.patch('/me', requireAuth, requireRole('patient'), patientController.updateMyProfile);

// List authorized patients for doctor or caregiver
router.get('/authorized', requireAuth, requireRole('doctor', 'caregiver'), patientController.getAuthorizedPatients);

// Patient specific access control and medical records
router.get('/:id', requireAuth, verifyPatientAccess('canViewMedications'), patientController.getPatientById);
router.get('/:id/access', requireAuth, patientController.getPatientAccessList);
router.post('/:id/access', requireAuth, patientController.grantPatientAccess);
router.patch('/:id/access/:accessId', requireAuth, patientController.updatePatientAccess);

module.exports = router;
