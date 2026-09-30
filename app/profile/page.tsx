"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Briefcase, Settings, Loader2, History, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import { updateUserProfile } from "@/lib/users";
import { logOut } from "@/lib/firebase";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(user?.displayName || profile?.displayName || "");
    setTargetRole(profile?.targetRole || "");
  }, [user, profile]);

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!user) return null;

  const plan = profile?.plan || "free";

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      if (name.trim() !== (user.displayName || "")) {
        await updateProfile(user, { displayName: name.trim() });
      }
      await updateUserProfile(user.uid, {
        displayName: name.trim(),
        targetRole: targetRole.trim(),
      });
      await refreshProfile();
      setMessage("Your changes have been saved.");
    } catch (e) {
      console.error(e);
      setMessage("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6 bg-slate-50 min-h-[calc(100vh-3.5rem)] pb-24">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Profile Settings</h1>
        <p className="text-xs text-slate-500">Manage your account and career preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
           <Card className="rounded-xl border-slate-200 shadow-sm bg-white overflow-hidden">
             <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-24 w-full"></div>
             <div className="px-5 pb-5 -mt-12 flex flex-col items-center text-center">
               <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md mb-3">
                 <div className="w-full h-full rounded-full border flex items-center justify-center overflow-hidden relative">
                   {user.photoURL ? (
                     <Image src={user.photoURL} alt="Profile" fill sizes="96px" className="object-cover" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full bg-blue-50 border-blue-100 flex items-center justify-center">
                       <User className="w-10 h-10 text-blue-600" />
                     </div>
                   )}
                 </div>
               </div>
               <h2 className="text-lg font-bold text-slate-800">{user.displayName || "User"}</h2>
               <p className="text-xs text-slate-500 mb-4">{user.email}</p>
               <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                 {plan === "free" ? "Free Tier" : plan === "pro" ? "Career Pro" : "Elite Prep"}
               </span>
               <div className="flex flex-col gap-2 w-full mt-5">
                 <Link href="/history">
                   <Button variant="outline" className="w-full h-8 text-xs font-bold">
                     <History className="w-3.5 h-3.5 mr-1.5" /> My history
                   </Button>
                 </Link>
                 <Button variant="outline" className="w-full h-8 text-xs font-bold text-red-600" onClick={handleLogout}>
                   <LogOut className="w-3.5 h-3.5 mr-1.5" /> Log out
                 </Button>
               </div>
             </div>
           </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center">
                <Settings className="w-4 h-4 mr-2 text-slate-400" /> General Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <User className="w-3 h-3 mr-1" /> Full Name
                  </label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Mail className="w-3 h-3 mr-1" /> Email Address
                  </label>
                  <Input type="email" value={user.email || ""} readOnly className="h-9 text-xs bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Briefcase className="w-3 h-3 mr-1" /> Current / Target Role
                  </label>
                  <Input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Frontend Developer"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button className="h-9 text-xs font-bold shadow-md shadow-blue-200" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
                {message && <span className="text-xs text-slate-500">{message}</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
