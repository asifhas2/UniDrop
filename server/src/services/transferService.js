import fs from 'fs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Transfer } from '../models/Transfer.js';
import { Session } from '../models/Session.js';
import { config } from '../config/environment.js';
import { safeUnlink } from '../utils/fileUtils.js';
import { recordAuditLog } from './auditService.js';
import { logger } from '../utils/logger.js';

export const initTransfer = async ({
  sessionId,
  fileName,
  fileSize,
  mimeType,
  senderDeviceId,
  receiverDeviceId,
  transferMode = 'webrtc_p2p',
  tempFilePath = null,
  ip = '',
}) => {
  const session = await Session.findOne({ sessionId });
  if (!session || !session.isValid()) {
    const error = new Error('Transfer cannot be initiated for an invalid or expired session.');
    error.statusCode = 400;
    throw error;
  }

  if (fileSize > session.maxFileSize) {
    const error = new Error(`File size (${Math.round(fileSize / (1024 * 1024))}MB) exceeds maximum limit (${Math.round(session.maxFileSize / (1024 * 1024))}MB).`);
    error.statusCode = 413;
    throw error;
  }

  const transferId = uuidv4();
  const expiresAt = new Date(Date.now() + config.tempFileTtlMinutes * 60 * 1000);

  const transfer = await Transfer.create({
    transferId,
    sessionId,
    fileName,
    fileSize,
    mimeType: mimeType || 'application/octet-stream',
    senderDeviceId,
    receiverDeviceId,
    transferMode,
    tempFilePath,
    status: tempFilePath ? 'completed' : 'initialized',
    progressPercent: tempFilePath ? 100 : 0,
    expiresAt,
    completedAt: tempFilePath ? new Date() : null,
  });

  await recordAuditLog({
    eventType: 'TRANSFER_STARTED',
    severity: 'info',
    actorId: senderDeviceId,
    ip,
    details: { transferId, sessionId, fileName, fileSize, transferMode },
  });

  logger.info(`[TransferService] Transfer ${transferId} initiated (${transferMode}: ${fileName}, ${fileSize} bytes)`);

  return transfer;
};

export const updateTransferProgress = async ({ transferId, status, progressPercent, speedBps, errorReason }) => {
  const updateData = {};
  if (status) updateData.status = status;
  if (typeof progressPercent === 'number') updateData.progressPercent = progressPercent;
  if (typeof speedBps === 'number') updateData.speedBps = speedBps;
  if (errorReason) updateData.errorReason = errorReason;
  if (status === 'completed') updateData.completedAt = new Date();

  const transfer = await Transfer.findOneAndUpdate(
    { transferId },
    { $set: updateData },
    { new: true }
  );

  return transfer;
};

export const getTransferById = async (transferId) => {
  return Transfer.findOne({ transferId });
};

export const handleRelayDownload = async ({ transferId, res, ip }) => {
  const transfer = await Transfer.findOne({ transferId });
  if (!transfer) {
    const error = new Error('Transfer not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!transfer.tempFilePath || !fs.existsSync(transfer.tempFilePath)) {
    const error = new Error('The requested relay file has already been consumed or has expired.');
    error.statusCode = 410;
    throw error;
  }

  // Set appropriate download headers
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(transfer.fileName)}"`);
  res.setHeader('Content-Type', transfer.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', transfer.fileSize);

  const fileStream = fs.createReadStream(transfer.tempFilePath);

  fileStream.pipe(res);

  // Shred and unlink file once download is finished to ensure zero lingering data on server
  fileStream.on('end', async () => {
    try {
      logger.info(`[TransferService] Relay download finished for transfer ${transferId}. Unlinking ephemeral file...`);
      await safeUnlink(transfer.tempFilePath);
      transfer.tempFilePath = null;
      
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await transfer.save();
        await recordAuditLog({
          eventType: 'TRANSFER_COMPLETED',
          severity: 'info',
          actorId: transfer.receiverDeviceId || 'client',
          ip,
          details: { transferId, fileName: transfer.fileName, fileSize: transfer.fileSize },
        });
      }
    } catch (err) {
      logger.error(`[TransferService] Post-download cleanup error:`, { error: err.message, transferId });
    }
  });

  fileStream.on('error', (err) => {
    logger.error(`[TransferService] Stream error during relay download:`, { error: err.message, transferId });
  });
};
