import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle,
  Download, ArrowDown, ArrowUp, Zap, Shield, LogOut, Laptop, Smartphone,
  RefreshCw, HardDrive
} from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';
import { formatBytes, formatSpeed } from '../utils/formatters.js';

export const TransferPage = () => {
  const { session, peerDevice, connectionState, transferMode, transfers, receivedFiles, sendFile, disconnectSession } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // If no active session, redirect to landing
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
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
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDisconnect = async () => {
    if (window.confirm('Terminate this transfer session? All temporary keys will be destroyed.')) {
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
    <div className="py-8 sm:py-12 px-4 max-w-5xl mx-auto space-y-8">
      {/* Top Connected Status Bar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Active Transfer Bridge</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                connectionState === 'p2p_ready'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                {connectionState === 'p2p_ready' ? '⚡ Direct WebRTC P2P' : '☁ Server Relay Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {session?.role === 'peer' ? '📱 Mobile Device' : '💻 Lab Workstation'} •{' '}
              {session?.labComputerId ? `Workstation ${session.labComputerId} • ` : ''}
              {peerDevice ? 'Connected to peer' : 'Bridge Ready'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect Session</span>
        </button>
      </div>

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
        onClick={() => fileInputRef.current?.click()}
        className={`glass-panel-glow p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">
          {session?.role === 'peer' ? 'Tap to Select Files from Your Phone' : 'Drag & Drop or Browse Files to Transfer'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          Photos, assignments, PDFs, presentations, or project archives. Files stream directly between devices.
        </p>

        <button
          type="button"
          disabled={uploading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all pointer-events-none"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Transferring...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>{session?.role === 'peer' ? 'Choose Files from Phone' : 'Select Files to Send'}</span>
            </>
          )}
        </button>
      </div>

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
    </div>
  );
};
