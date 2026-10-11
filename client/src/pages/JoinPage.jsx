import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, QrCode, ArrowRight, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

export const JoinPage = () => {
  const [searchParams] = useSearchParams();
  const { joinSession } = useSession();
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If query params contains qrToken, automatically attempt to pair
  useEffect(() => {
    const qrToken = searchParams.get('qrToken');
    const sessionId = searchParams.get('sessionId');

    if (qrToken) {
      handleAutoJoin(qrToken, sessionId);
    }
  }, [searchParams]);

  const handleAutoJoin = async (qrToken, sessionId) => {
    try {
      setLoading(true);
      setError('');
      await joinSession({ qrToken, sessionId });
      navigate('/transfer');
    } catch (err) {
      setError(err.message || 'QR Pairing failed or session expired.');
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
      await joinSession({ pinCode: pinCode.trim() });
      navigate('/transfer');
    } catch (err) {
      setError(err.message || 'Invalid or expired PIN code.');
    } finally {
      setLoading(false);
    }
  };

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
            ) : (
              <>
                <span>Connect to Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
          <p>Scanned via QR Code? If prompted, allow camera access on your device.</p>
        </div>
      </div>
    </div>
  );
};
