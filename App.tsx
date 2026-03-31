
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { AppState, InterviewSetup, InterviewReport, UserRole, InterviewSessionData } from './types';
import { RoleSelection } from './components/RoleSelection';
import { CandidateSetup } from './components/CandidateSetup';
import { InterviewerDashboard } from './components/InterviewerDashboard';
import { InterviewSession } from './components/InterviewSession';
import { ReportView } from './components/ReportView';
import { LogIn, LogOut, Loader2, Brain, CheckCircle2 } from 'lucide-react';
import { saveRecording } from './src/lib/db';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<{ uid: string; displayName: string; email: string } | null>(null);
  const [profile, setProfile] = useState<{ role: UserRole } | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<AppState>(AppState.ROLE_SELECTION);
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [interviews, setInterviews] = useState<InterviewSessionData[]>([]);
  const [globalJD, setGlobalJD] = useState<string>('');
  const [interviewId, setInterviewId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedInterviews = localStorage.getItem('interviews');
    if (savedInterviews) {
      setInterviews(JSON.parse(savedInterviews));
    }
    const savedJD = localStorage.getItem('globalJD');
    if (savedJD) {
      setGlobalJD(savedJD);
    }
  }, []);

  // Save to localStorage when interviews or JD change
  useEffect(() => {
    localStorage.setItem('interviews', JSON.stringify(interviews));
  }, [interviews]);

  useEffect(() => {
    localStorage.setItem('globalJD', globalJD);
  }, [globalJD]);

  const handleUpdateJD = (jd: string) => {
    setGlobalJD(jd);
  };

  const handleStart = React.useCallback((config: InterviewSetup, id: string) => {
    if (!user) return;
    const finalSetup = {
      ...config,
      description: config.description || globalJD || 'General interview.'
    };
    setSetup(finalSetup);
    setInterviewId(id);
    
    // Create initial interview record
    const newInterview: InterviewSessionData = {
      id,
      candidateId: user.uid,
      setup: finalSetup,
      status: 'ongoing',
      startTime: new Date(),
      transcript: [],
      candidateName: finalSetup.candidateName,
      vacancy: finalSetup.vacancy,
      description: finalSetup.description
    };
    setInterviews(prev => [newInterview, ...prev]);
    setState(AppState.INTERVIEWING);
  }, [user, globalJD]);

  const handleEnd = React.useCallback(async (transcript: string[], videoBlob?: Blob) => {
    if (interviewId && videoBlob) {
      try {
        await saveRecording(interviewId, videoBlob);
      } catch (err) {
        console.error("Failed to save recording to IndexedDB:", err);
      }
    }

    if (interviewId) {
      setInterviews(prev => prev.map(inv => 
        inv.id === interviewId 
          ? { ...inv, status: 'completed', endTime: new Date(), transcript } 
          : inv
      ));
    }
    
    setState(AppState.CANDIDATE_FINISHED);
  }, [interviewId]);

  const handleRoleSelect = async (role: 'interviewer' | 'candidate') => {
    setIsSelectingRole(true);
    const userRole: UserRole = role === 'interviewer' ? 'recruiter' : 'candidate';
    const mockUser = {
      uid: 'local-user-' + Math.random().toString(36).substr(2, 9),
      displayName: role === 'interviewer' ? 'Recruiter' : '',
      email: role === 'interviewer' ? 'recruiter@local.test' : 'candidate@local.test',
      role: userRole
    };
    
    setUser(mockUser);
    setProfile({ role: userRole });
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    if (userRole === 'recruiter') {
      setState(AppState.INTERVIEWER_DASHBOARD);
    } else {
      setState(AppState.CANDIDATE_SETUP);
    }
    setIsSelectingRole(false);
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    setState(AppState.ROLE_SELECTION);
  };

  const generateReport = async (interview: InterviewSessionData) => {
    setState(AppState.GENERATING_REPORT);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      const prompt = `
        As an expert recruiter, analyze the following transcript of an interview for the role of "${interview.vacancy}" with candidate "${interview.candidateName}".
        Consider the candidate's answers, tone, and behavioral analysis cues provided in the context of a high-stakes interview.
        
        Transcript:
        ${interview.transcript?.join('\n')}
        
        Job Description:
        ${interview.description}

        Generate a detailed recruitment report in JSON format with this schema:
        - overallScore: number (0-100)
        - summary: string (deep professional summary)
        - strengths: string[] (at least 3)
        - weaknesses: string[] (at least 2)
        - hardSkills: array of { skill: string, score: number }
        - softSkills: array of { skill: string, score: number }
        - behavioralAnalysis: string (detailed analysis of attitude, mimics, and non-verbal communication)
        - finalVerdict: "Hire", "Reject", or "Consider"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              hardSkills: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    skill: { type: Type.STRING }, 
                    score: { type: Type.NUMBER } 
                  },
                  required: ['skill', 'score']
                } 
              },
              softSkills: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    skill: { type: Type.STRING }, 
                    score: { type: Type.NUMBER } 
                  },
                  required: ['skill', 'score']
                } 
              },
              behavioralAnalysis: { type: Type.STRING },
              finalVerdict: { type: Type.STRING, enum: ['Hire', 'Reject', 'Consider'] },
            },
            required: ['overallScore', 'summary', 'strengths', 'weaknesses', 'hardSkills', 'softSkills', 'behavioralAnalysis', 'finalVerdict'],
          },
        },
      });

      const result = JSON.parse(response.text);
      
      // Update local state with the report
      setInterviews(prev => prev.map(inv => 
        inv.id === interview.id 
          ? { ...inv, report: response.text, status: 'analyzed', analysisDate: new Date() } 
          : inv
      ));

      setReport({
        overallScore: result.overallScore,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        hardSkills: result.hardSkills,
        softSkills: result.softSkills,
        behavioralAnalysis: result.behavioralAnalysis,
        finalVerdict: result.finalVerdict
      });
      setState(AppState.REPORT_READY);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert("Failed to call the Gemini API to generate the report. Please try again.");
      setState(AppState.ROLE_SELECTION);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      {user && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-slate-900/50 backdrop-blur-md p-2 pl-4 rounded-full border border-slate-800">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white">{user.displayName || user.email}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{profile?.role}</span>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {state === AppState.ROLE_SELECTION && (
        <RoleSelection 
          onSelect={handleRoleSelect} 
          onSignIn={() => {}} // No-op for local
          isAnonymous={false}
          isLoading={isSelectingRole}
        />
      )}

      {state === AppState.CANDIDATE_SETUP && (
        <CandidateSetup onStart={handleStart} user={user} />
      )}

      {state === AppState.INTERVIEWER_DASHBOARD && (
        <InterviewerDashboard
          globalJD={globalJD}
          onUpdateJD={handleUpdateJD}
          onGenerateReport={generateReport}
          onBack={() => setState(AppState.ROLE_SELECTION)}
          candidateName={setup?.candidateName}
          vacancy={setup?.vacancy}
          interviews={interviews}
        />
      )}
      
      {state === AppState.INTERVIEWING && setup && interviewId && (
        <InterviewSession setup={setup} interviewId={interviewId} onEnd={handleEnd} />
      )}

      {state === AppState.CANDIDATE_FINISHED && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950">
          <div className="w-28 h-28 bg-emerald-500/10 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-10 border border-emerald-500/20 shadow-2xl">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-white mb-6">Session Recorded</h1>
          <p className="text-slate-400 max-w-lg mx-auto mb-16 text-lg leading-relaxed font-medium">
            Your interview for <span className="text-blue-400 font-bold">{setup?.vacancy}</span> has been processed. Our HR team will review the non-verbal analysis and transcripts.
          </p>
          <button 
            onClick={() => setState(AppState.ROLE_SELECTION)}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Back to Home
          </button>
        </div>
      )}

      {state === AppState.GENERATING_REPORT && (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-10 bg-slate-950">
          <div className="relative">
             <div className="w-20 h-20 border-[4px] border-blue-500/20 rounded-full" />
             <div className="absolute inset-0 w-20 h-20 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Compiling Intelligence Report</h2>
            <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-xs">Cross-referencing JD requirements with interview performance</p>
          </div>
        </div>
      )}

      {state === AppState.REPORT_READY && report && (
        <ReportView report={report} onBack={() => setState(AppState.INTERVIEWER_DASHBOARD)} />
      )}
    </main>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
