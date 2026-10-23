const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const PatientAccess = require('../models/PatientAccess');
const { recordAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

/**
 * Get current patient profile (only for patient role)
 */
const getMyProfile = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ user: req.user._id });
    return res.status(200).json({
      success: true,
      user: req.user.toSafeObject(),
      profile: profile || {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile.',
    });
  }
};

/**
 * Update current patient profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const {
      allergies,
      medicalNotes,
      emergencyContact,
      address,
      dateOfBirth,
      gender,
      bloodType,
      notifyDoseReminders,
      notifyMissedDoses,
    } = req.body;

    const profile = await PatientProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Patient profile not found.' });
    }

    const beforeState = profile.toObject();

    if (Array.isArray(allergies)) profile.allergies = allergies;
    if (medicalNotes !== undefined) profile.medicalNotes = medicalNotes;
    if (emergencyContact) profile.emergencyContact = { ...profile.emergencyContact, ...emergencyContact };
    if (address !== undefined) profile.address = address;
    if (dateOfBirth) profile.dateOfBirth = new Date(dateOfBirth);
    if (gender) profile.gender = gender;
    if (bloodType) profile.bloodType = bloodType;
    if (notifyDoseReminders !== undefined) profile.notifyDoseReminders = notifyDoseReminders;
    if (notifyMissedDoses !== undefined) profile.notifyMissedDoses = notifyMissedDoses;

    await profile.save();

    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: req.user._id,
      action: 'profile_updated',
      description: 'Patient updated their personal health profile and preferences.',
      beforeState,
      afterState: profile.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile.',
    });
  }
};

/**
 * Get authorized patient details (for authorized doctor or caregiver)
 */
const getPatientById = async (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = await User.findById(patientId).select('-password');
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({
        success: false,
        error: 'Patient record not found.',
      });
    }

    const profile = await PatientProfile.findOne({ user: patientId });

    return res.status(200).json({
      success: true,
      patient,
      profile: profile || {},
      access: req.patientAccess || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient.',
    });
  }
};

/**
 * List patients authorized to current doctor or caregiver
 */
const getAuthorizedPatients = async (req, res) => {
  try {
    const accesses = await PatientAccess.find({
      authorizedUser: req.user._id,
      status: 'active',
    }).populate('patient', 'name email phone timezone createdAt');

    const patientList = accesses.map((acc) => ({
      accessId: acc._id,
      patient: acc.patient,
      relationshipLabel: acc.relationshipLabel,
      permissions: acc.permissions,
      grantedAt: acc.grantedAt,
    }));

    return res.status(200).json({
      success: true,
      patients: patientList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve authorized patients.',
    });
  }
};

/**
 * Get access list for a patient (doctors and caregivers who have access)
 */
const getPatientAccessList = async (req, res) => {
  try {
    const patientId = req.params.id;
    // Only the patient themselves can view their full access list
    if (req.user._id.toString() !== patientId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the patient can view and manage their authorization directory.',
      });
    }

    const accesses = await PatientAccess.find({ patient: patientId })
      .populate('authorizedUser', 'name email role phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      accesses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve access authorizations.',
    });
  }
};

/**
 * Patient grants authorization to a doctor or caregiver by email
 */
const grantPatientAccess = async (req, res) => {
  try {
    const patientId = req.params.id;
    if (req.user._id.toString() !== patientId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the patient can grant access to their medical records.',
      });
    }

    const { email, relationshipLabel, canRecordDoses, canPrescribe } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'User email is required.' });
    }

    const authorizedUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!authorizedUser) {
      return res.status(404).json({
        success: false,
        error: `No registered user found with email '${email}'. Please ask them to register first.`,
      });
    }

    if (authorizedUser.role !== 'doctor' && authorizedUser.role !== 'caregiver') {
      return res.status(400).json({
        success: false,
        error: 'Access can only be granted to registered Doctors or Caregivers.',
      });
    }

    const permissions = {
      canViewMedications: true,
      canRecordDoses: authorizedUser.role === 'caregiver' ? !!canRecordDoses : false,
      canPrescribe: authorizedUser.role === 'doctor' ? true : false,
    };

    let access = await PatientAccess.findOne({
      patient: patientId,
      authorizedUser: authorizedUser._id,
    });

    if (access) {
      access.status = 'active';
      access.relationshipLabel = relationshipLabel || access.relationshipLabel;
      access.permissions = permissions;
      access.revokedAt = null;
      access.grantedAt = new Date();
      await access.save();
    } else {
      access = await PatientAccess.create({
        patient: patientId,
        authorizedUser: authorizedUser._id,
        role: authorizedUser.role,
        relationshipLabel: relationshipLabel || (authorizedUser.role === 'doctor' ? 'Attending Physician' : 'Caregiver'),
        permissions,
        status: 'active',
      });
    }

    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: patientId,
      action: 'access_granted',
      targetRecordId: access._id,
      targetModel: 'PatientAccess',
      description: `Patient granted record access to ${authorizedUser.name} (${authorizedUser.role})`,
    });

    await createNotification({
      recipient: authorizedUser._id,
      relatedPatient: patientId,
      type: 'access_granted',
      title: 'New Patient Access Granted',
      message: `${req.user.name} has granted you access to their MediSync medication records.`,
      actionLink: authorizedUser.role === 'doctor' ? '/doctor-dashboard.html' : '/caregiver-dashboard.html',
    });

    return res.status(201).json({
      success: true,
      message: `Access granted successfully to ${authorizedUser.name}.`,
      access,
    });
  } catch (error) {
    console.error('[Grant Access Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to grant access.',
    });
  }
};

/**
 * Revoke or modify an authorization
 */
const updatePatientAccess = async (req, res) => {
  try {
    const { id: patientId, accessId } = req.params;
    if (req.user._id.toString() !== patientId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the patient can modify authorization access.',
      });
    }

    const { status, canRecordDoses, relationshipLabel } = req.body;
    const access = await PatientAccess.findOne({ _id: accessId, patient: patientId });
    if (!access) {
      return res.status(404).json({ success: false, error: 'Access record not found.' });
    }

    if (status === 'revoked') {
      access.status = 'revoked';
      access.revokedAt = new Date();
    } else if (status === 'active') {
      access.status = 'active';
      access.revokedAt = null;
    }

    if (relationshipLabel) access.relationshipLabel = relationshipLabel;
    if (canRecordDoses !== undefined && access.role === 'caregiver') {
      access.permissions.canRecordDoses = !!canRecordDoses;
    }

    await access.save();

    await recordAudit({
      actor: req.user,
      actorRole: req.user.role,
      patient: patientId,
      action: status === 'revoked' ? 'access_revoked' : 'access_updated',
      targetRecordId: access._id,
      targetModel: 'PatientAccess',
      description: `Patient ${status === 'revoked' ? 'revoked' : 'updated'} access for authorization #${access._id}`,
    });

    return res.status(200).json({
      success: true,
      message: `Authorization updated to ${access.status}.`,
      access,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update access.',
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPatientById,
  getAuthorizedPatients,
  getPatientAccessList,
  grantPatientAccess,
  updatePatientAccess,
};
