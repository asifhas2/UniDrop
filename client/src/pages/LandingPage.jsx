import React from 'react';
import { Link } from 'react-router-dom';
import { Monitor, QrCode, ArrowRight, ShieldCheck, Zap, Lock, HardDrive, Smartphone, CheckCircle2, Users } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="relative overflow-hidden py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          University Computer Lab File Bridge
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
          Zero-Login File Transfer for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Campus Labs</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-10">
          Transfer assignments, code, PDFs, and lab work directly between shared university computers and personal phones or laptops. No WhatsApp Web. No Gmail logins. No USB malware risks.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
          <Link
            to="/lab"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Monitor className="w-4 h-4" />
            <span>1-to-1 Lab Mode</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/lab?mode=group"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40 hover:-translate-y-0.5"
          >
            <Users className="w-4 h-4" />
            <span>Group Work Mode</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/join"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all border border-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Scan / Join Session</span>
          </Link>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Zero Personal Accounts</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Students never log in to personal messaging or cloud accounts on public computers. Sessions are strictly temporary and leave zero residue.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">High-Speed WebRTC P2P</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Direct browser-to-browser streaming chunked over encrypted DataChannels. Transfer gigabyte files at full local network bandwidth without server throttling.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <HardDrive className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Ephemeral Auto-Shredding</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pairing tokens expire automatically in minutes. When server-relay fallback is used, transferred files are securely shredded immediately upon delivery.
          </p>
        </div>
      </div>

      {/* 4-Step User Journey Timeline */}
      <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800 mb-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h3 className="text-2xl font-bold text-white mb-2">Effortless 4-Step Lab Transfer</h3>
          <p className="text-sm text-slate-400">Engineered for busy university computer laboratories</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-sm flex items-center justify-center mb-3">1</div>
            <h4 className="text-base font-semibold text-white mb-1">Launch Lab Mode</h4>
            <p className="text-xs text-slate-400">Open UniDrop on any lab PC. A short-lived QR code and 6-digit PIN are created.</p>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 font-bold text-sm flex items-center justify-center mb-3">2</div>
            <h4 className="text-base font-semibold text-white mb-1">Scan or Enter PIN</h4>
            <p className="text-xs text-slate-400">Scan the screen with your smartphone camera or type the PIN on your personal laptop.</p>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-3">3</div>
            <h4 className="text-base font-semibold text-white mb-1">Drag & Drop Files</h4>
            <p className="text-xs text-slate-400">Send PDFs, assignments, ZIP archives, or source code in either direction seamlessly.</p>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 font-bold text-sm flex items-center justify-center mb-3">4</div>
            <h4 className="text-base font-semibold text-white mb-1">Auto-Cleaned</h4>
            <p className="text-xs text-slate-400">Disconnect with one click or let the session self-destruct upon countdown expiry.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
