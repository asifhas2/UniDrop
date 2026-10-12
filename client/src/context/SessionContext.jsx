import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { getSocket, disconnectSocket } from '../services/socket.js';
import { WebRTCManager } from '../services/webrtc.js';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('unidrop_active_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      sessionStorage.setItem('unidrop_active_session', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('unidrop_active_session');
    }
  }, [session]);
  const [peerDevice, setPeerDevice] = useState(null); // { deviceId, role }
  const [memberCount, setMemberCount] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, p2p_ready, relay_fallback
  const [transferMode, setTransferMode] = useState('webrtc_p2p');
  const [transfers, setTransfers] = useState([]); // [{ id, name, size, type, progress, speed, status, direction, url }]
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [deviceId] = useState(() => {
    let id = sessionStorage.getItem('unidrop_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('unidrop_device_id', id);
    }
    return id;
  });

  const webrtcRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // Initialize WebRTC and Socket listeners once session is paired
  useEffect(() => {
    if (!session?.sessionId) return;

    const socket = getSocket();

    socket.emit('join_session_room', {
      sessionId: session.sessionId,
      deviceId,
      role: session.role,
    });

    socket.on('room_status', (status) => {
      setSession((prev) => (prev ? {
        ...prev,
        mode: status.mode || prev.mode,
        allowMemberUpload: status.allowMemberUpload ?? prev.allowMemberUpload,
        connectedDeviceIds: status.connectedDeviceIds || prev.connectedDeviceIds,
      } : prev));
      if (status.memberCount !== undefined) {
        setMemberCount(status.memberCount);
      }
      if (status.mode === 'group') {
        setTransferMode('server_relay');
        setConnectionState('relay_fallback');
      }
    });

    socket.on('peer_joined', ({ deviceId: peerId, role, mode, allowMemberUpload, memberCount: count }) => {
      setPeerDevice({ deviceId: peerId, role });
      if (count !== undefined) setMemberCount(count);

      setSession((prev) => (prev ? {
        ...prev,
        mode: mode || prev.mode,
        allowMemberUpload: allowMemberUpload ?? prev.allowMemberUpload,
      } : prev));

      const isGroup = (mode || session?.mode) === 'group';

      if (!isGroup) {
        setConnectionState('connecting');

        // If host in direct 1-to-1, initiate WebRTC offer
        if (session.role === 'host' && webrtcRef.current) {
          webrtcRef.current.initiateOffer();
        }

        // Start fallback countdown: if P2P channel doesn't open within 8 seconds, fallback to server relay
        fallbackTimerRef.current = setTimeout(() => {
          if (!webrtcRef.current?.isChannelOpen) {
            console.warn('[WebRTC] P2P channel negotiation timed out. Activating server-relay fallback.');
            setTransferMode('server_relay');
            setConnectionState('relay_fallback');
          }
        }, 8000);
      } else {
        // Group Work Mode: uses server relay broadcast
        setTransferMode('server_relay');
        setConnectionState('relay_fallback');
      }
    });

    socket.on('members_updated', ({ memberCount: count, connectedDeviceIds }) => {
      if (count !== undefined) setMemberCount(count);
      setSession((prev) => (prev ? {
        ...prev,
        memberCount: count,
        connectedDeviceIds: connectedDeviceIds || prev.connectedDeviceIds,
      } : prev));
    });

    socket.on('permissions_updated', ({ allowMemberUpload: allowed }) => {
      setSession((prev) => (prev ? { ...prev, allowMemberUpload: allowed } : prev));
    });

    socket.on('peer_disconnected', ({ deviceId: peerId, memberCount: count }) => {
      if (count !== undefined) setMemberCount(count);
      if (session?.mode === 'direct') {
        setPeerDevice(null);
        setConnectionState('disconnected');
      }
    });

    socket.on('transfer_signal', ({ event, payload, fromDeviceId }) => {
      if (event === 'relay_file_available' && fromDeviceId !== deviceId && payload) {
        // Incoming file available for this peer in group or 1-to-1
        const incomingTx = {
          id: payload.transferId,
          name: payload.fileName,
          size: payload.fileSize,
          progress: 100,
          speed: 0,
          status: 'completed',
          direction: 'inbound',
          url: payload.downloadUrl,
          fromDeviceId,
        };

        setTransfers((prev) => [incomingTx, ...prev]);
        setReceivedFiles((prev) => [
          {
            transferId: payload.transferId,
            name: payload.fileName,
            size: payload.fileSize,
            url: payload.downloadUrl,
            fromDeviceId,
          },
          ...prev,
        ]);

        // Auto-download file
        try {
          const a = document.createElement('a');
          a.href = payload.downloadUrl;
          a.download = payload.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.warn('[AutoDownload] Browser download trigger:', e);
        }
      }
    });

    socket.on('session_terminated', () => {
      endLocalSession();
      window.location.href = '/expired';
    });

    // Initialize WebRTC Manager for 1-to-1 direct sessions
    if (session.mode !== 'group') {
      webrtcRef.current = new WebRTCManager({
        sessionId: session.sessionId,
        deviceId,
        role: session.role,
        socket,
        onStatusChange: (status) => {
          if (status.type === 'channelOpen') {
            if (status.isOpen) {
              clearTimeout(fallbackTimerRef.current);
              setConnectionState('p2p_ready');
              setTransferMode('webrtc_p2p');
            } else {
              setConnectionState('disconnected');
            }
          }
        },
        onProgress: (progress) => {
          setTransfers((prev) => {
            const idx = prev.findIndex((t) => t.id === progress.transferId);
            if (idx === -1) {
              return [
                ...prev,
                {
                  id: progress.transferId,
                  name: progress.fileName || 'Incoming File',
                  size: progress.totalBytes,
                  progress: progress.percent,
                  speed: progress.speedBps,
                  status: progress.status,
                  direction: 'inbound',
                },
              ];
            }
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              progress: progress.percent,
              speed: progress.speedBps,
              status: progress.status,
            };
            return updated;
          });
        },
        onFileReceived: (file) => {
          setReceivedFiles((prev) => [file, ...prev]);
          // Trigger automatic browser download
          const a = document.createElement('a');
          a.href = file.url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        },
        onError: (err) => {
          console.error('[WebRTC Error]', err);
        },
      });
    }

    return () => {
      clearTimeout(fallbackTimerRef.current);
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
      socket.off('room_status');
      socket.off('peer_joined');
      socket.off('members_updated');
      socket.off('permissions_updated');
      socket.off('peer_disconnected');
      socket.off('transfer_signal');
      socket.off('session_terminated');
    };
  }, [session?.sessionId]);

  // Create new session (Host / Lab Workstation or Group Work)
  const initSession = async (labComputerId = null, mode = 'direct', allowMemberUpload = false) => {
    const res = await api.post('/sessions', {
      hostDeviceId: deviceId,
      labComputerId,
      mode,
      allowMemberUpload,
    });
    const data = res.data.data;
    setSession({
      ...data,
      role: 'host',
      mode: data.mode || mode,
      allowMemberUpload: data.allowMemberUpload ?? allowMemberUpload,
    });
    setMemberCount(0);
    return data;
  };

  // Toggle member upload permission (Host in Group Work mode)
  const toggleMemberUpload = async (allow) => {
    if (!session?.sessionId) return;
    try {
      await api.patch(`/sessions/${session.sessionId}/permissions`, {
        hostDeviceId: deviceId,
        allowMemberUpload: allow,
      });
      const socket = getSocket();
      socket.emit('toggle_member_upload', {
        sessionId: session.sessionId,
        hostDeviceId: deviceId,
        allowMemberUpload: allow,
      });
      setSession((prev) => (prev ? { ...prev, allowMemberUpload: allow } : prev));
    } catch (err) {
      console.error('Failed to update member upload permissions:', err);
      throw err;
    }
  };

  // Join session (Student Phone / Laptop)
  const joinSession = async ({ qrToken, pinCode, sessionId }) => {
    const res = await api.post('/sessions/join', {
      qrToken,
      pinCode,
      sessionId,
      peerDeviceId: deviceId,
    });
    const data = res.data.data;
    setSession({
      ...data,
      role: 'peer',
      mode: data.mode || 'direct',
      allowMemberUpload: data.allowMemberUpload || false,
    });
    if (data.memberCount !== undefined) {
      setMemberCount(data.memberCount);
    }
    return data;
  };

  // Send a file (either P2P WebRTC or Server Relay Fallback / Group Broadcast)
  const sendFile = async (file) => {
    const transferId = 'tx_' + Math.random().toString(36).substring(2, 9);
    
    // Check max file size
    if (session?.maxFileSize && file.size > session.maxFileSize) {
      throw new Error(`File exceeds maximum size limit of ${Math.round(session.maxFileSize / (1024 * 1024))}MB.`);
    }

    // Permission check for Group Work mode:
    if (session?.mode === 'group' && session?.role !== 'host' && !session?.allowMemberUpload) {
      throw new Error('Upload restricted: Only the session host can send files in this group.');
    }

    const newTransfer = {
      id: transferId,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      speed: 0,
      status: 'transferring',
      direction: 'outbound',
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    try {
      if (session?.mode !== 'group' && transferMode === 'webrtc_p2p' && webrtcRef.current?.isChannelOpen) {
        await webrtcRef.current.sendFile(file, transferId);
      } else {
        // Fallback to server relay upload / group broadcast
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', session.sessionId);
        formData.append('senderDeviceId', deviceId);
        if (peerDevice?.deviceId) {
          formData.append('receiverDeviceId', peerDevice.deviceId);
        }

        const res = await api.post('/transfers/relay/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const percent = Math.round((e.loaded * 100) / (e.total || file.size));
            setTransfers((prev) =>
              prev.map((t) => (t.id === transferId ? { ...t, progress: percent } : t))
            );
          },
        });

        // Broadcast to group members or peer through socket
        const socket = getSocket();
        socket.emit('transfer_signal', {
          sessionId: session.sessionId,
          event: 'relay_file_available',
          payload: {
            transferId: res.data.data.transferId,
            fileName: file.name,
            fileSize: file.size,
            downloadUrl: res.data.data.downloadUrl,
            senderDeviceId: deviceId,
            senderRole: session.role,
          },
        });

        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? { ...t, progress: 100, status: 'completed' } : t))
        );
      }
    } catch (err) {
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, status: 'failed', error: err.message } : t))
      );
      throw err;
    }
  };

  // Disconnect active session
  const disconnectSession = async () => {
    if (session?.sessionId) {
      try {
        await api.post(`/sessions/${session.sessionId}/disconnect`, { deviceId });
        const socket = getSocket();
        socket.emit('session_disconnect', { sessionId: session.sessionId });
      } catch (err) {
        console.error('Error disconnecting session:', err);
      }
    }
    endLocalSession();
  };

  const endLocalSession = () => {
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    disconnectSocket();
    sessionStorage.removeItem('unidrop_active_session');
    setSession(null);
    setPeerDevice(null);
    setMemberCount(0);
    setConnectionState('disconnected');
    setTransfers([]);
    setReceivedFiles([]);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        deviceId,
        peerDevice,
        memberCount,
        connectionState,
        transferMode,
        transfers,
        receivedFiles,
        initSession,
        toggleMemberUpload,
        joinSession,
        sendFile,
        disconnectSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
