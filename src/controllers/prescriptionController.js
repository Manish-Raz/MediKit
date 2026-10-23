const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { generateDosesForPrescription, cleanupFutureDoses } = require('../services/medicationScheduleService');
const { checkInteractions } = require('../services/interactionService');
const { recordAudit, getAuditHistory } = require('../services/auditService');
const { notifyCareTeam } = require('../services/notificationService');

/**
 * List prescriptions based on authenticated user and query parameters
 */
const getPrescriptions = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (patientId) {
      query.patient = patientId;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const prescriptions = await Prescription.find(query)
      .populate('doctor', 'name email')
      .populate('patient', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      prescriptions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch prescriptions.',
    });
  }
};

/**
 * Create a new prescription (Doctors only)
 */
const createPrescription = async (req, res) => {
  try {
    const {
      patientId,
      medicationName,
      activeIngredient,
      strength,
      dosageInstructions,
      route,
      frequency,
      scheduledTimes,
      startDate,
      endDate,
      specialInstructions,
      bypassInteractionAcknowledged,
    } = req.body;

    if (!patientId || !medicationName || !activeIngredient || !strength || !dosageInstructions || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all mandatory prescription fields (patient, medication, active ingredient, strength, instructions, dates).',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'End date must be greater than or equal to start date.',
      });
    }

    // Run interaction & duplicate detection
    const interactionCheck = await checkInteractions({
      patientId,
      medicationName,
      activeIngredient,
    });

    // If severe warnings found and not yet explicitly acknowledged by doctor
    if (interactionCheck.totalWarningsCount > 0 && !bypassInteractionAcknowledged) {
      return res.status(409).json({
        success: false,
        requiresAcknowledgment: true,
        message: 'Potential medication duplicate or drug interaction detected.',
        interactionReport: interactionCheck,
      });
    }

    // Determine scheduled times array based on frequency if not custom
    let times = Array.isArray(scheduledTimes) && scheduledTimes.length > 0 ? scheduledTimes : ['08:00'];
    if (frequency === 'twice_daily' && (!scheduledTimes || scheduledTimes.length < 2)) {
      times = ['08:00', '20:00'];
    } else if (frequency === 'three_times_daily' && (!scheduledTimes || scheduledTimes.length < 3)) {
      times = ['08:00', '14:00', '20:00'];
    } else if (frequency === 'every_6_hours' && (!scheduledTimes || scheduledTimes.length < 4)) {
      times = ['06:00', '12:00', '18:00', '00:00'];
    }

    const prescription = new Prescription({
      patient: patientId,
      doctor: req.user._id,
      medicationName,
      activeIngredient: activeIngredient.trim().toLowerCase(),
      strength,
      dosageInstructions,
      route: route || 'Oral',
      frequency: frequency || 'once_daily',
      scheduledTimes: times,
      startDate: start,
      endDate: end,
      specialInstructions: specialInstructions || '',
      status: 'active',
      version: 1,
    });

    prescription.rootPrescriptionId = prescription._id;
    await prescription.save();

    // Generate scheduled dose records
    const scheduleResult = await generateDosesForPrescription(prescription);

    // Record audit trail
    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: patientId,
      action: 'prescription_created',
      targetRecordId: prescription._id,
      targetModel: 'Prescription',
      description: `Doctor ${req.user.name} prescribed ${medicationName} (${strength}) for patient.`,
      afterState: prescription.toObject(),
      metadata: {
        interactionWarningsAcknowledged: interactionCheck.totalWarningsCount > 0,
      },
    });

    // Notify patient and care team
    await notifyCareTeam({
      patientId,
      excludeUserId: req.user._id,
      type: 'prescription_new',
      title: 'New Prescription Added',
      message: `Dr. ${req.user.name} prescribed ${medicationName} (${strength}). Dosage: ${dosageInstructions}.`,
      priority: 'high',
    });

    return res.status(201).json({
      success: true,
      message: 'Prescription created successfully.',
      prescription,
      dosesGenerated: scheduleResult.createdCount,
      interactionWarnings: interactionCheck.totalWarningsCount > 0 ? interactionCheck : null,
    });
  } catch (error) {
    console.error('[Create Prescription Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create prescription.',
    });
  }
};

/**
 * Get single prescription by ID
 */
const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctor', 'name email')
      .populate('patient', 'name email');

    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    return res.status(200).json({
      success: true,
      prescription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve prescription.',
    });
  }
};

/**
 * Modify an existing prescription (creates new version, archives previous)
 */
const updatePrescription = async (req, res) => {
  try {
    const existing = await Prescription.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    if (existing.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot modify a prescription that is currently '${existing.status}'.`,
      });
    }

    const {
      medicationName,
      activeIngredient,
      strength,
      dosageInstructions,
      route,
      frequency,
      scheduledTimes,
      startDate,
      endDate,
      specialInstructions,
      modificationReason,
      bypassInteractionAcknowledged,
    } = req.body;

    if (!modificationReason) {
      return res.status(400).json({
        success: false,
        error: 'A reason for modifying this prescription is required for clinical audit.',
      });
    }

    const candidateMedName = medicationName || existing.medicationName;
    const candidateIngredient = activeIngredient || existing.activeIngredient;

    // Check interactions excluding this prescription
    const interactionCheck = await checkInteractions({
      patientId: existing.patient,
      medicationName: candidateMedName,
      activeIngredient: candidateIngredient,
      excludePrescriptionId: existing._id,
    });

    if (interactionCheck.totalWarningsCount > 0 && !bypassInteractionAcknowledged) {
      return res.status(409).json({
        success: false,
        requiresAcknowledgment: true,
        message: 'Potential interaction or duplicate detected for modified prescription.',
        interactionReport: interactionCheck,
      });
    }

    const beforeState = existing.toObject();

    // 1. Mark existing prescription as 'modified'
    existing.status = 'modified';
    existing.modificationReason = modificationReason;
    existing.lastModifiedBy = req.user._id;
    await existing.save();

    // 2. Remove future upcoming doses generated by the old version
    await cleanupFutureDoses(existing._id);

    // 3. Create new prescription version
    const newVersion = new Prescription({
      patient: existing.patient,
      doctor: req.user._id,
      medicationName: candidateMedName,
      activeIngredient: candidateIngredient.trim().toLowerCase(),
      strength: strength || existing.strength,
      dosageInstructions: dosageInstructions || existing.dosageInstructions,
      route: route || existing.route,
      frequency: frequency || existing.frequency,
      scheduledTimes: scheduledTimes || existing.scheduledTimes,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      specialInstructions: specialInstructions !== undefined ? specialInstructions : existing.specialInstructions,
      status: 'active',
      version: existing.version + 1,
      previousVersionId: existing._id,
      rootPrescriptionId: existing.rootPrescriptionId || existing._id,
      modificationReason,
    });

    await newVersion.save();

    // 4. Generate doses for the new version
    const scheduleResult = await generateDosesForPrescription(newVersion);

    // 5. Audit log
    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: existing.patient,
      action: 'prescription_modified',
      targetRecordId: newVersion._id,
      targetModel: 'Prescription',
      description: `Doctor ${req.user.name} modified prescription for ${candidateMedName} to version ${newVersion.version}. Reason: ${modificationReason}`,
      beforeState,
      afterState: newVersion.toObject(),
    });

    // 6. Notify patient and care team
    await notifyCareTeam({
      patientId: existing.patient,
      excludeUserId: req.user._id,
      type: 'prescription_modified',
      title: 'Prescription Modified',
      message: `Dr. ${req.user.name} modified ${candidateMedName}. Reason: ${modificationReason}.`,
      priority: 'high',
    });

    return res.status(200).json({
      success: true,
      message: 'Prescription modified and updated successfully.',
      prescription: newVersion,
      dosesGenerated: scheduleResult.createdCount,
    });
  } catch (error) {
    console.error('[Update Prescription Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update prescription.',
    });
  }
};

/**
 * Discontinue an active prescription
 */
const discontinuePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { discontinuationReason } = req.body;

    if (!discontinuationReason) {
      return res.status(400).json({
        success: false,
        error: 'Clinical reason for discontinuation is required.',
      });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    if (prescription.status === 'discontinued') {
      return res.status(400).json({ success: false, error: 'Prescription is already discontinued.' });
    }

    const beforeState = prescription.toObject();

    prescription.status = 'discontinued';
    prescription.discontinuationReason = discontinuationReason;
    prescription.discontinuedAt = new Date();
    prescription.discontinuedBy = req.user._id;
    await prescription.save();

    // Clean up all future upcoming doses immediately
    const cleanupResult = await cleanupFutureDoses(prescription._id);

    // Record audit
    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: prescription.patient,
      action: 'prescription_discontinued',
      targetRecordId: prescription._id,
      targetModel: 'Prescription',
      description: `Dr. ${req.user.name} discontinued ${prescription.medicationName}. Reason: ${discontinuationReason}`,
      beforeState,
      afterState: prescription.toObject(),
    });

    // Notify patient and care team
    await notifyCareTeam({
      patientId: prescription.patient,
      excludeUserId: req.user._id,
      type: 'prescription_discontinued',
      title: 'Medication Discontinued',
      message: `${prescription.medicationName} has been discontinued by Dr. ${req.user.name}. Reason: ${discontinuationReason}. Future doses have been removed.`,
      priority: 'high',
    });

    return res.status(200).json({
      success: true,
      message: 'Prescription discontinued successfully. Future doses removed.',
      prescription,
      futureDosesRemoved: cleanupResult.deletedCount,
    });
  } catch (error) {
    console.error('[Discontinue Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to discontinue prescription.',
    });
  }
};

/**
 * Get audit and revision history for a prescription
 */
const getPrescriptionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    const rootId = prescription.rootPrescriptionId || prescription._id;

    // Find all versions belonging to this prescription chain
    const versions = await Prescription.find({
      $or: [{ _id: rootId }, { rootPrescriptionId: rootId }],
    })
      .sort({ version: 1 })
      .populate('doctor', 'name email')
      .populate('discontinuedBy', 'name email');

    // Retrieve audit logs
    const auditLogs = await getAuditHistory({
      patientId: prescription.patient,
      targetRecordId: prescription._id,
    });

    return res.status(200).json({
      success: true,
      versions,
      auditLogs: auditLogs.logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve prescription history.',
    });
  }
};

module.exports = {
  getPrescriptions,
  createPrescription,
  getPrescriptionById,
  updatePrescription,
  discontinuePrescription,
  getPrescriptionHistory,
};
