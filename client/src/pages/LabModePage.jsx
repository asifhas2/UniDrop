import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Monitor, RefreshCw, Copy, Check, Clock, ShieldCheck,
  AlertCircle, ArrowRight, UserCheck, Smartphone, Wifi,
  Users, Lock, Unlock, Sparkles, Share2
} from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

export const LabModePage = () => {
  const { session, peerDevice, memberCount, initSession, toggleMemberUpload } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState(() => (searchParams.get('mode') === 'group' ? 'group' : 'direct'));
  const [allowMemberUpload, setAllowMemberUpload] = useState(false);
  const [labId, setLabId] = useState(() => localStorage.getItem('unidrop_lab_id') || 'LAB-01');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [mobileHost, setMobileHost] = useState(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '192.168.0.107'; // Default detected local Wi-Fi IP
    }
    return window.location.hostname;
  });
  const [sessionRawData, setSessionRawData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Create or refresh session on mount
  useEffect(() => {
    handleGenerateSession(mode, allowMemberUpload);
  }, []);

  // When a peer connects in direct mode, redirect smoothly to the Transfer screen
  useEffect(() => {
    if (mode === 'direct' && (peerDevice || session?.status === 'paired')) {
      navigate('/transfer');
    }
  }, [peerDevice, session?.status, mode, navigate]);

  const generateQrForHost = async (hostIp, data) => {
    if (!data) return;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let joinBaseUrl = window.location.origin;
    if (isLocalhost) {
      const cleanHost = (hostIp || '').trim();
      if (cleanHost.startsWith('http://') || cleanHost.startsWith('https://')) {
        joinBaseUrl = cleanHost.replace(/\/+$/, '');
      } else if (cleanHost.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
        // Live cloud domain (e.g. unidrop.onrender.com or custom domain)
        joinBaseUrl = `https://${cleanHost.replace(/\/+$/, '')}`;
      } else {
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const targetHost = (cleanHost && cleanHost !== 'localhost') ? cleanHost : '192.168.0.107';
        joinBaseUrl = `${protocol}//${targetHost}${port}`;
      }
    }

    const joinUrl = `${joinBaseUrl}/join?qrToken=${data.qrToken}&sessionId=${data.sessionId}`;

    const url = await QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    setQrDataUrl(url);
  };

  const handleGenerateSession = async (targetMode = mode, targetAllowUpload = allowMemberUpload) => {
    try {
      setLoading(true);
      setError('');
      localStorage.setItem('unidrop_lab_id', labId);
      const data = await initSession(labId, targetMode, targetAllowUpload);
      setSessionRawData(data);

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const savedHost = localStorage.getItem('unidrop_mobile_host');
      const customHost = (savedHost && savedHost !== 'localhost') ? savedHost : (mobileHost && mobileHost !== 'localhost' ? mobileHost : null);
      const resolvedHost = isLocalhost ? (customHost || data.networkIp || 'localhost') : window.location.hostname;
      setMobileHost(resolvedHost);
      localStorage.setItem('unidrop_mobile_host', resolvedHost);

      await generateQrForHost(resolvedHost, data);

      // Calculate initial countdown
      const diffSecs = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diffSecs);
    } catch (err) {
      setError(err.message || 'Failed to initialize lab workstation session.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setSearchParams(newMode === 'group' ? { mode: 'group' } : {});
    handleGenerateSession(newMode, allowMemberUpload);
  };

  const handleToggleAllowUpload = async (enabled) => {
    setAllowMemberUpload(enabled);
    if (session?.sessionId) {
      try {
        await toggleMemberUpload(enabled);
      } catch (err) {
        console.error('Failed to toggle upload permissions:', err);
      }
    }
  };

  const handleHostIpChange = async (newIp) => {
    setMobileHost(newIp);
    if (sessionRawData) {
      await generateQrForHost(newIp, sessionRawData);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setError('Pairing session expired. Please regenerate a new QR code.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyPin = () => {
    if (session?.pinCode) {
      navigator.clipboard.writeText(session.pinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 max-w-4xl mx-auto space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleModeChange('direct')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'direct'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>1-to-1 Workstation Mode</span>
          </button>

          <button
            onClick={() => handleModeChange('group')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'group'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>Group Work Mode (Multi-User)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2">
          <input
            type="text"
            value={labId}
            onChange={(e) => setLabId(e.target.value.toUpperCase())}
            placeholder="e.g. LAB-01"
            className="bg-slate-950 border border-slate-800 text-white font-mono text-xs px-3 py-1.5 rounded-xl w-28 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleGenerateSession(mode, allowMemberUpload)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Mode Banner / Header */}
      <div className={`glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
        mode === 'group' ? 'border-purple-500/30 bg-purple-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            mode === 'group'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
              : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          }`}>
            {mode === 'group' ? <Users className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {mode === 'group' ? 'Group Work Station (Multi-User Hub)' : 'University Workstation Mode'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                mode === 'group'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {mode === 'group' ? 'Group Active' : 'Ready'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'group'
                ? 'Multiple students can connect to this single QR code / PIN simultaneously'
                : 'Direct 1-to-1 encrypted bridge with student phone or laptop'}
            </p>
          </div>
        </div>

        {mode === 'group' && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{memberCount} Member{memberCount === 1 ? '' : 's'} Connected</span>
            </span>
            <button
              onClick={() => navigate('/transfer')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all"
            >
              <span>Transfer Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Group Work Permission Control Card (Only in Group Mode) */}
      {mode === 'group' && (
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                allowMemberUpload ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {allowMemberUpload ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">File Upload Permissions for Group Members</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    allowMemberUpload
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {allowMemberUpload ? 'Collaborative: Everyone Can Share' : 'Creator Broadcast Only'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {allowMemberUpload
                    ? 'All joined members can upload and share files with the whole group.'
                    : 'Only you (the host) can broadcast files to members. Others can only receive/download.'}
                </p>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  (আপনি চাইলে সুইচটি অন করে যে কাউকে ফাইল পাঠানোর অনুমতি দিতে পারেন)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMemberUpload}
                  onChange={(e) => handleToggleAllowUpload(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-300">
                  {allowMemberUpload ? 'Members Allowed' : 'Host Only'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Kiosk Pairing Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: High-Visibility QR Code Card */}
        <div className="glass-panel-glow p-8 rounded-3xl border border-slate-800 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{mode === 'group' ? 'Scan to Join Group Session' : 'Scan to Connect Instantly'}</span>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-blue-500/10 mb-5 relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="UniDrop Pairing QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>

          {/* Network Banner */}
          <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 mb-4 text-left">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                  ? 'Phone Wi-Fi Pairing IP:'
                  : 'Cloud Gateway Active:'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              }`}>
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                  ? 'Same Wi-Fi'
                  : 'Any Network (5G / Wi-Fi)'}
              </span>
            </div>
            {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    value={mobileHost}
                    onChange={(e) => handleHostIpChange(e.target.value.trim())}
                    className="flex-1 bg-transparent text-cyan-300 font-mono text-xs font-semibold focus:outline-none"
                    placeholder="e.g. 192.168.0.107 or https://unidrop.onrender.com"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Enter Wi-Fi IP or Render URL</span>
                  <span className="text-cyan-400 font-mono truncate max-w-[200px]">
                    {mobileHost.startsWith('http') || mobileHost.includes('onrender') ? mobileHost : `http://${mobileHost}:5173`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 truncate">
                <span className="text-cyan-300 font-mono text-xs font-semibold">{window.location.origin}</span>
              </div>
            )}
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs">
            <Clock className={`w-3.5 h-3.5 ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`} />
            <span className="text-slate-400">Session expires in:</span>
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-400' : 'text-white'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>

        {/* Right: Numeric Fallback PIN & Instructions */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Alternative Numeric PIN
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              If camera scanning is not available, enter this 6-digit numeric PIN at <span className="text-blue-400 font-mono">{window.location.origin}/join</span> on your phone:
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-900/90 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-center">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  {session?.pinCode || '••••••'}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Copy PIN"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {mode === 'group' ? 'Group Work Instructions' : 'Pairing Instructions'}
            </h4>
            <div className="flex items-start gap-3 text-xs text-slate-400">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
              <span>
                {mode === 'group'
                  ? 'All group members can scan this QR code or enter the 6-digit PIN on their phones/laptops.'
                  : "Scan the QR code directly with your smartphone's camera."}
              </span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-400">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
              <span>
                {mode === 'group'
                  ? 'As members join, they are automatically connected to this group work room.'
                  : 'Once scanned, tap the link on your phone. You will be redirected instantly.'}
              </span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-400">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
              <span>
                {mode === 'group'
                  ? 'You (creator) can broadcast files to everyone, or enable member uploads so anyone can share.'
                  : 'This computer will automatically switch to the transfer screen.'}
              </span>
            </div>
          </div>

          {/* Action button */}
          {mode === 'group' ? (
            <button
              onClick={() => navigate('/transfer')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Enter Group Transfer Hub ({memberCount} Joined)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            peerDevice && (
              <button
                onClick={() => navigate('/transfer')}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Peer Connected! Proceed to File Transfer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
