const CHUNK_SIZE = 64 * 1024; // 64KB optimal chunk size for WebRTC DataChannel
const BUFFER_THRESHOLD = 1024 * 1024; // 1MB buffer ceiling for backpressure

export class WebRTCManager {
  constructor({ sessionId, deviceId, role, socket, onStatusChange, onProgress, onFileReceived, onError }) {
    this.sessionId = sessionId;
    this.deviceId = deviceId;
    this.role = role; // 'host' or 'peer'
    this.socket = socket;
    this.onStatusChange = onStatusChange || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onFileReceived = onFileReceived || (() => {});
    this.onError = onError || (() => {});

    this.pc = null;
    this.dataChannel = null;
    this.isChannelOpen = false;
    this.activeTransfers = new Map(); // transferId -> { cancelled: boolean }
    this.incomingTransfer = null; // { meta, chunks, receivedBytes, startTime, lastSpeedCheck }

    this.initPeerConnection();
    this.setupSignalingListeners();
  }

  initPeerConnection() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice_candidate', {
          sessionId: this.sessionId,
          candidate: event.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      this.onStatusChange({ type: 'connectionState', state });
      if (state === 'failed' || state === 'disconnected') {
        this.onStatusChange({ type: 'warning', message: 'Direct P2P connection unstable. Fallback available.' });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      this.onStatusChange({ type: 'iceConnectionState', state: this.pc.iceConnectionState });
    };

    if (this.role === 'host') {
      // Host creates the DataChannel
      this.dataChannel = this.pc.createDataChannel('unidrop_p2p_channel', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      // Peer listens for incoming DataChannel
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 64 * 1024;

    channel.onopen = () => {
      this.isChannelOpen = true;
      this.onStatusChange({ type: 'channelOpen', isOpen: true });
    };

    channel.onclose = () => {
      this.isChannelOpen = false;
      this.onStatusChange({ type: 'channelOpen', isOpen: false });
    };

    channel.onerror = (err) => {
      this.onError('WebRTC DataChannel error: ' + (err.message || 'Unknown channel failure'));
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  setupSignalingListeners() {
    this.handleOffer = async ({ sdp }) => {
      if (this.role === 'host' || !this.pc) return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.socket.emit('webrtc_answer', {
          sessionId: this.sessionId,
          sdp: answer,
        });
      } catch (err) {
        console.warn('[WebRTC] Offer handling warning:', err.message);
      }
    };

    this.handleAnswer = async ({ sdp }) => {
      if (!this.pc || this.pc.signalingState !== 'have-local-offer') return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.warn('[WebRTC] Answer handling warning:', err.message);
      }
    };

    this.handleIceCandidate = async ({ candidate }) => {
      try {
        if (candidate && this.pc && this.pc.remoteDescription) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn('[WebRTC] Non-fatal ICE candidate warning:', err.message);
      }
    };

    this.socket.on('webrtc_offer', this.handleOffer);
    this.socket.on('webrtc_answer', this.handleAnswer);
    this.socket.on('ice_candidate', this.handleIceCandidate);
  }

  // Host initiates connection offer
  async initiateOffer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      this.socket.emit('webrtc_offer', {
        sessionId: this.sessionId,
        sdp: offer,
      });
    } catch (err) {
      this.onError('Failed to initiate WebRTC offer: ' + err.message);
    }
  }

  // Send file through WebRTC DataChannel with chunking & backpressure
  async sendFile(file, transferId) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('P2P DataChannel is not currently connected.');
    }

    this.activeTransfers.set(transferId, { cancelled: false });

    // 1. Send file metadata header
    const header = JSON.stringify({
      type: 'FILE_HEADER',
      transferId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    });
    this.dataChannel.send(header);

    // 2. Stream chunks with flow control / backpressure
    let offset = 0;
    const totalSize = file.size;
    let lastProgressTime = Date.now();
    let bytesSinceLastCheck = 0;
    let speedBps = 0;

    while (offset < totalSize) {
      if (this.activeTransfers.get(transferId)?.cancelled) {
        this.dataChannel.send(JSON.stringify({ type: 'FILE_CANCEL', transferId }));
        throw new Error('Transfer was cancelled by sender.');
      }

      // Check backpressure on DataChannel buffer
      if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise((resolve) => {
          this.dataChannel.onbufferedamountlow = () => {
            this.dataChannel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const chunkSlice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunkSlice.arrayBuffer();

      this.dataChannel.send(buffer);
      offset += buffer.byteLength;
      bytesSinceLastCheck += buffer.byteLength;

      // Update transfer speed & progress calculation
      const now = Date.now();
      const elapsed = (now - lastProgressTime) / 1000;
      if (elapsed >= 0.5 || offset >= totalSize) {
        speedBps = Math.round(bytesSinceLastCheck / (elapsed || 0.001));
        bytesSinceLastCheck = 0;
        lastProgressTime = now;

        const percent = Math.min(100, Math.round((offset / totalSize) * 100));
        this.onProgress({
          transferId,
          transferredBytes: offset,
          totalBytes: totalSize,
          percent,
          speedBps,
          status: offset >= totalSize ? 'completed' : 'transferring',
        });
      }
    }

    // 3. Send file completion packet
    this.dataChannel.send(JSON.stringify({ type: 'FILE_DONE', transferId }));
    this.activeTransfers.delete(transferId);
  }

  // Handle incoming data channel packets (String metadata or ArrayBuffer chunks)
  handleIncomingData(data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'FILE_HEADER') {
          this.incomingTransfer = {
            transferId: msg.transferId,
            name: msg.name,
            size: msg.size,
            mimeType: msg.mimeType,
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now(),
            lastSpeedCheck: Date.now(),
            bytesSinceCheck: 0,
            speedBps: 0,
          };
          this.onProgress({
            transferId: msg.transferId,
            fileName: msg.name,
            transferredBytes: 0,
            totalBytes: msg.size,
            percent: 0,
            speedBps: 0,
            status: 'transferring',
          });
        } else if (msg.type === 'FILE_DONE') {
          if (this.incomingTransfer && this.incomingTransfer.transferId === msg.transferId) {
            const blob = new Blob(this.incomingTransfer.chunks, {
              type: this.incomingTransfer.mimeType,
            });
            const url = URL.createObjectURL(blob);

            this.onProgress({
              transferId: msg.transferId,
              transferredBytes: this.incomingTransfer.size,
              totalBytes: this.incomingTransfer.size,
              percent: 100,
              speedBps: 0,
              status: 'completed',
            });

            this.onFileReceived({
              transferId: this.incomingTransfer.transferId,
              name: this.incomingTransfer.name,
              size: this.incomingTransfer.size,
              mimeType: this.incomingTransfer.mimeType,
              blob,
              url,
            });

            this.incomingTransfer = null;
          }
        } else if (msg.type === 'FILE_CANCEL') {
          if (this.incomingTransfer && this.incomingTransfer.transferId === msg.transferId) {
            this.onError(`Transfer for ${this.incomingTransfer.name} was cancelled by sender.`);
            this.incomingTransfer = null;
          }
        }
      } catch (e) {
        console.error('[WebRTC] Error parsing JSON signaling message:', e);
      }
    } else if (data instanceof ArrayBuffer) {
      if (this.incomingTransfer) {
        this.incomingTransfer.chunks.push(data);
        this.incomingTransfer.receivedBytes += data.byteLength;
        this.incomingTransfer.bytesSinceCheck += data.byteLength;

        const now = Date.now();
        const elapsed = (now - this.incomingTransfer.lastSpeedCheck) / 1000;
        if (elapsed >= 0.5) {
          this.incomingTransfer.speedBps = Math.round(this.incomingTransfer.bytesSinceCheck / (elapsed || 0.001));
          this.incomingTransfer.bytesSinceCheck = 0;
          this.incomingTransfer.lastSpeedCheck = now;
        }

        const percent = Math.min(100, Math.round((this.incomingTransfer.receivedBytes / this.incomingTransfer.size) * 100));
        this.onProgress({
          transferId: this.incomingTransfer.transferId,
          fileName: this.incomingTransfer.name,
          transferredBytes: this.incomingTransfer.receivedBytes,
          totalBytes: this.incomingTransfer.size,
          percent,
          speedBps: this.incomingTransfer.speedBps,
          status: 'transferring',
        });
      }
    }
  }

  cancelTransfer(transferId) {
    if (this.activeTransfers.has(transferId)) {
      this.activeTransfers.get(transferId).cancelled = true;
    }
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'FILE_CANCEL', transferId }));
    }
  }

  close() {
    if (this.socket) {
      if (this.handleOffer) this.socket.off('webrtc_offer', this.handleOffer);
      if (this.handleAnswer) this.socket.off('webrtc_answer', this.handleAnswer);
      if (this.handleIceCandidate) this.socket.off('ice_candidate', this.handleIceCandidate);
    }
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
    this.isChannelOpen = false;
  }
}
