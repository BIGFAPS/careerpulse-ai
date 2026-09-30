"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useStats, Activity } from "@/components/stats-provider";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";

export default function DashboardPage() {
  const { stats, deleteActivity } = useStats();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  if (!user) return null;

  return (
    <div className="container max-w-full  mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-slate-200 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Welcome {user.displayName || "back"}! Track your career pulse and
            progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/resume-analyzer">
            <Button className="h-9 px-4 text-xs font-bold shadow-md shadow-blue-200">
              Analyze Resume
            </Button>
          </Link>
          <Link href="/mock-interview">
            <Button variant="outline" className="h-9 px-4 text-xs font-bold">
              Practice Interview
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" className="h-9 px-4 text-xs font-bold">
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-slate-200 shadow-sm p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Overall Preparedness
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={`text-xl font-bold ${stats.preparednessScore >= 80 ? "text-emerald-600" : stats.preparednessScore >= 50 ? "text-amber-500" : "text-red-500"}`}
            >
              {stats.preparednessScore}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Overall readiness</p>
            <Progress
              value={stats.preparednessScore}
              className={`mt-3 h-1.5 ${stats.preparednessScore >= 80 ? "[&>div]:bg-emerald-500" : stats.preparednessScore >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
            />
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Resumes Analyzed
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-slate-800">
              {stats.resumesAnalyzed}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Average score: {stats.preparednessScore}%
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Interviews & Letters
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-slate-800">
              {stats.interviewsCompleted} / {stats.coverLettersGenerated}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Interviews / Cover Letters
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Target Success Rate
            </CardTitle>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={`text-xl font-bold ${stats.preparednessScore >= 80 ? "text-emerald-600" : stats.preparednessScore >= 50 ? "text-amber-500" : "text-red-500"}`}
            >
              {stats.preparednessScore >= 80
                ? "High"
                : stats.preparednessScore >= 50
                  ? "Moderate"
                  : "Low"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Based on latest performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-12 lg:col-span-8 rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Your latest interactions and improvements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 cursor-pointer group"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-50 border border-blue-100 mr-3 shrink-0">
                      {activity.type === "resume" ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-700 leading-none truncate">
                        {activity.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 ml-11 sm:ml-3 font-medium text-[10px] flex items-center text-slate-400 shrink-0">
                    <Clock className="mr-1 h-3 w-3" />{" "}
                    {new Date(activity.timestamp).toLocaleDateString()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteActivity(activity.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-slate-500">
                <p>
                  No recent activity yet. Analyze a resume or start an
                  interview!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-12 lg:col-span-4 rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Skill Analytics
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Areas of strength and improvement.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  Technical Competency
                </span>
                <span className="text-slate-500 font-mono">
                  {stats.skillAnalytics.technical || 0}%
                </span>
              </div>
              <Progress
                value={stats.skillAnalytics.technical || 0}
                className="h-1.5"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  Communication (Delivery)
                </span>
                <span className="text-slate-500 font-mono">
                  {stats.skillAnalytics.communication || 0}%
                </span>
              </div>
              <Progress
                value={stats.skillAnalytics.communication || 0}
                className="h-1.5 bg-slate-100 [&>div]:bg-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  Resume Formatting
                </span>
                <span className="text-slate-500 font-mono">
                  {stats.skillAnalytics.formatting || 0}%
                </span>
              </div>
              <Progress
                value={stats.skillAnalytics.formatting || 0}
                className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  Keyword Optimization
                </span>
                <span className="text-slate-500 font-mono">
                  {stats.skillAnalytics.keywords || 0}%
                </span>
              </div>
              <Progress
                value={stats.skillAnalytics.keywords || 0}
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedActivity}
        onOpenChange={(open: boolean) => !open && setSelectedActivity(null)}
      >
        {selectedActivity && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedActivity.title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {selectedActivity.description} &middot;{" "}
                {new Date(selectedActivity.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {selectedActivity.content ? (
                <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100 prose prose-sm prose-slate max-w-none">
                  <Markdown>{selectedActivity.content}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No detailed content available for this activity.
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
