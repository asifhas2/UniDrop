import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KeyRound, QrCode, ArrowRight, ShieldAlert, CheckCircle2,
  RefreshCw, Smartphone, Laptop, Sparkles, AlertCircle
} from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

export const JoinPage = () => {
  const [searchParams] = useSearchParams();
  const { session, joinSession } = useSession();
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const navigate = useNavigate();

  const qrToken = searchParams.get('qrToken');
  const sessionId = searchParams.get('sessionId');

  // If already paired in context, redirect immediately to transfer upload page
  useEffect(() => {
    if (session && session.sessionId && session.role === 'peer') {
      navigate('/transfer', { replace: true });
    }
  }, [session, navigate]);

  // If URL has qrToken, automatically pair and redirect
  useEffect(() => {
    if (qrToken && !showPinFallback) {
      handleAutoJoin(qrToken, sessionId);
    }
  }, [qrToken, sessionId, showPinFallback]);

  const handleAutoJoin = async (token, sId) => {
    try {
      setLoading(true);
      setError('');
      setIsSuccess(false);

      await joinSession({ qrToken: token, sessionId: sId });

      setIsSuccess(true);
      // Seamless micro-delay for visual confirmation, then instant redirect to upload
      setTimeout(() => {
        navigate('/transfer', { replace: true });
      }, 600);
    } catch (err) {
      setError(err.message || 'QR Pairing failed or session has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pinCode || pinCode.trim().length !== 6) {
      setError('Please enter a complete 6-digit numeric PIN.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setIsSuccess(false);

      await joinSession({ pinCode: pinCode.trim() });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/transfer', { replace: true });
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid or expired PIN code.');
    } finally {
      setLoading(false);
    }
  };

  // If scanned via QR code and not choosing manual PIN fallback:
  if (qrToken && !showPinFallback) {
    return (
      <div className="py-12 px-4 max-w-md mx-auto">
        <div className="glass-panel-glow p-8 rounded-3xl border border-slate-800 text-center">
          {/* Animated Status Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            {isSuccess ? (
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : error ? (
              <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10" />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <RefreshCw className="w-9 h-9 animate-spin" />
                </div>
              </>
            )}
          </div>

          {/* Heading & Subtitle */}
          {isSuccess ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Connected Successfully!</h1>
              <p className="text-xs text-emerald-400 mb-6 flex items-center justify-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Encrypted peer bridge active. Opening file upload...</span>
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Pairing Failed</h1>
              <div className="p-3.5 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleAutoJoin(qrToken, sessionId)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry QR Connection</span>
                </button>
                <button
                  onClick={() => setShowPinFallback(true)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
                >
                  Enter 6-Digit PIN Manually
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Pairing with Lab PC...</h1>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                QR code verified. Connecting your device to the lab workstation and redirecting you to upload files.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-800/40 rounded-xl py-2 px-3">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Establishing encrypted WebRTC channel...</span>
              </div>
            </>
          )}

          {/* Quick Info Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-blue-400" /> Lab PC
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Your Phone
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Manual PIN Fallback View:
  return (
    <div className="py-12 px-4 max-w-md mx-auto">
      <div className="glass-panel-glow p-8 rounded-3xl border border-slate-800 text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cyan-500/20">
          <KeyRound className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Connect to Lab PC</h1>
        <p className="text-xs text-slate-400 mb-8 leading-relaxed">
          Enter the 6-digit PIN displayed on the lab workstation screen to establish a temporary encrypted file bridge.
        </p>

        {error && (
          <div className="p-3.5 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6-Digit PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              6-Digit Numeric PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full text-center font-mono text-3xl tracking-[0.4em] py-3.5 bg-slate-900/90 border border-slate-700 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pinCode.length !== 6}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Pairing Device...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Connected! Redirecting...</span>
              </>
            ) : (
              <>
                <span>Connect to Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
          <p>Scan the QR code on the lab PC to pair instantly without typing a PIN.</p>
        </div>
      </div>
    </div>
  );
};
