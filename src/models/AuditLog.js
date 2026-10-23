const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updating
  }
);

AuditLogSchema.index({ patient: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
