import * as sessionService from '../services/sessionService.js';
import { createSessionSchema, joinSessionSchema, disconnectSessionSchema } from '../validators/sessionValidator.js';

export const createSession = async (req, res, next) => {
  try {
    const validated = createSessionSchema.parse(req.body);
    const sessionData = await sessionService.createSession({
      ...validated,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: sessionData,
    });
  } catch (err) {
    next(err);
  }
};

export const joinSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id || req.body.sessionId;
    const validated = joinSessionSchema.parse({
      ...req.body,
      sessionId,
    });

    const sessionData = await sessionService.joinSession({
      sessionId,
      ...validated,
      ip: req.ip,
    });

    // Notify host workstation immediately through WebSocket room
    const io = req.app.get('io');
    if (io && sessionData.sessionId) {
      io.to(sessionData.sessionId).emit('peer_joined', {
        deviceId: validated.peerDeviceId,
        role: 'peer',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      data: sessionData,
    });
  } catch (err) {
    next(err);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const sessionData = await sessionService.getSessionById(sessionId);

    res.status(200).json({
      success: true,
      data: sessionData,
    });
  } catch (err) {
    next(err);
  }
};

export const disconnectSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const validated = disconnectSessionSchema.parse(req.body);

    await sessionService.disconnectSession({
      sessionId,
      deviceId: validated.deviceId,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Session terminated successfully.',
    });
  } catch (err) {
    next(err);
  }
};
