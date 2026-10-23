const mongoose = require('mongoose');

const PharmacyInventorySchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicationCatalog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicationCatalog',
      default: null,
    },
    medicationName: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    activeIngredient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    strength: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      default: 'Tablet',
      trim: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    quantity: {
      type: Number,
      default: 100,
      min: 0,
    },
    price: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    prescriptionRequired: {
      type: Boolean,
      default: true,
    },
    isDemoStock: {
      type: Boolean,
      default: true, // Clearly marks demo inventory vs real verified stock
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

PharmacyInventorySchema.index({ pharmacy: 1, medicationName: 1, strength: 1 }, { unique: true });

module.exports = mongoose.model('PharmacyInventory', PharmacyInventorySchema);
