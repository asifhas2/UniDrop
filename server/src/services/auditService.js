import { AuditLog } from '../models/AuditLog.js';
import { hashIp } from '../utils/cryptoUtils.js';
import { logger } from '../utils/logger.js';

export const recordAuditLog = async ({
  eventType,
  severity = 'info',
  actorId = 'system',
  ip = '',
  details = {},
}) => {
  try {
    const ipAddressHash = hashIp(ip);
    
    // Create audit record
    await AuditLog.create({
      eventType,
      severity,
      actorId,
      ipAddressHash,
      details,
      timestamp: new Date(),
    });

    logger.debug(`[AuditLog] Logged ${eventType} (${severity}) by ${actorId}`);
  } catch (err) {
    // Non-blocking logger to ensure audit logging errors do not crash main requests
    logger.error('[AuditLog] Failed to record audit log:', { error: err.message, eventType });
  }
};
