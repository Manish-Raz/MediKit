const mongoose = require('mongoose');

const PatientAccessSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorizedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['doctor', 'caregiver'],
      required: true,
    },
    relationshipLabel: {
      type: String,
      default: 'Care Team Member',
      trim: true,
    },
    permissions: {
      canViewMedications: {
        type: Boolean,
        default: true,
      },
      canRecordDoses: {
        type: Boolean,
        default: false,
      },
      canPrescribe: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'revoked'],
      default: 'active',
      index: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

PatientAccessSchema.index({ patient: 1, authorizedUser: 1 }, { unique: true });

module.exports = mongoose.model('PatientAccess', PatientAccessSchema);
