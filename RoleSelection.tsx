
import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface RoleSelectionProps {
  onSelect: (role: 'interviewer' | 'candidate') => void;
  onSignIn: () => void;
  isAnonymous: boolean;
  isLoading?: boolean;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect, onSignIn, isAnonymous, isLoading }) => {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleInterviewerClick = () => {
    setShowPasswordPrompt(true);
    setError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Azrc11*') {
      onSelect('interviewer');
      setShowPasswordPrompt(false);
      setPassword('');
    } else {
      setError('Incorrect password. Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950">
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-blue-500 font-black uppercase tracking-widest text-xs">Preparing your session...</p>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setShowPasswordPrompt(false)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 text-left">Interviewer Access</h2>
            <p className="text-slate-400 text-sm text-left mb-8">Please enter the security password to proceed to the recruiter dashboard.</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl text-white outline-none transition-all placeholder:text-slate-700 font-mono"
                />
                {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-left pl-2">{error}</p>}
              </div>
              
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify Access
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl mb-6 border border-blue-500/30 shadow-lg">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">AI Talent Scout</h1>
        <p className="text-slate-400 text-lg font-medium">Choose the relevant option below</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={handleInterviewerClick}
          className="group relative flex flex-col items-center p-10 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-[2.5rem] transition-all duration-300 shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white mb-2">Interviewer</span>
          <span className="text-slate-500 text-sm uppercase tracking-[0.2em] font-black">Access Reports</span>
        </button>

        <button
          onClick={() => onSelect('candidate')}
          className="group relative flex flex-col items-center p-10 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-[2.5rem] transition-all duration-300 shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white mb-2">Candidate</span>
          <span className="text-slate-500 text-sm uppercase tracking-[0.2em] font-black">Start Interview</span>
        </button>
      </div>

      {isAnonymous && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Want to save your data permanently?</p>
          <button
            onClick={onSignIn}
            className="flex items-center gap-3 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl border border-slate-800 transition-all text-[10px] font-black uppercase tracking-widest group"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
};
