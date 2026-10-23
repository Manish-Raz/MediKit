const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
      default: 'General Practice',
    },
    licenseNumber: {
      type: String,
      required: [true, 'License identifier is required'],
      trim: true,
    },
    clinicHospital: {
      type: String,
      trim: true,
      default: 'MediSync Health Center',
    },
    verifiedStatus: {
      type: Boolean,
      default: false, // Default false for public registrations, true for verified demo accounts
    },
    bio: {
      type: String,
      default: '',
    },
    officePhone: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);
