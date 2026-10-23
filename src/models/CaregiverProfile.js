const mongoose = require('mongoose');

const CaregiverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    relationship: {
      type: String,
      default: 'Family Member',
      trim: true,
    },
    phone: {
      type: String,
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

module.exports = mongoose.model('CaregiverProfile', CaregiverProfileSchema);
