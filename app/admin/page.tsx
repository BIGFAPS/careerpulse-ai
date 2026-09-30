"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Users,
  Activity,
  FileText,
  Trash2,
  Ban,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  SlidersHorizontal,
  Search,
  Video,
  Mail,
  CreditCard,
} from "lucide-react";
import {
  AdminEntry,
  AdminLoginError,
  AdminUserRow,
  adminLogin,
  changeAdminPassword,
  deleteUserAccount,
  grantAdmin,
  isAdmin,
  loadAdmins,
  loadPayments,
  PaymentRow,
  loadUsers,
  revokeAdmin,
  setUserBlocked,
  setUserPlan,
  touchAdmin,
} from "@/lib/admin";
import {
  DEFAULT_INTERVIEW_SETTINGS,
  InterviewSettings,
  JobDescription,
  addJobDescription,
  deleteJobDescription,
  getInterviewSettings,
  listJobDescriptions,
  saveInterviewSettings,
  updateJobDescription,
} from "@/lib/platform";
import { formatDate } from "@/lib/history";

type Tab = "users" | "payments" | "jobs" | "settings" | "admins";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && (await isAdmin(u.uid))) {
        setAdminUid(u.uid);
        touchAdmin(u.uid);
      } else {
        setAdminUid(null);
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const u = await adminLogin(email, password);
      setAdminUid(u.uid);
      setPassword("");
    } catch (error: any) {
      setLoginError(
        error instanceof AdminLoginError ? error.message : "Login failed. Please try again.",
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setAdminUid(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!adminUid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Admin Login
            </CardTitle>
            <CardDescription>Restricted to Career Pulse AI administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && <div className="text-xs text-red-500">{loginError}</div>}
              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard adminUid={adminUid} onLogout={handleLogout} />;
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{value}</div>
        {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function AdminDashboard({ adminUid, onLogout }: { adminUid: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [settings, setSettings] = useState<InterviewSettings>(DEFAULT_INTERVIEW_SETTINGS);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const a = await loadAdmins();
      setAdmins(a);
      const u = await loadUsers(new Set(a.map((x) => x.id)));
      setUsers(u);
      setJobs(await listJobDescriptions());
      setSettings(await getInterviewSettings());
      setPayments(await loadPayments().catch(() => []));
    } catch (e) {
      console.error(e);
      setError(
        "Some data could not be loaded. Make sure the Firestore security rules from firestore.rules are published.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const active = users.filter((u) => !u.deleted && !u.isAdmin);
  const totals = useMemo(
    () => ({
      users: active.length,
      blocked: active.filter((u) => u.blocked).length,
      resumes: active.reduce((a, u) => a + u.resumesAnalyzed, 0),
      interviews: active.reduce((a, u) => a + u.interviewsCompleted, 0),
      letters: active.reduce((a, u) => a + u.coverLettersGenerated, 0),
      revenue: payments
        .filter((p) => p.status === "SUCCESSFUL")
        .reduce((a, p) => a + (Number(p.chargedAmount) || 0), 0),
      avgPrep: active.length
        ? Math.round(active.reduce((a, u) => a + u.preparednessScore, 0) / active.length)
        : 0,
    }),
    [active, payments],
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "payments", label: "Payments", icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: "jobs", label: "Job descriptions", icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: "settings", label: "Interview settings", icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: "admins", label: "Admins & security", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-200 p-4 md:p-10 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-3 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Admin Dashboard</h1>
            <p className="text-xs text-slate-500">
              Manage users, job descriptions and interview parameters, and view platform statistics.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md p-3">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard icon={<Users className="w-4 h-4" />} label="Users" value={totals.users} hint={`${totals.blocked} blocked`} />
          <StatCard icon={<FileText className="w-4 h-4" />} label="Resumes analysed" value={totals.resumes} />
          <StatCard icon={<Video className="w-4 h-4" />} label="Interviews done" value={totals.interviews} />
          <StatCard icon={<Mail className="w-4 h-4" />} label="Cover letters" value={totals.letters} />
          <StatCard icon={<CreditCard className="w-4 h-4" />} label="Revenue (XAF)" value={totals.revenue.toLocaleString("fr-FR")} hint={`${payments.filter((p) => p.status === "SUCCESSFUL").length} paid`} />
          <StatCard icon={<Activity className="w-4 h-4" />} label="Avg. preparedness" value={`${totals.avgPrep}%`} />
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              className="h-8 text-xs font-bold gap-1.5"
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </Button>
          ))}
        </div>

        {tab === "users" && <UsersPanel users={users} onChange={refresh} />}
        {tab === "payments" && <PaymentsPanel payments={payments} />}
        {tab === "jobs" && <JobsPanel jobs={jobs} onChange={refresh} />}
        {tab === "settings" && <SettingsPanel initial={settings} />}
        {tab === "admins" && (
          <AdminsPanel adminUid={adminUid} admins={admins} users={users} onChange={refresh} />
        )}
      </div>
    </div>
  );
}

function UsersPanel({ users, onChange }: { users: AdminUserRow[]; onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = users
    .filter((u) => !u.isAdmin)
    .filter((u) => showDeleted || !u.deleted)
    .filter((u) =>
      `${u.email} ${u.displayName} ${u.uid}`.toLowerCase().includes(search.toLowerCase()),
    );

  const run = async (uid: string, fn: () => Promise<void>) => {
    setBusy(uid);
    try {
      await fn();
      onChange();
    } catch (e) {
      console.error(e);
      alert("The action failed. Check the Firestore rules and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User accounts</CardTitle>
        <CardDescription>Block, unblock or delete candidate accounts and change their plan.</CardDescription>
        <div className="flex flex-wrap gap-3 items-center pt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              className="h-8 text-xs pl-8"
              placeholder="Search by email, name or id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="text-xs text-slate-600 flex items-center gap-1.5">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Show deleted accounts
          </label>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Joined / last login</th>
              <th className="py-2 pr-3">Activity</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.uid} className="border-b last:border-0 align-top">
                <td className="py-2 pr-3">
                  <div className="font-semibold text-slate-800">{u.displayName || "—"}</div>
                  <div className="text-slate-500">{u.email || <span className="font-mono">{u.uid.slice(0, 10)}…</span>}</div>
                </td>
                <td className="py-2 pr-3 text-slate-500">
                  <div>{formatDate(u.createdAt) || "—"}</div>
                  <div>{formatDate(u.lastLogin) || "—"}</div>
                </td>
                <td className="py-2 pr-3 text-slate-500">
                  {u.resumesAnalyzed} resumes · {u.interviewsCompleted} interviews · {u.coverLettersGenerated} letters
                  <div>Preparedness {u.preparednessScore}%</div>
                </td>
                <td className="py-2 pr-3">
                  <select
                    className="h-7 rounded border border-slate-200 bg-white px-1 text-xs"
                    value={u.plan}
                    disabled={u.deleted || busy === u.uid}
                    onChange={(e) => run(u.uid, () => setUserPlan(u.uid, e.target.value))}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Career Pro</option>
                    <option value="elite">Elite Prep</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {u.deleted ? (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold text-[10px] uppercase">Deleted</span>
                  ) : u.blocked ? (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] uppercase">Blocked</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Active</span>
                  )}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {!u.deleted && (
                    <>
                      {u.blocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={busy === u.uid}
                          onClick={() => run(u.uid, () => setUserBlocked(u.uid, false))}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Unblock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] text-amber-700"
                          disabled={busy === u.uid}
                          onClick={() => run(u.uid, () => setUserBlocked(u.uid, true))}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Block
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-red-600 ml-1"
                        disabled={busy === u.uid}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete ${u.email || "this user"}? All their analyses, interviews and statistics will be erased and the account will be permanently disabled.`,
                            )
                          ) {
                            run(u.uid, () => deleteUserAccount(u.uid));
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const emptyJob = { title: "", company: "", industry: "", description: "", active: true };

function JobsPanel({ jobs, onChange }: { jobs: JobDescription[]; onChange: () => void }) {
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addJobDescription(form);
      setForm(emptyJob);
      onChange();
    } catch (err) {
      console.error(err);
      alert("Could not save the job description.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a job description</CardTitle>
          <CardDescription>Candidates can pick these jobs in the Resume Analyzer and the Interview Coach.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input className="h-8 text-xs" placeholder="Job title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-xs" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <Textarea className="min-h-[140px] text-xs" placeholder="Full job description *" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button type="submit" className="w-full h-8 text-xs" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />} Add job
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Job library ({jobs.length})</CardTitle>
          <CardDescription>Hide a job to remove it from the candidates&apos; lists without deleting it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
          {jobs.map((j) => (
            <div key={j.id} className="p-3 border rounded-lg bg-slate-50">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">{j.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {[j.company, j.industry].filter(Boolean).join(" · ") || "—"}
                    {j.active === false && " · hidden"}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={async () => {
                      await updateJobDescription(j.id!, { active: j.active === false });
                      onChange();
                    }}
                  >
                    {j.active === false ? "Show" : "Hide"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-red-600"
                    onClick={async () => {
                      if (confirm(`Delete "${j.title}"?`)) {
                        await deleteJobDescription(j.id!);
                        onChange();
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-3">{j.description}</p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-xs text-slate-500">No job descriptions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel({ initial }: { initial: InterviewSettings }) {
  const [s, setS] = useState<InterviewSettings>(initial);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await saveInterviewSettings({
        ...s,
        numberOfQuestions: Math.max(1, Math.min(15, Number(s.numberOfQuestions) || 5)),
      });
      setMsg("Settings saved. They apply to new interviews.");
    } catch (e) {
      console.error(e);
      setMsg("Could not save the settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Interview parameters</CardTitle>
        <CardDescription>Applied to every mock interview started by candidates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <label className="block space-y-1">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Number of questions (1–15)</span>
          <Input
            type="number"
            min={1}
            max={15}
            className="h-8 text-xs"
            value={s.numberOfQuestions}
            onChange={(e) => setS({ ...s, numberOfQuestions: Number(e.target.value) })}
          />
        </label>
        <label className="block space-y-1">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Difficulty</span>
          <select className="w-full h-8 rounded border border-slate-200 bg-white px-2" value={s.difficulty} onChange={(e) => setS({ ...s, difficulty: e.target.value as any })}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Question mix</span>
          <select className="w-full h-8 rounded border border-slate-200 bg-white px-2" value={s.questionMix} onChange={(e) => setS({ ...s, questionMix: e.target.value as any })}>
            <option value="balanced">Balanced</option>
            <option value="technical">Mostly technical</option>
            <option value="behavioral">Mostly behavioural (STAR)</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Voice answer language</span>
          <select className="w-full h-8 rounded border border-slate-200 bg-white px-2" value={s.voiceLanguage} onChange={(e) => setS({ ...s, voiceLanguage: e.target.value })}>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="fr-FR">French</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.webcamFeedback} onChange={(e) => setS({ ...s, webcamFeedback: e.target.checked })} />
          Webcam body-language feedback
        </label>
        <div className="flex items-center gap-3">
          <Button className="h-8 text-xs" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />} Save settings
          </Button>
          {msg && <span className="text-slate-500">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminsPanel({
  adminUid,
  admins,
  users,
  onChange,
}: {
  adminUid: string;
  admins: AdminEntry[];
  users: AdminUserRow[];
  onChange: () => void;
}) {
  const [promoteEmail, setPromoteEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const target = users.find(
      (u) => u.email.toLowerCase() === promoteEmail.trim().toLowerCase() && !u.deleted,
    );
    if (!target) {
      setMsg("No active account with this email. The person must sign up first.");
      return;
    }
    await grantAdmin(target.uid, target.email);
    setPromoteEmail("");
    setMsg(`${target.email} is now an administrator.`);
    onChange();
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    if (next.length < 10) {
      setPwMsg("The new password must have at least 10 characters.");
      return;
    }
    if (next !== confirmNext) {
      setPwMsg("The two new passwords do not match.");
      return;
    }
    try {
      await changeAdminPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirmNext("");
      setPwMsg("Password changed.");
    } catch (err: any) {
      setPwMsg(
        err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password"
          ? "The current password is incorrect."
          : "Could not change the password.",
      );
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>Give admin access to an existing account, or remove it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={promote} className="flex gap-2">
            <Input
              type="email"
              className="h-8 text-xs"
              placeholder="Email of an existing account"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              required
            />
            <Button type="submit" size="sm" className="h-8">
              Grant
            </Button>
          </form>
          {msg && <p className="text-xs text-slate-500">{msg}</p>}
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex justify-between items-center p-2 px-3 border rounded-lg bg-slate-50">
                <span className="text-xs font-bold">
                  {a.email}
                  {a.id === adminUid && <span className="text-slate-400 font-normal"> (you)</span>}
                </span>
                {a.id !== adminUid && admins.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm(`Remove admin access for ${a.email}?`)) {
                        await revokeAdmin(a.id);
                        onChange();
                      }
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 h-auto text-[10px]"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change my password</CardTitle>
          <CardDescription>Passwords are stored hashed by Firebase Authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePw} className="space-y-3">
            <Input type="password" autoComplete="current-password" className="h-8 text-xs" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <Input type="password" autoComplete="new-password" className="h-8 text-xs" placeholder="New password (min. 10 characters)" value={next} onChange={(e) => setNext(e.target.value)} required />
            <Input type="password" autoComplete="new-password" className="h-8 text-xs" placeholder="Repeat new password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} required />
            <Button type="submit" className="h-8 text-xs w-full">
              Update password
            </Button>
            {pwMsg && <p className="text-xs text-slate-500">{pwMsg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsPanel({ payments }: { payments: PaymentRow[] }) {
  const style: Record<string, string> = {
    SUCCESSFUL: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-blue-100 text-blue-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Money payments (Campay)</CardTitle>
        <CardDescription>Plan purchases made with MTN Mobile Money and Orange Money.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Operator</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-3 text-slate-500">{formatDate(p.createdAt)}</td>
                <td className="py-2 pr-3">{p.email || "—"}<div className="text-slate-400">{p.phone}</div></td>
                <td className="py-2 pr-3">{p.plan === "elite" ? "Elite Prep" : "Career Pro"} · {p.billing}</td>
                <td className="py-2 pr-3 font-semibold">{Number(p.chargedAmount || 0).toLocaleString("fr-FR")} XAF</td>
                <td className="py-2 pr-3">{p.operator || "—"}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${style[p.status] || ""}`}>{p.status}</span>
                </td>
                <td className="py-2 font-mono text-[10px] text-slate-500">{p.id.slice(0, 13)}…</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">No payments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
