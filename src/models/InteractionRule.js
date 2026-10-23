const mongoose = require('mongoose');

const InteractionRuleSchema = new mongoose.Schema(
  {
    primaryIngredient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    interactingIngredient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'contraindicated'],
      required: true,
      default: 'moderate',
    },
    warningTitle: {
      type: String,
      required: true,
      trim: true,
    },
    clinicalExplanation: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
      default: 'Consult with prescribing physician or pharmacist before co-administering.',
    },
    evidenceSource: {
      type: String,
      default: 'FDA Drug Safety Communication / National Library of Medicine (NLM)',
    },
    verificationDate: {
      type: Date,
      default: Date.now,
    },
    ruleVersion: {
      type: String,
      default: '1.0.0-demo',
    },
  },
  {
    timestamps: true,
  }
);

InteractionRuleSchema.index({ primaryIngredient: 1, interactingIngredient: 1 }, { unique: true });

module.exports = mongoose.model('InteractionRule', InteractionRuleSchema);
