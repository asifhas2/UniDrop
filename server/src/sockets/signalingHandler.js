import { logger } from '../utils/logger.js';
import { Session } from '../models/Session.js';

export const registerSignalingHandlers = (io, socket) => {
  // Join a private session room
  socket.on('join_session_room', async ({ sessionId, deviceId, role }) => {
    try {
      if (!sessionId) return;
      socket.join(sessionId);
      socket.data = { sessionId, deviceId, role };

      logger.info(`[Socket] Device ${deviceId} (${role}) joined session room: ${sessionId}`);

      // Notify other peer in the room
      socket.to(sessionId).emit('peer_joined', {
        deviceId,
        role,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[Socket] Error in join_session_room:', { error: err.message });
    }
  });

  // WebRTC SDP Offer exchange
  socket.on('webrtc_offer', ({ sessionId, sdp, targetDeviceId }) => {
    try {
      logger.debug(`[Signaling] Forwarding WebRTC offer in session ${sessionId}`);
      socket.to(sessionId).emit('webrtc_offer', {
        sdp,
        fromDeviceId: socket.data?.deviceId,
      });
    } catch (err) {
      logger.error('[Signaling] Error forwarding WebRTC offer:', { error: err.message });
    }
  });

  // WebRTC SDP Answer exchange
  socket.on('webrtc_answer', ({ sessionId, sdp, targetDeviceId }) => {
    try {
      logger.debug(`[Signaling] Forwarding WebRTC answer in session ${sessionId}`);
      socket.to(sessionId).emit('webrtc_answer', {
        sdp,
        fromDeviceId: socket.data?.deviceId,
      });
    } catch (err) {
      logger.error('[Signaling] Error forwarding WebRTC answer:', { error: err.message });
    }
  });

  // ICE Candidate exchange
  socket.on('ice_candidate', ({ sessionId, candidate }) => {
    try {
      socket.to(sessionId).emit('ice_candidate', {
        candidate,
        fromDeviceId: socket.data?.deviceId,
      });
    } catch (err) {
      logger.error('[Signaling] Error forwarding ICE candidate:', { error: err.message });
    }
  });

  // Real-time file transfer state notifications
  socket.on('transfer_signal', ({ sessionId, event, payload }) => {
    try {
      logger.debug(`[Signaling] Transfer signal '${event}' in session ${sessionId}`);
      socket.to(sessionId).emit('transfer_signal', {
        event,
        payload,
        fromDeviceId: socket.data?.deviceId,
      });
    } catch (err) {
      logger.error('[Signaling] Error in transfer_signal:', { error: err.message });
    }
  });

  // Session disconnection signal
  socket.on('session_disconnect', ({ sessionId, reason }) => {
    try {
      socket.to(sessionId).emit('session_terminated', {
        reason: reason || 'Peer disconnected',
        byDeviceId: socket.data?.deviceId,
      });
      socket.leave(sessionId);
    } catch (err) {
      logger.error('[Signaling] Error in session_disconnect:', { error: err.message });
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    const { sessionId, deviceId, role } = socket.data || {};
    if (sessionId) {
      logger.info(`[Socket] Device ${deviceId || socket.id} disconnected from session ${sessionId}`);
      socket.to(sessionId).emit('peer_disconnected', {
        deviceId,
        role,
      });
    }
  });
};
