import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="py-24 px-4 max-w-md mx-auto text-center">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-2">404</h1>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-400 mb-8 leading-relaxed">
          The requested UniDrop resource or screen does not exist.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-600/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to UniDrop Home</span>
        </Link>
      </div>
    </div>
  );
};
