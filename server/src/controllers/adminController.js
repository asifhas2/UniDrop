import * as adminService from '../services/adminService.js';
import { adminLoginSchema, labComputerSchema, updateSettingsSchema } from '../validators/adminValidator.js';

export const login = async (req, res, next) => {
  try {
    const validated = adminLoginSchema.parse(req.body);
    const result = await adminService.loginAdmin({
      ...validated,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getLabComputers = async (req, res, next) => {
  try {
    const computers = await adminService.getLabComputers();
    res.status(200).json({
      success: true,
      data: computers,
    });
  } catch (err) {
    next(err);
  }
};

export const upsertLabComputer = async (req, res, next) => {
  try {
    const validated = labComputerSchema.parse(req.body);
    const computer = await adminService.upsertLabComputer(validated);
    res.status(200).json({
      success: true,
      data: computer,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLabComputer = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteLabComputer(id);
    res.status(200).json({
      success: true,
      message: `Lab workstation ${id} deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await adminService.getActiveSessions();
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};

export const endSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await adminService.terminateSessionByAdmin(id, req.admin.username);
    res.status(200).json({
      success: true,
      message: `Session ${id} successfully terminated by administrator.`,
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const skip = parseInt(req.query.skip || '0', 10);
    const result = await adminService.getAuditLogs(limit, skip);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await adminService.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const validated = updateSettingsSchema.parse(req.body);
    const updated = await adminService.updateSettings(validated.settings, req.admin.username);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
