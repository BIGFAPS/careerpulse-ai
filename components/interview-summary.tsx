"use client";

import Link from "next/link";
import type { InterviewScores } from "@/lib/history";

export interface SessionSummary {
  scores: InterviewScores;
  summary: string;
  strengths: string[];
  improvements: string[];
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function SummaryCard({
  summary,
  showHistoryLink = true,
}: {
  summary: SessionSummary;
  showHistoryLink?: boolean;
}) {
  const s = summary.scores;
  const color =
    s.overall >= 80
      ? "text-emerald-700 bg-emerald-100 border-emerald-200"
      : s.overall >= 50
        ? "text-amber-700 bg-amber-100 border-amber-200"
        : "text-red-700 bg-red-100 border-red-200";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex flex-col items-center rounded-xl border px-5 py-3 ${color}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Overall grade
          </span>
          <span className="text-3xl font-black">{s.overall}/100</span>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <ScoreBar label="Technical competence" value={s.technical} />
          <ScoreBar label="Communication" value={s.communication} />
          <ScoreBar label="Keyword optimisation" value={s.keywords} />
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{summary.summary}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-emerald-700 mb-1">Strengths</h4>
          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
            {summary.strengths.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-700 mb-1">To improve</h4>
          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
            {summary.improvements.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      {showHistoryLink && (
      <p className="text-[10px] text-slate-400">
        This session was saved. See it any time in{" "}
        <Link href="/history" className="text-blue-600 font-semibold">
          your history
        </Link>
        .
      </p>
      )}
    </div>
  );
}

