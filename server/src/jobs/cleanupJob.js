import fs from 'fs/promises';
import path from 'path';
import { Session } from '../models/Session.js';
import { Transfer } from '../models/Transfer.js';
import { config } from '../config/environment.js';
import { safeUnlink } from '../utils/fileUtils.js';
import { logger } from '../utils/logger.js';

export const runCleanupJob = async () => {
  try {
    const now = new Date();

    // 1. Mark expired sessions
    const expiredSessionsResult = await Session.updateMany(
      {
        status: { $in: ['pending', 'paired', 'active'] },
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (expiredSessionsResult.modifiedCount > 0) {
      logger.info(`[CleanupJob] Marked ${expiredSessionsResult.modifiedCount} expired session(s) as expired.`);
    }

    // 2. Reap stale temporary relay files on disk
    try {
      const files = await fs.readdir(config.tempUploadDir);
      const ttlMs = config.tempFileTtlMinutes * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(config.tempUploadDir, file);
        try {
          const stats = await fs.stat(filePath);
          const ageMs = Date.now() - stats.mtimeMs;

          if (ageMs > ttlMs) {
            await safeUnlink(filePath);
            logger.info(`[CleanupJob] Reaped stale ephemeral relay file: ${file}`);
          }
        } catch {
          // File may have been removed concurrently
        }
      }
    } catch (fsErr) {
      if (fsErr.code !== 'ENOENT') {
        logger.error('[CleanupJob] Error scanning temp upload directory:', { error: fsErr.message });
      }
    }

    // 3. Update expired transfers
    await Transfer.updateMany(
      {
        status: { $in: ['initialized', 'transferring'] },
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'failed', errorReason: 'Transfer timed out or session expired.' },
      }
    );
  } catch (err) {
    logger.error('[CleanupJob] Cleanup execution encountered an error:', { error: err.message });
  }
};

export const startCleanupScheduler = (intervalMs = 2 * 60 * 1000) => {
  logger.info(`[CleanupJob] Scheduled automated cleanup reaper (every ${Math.round(intervalMs / 1000)}s).`);
  // Run once immediately on startup
  runCleanupJob();
  return setInterval(runCleanupJob, intervalMs);
};
