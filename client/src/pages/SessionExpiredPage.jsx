import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, ArrowRight, RotateCcw } from 'lucide-react';

export const SessionExpiredPage = () => {
  return (
    <div className="py-20 px-4 max-w-md mx-auto text-center">
      <div className="glass-panel-glow p-8 rounded-3xl border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
          <Clock className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Session Terminated</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          This transfer session has expired or was disconnected. For university security, all pairing tokens, ephemeral storage buffers, and room channels have been automatically shredded.
        </p>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs text-slate-400 space-y-2 mb-8">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Data Residue</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your personal credentials were never required, and no persistent accounts remain logged in on the lab computer.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/lab"
            className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Launch New Lab Session</span>
          </Link>

          <Link
            to="/"
            className="w-full py-3 px-6 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
