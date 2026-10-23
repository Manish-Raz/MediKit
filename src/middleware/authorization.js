const PatientAccess = require('../models/PatientAccess');

/**
 * Middleware factory to verify that req.user is authorized to access a given patient's records.
 * Patient ID is extracted from req.params.patientId, req.params.id, or req.body.patientId.
 * @param {string} [requiredPermission] - 'canViewMedications' | 'canPrescribe' | 'canRecordDoses'
 */
const verifyPatientAccess = (requiredPermission = 'canViewMedications') => {
  return async (req, res, next) => {
    try {
      const patientId = req.params.patientId || req.params.id || req.body.patientId;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient identifier is required for access verification.',
        });
      }

      const currentUserId = req.user._id.toString();

      // Case 1: Patient accessing their own data
      if (currentUserId === patientId.toString()) {
        if (req.user.role === 'patient') {
          return next();
        }
      }

      // Case 2: Authorized Doctor or Caregiver
      const access = await PatientAccess.findOne({
        patient: patientId,
        authorizedUser: currentUserId,
        status: 'active',
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have authorization to access this patient record.',
        });
      }

      // Check specific permission if requested
      if (requiredPermission && !access.permissions[requiredPermission]) {
        return res.status(403).json({
          success: false,
          error: `Access denied: Missing required permission '${requiredPermission}'.`,
        });
      }

      // Attach verified access record to request for controllers
      req.patientAccess = access;
      next();
    } catch (err) {
      console.error('[Authorization Check Error]', err);
      return res.status(500).json({
        success: false,
        error: 'Error validating authorization.',
      });
    }
  };
};

module.exports = {
  verifyPatientAccess,
};
