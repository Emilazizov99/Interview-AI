
export type UserRole = 'recruiter' | 'candidate' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

export interface InterviewSetup {
  candidateName: string;
  vacancy: string;
  description: string;
}

export interface InterviewReport {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  hardSkills: { skill: string; score: number }[];
  softSkills: { skill: string; score: number }[];
  behavioralAnalysis: string;
  finalVerdict: 'Hire' | 'Reject' | 'Consider';
}

export interface InterviewSessionData {
  id: string;
  candidateId: string;
  candidateName: string;
  vacancy: string;
  description: string;
  recruiterId?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'analyzed';
  startTime?: any;
  endTime?: any;
  transcript?: string[];
  setup: InterviewSetup;
  recordingUrl?: string;
  report?: string;
  analysisDate?: any;
}

export enum AppState {
  AUTH = 'AUTH',
  ROLE_SELECTION = 'ROLE_SELECTION',
  CANDIDATE_SETUP = 'CANDIDATE_SETUP',
  INTERVIEWER_DASHBOARD = 'INTERVIEWER_DASHBOARD',
  INTERVIEWING = 'INTERVIEWING',
  CANDIDATE_FINISHED = 'CANDIDATE_FINISHED',
  GENERATING_REPORT = 'GENERATING_REPORT',
  REPORT_READY = 'REPORT_READY'
}
