const { checkInteractions, checkPatientProfileInteractions } = require('../services/interactionService');

/**
 * Check a candidate medication against patient's active prescriptions
 */
const checkCandidate = async (req, res) => {
  try {
    const { patientId, medicationName, activeIngredient, excludePrescriptionId } = req.body;

    if (!patientId || !medicationName) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and medication name are required for checking.',
      });
    }

    const report = await checkInteractions({
      patientId,
      medicationName,
      activeIngredient: activeIngredient || medicationName,
      excludePrescriptionId,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[Interaction Check Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run interaction check.',
    });
  }
};

/**
 * Scan entire patient profile for internal medication conflicts
 */
const getPatientInteractions = async (req, res) => {
  try {
    const patientId = req.params.id;
    const report = await checkPatientProfileInteractions(patientId);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[Patient Interaction Scan Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scan patient medications.',
    });
  }
};

module.exports = {
  checkCandidate,
  getPatientInteractions,
};
