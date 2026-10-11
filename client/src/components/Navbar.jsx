import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Monitor, ArrowLeftRight, LogOut, Lock } from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

export const Navbar = () => {
  const { session, peerDevice, connectionState, disconnectSession } = useSession();
  const navigate = useNavigate();

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to terminate this transfer session? All temporary keys will be invalidated.')) {
      await disconnectSession();
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-tight">UniDrop</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                P2P
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Campus Lab Peer-to-Peer Transfer</p>
          </div>
        </Link>

        {/* Live Session Status Bar */}
        {session && (
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/80 border border-slate-700/60 rounded-full px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'p2p_ready' ? 'bg-emerald-400 animate-pulse' :
                connectionState === 'connecting' ? 'bg-amber-400 animate-pulse' :
                'bg-blue-400'
              }`} />
              {session.labComputerId ? (
                <span className="text-blue-300 font-mono font-semibold">{session.labComputerId}</span>
              ) : 'Active Session'}
            </span>

            {peerDevice ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1 hidden sm:inline-flex">
                • Device Paired
              </span>
            ) : (
              <span className="text-amber-400 font-medium hidden sm:inline-flex">
                • Waiting for Peer
              </span>
            )}

            <button
              onClick={handleDisconnect}
              className="ml-1 text-slate-400 hover:text-rose-400 transition-colors p-1"
              title="Disconnect Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {!session && (
            <Link
              to="/lab"
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-lg shadow-sm shadow-blue-600/30 transition-all hover:shadow-blue-500/40"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Lab Mode</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
