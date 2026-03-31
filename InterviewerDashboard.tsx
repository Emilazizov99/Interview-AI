
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { InterviewReport, InterviewSessionData } from '../types';
import { ReportView } from './ReportView';
import { FileText, Video, BarChart3, Upload, Loader2, Download, Search, User, Calendar } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { getRecording } from '../src/lib/db';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface InterviewerDashboardProps {
  globalJD: string;
  onUpdateJD: (jd: string) => void;
  onGenerateReport: (interview: InterviewSessionData) => void;
  onBack: () => void;
  candidateName?: string;
  vacancy?: string;
  interviews: InterviewSessionData[];
}

export const InterviewerDashboard: React.FC<InterviewerDashboardProps> = ({
  globalJD,
  onUpdateJD,
  onGenerateReport,
  onBack,
  candidateName,
  vacancy,
  interviews
}) => {
  const [activeTab, setActiveTab] = useState<'jd' | 'interviews' | 'report'>('interviews');
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSessionData | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recording from IndexedDB when selectedInterview changes
  React.useEffect(() => {
    let url: string | null = null;
    
    const loadRecording = async () => {
      if (selectedInterview) {
        try {
          const blob = await getRecording(selectedInterview.id);
          if (blob) {
            url = URL.createObjectURL(blob);
            setRecordingUrl(url);
          } else {
            setRecordingUrl(null);
          }
        } catch (err) {
          console.error("Error loading recording:", err);
          setRecordingUrl(null);
        }
      } else {
        setRecordingUrl(null);
      }
    };

    loadRecording();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selectedInterview]);

  const downloadReport = (interview: InterviewSessionData) => {
    if (!interview.report) return;
    try {
      const reportData = JSON.parse(interview.report);
      const rows = [
        ['Field', 'Value'],
        ['Candidate Name', interview.setup.candidateName],
        ['Vacancy', interview.setup.vacancy],
        ['Interview Date', new Date(interview.startTime).toLocaleString()],
        ['Overall Score', `${reportData.overallScore}%`],
        ['Summary', reportData.summary],
        ['Verdict', reportData.finalVerdict],
        ['', ''],
        ['Hard Skills', 'Score'],
        ...reportData.hardSkills.map((s: any) => [s.skill, `${s.score}%`]),
        ['', ''],
        ['Soft Skills', 'Score'],
        ...reportData.softSkills.map((s: any) => [s.skill, `${s.score}%`]),
        ['', ''],
        ['Strengths', ''],
        ...reportData.strengths.map((s: string) => [s]),
        ['', ''],
        ['Weaknesses', ''],
        ...reportData.weaknesses.map((w: string) => [w]),
        ['', ''],
        ['Detailed Analysis', ''],
        ['Behavioral Analysis', reportData.behavioralAnalysis],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Interview Report');
      XLSX.writeFile(wb, `Report_${interview.setup.candidateName.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {
      console.error("Failed to download Excel report:", e);
    }
  };

  const downloadAllReports = () => {
    const analyzedInterviews = interviews.filter(inv => inv.report);
    if (analyzedInterviews.length === 0) return;

    const wb = XLSX.utils.book_new();
    
    analyzedInterviews.forEach(interview => {
      try {
        const reportData = JSON.parse(interview.report!);
        const rows = [
          ['Field', 'Value'],
          ['Candidate Name', interview.setup.candidateName],
          ['Vacancy', interview.setup.vacancy],
          ['Interview Date', new Date(interview.startTime).toLocaleString()],
          ['Overall Score', `${reportData.overallScore}%`],
          ['Summary', reportData.summary],
          ['Verdict', reportData.finalVerdict],
          ['', ''],
          ['Hard Skills', 'Score'],
          ...reportData.hardSkills.map((s: any) => [s.skill, `${s.score}%`]),
          ['', ''],
          ['Soft Skills', 'Score'],
          ...reportData.softSkills.map((s: any) => [s.skill, `${s.score}%`]),
          ['', ''],
          ['Strengths', ''],
          ...reportData.strengths.map((s: string) => [s]),
          ['', ''],
          ['Weaknesses', ''],
          ...reportData.weaknesses.map((w: string) => [w]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, interview.setup.candidateName.substring(0, 30));
      } catch (e) {}
    });

    XLSX.writeFile(wb, `All_Interview_Reports.xlsx`);
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    if (fileType === 'application/pdf') {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (fileType === 'text/plain') {
      return await file.text();
    } else {
      // Fallback to Gemini for other types if possible, but warn
      console.warn(`Unsupported file type: ${fileType}. Attempting fallback.`);
      return '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtracting(true);
    let combinedExtractedText = '';
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileName(file.name);
        
        let extractedText = await extractTextFromFile(file);
        
        if (!extractedText) {
          // Fallback to Gemini if extraction failed or type is unknown
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              {
                parts: [
                  { inlineData: { data: base64, mimeType: file.type || 'application/octet-stream' } },
                  { text: `Extract the full job description, responsibilities, and requirements from this document named "${file.name}". Provide only the text content found within the document.` }
                ]
              }
            ]
          });
          extractedText = response.text || "";
        }

        combinedExtractedText += `\n\n--- Extracted from ${file.name} ---\n${extractedText}`;
      }

      const newJD = globalJD ? `${globalJD}${combinedExtractedText}` : combinedExtractedText.trim();
      onUpdateJD(newJD);
    } catch (err) {
      console.error("Error extracting JD:", err);
      alert("Failed to extract text from the document. Please try copy-pasting the text manually.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadJD = () => {
    if (!globalJD) return;
    try {
      const blob = new Blob([globalJD], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'job_description.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading JD:", err);
      alert("Failed to download the file. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Recruiter Dashboard</h1>
            <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-xs mt-2">Management & Intelligence Center</p>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all text-xs font-black uppercase tracking-widest"
          >
            Logout
          </button>
        </div>

        <div className="flex space-x-4 mb-10">
          <button
            onClick={() => setActiveTab('interviews')}
            className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex items-center gap-3 ${
              activeTab === 'interviews' 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <Video className="w-4 h-4" /> Interviews
          </button>
          <button
            onClick={() => setActiveTab('jd')}
            className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex items-center gap-3 ${
              activeTab === 'jd' 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" /> Job Description
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex items-center gap-3 ${
              activeTab === 'report' 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Intelligence
          </button>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-[3rem] border border-slate-800 p-12 shadow-2xl min-h-[600px]">
          {activeTab === 'interviews' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Recent Interviews</h2>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search candidates..."
                    className="bg-slate-950 border border-slate-800 rounded-full pl-12 pr-6 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {interviews.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                    <Video className="w-12 h-12 mb-4 opacity-20" />
                    <p className="uppercase tracking-widest text-[10px] font-black">No interviews found</p>
                  </div>
                ) : (
                  interviews.map((interview) => (
                    <div 
                      key={interview.id}
                      onClick={() => setSelectedInterview(interview)}
                      className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                        selectedInterview?.id === interview.id 
                          ? 'bg-blue-600/10 border-blue-500/50 shadow-xl shadow-blue-500/10' 
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold">{interview.setup.candidateName}</h3>
                            <p className="text-slate-500 text-xs font-medium">{interview.setup.vacancy}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          interview.status === 'analyzed' ? 'bg-emerald-500/10 text-emerald-500' :
                          interview.status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {interview.startTime instanceof Date 
                            ? interview.startTime.toLocaleDateString() 
                            : typeof interview.startTime === 'string'
                              ? new Date(interview.startTime).toLocaleDateString()
                              : 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          {interview.transcript?.length || 0} Lines
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedInterview && (
                <div className="mt-12 p-8 bg-slate-950 rounded-[2.5rem] border border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-white">Interview Details: {selectedInterview.setup.candidateName}</h3>
                    <div className="flex gap-4">
                      {selectedInterview.report && (
                        <button 
                          onClick={() => downloadReport(selectedInterview)}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <Download className="w-3 h-3" /> Download Report
                        </button>
                      )}
                      <button 
                        onClick={() => selectedInterview && onGenerateReport(selectedInterview)}
                        disabled={selectedInterview.status !== 'completed' && selectedInterview.status !== 'analyzed'}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          selectedInterview.status === 'completed' || selectedInterview.status === 'analyzed'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {selectedInterview.status === 'analyzed' ? 'Re-analyze with AI' : 'Analyze with AI'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Transcript Preview</h4>
                        <div className="max-h-60 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                          {selectedInterview.transcript?.map((line, i) => (
                            <div key={i} className="text-sm text-slate-400 leading-relaxed">
                              {line}
                            </div>
                          )) || <p className="text-slate-600 italic">No transcript available.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Interview Recording</h4>
                        {recordingUrl ? (
                          <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-700">
                            <video 
                              src={recordingUrl} 
                              controls 
                              className="w-full h-full"
                            />
                            <div className="p-4 bg-slate-800/50 flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Video Recording</span>
                              <a 
                                href={recordingUrl} 
                                download={`Interview_${selectedInterview.setup.candidateName.replace(/\s+/g, '_')}.webm`}
                                className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                              >
                                <Download className="w-3 h-3" /> Download Video
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-950 rounded-xl flex flex-col items-center justify-center border border-slate-800 border-dashed">
                            <Video className="w-8 h-8 text-slate-700 mb-2" />
                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">No recording available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jd' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Upload Job Description</h2>
                <div className="flex items-center gap-4">
                  {globalJD && (
                    <>
                      <button 
                        onClick={downloadJD}
                        className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" /> Download JD
                      </button>
                      <button 
                        onClick={() => onUpdateJD('')}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Clear All
                      </button>
                    </>
                  )}
                  {fileName && <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Last: {fileName}</span>}
                </div>
              </div>
              
              <div 
                onClick={() => !isExtracting && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2rem] p-16 text-center transition-all cursor-pointer ${
                  isExtracting ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50'
                }`}
              >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    multiple
                  />
                {isExtracting ? (
                  <div className="flex flex-col items-center space-y-6">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    <p className="text-blue-400 font-black uppercase tracking-widest">AI is processing document...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="w-20 h-20 bg-slate-800 text-slate-500 rounded-3xl flex items-center justify-center">
                      <Upload className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-white text-xl font-bold">Drop JD File Here</p>
                      <p className="text-slate-500 text-sm mt-2">Supports PDF, Word, Excel, and Text files</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Current JD Content</label>
                <textarea
                  value={globalJD}
                  onChange={(e) => onUpdateJD(e.target.value)}
                  placeholder="The extracted text will appear here. You can also paste it manually."
                  className="w-full h-64 bg-slate-950 border border-slate-800 rounded-3xl p-8 text-slate-300 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500/50 transition-all custom-scrollbar"
                />
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="h-full animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-white">Intelligence & Reports</h2>
                {interviews.some(i => i.report) && (
                  <button 
                    onClick={downloadAllReports}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <Download className="w-3 h-4" /> Download All Reports
                  </button>
                )}
              </div>

              {selectedInterview?.report ? (
                <ReportView 
                  report={JSON.parse(selectedInterview.report)} 
                  onBack={() => setSelectedInterview(null)} 
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {interviews.filter(i => i.report).length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="uppercase tracking-widest text-[10px] font-black">No reports available yet</p>
                      <p className="text-xs mt-2">Analyze an interview to see results here.</p>
                    </div>
                  ) : (
                    interviews.filter(i => i.report).map((interview) => {
                      const reportData = JSON.parse(interview.report!);
                      return (
                        <div 
                          key={interview.id}
                          onClick={() => setSelectedInterview(interview)}
                          className="p-6 bg-slate-950 border border-slate-800 rounded-3xl hover:border-blue-500/50 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-white">{reportData.overallScore}%</span>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Score</p>
                            </div>
                          </div>
                          <h3 className="text-white font-bold mb-1">{interview.setup.candidateName}</h3>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">{interview.setup.vacancy}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-900">
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                              reportData.finalVerdict === 'Hire' ? 'bg-emerald-500/10 text-emerald-500' :
                              reportData.finalVerdict === 'Reject' ? 'bg-red-500/10 text-red-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {reportData.finalVerdict}
                            </span>
                            <button className="text-blue-400 text-[8px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                              View Full →
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
