"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { Loader2, FileText, Video, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";
import { SummaryCard } from "@/components/interview-summary";
import {
  InterviewSessionRecord,
  ResumeAnalysisRecord,
  deleteHistoryItem,
  formatDate,
  listInterviewSessions,
  listResumeAnalyses,
} from "@/lib/history";

export default function HistoryPage() {
  return (
    <RequireAuth>
      <History />
    </RequireAuth>
  );
}

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  abandoned: "bg-slate-200 text-slate-600",
  analyzed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function History() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"analyses" | "interviews">("analyses");
  const [analyses, setAnalyses] = useState<ResumeAnalysisRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([listResumeAnalyses(user.uid), listInterviewSessions(user.uid)])
      .then(([a, i]) => {
        setAnalyses(a);
        setInterviews(i);
      })
      .catch((e) => {
        console.error(e);
        setError("Your history could not be loaded. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const remove = async (kind: "analyses" | "interviews", id?: string) => {
    if (!user || !id) return;
    if (!confirm("Delete this item from your history?")) return;
    await deleteHistoryItem(user.uid, kind, id);
    if (kind === "analyses") setAnalyses((x) => x.filter((a) => a.id !== id));
    else setInterviews((x) => x.filter((a) => a.id !== id));
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-6 bg-slate-50 min-h-[calc(100vh-3.5rem)] pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">History</h1>
        <p className="text-xs text-slate-500">
          All your resume analyses and interview sessions, with their results.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "analyses" ? "default" : "outline"}
          className="h-8 text-xs font-bold"
          onClick={() => setTab("analyses")}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Resume analyses ({analyses.length})
        </Button>
        <Button
          variant={tab === "interviews" ? "default" : "outline"}
          className="h-8 text-xs font-bold"
          onClick={() => setTab("interviews")}
        >
          <Video className="w-3.5 h-3.5 mr-1.5" /> Interview sessions ({interviews.length})
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : tab === "analyses" ? (
        analyses.length === 0 ? (
          <Empty
            text="No resume analysed yet."
            href="/resume-analyzer"
            action="Analyze a resume"
          />
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <Card key={a.id} className="rounded-xl border-slate-200 shadow-sm">
                <CardHeader
                  className="p-4 cursor-pointer"
                  onClick={() => setOpen(open === a.id ? null : a.id!)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-bold text-slate-800 truncate">
                        {a.fileName}
                        {a.jobTitle ? ` → ${a.jobTitle}` : ""}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-500">
                        {formatDate(a.createdAt)}
                        {a.jobDescription ? " · against a job description" : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusStyle[a.status] || ""}`}
                      >
                        {a.status}
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {a.score}/100
                      </span>
                      {open === a.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {open === a.id && (
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="prose prose-sm prose-slate max-w-none text-xs">
                      <Markdown>{a.analysis}</Markdown>
                    </div>
                    <div className="flex gap-2">
                      <Link href="/mock-interview?useResume=1">
                        <Button size="sm" className="h-8 text-xs">
                          Practise an interview
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600"
                        onClick={() => remove("analyses", a.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )
      ) : interviews.length === 0 ? (
        <Empty
          text="No interview session yet."
          href="/mock-interview"
          action="Start an interview"
        />
      ) : (
        <div className="space-y-3">
          {interviews.map((s) => (
            <Card key={s.id} className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader
                className="p-4 cursor-pointer"
                onClick={() => setOpen(open === s.id ? null : s.id!)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold text-slate-800 truncate">
                      {s.role} · {s.industry}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-slate-500">
                      {formatDate(s.createdAt)} · {s.questionsAsked || 0} question(s) ·{" "}
                      {s.answerMode} answers{s.usedResume ? " · based on resume" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusStyle[s.status] || ""}`}
                    >
                      {s.status.replace("_", " ")}
                    </span>
                    {s.scores && (
                      <span className="text-sm font-black text-slate-800">
                        {s.scores.overall}/100
                      </span>
                    )}
                    {open === s.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {open === s.id && (
                <CardContent className="p-4 pt-0 space-y-3">
                  {s.scores && (
                    <SummaryCard
                      showHistoryLink={false}
                      summary={{
                        scores: s.scores,
                        summary: s.summary || "",
                        strengths: s.strengths || [],
                        improvements: s.improvements || [],
                      }}
                    />
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-slate-600">
                      Transcript ({s.messages?.length || 0} messages)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {(s.messages || []).map((m, i) => (
                        <p key={i} className="whitespace-pre-wrap">
                          <b className={m.role === "user" ? "text-blue-700" : "text-slate-700"}>
                            {m.role === "user" ? "You" : "Coach"}:
                          </b>{" "}
                          {m.content}
                        </p>
                      ))}
                    </div>
                  </details>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-red-600"
                    onClick={() => remove("interviews", s.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
      <p className="text-sm mb-3">{text}</p>
      <Link href={href}>
        <Button className="h-8 text-xs font-bold">{action}</Button>
      </Link>
    </div>
  );
}
