import React from 'react';
import { Shield, Lock, Cpu, Globe } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 px-4 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>UniDrop • Secure Ephemeral File Transfer for University Laboratories</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-slate-500">
          <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> DTLS / SCTP P2P Encryption
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
            <Cpu className="w-3.5 h-3.5 text-blue-400" /> Zero Personal Account Logging
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
            <Globe className="w-3.5 h-3.5 text-cyan-400" /> Automatic TTL Shredding
          </span>
        </div>
      </div>
    </footer>
  );
};
