import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    actorId: {
      type: String,
      default: 'system',
    },
    ipAddressHash: {
      type: String,
      default: 'unknown',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically prune audit logs older than 30 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
