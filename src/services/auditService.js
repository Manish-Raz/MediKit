const AuditLog = require('../models/AuditLog');

/**
 * Record an audit log entry for significant clinical or access actions.
 */
const recordAudit = async ({
  actor,
  actorRole,
  patient = null,
  action,
  targetRecordId = null,
  targetModel = '',
  description,
  beforeState = null,
  afterState = null,
  metadata = {},
}) => {
  try {
    // Sanitize state to prevent sensitive leaks
    const sanitize = (data) => {
      if (!data) return null;
      const copy = JSON.parse(JSON.stringify(data));
      if (copy.password) delete copy.password;
      return copy;
    };

    const entry = await AuditLog.create({
      actor: actor._id || actor,
      actorRole: actorRole || (actor && actor.role) || 'system',
      patient: patient ? patient._id || patient : null,
      action,
      targetRecordId,
      targetModel,
      description,
      beforeState: sanitize(beforeState),
      afterState: sanitize(afterState),
      metadata,
    });
    return entry;
  } catch (err) {
    console.error('[Audit Log Error]', err);
    // Audit logging should not crash the main transaction, but log error
    return null;
  }
};

/**
 * Retrieve audit history for a patient or record
 */
const getAuditHistory = async ({ patientId, targetRecordId, limit = 50, skip = 0 }) => {
  const query = {};
  if (patientId) query.patient = patientId;
  if (targetRecordId) query.targetRecordId = targetRecordId;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email role')
      .populate('patient', 'name email'),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total };
};

module.exports = {
  recordAudit,
  getAuditHistory,
};
