
import React, { useState } from 'react';

interface InterviewerLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export const InterviewerLogin: React.FC<InterviewerLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Azrc11*') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-2xl p-12 rounded-[3rem] border border-slate-800 shadow-2xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl mb-6 border border-blue-500/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Recruiter Access</h1>
          <p className="text-slate-500 font-medium">Please enter the security password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-6 py-4 bg-slate-950 border rounded-2xl focus:ring-2 transition-all text-white placeholder:text-slate-700 font-medium ${
                error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-800 focus:ring-blue-500/50 focus:border-blue-500'
              }`}
            />
            {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1 uppercase tracking-wider">Invalid password</p>}
          </div>

          <div className="flex flex-col space-y-4 pt-4">
            <button
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98] uppercase tracking-widest"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-4 text-slate-500 hover:text-white font-bold text-sm transition-all uppercase tracking-[0.2em]"
            >
              Back to Role Selection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
