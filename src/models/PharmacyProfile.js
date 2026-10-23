const mongoose = require('mongoose');

const PharmacyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    pharmacyName: {
      type: String,
      required: [true, 'Pharmacy name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Pharmacy license is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      default: 'Metropolis',
      trim: true,
    },
    postalCode: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    operatingHours: {
      type: String,
      default: '8:00 AM - 10:00 PM',
    },
    verifiedStatus: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PharmacyProfile', PharmacyProfileSchema);
