const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { verifyPatientAccess } = require('../middleware/authorization');

router.get('/', requireAuth, prescriptionController.getPrescriptions);
router.post(
  '/',
  requireAuth,
  requireRole('doctor'),
  verifyPatientAccess('canPrescribe'),
  prescriptionController.createPrescription
);
router.get('/:id', requireAuth, prescriptionController.getPrescriptionById);
router.patch('/:id', requireAuth, requireRole('doctor'), prescriptionController.updatePrescription);
router.post('/:id/discontinue', requireAuth, requireRole('doctor'), prescriptionController.discontinuePrescription);
router.get('/:id/history', requireAuth, prescriptionController.getPrescriptionHistory);

module.exports = router;
