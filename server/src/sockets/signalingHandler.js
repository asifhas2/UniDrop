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

      const session = await Session.findOne({ sessionId });
      const memberCount = session?.connectedDeviceIds?.length || 1;
      const mode = session?.mode || 'direct';
      const allowMemberUpload = session?.allowMemberUpload || false;

      // Send initial room state to joining socket
      socket.emit('room_status', {
        sessionId,
        mode,
        allowMemberUpload,
        memberCount,
        connectedDeviceIds: session?.connectedDeviceIds || [],
      });

      // Notify other peers in the room
      socket.to(sessionId).emit('peer_joined', {
        deviceId,
        role,
        mode,
        allowMemberUpload,
        memberCount,
        connectedDeviceIds: session?.connectedDeviceIds || [],
        timestamp: new Date().toISOString(),
      });

      io.to(sessionId).emit('members_updated', {
        memberCount,
        connectedDeviceIds: session?.connectedDeviceIds || [],
      });
    } catch (err) {
      logger.error('[Socket] Error in join_session_room:', { error: err.message });
    }
  });

  // Host toggles member upload permission via socket
  socket.on('toggle_member_upload', async ({ sessionId, hostDeviceId, allowMemberUpload }) => {
    try {
      const session = await Session.findOne({ sessionId });
      if (session && session.hostDeviceId === hostDeviceId) {
        session.allowMemberUpload = Boolean(allowMemberUpload);
        await session.save();
        io.to(sessionId).emit('permissions_updated', {
          sessionId,
          allowMemberUpload: session.allowMemberUpload,
        });
        logger.info(`[Signaling] Upload permissions updated for ${sessionId}: allowMemberUpload=${session.allowMemberUpload}`);
      }
    } catch (err) {
      logger.error('[Signaling] Error in toggle_member_upload:', { error: err.message });
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
  socket.on('disconnect', async () => {
    const { sessionId, deviceId, role } = socket.data || {};
    if (sessionId) {
      logger.info(`[Socket] Device ${deviceId || socket.id} disconnected from session ${sessionId}`);
      try {
        const session = await Session.findOne({ sessionId });
        const memberCount = session?.connectedDeviceIds?.length || 0;
        socket.to(sessionId).emit('peer_disconnected', {
          deviceId,
          role,
          memberCount,
        });
        socket.to(sessionId).emit('members_updated', {
          memberCount,
          connectedDeviceIds: session?.connectedDeviceIds || [],
        });
      } catch (e) {
        socket.to(sessionId).emit('peer_disconnected', {
          deviceId,
          role,
        });
      }
    }
  });
};
