const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: '',
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''],
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    medicalNotes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    address: {
      type: String,
      default: '',
    },
    notifyDoseReminders: {
      type: Boolean,
      default: true,
    },
    notifyMissedDoses: {
      type: Boolean,
      default: true,
    },
    notifyCaregiversOnMissed: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);
