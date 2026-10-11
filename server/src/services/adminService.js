import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Admin } from '../models/Admin.js';
import { LabComputer } from '../models/LabComputer.js';
import { Session } from '../models/Session.js';
import { Transfer } from '../models/Transfer.js';
import { AuditLog } from '../models/AuditLog.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { config } from '../config/environment.js';
import { recordAuditLog } from './auditService.js';
import { logger } from '../utils/logger.js';

export const seedDefaultAdminAndSettings = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(config.defaultAdmin.password, salt);

      await Admin.create({
        username: config.defaultAdmin.username,
        email: config.defaultAdmin.email,
        passwordHash,
        role: 'superadmin',
        isActive: true,
      });

      logger.info(`[AdminService] Seeded initial administrator: ${config.defaultAdmin.username}`);
    }

    // Seed default settings if empty
    const settingsCount = await SystemSetting.countDocuments();
    if (settingsCount === 0) {
      await SystemSetting.insertMany([
        {
          key: 'FILE_MAX_SIZE_BYTES',
          value: config.maxFileSize,
          description: 'Maximum individual transfer file size in bytes (default 100MB)',
          category: 'transfer',
        },
        {
          key: 'SESSION_TTL_MINUTES',
          value: config.sessionTtlMinutes,
          description: 'Standard temporary session lifetime in minutes',
          category: 'security',
        },
        {
          key: 'TEMP_FILE_TTL_MINUTES',
          value: config.tempFileTtlMinutes,
          description: 'Maximum lifetime of temporary server relay files before automatic shredding',
          category: 'storage',
        },
        {
          key: 'ALLOWED_EXTENSIONS_POLICY',
          value: 'ALLOW_ALL_EXCEPT_EXECUTABLES',
          description: 'Enforces rejection of dangerous executables (.exe, .bat, etc.)',
          category: 'security',
        },
      ]);
      logger.info('[AdminService] Seeded initial system policy settings.');
    }
  } catch (err) {
    logger.error('[AdminService] Error during admin/settings seeding:', { error: err.message });
  }
};

export const loginAdmin = async ({ username, password, ip }) => {
  const admin = await Admin.findOne({ username: username.toLowerCase() });
  if (!admin || !admin.isActive) {
    await recordAuditLog({
      eventType: 'ADMIN_LOGIN',
      severity: 'warning',
      actorId: username,
      ip,
      details: { success: false, reason: 'USER_NOT_FOUND_OR_INACTIVE' },
    });
    const error = new Error('Invalid administrative credentials.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    await recordAuditLog({
      eventType: 'ADMIN_LOGIN',
      severity: 'warning',
      actorId: username,
      ip,
      details: { success: false, reason: 'INVALID_PASSWORD' },
    });
    const error = new Error('Invalid administrative credentials.');
    error.statusCode = 401;
    throw error;
  }

  admin.lastLogin = new Date();
  await admin.save();

  const token = jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role },
    config.adminJwtSecret,
    { expiresIn: config.adminJwtExpiresIn }
  );

  await recordAuditLog({
    eventType: 'ADMIN_LOGIN',
    severity: 'info',
    actorId: admin.username,
    ip,
    details: { success: true },
  });

  return {
    token,
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
  };
};

export const getDashboardStats = async () => {
  const [
    totalLabComputers,
    availableComputers,
    busyComputers,
    offlineComputers,
    activeSessions,
    totalTransfers,
    completedTransfers,
    failedTransfers,
    recentAudits,
  ] = await Promise.all([
    LabComputer.countDocuments(),
    LabComputer.countDocuments({ status: 'available', isEnabled: true }),
    LabComputer.countDocuments({ status: 'busy' }),
    LabComputer.countDocuments({ $or: [{ status: 'offline' }, { isEnabled: false }] }),
    Session.countDocuments({ status: { $in: ['pending', 'paired', 'active'] }, expiresAt: { $gt: new Date() } }),
    Transfer.countDocuments(),
    Transfer.countDocuments({ status: 'completed' }),
    Transfer.countDocuments({ status: 'failed' }),
    AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  // Calculate temp storage usage
  let tempStorageBytes = 0;
  try {
    if (fs.existsSync(config.tempUploadDir)) {
      const files = fs.readdirSync(config.tempUploadDir);
      for (const file of files) {
        const stats = fs.statSync(path.join(config.tempUploadDir, file));
        tempStorageBytes += stats.size;
      }
    }
  } catch {
    // Ignore fs errors in metric collection
  }

  return {
    labComputers: {
      total: totalLabComputers,
      available: availableComputers,
      busy: busyComputers,
      offline: offlineComputers,
    },
    sessions: {
      active: activeSessions,
    },
    transfers: {
      total: totalTransfers,
      completed: completedTransfers,
      failed: failedTransfers,
    },
    storage: {
      tempUsageBytes: tempStorageBytes,
      maxFileSizeBytes: config.maxFileSize,
    },
    recentAudits,
  };
};

export const getLabComputers = async () => {
  return LabComputer.find().sort({ computerId: 1 }).lean();
};

export const upsertLabComputer = async (data) => {
  const computer = await LabComputer.findOneAndUpdate(
    { computerId: data.computerId.toUpperCase() },
    { $set: data },
    { upsert: true, new: true }
  );
  return computer;
};

export const deleteLabComputer = async (computerId) => {
  return LabComputer.findOneAndDelete({ computerId: computerId.toUpperCase() });
};

export const getActiveSessions = async () => {
  return Session.find({
    status: { $in: ['pending', 'paired', 'active'] },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean();
};

export const terminateSessionByAdmin = async (sessionId, adminUsername) => {
  const session = await Session.findOne({ sessionId });
  if (session) {
    session.status = 'terminated';
    await session.save();

    if (session.labComputerId) {
      await LabComputer.updateOne(
        { computerId: session.labComputerId },
        { status: 'available', currentSessionId: null }
      );
    }

    await recordAuditLog({
      eventType: 'SESSION_DISCONNECTED',
      severity: 'warning',
      actorId: adminUsername,
      details: { sessionId, reason: 'ADMIN_FORCE_TERMINATION' },
    });
  }
  return session;
};

export const getAuditLogs = async (limit = 50, skip = 0) => {
  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(),
  ]);
  return { logs, total };
};

export const getSettings = async () => {
  return SystemSetting.find().lean();
};

export const updateSettings = async (settingsObj, updatedBy) => {
  for (const [key, value] of Object.entries(settingsObj)) {
    await SystemSetting.findOneAndUpdate(
      { key: key.toUpperCase() },
      { $set: { value, updatedBy } },
      { upsert: true }
    );
  }
  return SystemSetting.find().lean();
};
