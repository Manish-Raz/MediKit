const ScheduledDose = require('../models/ScheduledDose');
const PatientAccess = require('../models/PatientAccess');
const Notification = require('../models/Notification');

/**
 * Marks overdue doses as 'missed' if scheduledTime has passed by graceMinutes (default 60 mins)
 * and generates adherence notifications for the patient, authorized doctors, and caregivers.
 */
const processOverdueDoses = async (graceMinutes = 60) => {
  const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

  // Find all doses still marked 'upcoming' where scheduledTime is earlier than cutoff
  const overdueDoses = await ScheduledDose.find({
    status: 'upcoming',
    scheduledTime: { $lt: cutoff },
  }).populate('patient');

  let updatedCount = 0;
  const missedByPatient = {};

  for (const dose of overdueDoses) {
    dose.status = 'missed';
    dose.actualActionTime = new Date();
    dose.recordedByRole = 'system';
    dose.notes = 'Automatically marked as missed after scheduled window expired.';
    await dose.save();
    updatedCount++;

    const pId = dose.patient._id ? dose.patient._id.toString() : dose.patient.toString();
    if (!missedByPatient[pId]) {
      missedByPatient[pId] = [];
    }
    missedByPatient[pId].push(dose);
  }

  // Generate alerts for patients who have missed doses
  for (const [patientId, doses] of Object.entries(missedByPatient)) {
    const patientName = doses[0].patient.name || 'Patient';
    const medNames = [...new Set(doses.map((d) => d.medicationName))].join(', ');

    // 1. Notify the patient
    const patientDedupKey = `missed_${patientId}_${new Date().toISOString().slice(0, 10)}`;
    try {
      await Notification.create({
        recipient: patientId,
        relatedPatient: patientId,
        type: 'dose_missed',
        title: 'Missed Medication Dose Alert',
        message: `You missed scheduled dose(s) for ${medNames}. Please consult your medication schedule.`,
        priority: 'high',
        deduplicationKey: patientDedupKey,
        actionLink: '/patient-dashboard.html',
      });
    } catch (e) {
      // Ignore duplicate notification key error
    }

    // 2. If 2 or more doses missed, alert authorized doctors & caregivers
    if (doses.length >= 2) {
      const activeAccessList = await PatientAccess.find({
        patient: patientId,
        status: 'active',
      });

      for (const access of activeAccessList) {
        const authDedupKey = `alert_${access.authorizedUser}_${patientId}_${new Date().toISOString().slice(0, 10)}`;
        try {
          await Notification.create({
            recipient: access.authorizedUser,
            relatedPatient: patientId,
            type: 'adherence_alert',
            title: `Adherence Alert: ${patientName}`,
            message: `${patientName} has missed ${doses.length} scheduled dose(s) of ${medNames} today.`,
            priority: 'urgent',
            deduplicationKey: authDedupKey,
            actionLink: access.role === 'doctor' ? '/doctor-dashboard.html' : '/caregiver-dashboard.html',
          });
        } catch (e) {
          // Ignore duplicate key error
        }
      }
    }
  }

  return { processedCount: updatedCount };
};

/**
 * Calculates adherence statistics for a patient over a specified timeframe
 * @param {string} patientId
 * @param {number} [days=30]
 */
const calculatePatientAdherence = async (patientId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const now = new Date();

  // Find all scheduled doses within window up to now
  const doses = await ScheduledDose.find({
    patient: patientId,
    scheduledTime: { $gte: startDate, $lte: now },
  }).sort({ scheduledTime: 1 });

  const summary = {
    totalScheduled: doses.length,
    taken: 0,
    skipped: 0,
    missed: 0,
    upcoming: 0,
    adherenceRate: 100,
    consecutiveMissedCount: 0,
    hasSevereAdherenceRisk: false,
    periodDays: days,
  };

  let currentConsecutiveMissed = 0;
  let maxConsecutiveMissed = 0;

  for (const dose of doses) {
    if (dose.status === 'taken') {
      summary.taken++;
      currentConsecutiveMissed = 0;
    } else if (dose.status === 'skipped') {
      summary.skipped++;
      currentConsecutiveMissed = 0;
    } else if (dose.status === 'missed') {
      summary.missed++;
      currentConsecutiveMissed++;
      if (currentConsecutiveMissed > maxConsecutiveMissed) {
        maxConsecutiveMissed = currentConsecutiveMissed;
      }
    } else if (dose.status === 'upcoming') {
      summary.upcoming++;
    }
  }

  summary.consecutiveMissedCount = currentConsecutiveMissed;

  // Evaluated doses = taken + skipped + missed
  const evaluatedCount = summary.taken + summary.skipped + summary.missed;
  if (evaluatedCount > 0) {
    summary.adherenceRate = Math.round((summary.taken / evaluatedCount) * 100);
  } else {
    summary.adherenceRate = 100; // No overdue/logged doses yet
  }

  if (summary.adherenceRate < 70 || maxConsecutiveMissed >= 3) {
    summary.hasSevereAdherenceRisk = true;
  }

  return summary;
};

module.exports = {
  processOverdueDoses,
  calculatePatientAdherence,
};
