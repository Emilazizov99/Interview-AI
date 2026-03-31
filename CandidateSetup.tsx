
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, Blob as GenAIBlob, LiveServerMessage } from '@google/genai';
import { InterviewSetup } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio-helpers';
import { Video, Mic, StopCircle, Loader2, AlertCircle } from 'lucide-react';

interface InterviewSessionProps {
  setup: InterviewSetup;
  interviewId: string;
  onEnd: (transcript: string[], videoBlob?: Blob) => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ setup, interviewId, onEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const aiAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const transcriptRef = useRef<string[]>([]);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<number | null>(null);
  
  const currentModelTextRef = useRef('');
  const currentUserTextRef = useRef('');

  const FRAME_RATE = 1; 
  const JPEG_QUALITY = 0.3;
  const MAX_IMAGE_DIMENSION = 320;

  const stopSession = useCallback(async (isCleanup = false) => {
    if (!isActiveRef.current && !isCleanup) return;
    
    isActiveRef.current = false;
    setIsActive(false);
    
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }

    // Capture any pending transcript text before ending
    if (currentModelTextRef.current) {
      transcriptRef.current.push(`Interviewer: ${currentModelTextRef.current}`);
      currentModelTextRef.current = '';
    }
    if (currentUserTextRef.current) {
      transcriptRef.current.push(`${setup.candidateName}: ${currentUserTextRef.current}`);
      currentUserTextRef.current = '';
    }

    let videoBlob: Blob | undefined;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        const recorder = mediaRecorderRef.current;
        const stopPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(recordedChunksRef.current, { type: 'video/webm' }));
          };
        });
        recorder.stop();
        videoBlob = await stopPromise;
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      try { outputAudioContextRef.current.close(); } catch(e) {}
      outputAudioContextRef.current = null;
    }

    if (!isCleanup) {
      onEnd(transcriptRef.current, videoBlob);
    }
  }, [onEnd]);

  useEffect(() => {
    let isMounted = true;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true }, 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 15 } } 
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        await inCtx.resume();
        await outCtx.resume();
        audioContextRef.current = inCtx;
        outputAudioContextRef.current = outCtx;

        // Create a destination for mixing AI and User audio for recording
        const aiDest = outCtx.createMediaStreamDestination();
        aiAudioDestRef.current = aiDest;

        // Mix user mic into the recording destination
        const userMicSource = outCtx.createMediaStreamSource(stream);
        userMicSource.connect(aiDest);

        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...aiDest.stream.getAudioTracks()
        ]);

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `You are an elite AI HR Recruiter. 
            ROLE: ${setup.vacancy}
            JD: ${setup.description}
            CANDIDATE NAME: ${setup.candidateName}
            
            MISSION: 
            Conduct a high-stakes professional interview with ${setup.candidateName}.
            
            CORE RULES:
            - START IMMEDIATELY: As soon as the session opens, introduce yourself to ${setup.candidateName} and ask your first question.
            - BALANCED ASSESSMENT: You MUST evaluate both HARD SKILLS (technical expertise, specific knowledge for ${setup.vacancy}) and SOFT SKILLS (communication, leadership, problem-solving, cultural fit).
            - CONCISE: The interview must be efficient and not take too long. Aim for 5-7 high-impact questions.
            - SOFT SKILLS: Ensure you ask specific questions to evaluate soft skills like communication, adaptability, and teamwork.
            - JD-DRIVEN: Use the provided Job Description to tailor your questions. Most of your questions should be directly related to the requirements and responsibilities in the JD.
            - NO INTERRUPTION: You are strictly forbidden from interrupting the candidate. If you detect the candidate is speaking, you must remain silent. Do not speak while the candidate is talking.
            - 5-SECOND SILENCE RULE: You MUST wait for a full 5 seconds of absolute silence after the candidate finishes their response before you begin speaking or ask the next question. This is non-negotiable.
            - FLOW: Ask one question at a time. If the candidate is stuck, provide a gentle nudge.
            - END: When finished, say "The interview is now complete."`,
          },
          callbacks: {
            onopen: () => {
              if (!isMounted) return;
              isActiveRef.current = true;
              setIsActive(true);
              setIsConnecting(false);
              
              sessionPromise.then(session => {
                if (session && isMounted) {
                  const silentPCM = new Int16Array(100).fill(0);
                  session.sendRealtimeInput({
                    audio: {
                      data: encode(new Uint8Array(silentPCM.buffer)),
                      mimeType: 'audio/pcm;rate=16000'
                    }
                  });
                  session.sendRealtimeInput({ 
                    text: "The candidate is here. Introduce yourself and ask the first question immediately." 
                  });
                }
              }).catch(() => setError("Failed to initialize session stream."));
              
              const source = inCtx.createMediaStreamSource(stream);
              const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                const audio: GenAIBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(session => {
                  if (session && isMounted && isActiveRef.current) session.sendRealtimeInput({ audio });
                }).catch(() => {});
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inCtx.destination);

              const ctx = canvasRef.current?.getContext('2d');
              intervalRef.current = window.setInterval(() => {
                if (videoRef.current && canvasRef.current && ctx && isActiveRef.current) {
                  const width = Math.min(videoRef.current.videoWidth, MAX_IMAGE_DIMENSION);
                  const height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * width;
                  
                  if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
                    canvasRef.current.width = width;
                    canvasRef.current.height = height;
                  }
                  
                  ctx.drawImage(videoRef.current, 0, 0, width, height);
                  canvasRef.current.toBlob((blob) => {
                    if (blob && isMounted && isActiveRef.current) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        sessionPromise.then(session => {
                          if (session && isMounted && isActiveRef.current) session.sendRealtimeInput({
                            video: { data: base64Data, mimeType: 'image/jpeg' }
                          });
                        }).catch(() => {});
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }, 1000 / FRAME_RATE);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isMounted) return;

              if (message.serverContent?.outputTranscription) {
                currentModelTextRef.current += message.serverContent.outputTranscription.text;
                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  const newText = `Interviewer: ${currentModelTextRef.current}`;
                  if (last?.startsWith('Interviewer:')) {
                    const newArr = [...prev];
                    newArr[newArr.length - 1] = newText;
                    return newArr;
                  }
                  return [...prev, newText];
                });
              }

              if (message.serverContent?.inputTranscription) {
                currentUserTextRef.current += message.serverContent.inputTranscription.text;
                // Candidate's sentences are hidden from the live view as per user request
              }

              if (message.serverContent?.turnComplete) {
                if (currentModelTextRef.current) transcriptRef.current.push(`Interviewer: ${currentModelTextRef.current}`);
                if (currentUserTextRef.current) transcriptRef.current.push(`${setup.candidateName}: ${currentUserTextRef.current}`);
                currentModelTextRef.current = '';
                currentUserTextRef.current = '';
              }

              const modelParts = message.serverContent?.modelTurn?.parts;
              if (modelParts && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                for (const part of modelParts) {
                  if (part.inlineData?.data) {
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(part.inlineData.data), ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    if (aiAudioDestRef.current) source.connect(aiAudioDestRef.current);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: (e) => { 
              console.log("Connection closed:", e);
              if (isMounted && isActiveRef.current) {
                stopSession();
              }
            },
            onerror: (e) => {
              console.error('WebSocket Error:', e);
              if (isMounted) {
                setError("The AI session could not be established. Please check your internet connection or try again.");
                if (isActiveRef.current) stopSession();
              }
            },
          },
        });

        sessionRef.current = await sessionPromise;
      } catch (err: any) {
        console.error("Initialization failure:", err);
        setError(err?.message || "Failed to initialize camera or AI session.");
      }
    };

    startMedia();
    return () => { 
      isMounted = false; 
      stopSession(true); 
    };
  }, [setup, stopSession]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-center p-12">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Connection Failed</h2>
        <p className="text-slate-400 mb-10 max-w-sm leading-relaxed">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 active:scale-95">
          Restart Interview
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 p-6 overflow-hidden">
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-grow flex flex-col bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-800 relative shadow-2xl">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale-[0.3]" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-10 left-10 flex items-center space-x-3 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10 z-10 shadow-2xl">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[12px] font-black text-white tracking-[0.3em] uppercase">
              {isConnecting ? 'Syncing Neural Link...' : 'Active Session Analysis'}
            </span>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => stopSession()}
              className="bg-red-500 hover:bg-red-600 text-white px-14 py-6 rounded-[2rem] font-black shadow-[0_25px_60px_rgba(239,68,68,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-4 group"
            >
              <StopCircle className="w-6 h-6" />
              <span className="tracking-widest uppercase text-sm">End Interview</span>
            </button>
          </div>
        </div>

        <div className="w-[440px] flex flex-col space-y-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
            <h2 className="text-[11px] font-black text-slate-500 mb-2 uppercase tracking-[0.3em]">Vacancy</h2>
            <p className="text-blue-400 font-black text-3xl leading-tight truncate">{setup.vacancy}</p>
          </div>

          <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 flex flex-1 flex-col overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Question Feed</h2>
              {isActive && (
                <div className="flex space-x-1.5 items-end h-4">
                  <div className="w-1.5 h-full bg-blue-500/40 animate-[bounce_1.2s_infinite_100ms]" />
                  <div className="w-1.5 h-2/3 bg-blue-500/40 animate-[bounce_1.2s_infinite_300ms]" />
                  <div className="w-1.5 h-1/2 bg-blue-500/40 animate-[bounce_1.2s_infinite_500ms]" />
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-3 custom-scrollbar">
              {transcript.length === 0 && !isConnecting && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-6">
                  <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
                  <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] leading-relaxed">
                    Connecting to AI Recruiter Engine...
                  </p>
                </div>
              )}
              
              {transcript.map((line, idx) => {
                const isInterviewer = line.startsWith('Interviewer:');
                const content = line.split(': ').slice(1).join(': ');
                return (
                  <div key={idx} className={`p-7 rounded-[2rem] text-[16px] leading-relaxed transition-all animate-in fade-in slide-in-from-bottom-6 duration-700 ${
                    isInterviewer 
                      ? 'bg-blue-600/10 text-blue-50 border border-blue-500/20 shadow-lg' 
                      : 'bg-slate-800/40 text-slate-400 border border-transparent italic'
                  }`}>
                    <span className="block font-black text-[10px] uppercase mb-3 opacity-50 tracking-[0.25em]">
                      {isInterviewer ? 'AI Recruiter' : setup.candidateName}
                    </span>
                    {content || "Analyzing response..."}
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none rounded-b-[3rem]" />
          </div>
        </div>
      </div>
    </div>
  );
};
