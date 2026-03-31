
import React from 'react';
import { InterviewReport } from '../types';
import { Award, TrendingUp, ShieldCheck, XCircle, ChevronLeft, Download, FileText, User, Briefcase } from 'lucide-react';

interface ReportViewProps {
  report: InterviewReport;
  onBack: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onBack }) => {
  const getVerdictStyles = (v: string) => {
    switch (v) {
      case 'Hire': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Reject': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  // Helper for user's specific request: bold titles with yellow background
  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="font-black text-slate-950 bg-yellow-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest mr-2 inline-block">
      {children}
    </span>
  );

  return (
    <div className="max-w-5xl mx-auto my-12 bg-slate-950 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden">
      {/* Header Section */}
      <div className="bg-slate-900/50 p-12 border-b border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500 font-black tracking-[0.2em] uppercase text-xs">
              <ShieldCheck className="w-4 h-4" />
              Verified Assessment Report
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight">
              Executive Interview <br />
              <span className="text-slate-500 italic">Scorecard</span>
            </h1>
          </div>
          <div className={`px-10 py-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 ${getVerdictStyles(report.finalVerdict)}`}>
            <Label>Verdict</Label>
            <span className="text-4xl font-black tracking-tighter">{report.finalVerdict}</span>
          </div>
        </div>
      </div>

      <div className="p-12 space-y-16">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <Award className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-5xl font-black text-white mb-2">{report.overallScore}</div>
            <Label>Overall Score</Label>
          </div>

          <div className="md:col-span-2 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <Label>Behavioral Analysis</Label>
            </div>
            <p className="text-slate-300 leading-relaxed font-medium italic">
              "{report.behavioralAnalysis}"
            </p>
          </div>
        </div>

        {/* Skills Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Technical Proficiency</h3>
              <Label>Hard Skills</Label>
            </div>
            <div className="space-y-6">
              {report.hardSkills?.map((s, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{s.skill}</span>
                    <span className={`text-sm font-black ${getScoreColor(s.score)}`}>{s.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                      style={{ width: `${s.score}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Professional Attributes</h3>
              <Label>Soft Skills</Label>
            </div>
            <div className="space-y-6">
              {report.softSkills?.map((s, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{s.skill}</span>
                    <span className={`text-sm font-black ${getScoreColor(s.score)}`}>{s.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                      style={{ width: `${s.score}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive Summary Section */}
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800/50 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              <Label>Summary</Label>
              Executive Summary
            </h3>
          </div>
          <p className="text-slate-400 leading-relaxed text-lg font-medium">
            {report.summary}
          </p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
              <Label>Strengths</Label>
            </div>
            <div className="space-y-4">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                  <span className="text-slate-300 font-medium leading-tight">{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <XCircle className="w-5 h-5" />
              <Label>Growth Areas</Label>
            </div>
            <div className="space-y-4">
              {report.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 shrink-0" />
                  <span className="text-slate-300 font-medium leading-tight">{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black transition-all border border-slate-800 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Download Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};
