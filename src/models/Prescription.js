const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    activeIngredient: {
      type: String,
      required: [true, 'Active ingredient is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    strength: {
      type: String,
      required: [true, 'Strength is required'],
      trim: true,
    },
    dosageInstructions: {
      type: String,
      required: [true, 'Dosage instructions are required'],
      trim: true,
    },
    route: {
      type: String,
      default: 'Oral',
      trim: true,
    },
    frequency: {
      type: String,
      required: true,
      enum: ['once_daily', 'twice_daily', 'three_times_daily', 'every_6_hours', 'custom'],
      default: 'once_daily',
    },
    scheduledTimes: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one scheduled dose time (HH:mm) is required',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    specialInstructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'modified', 'discontinued', 'completed'],
      default: 'active',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    rootPrescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
      index: true,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    modificationReason: {
      type: String,
      default: '',
    },
    discontinuationReason: {
      type: String,
      default: '',
    },
    discontinuedAt: {
      type: Date,
      default: null,
    },
    discontinuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PrescriptionSchema.index({ patient: 1, status: 1 });
PrescriptionSchema.index({ doctor: 1, status: 1 });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
