"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import { signInWithGoogle, signInWithGithub } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  afterSignIn,
  consumeBlockedNotice,
  friendlyAuthError,
  nextUrl,
} from "@/lib/auth-helpers";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (consumeBlockedNotice()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMsg(
        "This account has been blocked by an administrator. Please contact support.",
      );
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      await signInWithGoogle();
      await afterSignIn();
      router.push(nextUrl());
    } catch (error: any) {
      console.error(error);
      setErrorMsg(friendlyAuthError(error, "Failed to log in with Google."));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      await signInWithGithub();
      await afterSignIn();
      router.push(nextUrl());
    } catch (error: any) {
      console.error(error);
      setErrorMsg(friendlyAuthError(error, "Failed to log in with GitHub."));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: name });
      await afterSignIn();
      router.push(nextUrl());
    } catch (error: any) {
      console.error(error);
      setErrorMsg(friendlyAuthError(error, "Failed to sign up with email."));
    } finally {
      setLoading(false);
    }
  };

  const handleNotConfigured = (provider: string) => {
    alert(
      `${provider} login is not configured yet. Please configure it in the Firebase console.`,
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-indigo-50 via-slate-300 to-blue-300 px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <Card className="w-full max-w-md rounded-xl border-slate-200 shadow-2xl shadow-blue-900/10 bg-white/90 backdrop-blur-sm relative z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
            Create an Account
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Join Career Pulse AI to accelerate your career
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <form className="space-y-3" onSubmit={handleEmailSignup}>
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>
            {errorMsg && (
              <div className="text-xs text-red-500 font-medium">{errorMsg}</div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold shadow-md shadow-blue-200 mt-2"
            >
              Sign Up
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-4 h-4 sm:mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="hidden sm:inline">Google</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
              onClick={handleGithubLogin}
              disabled={loading}
            >
              <Github className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">GitHub</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
              onClick={() => handleNotConfigured("LinkedIn")}
              disabled={loading}
            >
              <Linkedin className="w-4 h-4 sm:mr-2 text-blue-600" />
              <span className="hidden sm:inline">LinkedIn</span>
            </Button>
          </div>

          <div className="text-center text-xs text-slate-500 mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:underline font-bold"
            >
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
