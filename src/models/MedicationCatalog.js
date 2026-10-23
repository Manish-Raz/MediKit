const mongoose = require('mongoose');

const MedicationCatalogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
      trim: true,
      lowercase: true,
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
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    commonIndications: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

MedicationCatalogSchema.index({ name: 'text', brandName: 'text', activeIngredient: 'text' });

module.exports = mongoose.model('MedicationCatalog', MedicationCatalogSchema);
