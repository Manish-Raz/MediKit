const Prescription = require('../models/Prescription');
const ScheduledDose = require('../models/ScheduledDose');
const PatientAccess = require('../models/PatientAccess');
const PharmacyInventory = require('../models/PharmacyInventory');
const Notification = require('../models/Notification');
const { calculatePatientAdherence } = require('../services/adherenceService');
const { checkPatientProfileInteractions } = require('../services/interactionService');

/**
 * Get unified dashboard summary tailored to user's role
 */
const getDashboardSummary = async (req, res) => {
  try {
    const user = req.user;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const unreadNotificationsCount = await Notification.countDocuments({
      recipient: user._id,
      isRead: false,
    });

    if (user.role === 'patient') {
      const [todayDoses, activePrescriptions, adherence, interactions] = await Promise.all([
        ScheduledDose.find({
          patient: user._id,
          scheduledTime: { $gte: todayStart, $lte: todayEnd },
        }).sort({ scheduledTime: 1 }),
        Prescription.find({ patient: user._id, status: 'active' }).populate('doctor', 'name email'),
        calculatePatientAdherence(user._id, 30),
        checkPatientProfileInteractions(user._id),
      ]);

      const now = new Date();
      const nextDose = todayDoses.find((d) => d.status === 'upcoming' && d.scheduledTime >= now) ||
        todayDoses.find((d) => d.status === 'upcoming') ||
        null;

      const dosesSummary = {
        total: todayDoses.length,
        taken: todayDoses.filter((d) => d.status === 'taken').length,
        skipped: todayDoses.filter((d) => d.status === 'skipped').length,
        missed: todayDoses.filter((d) => d.status === 'missed').length,
        upcoming: todayDoses.filter((d) => d.status === 'upcoming').length,
      };

      return res.status(200).json({
        success: true,
        role: 'patient',
        summary: {
          dosesSummary,
          nextDose,
          activePrescriptionsCount: activePrescriptions.length,
          adherenceRate: adherence.adherenceRate,
          consecutiveMissedCount: adherence.consecutiveMissedCount,
          hasSevereAdherenceRisk: adherence.hasSevereAdherenceRisk,
          unreadNotificationsCount,
          interactionWarningsCount: interactions.totalWarningsCount,
          activePrescriptions,
        },
      });
    }

    if (user.role === 'doctor') {
      const authorizedAccesses = await PatientAccess.find({
        authorizedUser: user._id,
        status: 'active',
      }).populate('patient', 'name email phone');

      const patientIds = authorizedAccesses.map((a) => a.patient._id);

      const [myPrescriptionsCount, activePrescriptions] = await Promise.all([
        Prescription.countDocuments({ doctor: user._id }),
        Prescription.find({ doctor: user._id, status: 'active' }).populate('patient', 'name email'),
      ]);

      // Calculate adherence for authorized patients
      const patientAdherenceList = [];
      let atRiskCount = 0;

      for (const acc of authorizedAccesses) {
        const stats = await calculatePatientAdherence(acc.patient._id, 30);
        if (stats.hasSevereAdherenceRisk) {
          atRiskCount++;
        }
        patientAdherenceList.push({
          patient: acc.patient,
          adherenceRate: stats.adherenceRate,
          missed: stats.missed,
          hasSevereRisk: stats.hasSevereAdherenceRisk,
        });
      }

      return res.status(200).json({
        success: true,
        role: 'doctor',
        summary: {
          totalPatients: authorizedAccesses.length,
          activePrescriptionsCount: myPrescriptionsCount,
          atRiskPatientsCount: atRiskCount,
          unreadNotificationsCount,
          patients: patientAdherenceList,
          recentPrescriptions: activePrescriptions.slice(0, 10),
        },
      });
    }

    if (user.role === 'caregiver') {
      const authorizedAccesses = await PatientAccess.find({
        authorizedUser: user._id,
        status: 'active',
      }).populate('patient', 'name email phone');

      const patientsOverview = [];
      for (const acc of authorizedAccesses) {
        const [todayDoses, stats] = await Promise.all([
          ScheduledDose.find({
            patient: acc.patient._id,
            scheduledTime: { $gte: todayStart, $lte: todayEnd },
          }).sort({ scheduledTime: 1 }),
          calculatePatientAdherence(acc.patient._id, 30),
        ]);

        patientsOverview.push({
          patient: acc.patient,
          permissions: acc.permissions,
          todayDoses,
          adherence: stats,
        });
      }

      return res.status(200).json({
        success: true,
        role: 'caregiver',
        summary: {
          assignedPatientsCount: authorizedAccesses.length,
          unreadNotificationsCount,
          patients: patientsOverview,
        },
      });
    }

    if (user.role === 'pharmacy') {
      const inventory = await PharmacyInventory.find({ pharmacy: user._id });
      const inStock = inventory.filter((i) => i.availabilityStatus === 'in_stock').length;
      const lowStock = inventory.filter((i) => i.availabilityStatus === 'low_stock').length;
      const outOfStock = inventory.filter((i) => i.availabilityStatus === 'out_of_stock').length;

      return res.status(200).json({
        success: true,
        role: 'pharmacy',
        summary: {
          totalItems: inventory.length,
          inStock,
          lowStock,
          outOfStock,
          unreadNotificationsCount,
          recentInventory: inventory.slice(0, 10),
        },
      });
    }

    return res.status(200).json({
      success: true,
      role: user.role,
      summary: { unreadNotificationsCount },
    });
  } catch (error) {
    console.error('[Dashboard Summary Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard summary.',
    });
  }
};

module.exports = {
  getDashboardSummary,
};
