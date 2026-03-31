
import React, { useState } from 'react';
import { InterviewSetup } from '../types';
import { User, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';

interface CandidateSetupProps {
  onStart: (setup: InterviewSetup, interviewId: string) => void;
  user: { uid: string; displayName: string | null } | null;
}

export const CandidateSetup: React.FC<CandidateSetupProps> = ({ onStart, user }) => {
  const [candidateName, setCandidateName] = useState(user?.displayName || '');
  const [vacancy, setVacancy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (candidateName.trim() && vacancy.trim()) {
      setIsSubmitting(true);
      try {
        const interviewId = `int_${Date.now()}_${user.uid.slice(0, 5)}`;
        const setup: InterviewSetup = { 
          candidateName, 
          vacancy, 
          description: '' // Removed from candidate view
        };

        onStart(setup, interviewId);
      } catch (error) {
        console.error('Error saving interview setup:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950">
      <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-2xl p-12 rounded-[3rem] border border-slate-800 shadow-2xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl mb-6 border border-emerald-500/20">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Candidate Registration</h1>
          <p className="text-slate-500 font-medium">Please provide your details to begin the session.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Your Name
            </label>
            <input
              type="text"
              required
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-white placeholder:text-slate-700 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Briefcase className="w-3 h-3" /> Vacancy Name
            </label>
            <input
              type="text"
              required
              value={vacancy}
              onChange={(e) => setVacancy(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-white placeholder:text-slate-700 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-950 font-black text-lg rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Ready
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
