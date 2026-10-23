const mongoose = require('mongoose');

const ScheduledDoseSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      required: true,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    doseTimeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    medicationName: {
      type: String,
      required: true,
      trim: true,
    },
    strength: {
      type: String,
      default: '',
    },
    dosageInstructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['upcoming', 'taken', 'skipped', 'missed'],
      default: 'upcoming',
      index: true,
    },
    actualActionTime: {
      type: Date,
      default: null,
    },
    skipReason: {
      type: String,
      default: '',
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recordedByRole: {
      type: String,
      enum: ['patient', 'caregiver', 'doctor', 'system', ''],
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Idempotency constraint: exactly one dose record per patient + prescription + exact scheduledTime
ScheduledDoseSchema.index({ patient: 1, prescription: 1, scheduledTime: 1 }, { unique: true });
ScheduledDoseSchema.index({ patient: 1, scheduledTime: 1, status: 1 });

module.exports = mongoose.model('ScheduledDose', ScheduledDoseSchema);
