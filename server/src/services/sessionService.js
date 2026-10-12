import { Session } from '../models/Session.js';
import { LabComputer } from '../models/LabComputer.js';
import { Transfer } from '../models/Transfer.js';
import { config } from '../config/environment.js';
import { safeUnlink } from '../utils/fileUtils.js';
import {
  generateSessionId,
  generatePairingToken,
  hashToken,
  generatePin,
  hashPin,
} from '../utils/cryptoUtils.js';
import { getLocalNetworkIp } from '../utils/networkUtils.js';
import { recordAuditLog } from './auditService.js';
import { logger } from '../utils/logger.js';

export const createSession = async ({ labComputerId, hostDeviceId, mode = 'direct', allowMemberUpload = false, ip }) => {
  const sessionId = generateSessionId();
  const pairingToken = generatePairingToken();
  const pairingTokenHash = hashToken(pairingToken);
  const pinCode = generatePin();
  const pinCodeHash = hashPin(pinCode);

  const expiresAt = new Date(Date.now() + config.sessionTtlMinutes * 60 * 1000);

  // If a lab computer is specified, verify its existence and status
  let verifiedLabId = null;
  if (labComputerId) {
    const labComp = await LabComputer.findOne({ computerId: labComputerId.toUpperCase() });
    if (labComp) {
      if (!labComp.isEnabled) {
        const error = new Error(`Lab Workstation ${labComputerId} is currently disabled by administrator policy.`);
        error.statusCode = 403;
        throw error;
      }
      verifiedLabId = labComp.computerId;
      labComp.status = 'busy';
      labComp.currentSessionId = sessionId;
      labComp.lastHeartbeat = new Date();
      await labComp.save();
    }
  }

  const session = await Session.create({
    sessionId,
    pairingTokenHash,
    pinCodeHash,
    hostDeviceId,
    labComputerId: verifiedLabId,
    mode: mode === 'group' ? 'group' : 'direct',
    allowMemberUpload: mode === 'group' ? Boolean(allowMemberUpload) : false,
    status: 'pending',
    maxFileSize: config.maxFileSize,
    expiresAt,
    lastActivityAt: new Date(),
  });

  await recordAuditLog({
    eventType: 'SESSION_CREATED',
    severity: 'info',
    actorId: hostDeviceId,
    ip,
    details: { sessionId, labComputerId: verifiedLabId, mode: session.mode, allowMemberUpload: session.allowMemberUpload, expiresAt },
  });

  logger.info(`[SessionService] Session created: ${sessionId} (Mode: ${session.mode}, Host: ${hostDeviceId}, Lab: ${verifiedLabId || 'none'})`);

  return {
    sessionId: session.sessionId,
    mode: session.mode,
    allowMemberUpload: session.allowMemberUpload,
    qrToken: pairingToken, // Raw token sent once to host for QR code encoding
    pinCode,              // Raw PIN sent once to host for visual display
    expiresAt: session.expiresAt,
    maxFileSize: session.maxFileSize,
    labComputerId: verifiedLabId,
    networkIp: getLocalNetworkIp(),
  };
};

export const joinSession = async ({ sessionId, qrToken, pinCode, peerDeviceId, ip }) => {
  let session = null;
  if (sessionId) {
    session = await Session.findOne({ sessionId });
  } else if (qrToken) {
    session = await Session.findOne({ pairingTokenHash: hashToken(qrToken) });
  } else if (pinCode) {
    session = await Session.findOne({ pinCodeHash: hashPin(pinCode) });
  }

  if (!session) {
    await recordAuditLog({
      eventType: 'PAIRING_FAILED',
      severity: 'warning',
      actorId: peerDeviceId,
      ip,
      details: { reason: 'SESSION_NOT_FOUND', providedPin: !!pinCode, providedQr: !!qrToken },
    });
    const error = new Error('Invalid or expired pairing credentials.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Check if session is already expired or terminated
  if (!session.isValid()) {
    const error = new Error('This transfer session has expired.');
    error.statusCode = 410;
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  // Brute force defense: check failed PIN attempts
  if (session.pinAttempts >= 5) {
    session.status = 'terminated';
    await session.save();

    await recordAuditLog({
      eventType: 'SECURITY_VIOLATION',
      severity: 'critical',
      actorId: peerDeviceId,
      ip,
      details: { sessionId: session.sessionId, reason: 'EXCEEDED_MAX_PIN_ATTEMPTS' },
    });

    const error = new Error('Session locked due to excessive failed pairing attempts.');
    error.statusCode = 403;
    error.code = 'SESSION_LOCKED';
    throw error;
  }

  // Verify pairing credentials
  let isAuthorized = false;
  if (qrToken && hashToken(qrToken) === session.pairingTokenHash) {
    isAuthorized = true;
  } else if (pinCode && hashPin(pinCode) === session.pinCodeHash) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    session.pinAttempts += 1;
    await session.save();

    await recordAuditLog({
      eventType: 'PAIRING_FAILED',
      severity: 'warning',
      actorId: peerDeviceId,
      ip,
      details: { sessionId: session.sessionId, attemptCount: session.pinAttempts },
    });

    const error = new Error('Pairing verification failed. Invalid PIN code or QR token.');
    error.statusCode = 401;
    error.code = 'PAIRING_FAILED';
    throw error;
  }

  // Enforce device count limit based on session mode:
  // In 'direct' (1-to-1): max 1 peer allowed
  // In 'group' (Group Work): multiple peers can connect!
  if (!session.connectedDeviceIds.includes(peerDeviceId)) {
    if (session.mode === 'direct' && session.connectedDeviceIds.length >= 1) {
      const error = new Error('This 1-to-1 session has already reached maximum connected peers.');
      error.statusCode = 409;
      error.code = 'SESSION_FULL';
      throw error;
    }
    session.connectedDeviceIds.push(peerDeviceId);
  }

  session.status = 'paired';
  session.lastActivityAt = new Date();
  await session.save();

  await recordAuditLog({
    eventType: 'PAIRING_SUCCESS',
    severity: 'info',
    actorId: peerDeviceId,
    ip,
    details: { sessionId: session.sessionId, hostDeviceId: session.hostDeviceId, mode: session.mode },
  });

  logger.info(`[SessionService] Peer joined session: ${session.sessionId} (Peer: ${peerDeviceId}, Mode: ${session.mode}, Total members: ${session.connectedDeviceIds.length})`);

  return {
    sessionId: session.sessionId,
    hostDeviceId: session.hostDeviceId,
    connectedDeviceIds: session.connectedDeviceIds,
    status: session.status,
    mode: session.mode,
    allowMemberUpload: session.allowMemberUpload,
    memberCount: session.connectedDeviceIds.length,
    expiresAt: session.expiresAt,
    maxFileSize: session.maxFileSize,
    labComputerId: session.labComputerId,
  };
};

export const updateSessionPermissions = async ({ sessionId, hostDeviceId, allowMemberUpload }) => {
  const session = await Session.findOne({ sessionId });
  if (!session || !session.isValid()) {
    const error = new Error('Active session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (session.hostDeviceId !== hostDeviceId) {
    const error = new Error('Only the session creator (host) can modify upload permissions.');
    error.statusCode = 403;
    throw error;
  }

  session.allowMemberUpload = Boolean(allowMemberUpload);
  session.lastActivityAt = new Date();
  await session.save();

  logger.info(`[SessionService] Updated permissions for session ${sessionId}: allowMemberUpload=${session.allowMemberUpload}`);

  return {
    sessionId: session.sessionId,
    mode: session.mode,
    allowMemberUpload: session.allowMemberUpload,
  };
};

export const getSessionById = async (sessionId) => {
  const session = await Session.findOne({ sessionId });
  if (!session) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!session.isValid()) {
    const error = new Error('Session has expired.');
    error.statusCode = 410;
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  return {
    sessionId: session.sessionId,
    status: session.status,
    hostDeviceId: session.hostDeviceId,
    connectedDeviceIds: session.connectedDeviceIds,
    mode: session.mode,
    allowMemberUpload: session.allowMemberUpload,
    memberCount: session.connectedDeviceIds.length,
    labComputerId: session.labComputerId,
    maxFileSize: session.maxFileSize,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt,
  };
};

export const disconnectSession = async ({ sessionId, deviceId, ip }) => {
  const session = await Session.findOne({ sessionId });
  if (!session) return null;

  session.status = 'terminated';
  await session.save();

  // Reset lab computer status if assigned
  if (session.labComputerId) {
    await LabComputer.updateOne(
      { computerId: session.labComputerId },
      { status: 'available', currentSessionId: null, lastHeartbeat: new Date() }
    );
  }

  // Cleanup any lingering temp relay files for this session
  try {
    const activeTransfers = await Transfer.find({ sessionId, tempFilePath: { $ne: null } });
    for (const t of activeTransfers) {
      if (t.tempFilePath) {
        await safeUnlink(t.tempFilePath);
        t.tempFilePath = null;
        await t.save();
      }
    }
  } catch (cleanErr) {
    logger.warn(`[SessionService] Error cleaning up relay files on disconnect: ${cleanErr.message}`);
  }

  await recordAuditLog({
    eventType: 'SESSION_DISCONNECTED',
    severity: 'info',
    actorId: deviceId,
    ip,
    details: { sessionId },
  });

  logger.info(`[SessionService] Session terminated: ${sessionId} by ${deviceId}`);
  return session;
};
