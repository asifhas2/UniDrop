import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';
import { Admin } from '../models/Admin.js';
import { Session } from '../models/Session.js';

/**
 * Middleware to authenticate administrative requests via signed JWT
 */
export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.adminJwtSecret);

    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Administrator session is invalid or has been revoked.',
        },
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired administration token.',
      },
    });
  }
};

/**
 * Middleware to authenticate requests that must belong to an active temporary session
 */
export const requireActiveSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId || req.params.id || req.body.sessionId;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session identifier is required.',
        },
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Transfer session not found or already deleted.',
        },
      });
    }

    if (!session.isValid()) {
      return res.status(410).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Transfer session has expired.',
        },
      });
    }

    req.sessionDoc = session;
    next();
  } catch (err) {
    next(err);
  }
};
