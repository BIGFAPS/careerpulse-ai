"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Flag,
  LogOut,
  RotateCcw,
  History,
  FileText,
} from "lucide-react";
import { getGemini } from "@/lib/gemini";
import type { Chat } from "@google/genai";
import Webcam from "react-webcam";
import { useStats } from "@/components/stats-provider";
import { useAuth } from "@/components/auth-provider";
import { SummaryCard, SessionSummary } from "@/components/interview-summary";
import { RequireAuth } from "@/components/require-auth";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  createInterviewSession,
  updateInterviewSession,
} from "@/lib/history";
import { getUserProfile } from "@/lib/users";
import {
  DEFAULT_INTERVIEW_SETTINGS,
  InterviewSettings,
  JobDescription,
  getInterviewSettings,
  listJobDescriptions,
} from "@/lib/platform";

interface Message {
  role: "user" | "model";
  content: string;
}

const COMPLETE_TOKEN = "[INTERVIEW_COMPLETE]";

function isRateLimit(error: any) {
  return (
    error?.status === 429 ||
    error?.message?.includes("429") ||
    error?.message?.includes("quota") ||
    error?.message?.includes("exceeded")
  );
}

function clamp(n: any) {
  const v = Math.round(Number(n));
  return isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
}

function InterviewCoach() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { incrementStat, addActivity, updateSkillAnalytics } = useStats();

  const roleParam = searchParams?.get("role") || "";
  const [industry, setIndustry] = useState(
    roleParam ? roleParam.split(" ")[0] : "",
  );
  const [role, setRole] = useState(roleParam);
  const [jobDescription, setJobDescription] = useState("");
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [settings, setSettings] = useState<InterviewSettings>(DEFAULT_INTERVIEW_SETTINGS);
  const [savedResume, setSavedResume] = useState<{ name: string; text: string } | null>(null);
  const [useResume, setUseResume] = useState(searchParams?.get("useResume") === "1");
  const [pastedResume, setPastedResume] = useState("");

  const [isStarted, setIsStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [usedVoice, setUsedVoice] = useState(false);
  const [usedText, setUsedText] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const speech = useSpeechToText(settings.voiceLanguage);

  const bottomRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const activeSessionRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, summary]);

  // Load admin-defined settings, the job library and the last analysed resume
  useEffect(() => {
    getInterviewSettings().then(setSettings);
    listJobDescriptions(true).then(setJobs);
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p?.lastResumeText) {
        setSavedResume({ name: p.lastResumeName || "Last analysed resume", text: p.lastResumeText });
      } else {
        setUseResume(false);
      }
    });
  }, [user]);

  // Voice transcript fills the answer box live
  useEffect(() => {
    if (speech.listening || speech.transcript) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(speech.transcript);
    }
  }, [speech.transcript, speech.listening]);

  // If the user leaves the page during an interview, mark it as abandoned
  useEffect(() => {
    const markAbandoned = () => {
      const id = activeSessionRef.current;
      if (id && user) {
        updateInterviewSession(user.uid, id, { status: "abandoned" }).catch(() => {});
        activeSessionRef.current = null;
      }
    };
    window.addEventListener("beforeunload", markAbandoned);
    return () => {
      window.removeEventListener("beforeunload", markAbandoned);
      markAbandoned();
    };
  }, [user]);

  const pickJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setRole(job.title);
    if (job.industry) setIndustry(job.industry);
    setJobDescription(job.description);
  };

  const resumeForInterview = () => {
    if (pastedResume.trim()) return pastedResume.trim();
    if (useResume && savedResume) return savedResume.text;
    return "";
  };

  const startInterview = async () => {
    if (!industry || !role || !user) return;
    setIsLoading(true);
    setErrorMsg("");
    setSummary(null);
    setQuestionsAsked(0);
    setUsedVoice(false);
    setUsedText(false);

    const resume = resumeForInterview();
    const n = settings.numberOfQuestions;
    const mix =
      settings.questionMix === "technical"
        ? "Focus mostly on technical/role-specific questions."
        : settings.questionMix === "behavioral"
          ? "Focus mostly on behavioural and situational questions (STAR method)."
          : "Mix technical, behavioural and situational questions.";

    try {
      const ai = getGemini();
      const newChat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: `You are an expert technical interviewer and hiring manager in the ${industry} industry recruiting for a ${role} position.
          Start by welcoming the candidate and asking the first interview question.
          Keep your questions professional. Ask one question at a time. Evaluate their answers briefly, providing constructive feedback (clarity, technical accuracy, communication, use of the STAR method).
          The interview has exactly ${n} questions. Difficulty: ${settings.difficulty}. ${mix}
          ${resume ? `Tailor your questions to the candidate's resume below: ask about their real experience, projects and skills, and about gaps compared with the job.\n\nCANDIDATE RESUME:\n${resume.slice(0, 12000)}` : ""}
          ${jobDescription ? `\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 6000)}` : ""}
          Start each question with "Question X/${n}:".
          After you have evaluated the answer to question ${n}, thank the candidate, do NOT ask another question, and end your message with the exact text ${COMPLETE_TOKEN}.
          ${settings.webcamFeedback ? "If the user's response includes an image, it is a webcam snapshot. Briefly analyze their body posture and facial expression for confidence, and provide that feedback alongside your evaluation of their verbal answer. Then proceed to the next question." : ""}`,
        },
      });

      const response = await newChat.sendMessage({
        message: "Hello, I am ready to start the interview.",
      });
      const first: Message = {
        role: "model",
        content: response.text || "Hello! Let's begin the interview.",
      };

      const id = await createInterviewSession(user.uid, {
        industry,
        role,
        jobDescription,
        usedResume: !!resume,
        answerMode: "text",
        messages: [first],
        questionsAsked: 1,
      }).catch((e) => {
        console.error("Could not create interview session", e);
        return null;
      });

      setSessionId(id);
      activeSessionRef.current = id;
      setChatSession(newChat);
      setIsStarted(true);
      setMessages([first]);
      setQuestionsAsked(1);
      addActivity({
        type: "interview",
        title: `${role} Mock Interview`,
        description: `Started an interview for the ${industry} industry${resume ? " based on your resume" : ""}.`,
      });
    } catch (error: any) {
      if (isRateLimit(error)) {
        setErrorMsg(
          "API rate limit exceeded. Please wait about 30 seconds and try again.",
        );
      } else {
        setErrorMsg(
          "The AI service is unavailable right now. Please try again in a moment.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const persistMessages = useCallback(
    (all: Message[], asked: number) => {
      if (!user || !sessionId) return;
      updateInterviewSession(user.uid, sessionId, {
        messages: all,
        questionsAsked: asked,
        answerMode: usedVoice && usedText ? "mixed" : usedVoice ? "voice" : "text",
      }).catch((e) => console.error("Could not save interview progress", e));
    },
    [user, sessionId, usedVoice, usedText],
  );

  const finishInterview = async (transcript: Message[]) => {
    if (!user) return;
    setIsEnding(true);
    speech.stop();
    try {
      const ai = getGemini();
      const conversation = transcript
        .map((m) => `${m.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${m.content.replace(COMPLETE_TOKEN, "")}`)
        .join("\n\n");
      const res = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            text: `You are a senior hiring manager. Grade this mock interview for a ${role} position (${industry} industry).
Return ONLY JSON with this shape:
{"overall": 0-100, "technical": 0-100, "communication": 0-100, "keywords": 0-100, "summary": "3-5 sentence overall assessment", "strengths": ["..."], "improvements": ["..."]}
- technical = technical competence and accuracy of the answers
- communication = clarity, structure (STAR), confidence of delivery
- keywords = use of relevant industry/job keywords
If the candidate answered few or no questions, give low scores and say so.

TRANSCRIPT:
${conversation}`,
          },
        ],
        config: { responseMimeType: "application/json" },
      });
      let data: any = {};
      try {
        data = JSON.parse((res.text || "{}").replace(/```json|```/g, ""));
      } catch {
        data = {};
      }
      const result: SessionSummary = {
        scores: {
          overall: clamp(data.overall),
          technical: clamp(data.technical),
          communication: clamp(data.communication),
          keywords: clamp(data.keywords),
        },
        summary: String(data.summary || "No summary could be generated."),
        strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
        improvements: Array.isArray(data.improvements) ? data.improvements.map(String) : [],
      };
      setSummary(result);

      if (sessionId) {
        await updateInterviewSession(user.uid, sessionId, {
          status: "completed",
          messages: transcript,
          questionsAsked,
          scores: result.scores,
          summary: result.summary,
          strengths: result.strengths,
          improvements: result.improvements,
          answerMode: usedVoice && usedText ? "mixed" : usedVoice ? "voice" : "text",
        }).catch((e) => console.error("Could not save interview summary", e));
      }
      activeSessionRef.current = null;

      incrementStat("interviewsCompleted");
      updateSkillAnalytics({
        technical: result.scores.technical,
        communication: result.scores.communication,
        keywords: result.scores.keywords,
      });
      addActivity({
        type: "interview",
        title: `${role} Interview Completed`,
        description: `Overall grade ${result.scores.overall}/100 (technical ${result.scores.technical}, communication ${result.scores.communication}).`,
        content: result.summary,
      });
    } catch (error: any) {
      setErrorMsg(
        isRateLimit(error)
          ? "API rate limit exceeded while grading. Wait 30 seconds and click End & get summary again."
          : "Could not generate the session summary. Please try again.",
      );
    } finally {
      setIsEnding(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !chatSession || isLoading || summary) return;
    if (speech.listening) speech.stop();

    const userMessage = input.trim();
    const fromVoice = !!speech.transcript && speech.transcript.trim() === userMessage;
    if (fromVoice) setUsedVoice(true);
    else setUsedText(true);
    speech.reset();
    setInput("");
    const withUser: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(withUser);
    setIsLoading(true);

    try {
      const contents: any[] = [{ text: userMessage }];

      if (settings.webcamFeedback) {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
          const base64Data = imageSrc.split(",")[1];
          contents.push({
            inlineData: { data: base64Data, mimeType: "image/jpeg" },
          });
          contents[0].text +=
            "\n\n[System: Attached is a webcam snapshot. Briefly analyze my body language and expression and give constructive feedback.]";
        }
      }

      const response = await chatSession.sendMessage({
        message: contents as any,
      });
      const reply = response.text || "";
      const done = reply.includes(COMPLETE_TOKEN);
      const all: Message[] = [
        ...withUser,
        { role: "model", content: reply.replace(COMPLETE_TOKEN, "").trim() },
      ];
      setMessages(all);
      const asked = done ? questionsAsked : Math.min(questionsAsked + 1, settings.numberOfQuestions);
      setQuestionsAsked(asked);
      persistMessages(all, asked);
      if (done) {
        await finishInterview(all);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: isRateLimit(error)
            ? "Oops, we've hit the API rate limit! Please wait about 30 seconds and try again."
            : "Sorry, I encountered an error processing your response. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quitInterview = async () => {
    speech.stop();
    if (user && sessionId && !summary) {
      await updateInterviewSession(user.uid, sessionId, {
        status: "abandoned",
        messages,
        questionsAsked,
      }).catch(() => {});
    }
    activeSessionRef.current = null;
    setIsStarted(false);
    setChatSession(null);
    setSessionId(null);
    setMessages([]);
    setSummary(null);
    setInput("");
  };

  const toggleMic = () => {
    if (speech.listening) speech.stop();
    else speech.start();
  };

  return (
    <div className="min-h-screen bg-slate-200 min-w-full py-8">
      <div className="container max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-80">
        <div className="mb-4 shrink-0 flex flex-wrap gap-2 justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Interview Coach Simulation
            </h1>
            <p className="text-xs text-slate-500">
              Practice your interviewing skills with our AI coach. Answer by
              voice or text.
            </p>
          </div>
          {isStarted ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 rounded px-2 py-1">
                Question {Math.min(questionsAsked, settings.numberOfQuestions)}/
                {settings.numberOfQuestions}
              </span>
              {!summary && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold"
                  onClick={() => finishInterview(messages)}
                  disabled={isEnding || isLoading || messages.length < 2}
                >
                  {isEnding ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Flag className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  End &amp; get summary
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold bg-white"
                onClick={quitInterview}
              >
                {summary ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New interview
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5 mr-1.5" /> Quit
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Link href="/history">
              <Button variant="outline" className="h-8 text-xs font-bold bg-white">
                <History className="w-3.5 h-3.5 mr-1.5" /> Past sessions
              </Button>
            </Link>
          )}
        </div>

        {!isStarted ? (
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Configure Interview
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Set up the scenario for your mock interview. {settings.numberOfQuestions}{" "}
                questions · {settings.difficulty} difficulty.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {jobs.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Job library (optional)
                  </label>
                  <select
                    className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    defaultValue=""
                    onChange={(e) => pickJob(e.target.value)}
                  >
                    <option value="">Pick a job to practise for…</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                        {j.company ? ` – ${j.company}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Industry
                  </label>
                  <Input
                    placeholder="e.g. Technology, Finance, Healthcare"
                    className="h-8 text-xs"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Role
                  </label>
                  <Input
                    placeholder="e.g. Frontend Developer, Investment Banker"
                    className="h-8 text-xs"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Job description (optional)
                </label>
                <Textarea
                  placeholder="Paste the job description so questions match the job..."
                  className="min-h-[80px] text-xs"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Questions based on your resume
                </label>
                {savedResume ? (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useResume}
                      onChange={(e) => setUseResume(e.target.checked)}
                    />
                    Use my last analysed resume ({savedResume.name})
                  </label>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No analysed resume yet.{" "}
                    <Link href="/resume-analyzer" className="text-blue-600 font-semibold">
                      Analyze one first
                    </Link>{" "}
                    or paste it below.
                  </p>
                )}
                <Textarea
                  placeholder="Or paste a resume here to use for this interview..."
                  className="min-h-[60px] text-xs bg-white"
                  value={pastedResume}
                  onChange={(e) => setPastedResume(e.target.value)}
                />
              </div>
              {errorMsg && (
                <div className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-md border border-red-100 mb-2">
                  {errorMsg}
                </div>
              )}
              <Button
                className="w-full h-9 text-xs font-bold shadow-md shadow-blue-200"
                onClick={startInterview}
                disabled={isLoading || !industry || !role}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Starting...
                  </>
                ) : (
                  "Start Interview Simulator"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col relative pb-16 sm:pb-0 h-[calc(100vh-12rem)]">
            {settings.webcamFeedback && !summary && (
              <div className="absolute top-4 right-4 w-24 sm:w-32 md:w-48 aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-lg border-2 border-primary z-10 flex items-center justify-center">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 bg-red-600 px-1 py-0.5 rounded text-[8px] font-bold text-white uppercase flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{" "}
                  REC
                </div>
              </div>
            )}

            <Card className="flex flex-col flex-1 overflow-hidden rounded-xl border-slate-200 shadow-sm bg-white">
              <CardContent className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 pt-20 sm:pt-5">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex justify-center items-center shrink-0 border ${msg.role === "user" ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 shadow-sm"}`}
                      >
                        {msg.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-xl border ${msg.role === "user" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-white text-slate-700 border-slate-200 shadow-sm"}`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(isLoading || isEnding) && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex justify-center items-center shrink-0 text-slate-600">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 flex items-center gap-2 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEnding ? "Grading your interview..." : null}
                      </div>
                    </div>
                  </div>
                )}

                {summary && <SummaryCard summary={summary} />}
                {errorMsg && isStarted && (
                  <div className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-md border border-red-100">
                    {errorMsg}
                  </div>
                )}
                <div ref={bottomRef} />
              </CardContent>
              {!summary && (
                <div className="p-3 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative z-20">
                  {speech.error && (
                    <p className="text-[11px] text-amber-700 mb-2">{speech.error}</p>
                  )}
                  {speech.listening && (
                    <p className="text-[11px] text-red-600 font-semibold mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      Listening… speak your answer, then press the mic again and Send.
                    </p>
                  )}
                  <div className="flex gap-2">
                    {speech.supported && (
                      <Button
                        size="icon"
                        variant={speech.listening ? "destructive" : "outline"}
                        className="h-10 w-10 shrink-0"
                        onClick={toggleMic}
                        disabled={isLoading || isEnding}
                        title={speech.listening ? "Stop recording" : "Answer by voice"}
                      >
                        {speech.listening ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Input
                      placeholder={
                        speech.supported
                          ? "Type your answer or use the mic..."
                          : "Type your answer... (voice input not supported in this browser)"
                      }
                      className="h-10 text-sm shadow-inner"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                      }}
                      disabled={isLoading || isEnding}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0 shadow-md shadow-blue-200"
                      onClick={handleSendMessage}
                      disabled={isLoading || isEnding || !input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockInterviewPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        }
      >
        <InterviewCoach />
      </Suspense>
    </RequireAuth>
  );
}
