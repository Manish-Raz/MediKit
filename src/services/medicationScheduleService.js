const ScheduledDose = require('../models/ScheduledDose');

/**
 * Generates ScheduledDose records for a given prescription between startDate and endDate (or up to horizon days for long prescriptions).
 * @param {Object} prescription - The prescription document
 * @param {number} [horizonDays=14] - Horizon for initial batch scheduling to keep performance fast
 */
const generateDosesForPrescription = async (prescription, horizonDays = 14) => {
  if (prescription.status !== 'active') {
    return { createdCount: 0, message: 'Prescription is not active' };
  }

  const startDate = new Date(prescription.startDate);
  const endDate = new Date(prescription.endDate);

  const now = new Date();
  // Start scheduling from max(startDate, today at 00:00:00)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const effectiveStart = startDate > todayStart ? new Date(startDate.getTime()) : new Date(todayStart.getTime());

  // Limit scheduling horizon up to min(endDate, effectiveStart + horizonDays)
  const maxHorizon = new Date(effectiveStart.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const effectiveEnd = endDate < maxHorizon ? new Date(endDate.getTime()) : maxHorizon;

  const times = prescription.scheduledTimes || ['08:00'];
  let createdCount = 0;

  const cursor = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), effectiveStart.getDate());
  const finalDay = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate());

  while (cursor <= finalDay) {
    for (const timeStr of times) {
      const [hours, minutes] = timeStr.split(':').map((n) => parseInt(n, 10));
      const scheduledDateTime = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        hours || 8,
        minutes || 0,
        0,
        0
      );

      // Check if within exact prescription bounds
      if (scheduledDateTime >= startDate && scheduledDateTime <= endDate) {
        try {
          await ScheduledDose.updateOne(
            {
              patient: prescription.patient,
              prescription: prescription._id,
              scheduledTime: scheduledDateTime,
            },
            {
              $setOnInsert: {
                patient: prescription.patient,
                prescription: prescription._id,
                scheduledTime: scheduledDateTime,
                doseTimeSlot: timeStr,
                medicationName: prescription.medicationName,
                strength: prescription.strength,
                dosageInstructions: prescription.dosageInstructions,
                status: scheduledDateTime < now ? 'upcoming' : 'upcoming',
              },
            },
            { upsert: true }
          );
          createdCount++;
        } catch (err) {
          // Ignore duplicate key error in case of concurrent write
          if (err.code !== 11000) {
            console.error('[Schedule Error]', err);
          }
        }
      }
    }
    // Advance to next day
    cursor.setDate(cursor.getDate() + 1);
  }

  return { createdCount };
};

/**
 * Remove future upcoming doses when a prescription is discontinued or replaced
 */
const cleanupFutureDoses = async (prescriptionId) => {
  const now = new Date();
  const result = await ScheduledDose.deleteMany({
    prescription: prescriptionId,
    scheduledTime: { $gt: now },
    status: 'upcoming',
  });
  return result;
};

module.exports = {
  generateDosesForPrescription,
  cleanupFutureDoses,
};
