import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle,
  Download, ArrowDown, ArrowUp, Zap, Shield, LogOut, Laptop, Smartphone,
  RefreshCw, HardDrive, Users, Lock, Unlock, QrCode, X, Copy, Check
} from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';
import { formatBytes } from '../utils/formatters.js';

export const TransferPage = () => {
  const {
    session,
    peerDevice,
    memberCount,
    connectionState,
    transferMode,
    transfers,
    receivedFiles,
    sendFile,
    toggleMemberUpload,
    disconnectSession,
  } = useSession();

  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [modalQrUrl, setModalQrUrl] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // If no active session, redirect to landing
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  // Check upload permissions
  const isGroup = session?.mode === 'group';
  const isHost = session?.role === 'host';
  const canUpload = !isGroup || isHost || Boolean(session?.allowMemberUpload);

  // Generate QR code for late arrivals modal
  useEffect(() => {
    if (session?.qrToken && session?.sessionId) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let joinBaseUrl = window.location.origin;
      if (isLocalhost) {
        const savedHost = localStorage.getItem('unidrop_mobile_host') || '192.168.0.107';
        if (savedHost.startsWith('http://') || savedHost.startsWith('https://')) {
          joinBaseUrl = savedHost.replace(/\/+$/, '');
        } else if (savedHost.includes('.onrender.com')) {
          joinBaseUrl = `https://${savedHost.replace(/\/+$/, '')}`;
        } else {
          const port = window.location.port ? `:${window.location.port}` : '';
          const protocol = window.location.protocol;
          joinBaseUrl = `${protocol}//${savedHost}${port}`;
        }
      }
      const joinUrl = `${joinBaseUrl}/join?qrToken=${session.qrToken}&sessionId=${session.sessionId}`;
      QRCode.toDataURL(joinUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(setModalQrUrl).catch(() => {});
    }
  }, [session?.qrToken, session?.sessionId]);

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    if (!canUpload) {
      setErrorMsg('File uploads are currently restricted to the host. Ask the host to enable member sharing.');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        await sendFile(file);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while transferring files.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload) return;
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleToggleUploadPermission = async (enabled) => {
    try {
      await toggleMemberUpload(enabled);
    } catch (err) {
      setErrorMsg('Failed to update group upload permissions.');
    }
  };

  const handleCopyPin = () => {
    if (session?.pinCode) {
      navigator.clipboard.writeText(session.pinCode);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    const promptMsg = isGroup && isHost
      ? 'Terminate this Group Work session? All connected members will be disconnected and session keys cleared.'
      : 'Disconnect and leave this transfer session?';

    if (window.confirm(promptMsg)) {
      await disconnectSession();
      navigate('/expired');
    }
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    if (bytesPerSec > 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  };

  return (
    <div className="py-8 sm:py-12 px-4 max-w-5xl mx-auto space-y-6">
      {/* Top Connected Status Bar */}
      <div className={`glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
        isGroup ? 'border-purple-500/30' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isGroup ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400' : 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
            }`}>
              {isGroup ? <Users className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {isGroup ? 'Group Work Transfer Hub' : 'Active Transfer Bridge'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isGroup
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : connectionState === 'p2p_ready'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                {isGroup ? '👥 Multi-User Broadcast' : connectionState === 'p2p_ready' ? '⚡ Direct WebRTC P2P' : '☁ Server Relay Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isHost ? '👑 Creator / Host PC' : '📱 Connected Member'} •{' '}
              {session?.labComputerId ? `Workstation ${session.labComputerId} • ` : ''}
              {isGroup ? `${memberCount} Member${memberCount === 1 ? '' : 's'} in Room` : peerDevice ? 'Connected to peer' : 'Bridge Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Host button to invite additional members */}
          {isGroup && isHost && (
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-400" />
              <span>Show QR / Invite</span>
            </button>
          )}

          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isGroup && !isHost ? 'Leave Group' : 'Disconnect'}</span>
          </button>
        </div>
      </div>

      {/* Host Permissions Control Banner in Group Mode */}
      {isGroup && isHost && (
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              session?.allowMemberUpload ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {session?.allowMemberUpload ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Member Upload Permissions:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  session?.allowMemberUpload
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {session?.allowMemberUpload ? 'Open Sharing (All Members)' : 'Host-Only Broadcast'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {session?.allowMemberUpload
                  ? 'All members can upload and share files with everyone.'
                  : 'Only you (Host) can send files to the group. Members can only download.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={Boolean(session?.allowMemberUpload)}
              onChange={(e) => handleToggleUploadPermission(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            <span className="ml-2 text-xs font-semibold text-slate-300">
              {session?.allowMemberUpload ? 'Allow Everyone' : 'Host Only'}
            </span>
          </label>
        </div>
      )}

      {/* Member Notification Banner in Group Mode */}
      {isGroup && !isHost && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
          canUpload
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          {canUpload ? <Unlock className="w-5 h-5 shrink-0 text-emerald-400" /> : <Lock className="w-5 h-5 shrink-0 text-amber-400" />}
          <div>
            <p className="font-semibold">
              {canUpload
                ? 'Collaborative Sharing Enabled: The host has permitted all members to send files.'
                : 'Host-Only Mode Active: Only the creator (Host) can send files right now.'}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {canUpload
                ? 'You can upload and share files with everyone in the room.'
                : 'You can receive and download files shared by the host. (হোস্ট চাইলে আপনাকেও ফাইল পাঠানোর অনুমতি দিতে পারে)'}
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Drag & Drop File Upload Stage */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (canUpload) fileInputRef.current?.click();
        }}
        className={`glass-panel-glow p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-all text-center ${
          !canUpload
            ? 'border-slate-800 bg-slate-950/40 opacity-70 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01] cursor-pointer'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 cursor-pointer'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          disabled={!canUpload}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
          !canUpload
            ? 'bg-slate-800 text-slate-500 border-slate-700'
            : isGroup
            ? 'bg-purple-600/10 border-purple-500/20 text-purple-400'
            : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
        }`}>
          {!canUpload ? <Lock className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
        </div>

        <h3 className="text-lg font-bold text-white mb-2">
          {!canUpload
            ? 'File Uploads Restricted by Host'
            : isGroup
            ? isHost
              ? 'Broadcast Files to All Group Members'
              : 'Share Files with Group Members'
            : session?.role === 'peer'
            ? 'Tap to Select Files from Your Phone'
            : 'Drag & Drop or Browse Files to Transfer'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          {!canUpload
            ? 'The session creator has restricted uploads. You can download files sent by the creator below.'
            : isGroup
            ? 'Select assignments, PDFs, code, or images. Files are broadcast to all connected devices in real time.'
            : 'Photos, assignments, PDFs, presentations, or project archives. Files stream directly between devices.'}
        </p>

        <button
          type="button"
          disabled={uploading || !canUpload}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs shadow-lg transition-all ${
            !canUpload
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : isGroup
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-600/30'
          }`}
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Broadcasting...</span>
            </>
          ) : !canUpload ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Uploads Disabled by Host</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>{isGroup ? 'Broadcast Files to Group' : session?.role === 'peer' ? 'Choose Files from Phone' : 'Select Files to Send'}</span>
            </>
          )}
        </button>
      </div>

      {/* Received Files Download Hub (Especially helpful in Group Work) */}
      {receivedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>Received Files ({receivedFiles.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Auto-saved or click to download</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {receivedFiles.map((file, idx) => (
              <div
                key={file.transferId || idx}
                className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Ready'}
                    </p>
                  </div>
                </div>

                <a
                  href={file.url}
                  download={file.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm shadow-emerald-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Transfer Activity Queue */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Session Transfers</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-300">
            {transfers.length}
          </span>
        </h3>

        {transfers.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
            No files transferred yet in this session. Drop any file above to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.direction === 'outbound'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {item.direction === 'outbound' ? (
                      <ArrowUp className="w-5 h-5" />
                    ) : (
                      <ArrowDown className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Streaming'} • {item.direction === 'outbound' ? 'Sent' : 'Received'}
                    </p>
                  </div>
                </div>

                {/* Progress / Speed / Status */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {item.status === 'transferring' && (
                    <div className="flex items-center gap-3 w-48">
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400 w-12 text-right">
                        {item.progress}%
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 hidden sm:inline">
                        {formatSpeed(item.speed)}
                      </span>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed</span>
                    </span>
                  )}

                  {item.status === 'failed' && (
                    <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                      <XCircle className="w-4 h-4" />
                      <span>Failed</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group QR Code & PIN Modal for late joiners */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Invite Members to Group</h3>
            <p className="text-xs text-slate-400 mb-4">
              Students can scan this QR or type the PIN to join this active group session.
            </p>

            {modalQrUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-xl mx-auto w-fit mb-4">
                <img src={modalQrUrl} alt="Group Join QR Code" className="w-48 h-48 object-contain rounded-lg" />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase">Numeric PIN</span>
                <span className="font-mono text-xl font-bold text-purple-300 tracking-wider">
                  {session?.pinCode || '••••••'}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy PIN"
              >
                {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
