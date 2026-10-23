const ScheduledDose = require('../models/ScheduledDose');
const PatientAccess = require('../models/PatientAccess');
const { calculatePatientAdherence } = require('../services/adherenceService');
const { recordAudit } = require('../services/auditService');

/**
 * Get today's scheduled doses for patient
 */
const getTodayDoses = async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required.' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const doses = await ScheduledDose.find({
      patient: patientId,
      scheduledTime: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ scheduledTime: 1 })
      .populate('prescription', 'medicationName strength dosageInstructions route specialInstructions frequency');

    const summary = {
      total: doses.length,
      taken: doses.filter((d) => d.status === 'taken').length,
      skipped: doses.filter((d) => d.status === 'skipped').length,
      missed: doses.filter((d) => d.status === 'missed').length,
      upcoming: doses.filter((d) => d.status === 'upcoming').length,
    };

    return res.status(200).json({
      success: true,
      date: todayStart.toISOString().slice(0, 10),
      summary,
      doses,
    });
  } catch (error) {
    console.error('[Get Today Doses Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve today doses.',
    });
  }
};

/**
 * Get doses with date range
 */
const getDoses = async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required.' });
    }

    const { startDate, endDate, status } = req.query;
    const query = { patient: patientId };

    if (startDate || endDate) {
      query.scheduledTime = {};
      if (startDate) query.scheduledTime.$gte = new Date(startDate);
      if (endDate) query.scheduledTime.$lte = new Date(endDate);
    }

    if (status) {
      query.status = status;
    }

    const doses = await ScheduledDose.find(query)
      .sort({ scheduledTime: -1 })
      .limit(100)
      .populate('prescription', 'medicationName strength dosageInstructions frequency');

    return res.status(200).json({
      success: true,
      count: doses.length,
      doses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve doses.',
    });
  }
};

/**
 * Mark a scheduled dose as Taken or Skipped
 */
const updateDoseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, skipReason, notes } = req.body;

    if (!['taken', 'skipped'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'taken' or 'skipped'.",
      });
    }

    const dose = await ScheduledDose.findById(id);
    if (!dose) {
      return res.status(404).json({ success: false, error: 'Scheduled dose not found.' });
    }

    // Authorization check: Patient themselves OR authorized caregiver with canRecordDoses: true
    const isPatient = req.user.role === 'patient' && req.user._id.toString() === dose.patient.toString();
    let isAuthorizedCaregiver = false;

    if (!isPatient && req.user.role === 'caregiver') {
      const access = await PatientAccess.findOne({
        patient: dose.patient,
        authorizedUser: req.user._id,
        status: 'active',
        'permissions.canRecordDoses': true,
      });
      if (access) {
        isAuthorizedCaregiver = true;
      }
    }

    if (!isPatient && !isAuthorizedCaregiver) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to log doses for this patient.',
      });
    }

    // Idempotency check: if already in requested status, return early without duplicate log
    if (dose.status === status && (!skipReason || dose.skipReason === skipReason)) {
      return res.status(200).json({
        success: true,
        message: `Dose is already marked as ${status}.`,
        dose,
      });
    }

    const beforeState = dose.toObject();

    dose.status = status;
    dose.actualActionTime = new Date();
    dose.skipReason = status === 'skipped' ? skipReason || 'No reason specified' : '';
    dose.notes = notes || dose.notes || '';
    dose.recordedBy = req.user._id;
    dose.recordedByRole = req.user.role;

    await dose.save();

    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: dose.patient,
      action: 'dose_status_updated',
      targetRecordId: dose._id,
      targetModel: 'ScheduledDose',
      description: `${req.user.name} (${req.user.role}) marked dose of ${dose.medicationName} as ${status}${
        status === 'skipped' ? ` (Reason: ${skipReason})` : ''
      }`,
      beforeState,
      afterState: dose.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: `Dose recorded as ${status}.`,
      dose,
    });
  } catch (error) {
    console.error('[Update Dose Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update dose status.',
    });
  }
};

/**
 * Get adherence metrics for a patient
 */
const getAdherenceStats = async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required.' });
    }

    const days = parseInt(req.query.days, 10) || 30;
    const stats = await calculatePatientAdherence(patientId, days);

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate adherence metrics.',
    });
  }
};

module.exports = {
  getTodayDoses,
  getDoses,
  updateDoseStatus,
  getAdherenceStats,
};
