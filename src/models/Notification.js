const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    relatedPatient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'dose_reminder',
        'dose_missed',
        'adherence_alert',
        'prescription_new',
        'prescription_modified',
        'prescription_discontinued',
        'interaction_warning',
        'access_granted',
        'access_revoked',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deduplicationKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    actionLink: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
