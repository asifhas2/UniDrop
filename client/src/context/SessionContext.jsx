import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { getSocket, disconnectSocket } from '../services/socket.js';
import { WebRTCManager } from '../services/webrtc.js';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null); // { sessionId, role, expiresAt, maxFileSize, labComputerId, qrToken, pinCode }
  const [peerDevice, setPeerDevice] = useState(null); // { deviceId, role }
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

    socket.on('peer_joined', ({ deviceId: peerId, role }) => {
      setPeerDevice({ deviceId: peerId, role });
      setConnectionState('connecting');

      // If host, initiate WebRTC offer
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
    });

    socket.on('peer_disconnected', () => {
      setPeerDevice(null);
      setConnectionState('disconnected');
    });

    socket.on('session_terminated', () => {
      endLocalSession();
      window.location.href = '/expired';
    });

    // Initialize WebRTC Manager
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

    return () => {
      clearTimeout(fallbackTimerRef.current);
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
      socket.off('peer_joined');
      socket.off('peer_disconnected');
      socket.off('session_terminated');
    };
  }, [session?.sessionId]);

  // Create new session (Host / Lab Workstation)
  const initSession = async (labComputerId = null) => {
    const res = await api.post('/sessions', {
      hostDeviceId: deviceId,
      labComputerId,
    });
    const data = res.data.data;
    setSession({
      ...data,
      role: 'host',
    });
    return data;
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
    });
    return data;
  };

  // Send a file (either P2P WebRTC or Server Relay Fallback)
  const sendFile = async (file) => {
    const transferId = 'tx_' + Math.random().toString(36).substring(2, 9);
    
    // Check max file size
    if (session?.maxFileSize && file.size > session.maxFileSize) {
      throw new Error(`File exceeds maximum size limit of ${Math.round(session.maxFileSize / (1024 * 1024))}MB.`);
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
      if (transferMode === 'webrtc_p2p' && webrtcRef.current?.isChannelOpen) {
        await webrtcRef.current.sendFile(file, transferId);
      } else {
        // Fallback to server relay upload
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

        // Notify peer through socket
        const socket = getSocket();
        socket.emit('transfer_signal', {
          sessionId: session.sessionId,
          event: 'relay_file_available',
          payload: {
            transferId: res.data.data.transferId,
            fileName: file.name,
            fileSize: file.size,
            downloadUrl: res.data.data.downloadUrl,
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
    setSession(null);
    setPeerDevice(null);
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
        connectionState,
        transferMode,
        transfers,
        receivedFiles,
        initSession,
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
