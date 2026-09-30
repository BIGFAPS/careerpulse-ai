"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Download, FileText, File as FileIcon } from "lucide-react";
import Markdown from "react-markdown";
import { getGemini } from "@/lib/gemini";
import { useStats } from "@/components/stats-provider";
import { useAuth } from "@/components/auth-provider";
import { extractDocxText } from "@/lib/resume-parser";
import { getUserProfile } from "@/lib/users";

export default function CoverLetterPage() {
  const { incrementStat, addActivity } = useStats();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const { user } = useAuth();

  const loadSavedResume = async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    if (p?.lastResumeText) setResumeText(p.lastResumeText);
    else setFileError("No analysed resume found yet. Analyze one in the Resume Analyzer first.");
  };

  const handleExportTxt = () => {
    if (!coverLetter) return;
    const element = document.createElement("a");
    const file = new Blob([coverLetter], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "cover_letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportWord = () => {
    if (!coverLetter) return;
    const markdownContainer = document.getElementById("cover-letter-content");
    const htmlText = markdownContainer
      ? markdownContainer.innerHTML
      : coverLetter;

    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Cover Letter</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + htmlText + footer;

    const element = document.createElement("a");
    const file = new Blob(["\ufeff", sourceHTML], {
      type: "application/msword",
    });
    element.href = URL.createObjectURL(file);
    element.download = "cover_letter.doc";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleGenerate = async () => {
    if (!resumeText || !jobDescription) return;
    setIsLoading(true);
    try {
      const ai = getGemini();
      const prompt = `
        You are an expert career coach and copywriter.
        Write a professional, compelling cover letter based on the following information.
        
        Target Role: ${targetRole}
        Company Name: ${companyName}
        
        Resume text:
        ${resumeText}
        
        Job Description:
        ${jobDescription}
        
        The cover letter should be modern, engaging, highlight my most relevant skills, and be ready to send.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      setCoverLetter(response.text || "No cover letter generated.");
      incrementStat("coverLettersGenerated");
      addActivity({
        type: "coverletter",
        title: "Cover Letter Generated",
        description: `Drafted for ${targetRole || "a position"}${companyName ? ` at ${companyName}` : ""}.`,
        content: response.text || "No cover letter generated.",
      });
    } catch (error: any) {
      if (
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("exceeded")
      ) {
        setCoverLetter(
          "API rate limit exceeded. Please wait about 30 seconds and try again.",
        );
      } else {
        console.error(error);
        setCoverLetter(
          "An error occurred. Please ensure your API key is correctly configured.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6 bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Cover Letter Generator
        </h1>
        <p className="text-xs text-slate-500">
          Instantly create tailored cover letters that stand out.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Details
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Provide info for your draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Role
                  </label>
                  <Input
                    placeholder="e.g. Software Engineer"
                    className="h-8 text-xs"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Company Name
                  </label>
                  <Input
                    placeholder="e.g. Google"
                    className="h-8 text-xs"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Resume Text *
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".txt,.md,.docx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setFileError("");
                      const lower = file.name.toLowerCase();
                      if (!/\.(txt|md|docx)$/.test(lower)) {
                        setFileError("Please upload a .docx, .txt or .md file (or paste the text).");
                        return;
                      }
                      try {
                        const text = lower.endsWith(".docx")
                          ? await extractDocxText(file)
                          : await file.text();
                        if (!text.trim()) throw new Error("empty");
                        setResumeText(text);
                      } catch {
                        setFileError("No text could be read from this file. Please paste your resume instead.");
                      }
                    }}
                  />
                  <div className="text-center pointer-events-none">
                    <p className="text-xs font-bold text-slate-700">
                      Drag & drop or click to upload
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Supports .docx, .txt, .md
                    </p>
                  </div>
                </div>
                {fileError && (
                  <p className="text-[11px] font-medium text-red-600 mt-1">{fileError}</p>
                )}
                {user && (
                  <button
                    type="button"
                    onClick={loadSavedResume}
                    className="text-[11px] font-semibold text-blue-600 mt-1"
                  >
                    Use my last analysed resume
                  </button>
                )}
                <Textarea
                  placeholder="Or paste your resume here..."
                  className="min-h-[120px] text-xs resize-y mt-2"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Job Description *
                </label>
                <Textarea
                  placeholder="Paste the job requirements..."
                  className="min-h-[120px] text-xs resize-y"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <Button
                className="w-full h-9 text-xs font-bold shadow-md shadow-blue-200"
                onClick={handleGenerate}
                disabled={isLoading || !resumeText || !jobDescription}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Generating...
                  </>
                ) : (
                  "Generate AI Draft"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Generated Cover Letter
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Your tailored draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mb-3" />
                  <p className="text-xs">Crafting your cover letter...</p>
                </div>
              ) : coverLetter ? (
                <>
                  <div
                    id="cover-letter-content"
                    className="prose prose-sm prose-slate max-w-none text-xs"
                  >
                    <Markdown>{coverLetter}</Markdown>
                  </div>
                  <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-end print:hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                      Export As:
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1"
                      onClick={handleExportTxt}
                    >
                      <FileIcon className="w-3 h-3" /> TXT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1"
                      onClick={handleExportWord}
                    >
                      <FileText className="w-3 h-3" /> DOC
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1"
                      onClick={handleExportPdf}
                    >
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
                  <p className="text-xs">Your cover letter will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
