"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, UploadCloud, FileCheck2, X, History, Video } from "lucide-react";
import Markdown from "react-markdown";
import { getGemini } from "@/lib/gemini";
import { useDropzone, FileRejection } from "react-dropzone";
import { useStats } from "@/components/stats-provider";
import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";
import {
  ACCEPTED_RESUME_TYPES,
  DocumentParseError,
  MAX_FILE_SIZE,
  ParsedDocument,
  parseResumeFile,
  validateResumeFile,
} from "@/lib/resume-parser";
import { extractScore, saveResumeAnalysis } from "@/lib/history";
import { updateUserProfile } from "@/lib/users";
import { JobDescription, listJobDescriptions } from "@/lib/platform";

export default function ResumeAnalyzerPage() {
  return (
    <RequireAuth>
      <ResumeAnalyzer />
    </RequireAuth>
  );
}

function ResumeAnalyzer() {
  const router = useRouter();
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileError, setFileError] = useState("");
  const [parsedFile, setParsedFile] = useState<ParsedDocument | null>(null);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [savedNotice, setSavedNotice] = useState("");
  const { incrementStat, addActivity, updateSkillAnalytics } = useStats();

  useEffect(() => {
    listJobDescriptions(true).then(setJobs);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      setFileError("");
      if (rejections.length > 0) {
        const f = rejections[0].file;
        setFileError(
          validateResumeFile(f) ||
            "Please upload a valid resume (.pdf or .docx).",
        );
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;
      setIsParsing(true);
      try {
        const parsed = await parseResumeFile(file);
        setParsedFile(parsed);
        if (parsed.kind === "pdf") {
          setResumeText("");
        } else {
          setResumeText(parsed.text);
        }
      } catch (error: any) {
        setParsedFile(null);
        setFileError(
          error instanceof DocumentParseError
            ? error.message
            : "The file could not be read. Please try another file.",
        );
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_RESUME_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const clearFile = () => {
    setParsedFile(null);
    setResumeText("");
    setFileError("");
  };

  const pickJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) {
      setJobTitle("");
      return;
    }
    setJobTitle(`${job.title}${job.company ? " – " + job.company : ""}`);
    setJobDescription(job.description);
  };

  const canAnalyze = !!resumeText.trim() || parsedFile?.kind === "pdf";

  // For PDFs, ask Gemini for the plain text so it can be reused by the
  // interview coach and stored with the analysis.
  const extractPdfText = async (file: ParsedDocument) => {
    try {
      const ai = getGemini();
      const res = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            text: "Extract the full plain text of this resume. Return only the text, keeping sections and bullet points, with no commentary.",
          },
          { inlineData: { data: file.base64!, mimeType: file.mimeType! } },
        ],
      });
      return (res.text || "").trim();
    } catch (e) {
      console.error("PDF text extraction failed", e);
      return "";
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || !user) return;
    setIsLoading(true);
    setSavedNotice("");
    try {
      const ai = getGemini();
      const prompt = `
        You are an expert ATS (Applicant Tracking System) and senior recruiter.
        Please analyze the uploaded resume or text below. ${jobDescription ? `Compare it against this job description: ${jobDescription}` : ""}

        Provide your analysis in the following format using markdown:
        1. ATS Match Score (Format exactly as 'Score: X/100') followed by one or two sentences explaining the reason for this score
        2. Strengths
        3. Areas for Improvement (weaknesses)
        4. Keyword Suggestions (missing keywords)
        5. Formatting & Impact Tips (recommendations)

        Resume Text:
        ${resumeText || "(see attached PDF)"}
      `;

      const contents: any[] = [{ text: prompt }];
      if (parsedFile?.kind === "pdf") {
        contents.push({
          inlineData: {
            data: parsedFile.base64,
            mimeType: parsedFile.mimeType,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
      });

      const textResp = response.text || "No analysis generated.";
      setAnalysis(textResp);
      incrementStat("resumesAnalyzed");

      const score = extractScore(textResp);

      addActivity({
        type: "resume",
        title: "Resume Analyzed",
        description: `Scored ${score}/100${jobDescription ? " against a specific job description" : ""}.`,
        content: textResp,
      });

      updateSkillAnalytics({
        formatting: score > 0 ? Math.min(score + 10, 100) : undefined,
        keywords: score > 0 ? score : undefined,
      });

      // Save the resume and its analysis (history + reuse by the interview coach)
      (async () => {
        try {
          let parsedText = resumeText;
          if (parsedFile?.kind === "pdf") {
            parsedText = (await extractPdfText(parsedFile)) || resumeText;
          }
          await saveResumeAnalysis(user.uid, {
            fileName: parsedFile?.fileName || "Pasted text",
            fileType: parsedFile ? parsedFile.kind : "pasted",
            parsedText,
            jobTitle,
            jobDescription,
            score,
            status: "analyzed",
            analysis: textResp,
          });
          if (parsedText.trim()) {
            await updateUserProfile(user.uid, {
              lastResumeText: parsedText.slice(0, 20000),
              lastResumeName: parsedFile?.fileName || "Pasted resume",
            });
          }
          setSavedNotice("Saved to your history.");
        } catch (e) {
          console.error("Could not save analysis", e);
          setSavedNotice("Analysis shown, but it could not be saved to your history.");
        }
      })();

      // Check for perfect score
      if (score === 100) {
        setAnalysis(
          textResp +
            "\n\n**🎉 Perfect score achieved! Redirecting to Interview Coach in 3 seconds...**",
        );
        setTimeout(() => {
          const roleParam = jobTitle
            ? encodeURIComponent(jobTitle)
            : jobDescription
              ? encodeURIComponent(jobDescription.substring(0, 50))
              : "General";
          router.push(`/mock-interview?role=${roleParam}`);
        }, 3000);
      }
    } catch (error: any) {
      if (
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("exceeded")
      ) {
        setAnalysis(
          "API rate limit exceeded. Please wait about 30 seconds and try again.",
        );
      } else {
        console.error(error);
        setAnalysis(
          "The AI service is currently unavailable. Please try again in a moment.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const score = analysis ? extractScore(analysis) : 0;
  const hasScore = !!analysis && /Score:|\/\s*100/i.test(analysis);

  return (
    <div className="container max-w-full mx-auto px-4 lg:px-6 py-6 space-y-6 bg-slate-200 min-h-[calc(100vh-3.5rem)]">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Resume Optimizer
          </h1>
          <p className="text-xs text-slate-500">
            Upload or paste your resume and get instant AI-powered feedback.
          </p>
        </div>
        <Link href="/history">
          <Button variant="outline" className="h-8 text-xs font-bold bg-white">
            <History className="w-3.5 h-3.5 mr-1.5" /> My history
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4 ">
        <div className="space-y-4">
          <Card className="rounded-xl border-slate-200 shadow-sm bg-slate-100 p-4">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Input Data
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Upload your resume and context.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Upload Resume (PDF, DOCX)
                </label>
                {parsedFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {parsedFile.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {parsedFile.kind === "pdf"
                            ? "PDF attached – the AI reads it directly."
                            : `Text extracted (${parsedFile.text.length} characters). You can edit it below.`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-1 rounded hover:bg-emerald-100"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isParsing ? (
                      <Loader2 className="h-8 w-8 text-slate-400 mb-2 animate-spin" />
                    ) : (
                      <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                    )}
                    <p className="text-xs text-slate-600 font-medium">
                      {isParsing
                        ? "Reading your resume..."
                        : isDragActive
                          ? "Drop the file here"
                          : "Drag & drop your resume, or click to select"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supports PDF and DOCX (also TXT/MD) · max 5 MB
                    </p>
                  </div>
                )}
                {fileError && (
                  <p className="text-[11px] font-medium text-red-600">{fileError}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {parsedFile?.kind === "pdf"
                    ? "Additional Notes (optional)"
                    : "Or Paste Resume Text *"}
                </label>
                <Textarea
                  placeholder={
                    parsedFile?.kind === "pdf"
                      ? "Optional: add anything the AI should know..."
                      : "Paste your resume here..."
                  }
                  className="min-h-[150px] text-xs resize-y"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Job Description
                </label>
                {jobs.length > 0 && (
                  <select
                    className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    defaultValue=""
                    onChange={(e) => pickJob(e.target.value)}
                  >
                    <option value="">Pick from the job library (optional)…</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                        {j.company ? ` – ${j.company}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                <Textarea
                  placeholder="Paste job description for tailored analysis..."
                  className="min-h-[100px] text-xs resize-y"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-9 text-xs font-bold shadow-md shadow-blue-200 mt-4"
                onClick={handleAnalyze}
                disabled={isLoading || isParsing || !canAnalyze}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Analyzing...
                  </>
                ) : (
                  "Analyze Resume"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full rounded-xl border-slate-200 shadow-sm bg-slate-100 p-4">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Analysis Results
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                AI-generated score and suggestions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mb-3" />
                  <p className="text-xs">Processing your resume...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  {hasScore && (
                    <div
                      className={`inline-flex flex-col items-center justify-center p-4 rounded-xl border ${
                        score >= 80
                          ? "text-emerald-700 bg-emerald-100 border-emerald-200"
                          : score >= 50
                            ? "text-amber-700 bg-amber-100 border-amber-200"
                            : "text-red-700 bg-red-100 border-red-200"
                      } shadow-sm w-full mb-4`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
                        ATS Match Score
                      </span>
                      <span className="text-4xl font-black tracking-tighter">
                        {score}/100
                      </span>
                    </div>
                  )}
                  {savedNotice && (
                    <p className="text-[10px] text-slate-500">{savedNotice}</p>
                  )}
                  <div className="prose prose-sm prose-slate max-w-none text-xs">
                    <Markdown>{analysis}</Markdown>
                  </div>
                  {hasScore && (
                    <Link href="/mock-interview?useResume=1">
                      <Button className="w-full h-9 text-xs font-bold mt-2">
                        <Video className="w-3.5 h-3.5 mr-1.5" /> Practise an
                        interview based on this resume
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
                  <p className="text-xs">Results will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
