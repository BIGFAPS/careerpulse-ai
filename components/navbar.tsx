"use client";

import Link from "next/link";
import { Logo } from "./ui/icons";
import { Home, FileText, Video, User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";
import { logOut } from "@/lib/firebase";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-14 w-full bg-slate-100 border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="mr-4 sm:mr-6 flex items-center space-x-2">
            <Logo className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end">
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted-foreground mr-6">
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/resume-analyzer"
                  className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
                >
                  Resume Suite
                </Link>
                <Link
                  href="/mock-interview"
                  className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
                >
                  Interview Coach
                </Link>
                <Link
                  href="/cover-letter"
                  className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
                >
                  Cover Letter
                </Link>
                <Link
                  href="/history"
                  className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
                >
                  History
                </Link>
              </>
            )}
            <Link
              href="/pricing"
              className="bg-slate-800 text-white px-4 py-1.5 rounded-md my-auto hover:bg-slate-700 transition-colors"
            >
              Pricing (XAF)
            </Link>
            <Link
              href="/#faq"
              className="hover:text-primary h-14 flex items-center border-b-2 border-transparent hover:border-primary transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {!loading && user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                    {user.displayName || "User"}
                  </p>
                  <button
                    onClick={() => logOut()}
                    className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Log out
                  </button>
                </div>
                <Link href="/profile">
                  <div className="w-8 h-8 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase cursor-pointer hover:bg-primary/20 transition-colors">
                    {getInitials(user.displayName || user.email)}
                  </div>
                </Link>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block text-xs font-bold text-slate-600 hover:text-primary mr-2"
                >
                  Log In
                </Link>
                <Link href="/signup" className="hidden sm:block">
                  <div className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors shrink-0">
                    Sign Up
                  </div>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      {pathname !== "/" && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex sm:hidden justify-around items-center px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] text-[10px] font-bold text-slate-500 pb-safe">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <Home className="w-5 h-5" /> Dashboard
              </Link>
              <Link
                href="/resume-analyzer"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <FileText className="w-5 h-5" /> Resume
              </Link>
              <Link
                href="/mock-interview"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <Video className="w-5 h-5" /> Interview
              </Link>
              <Link
                href="/profile"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <User className="w-5 h-5" /> Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <Home className="w-5 h-5" /> Home
              </Link>
              <Link
                href="/pricing"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <FileText className="w-5 h-5" /> Pricing
              </Link>
              <Link
                href="/#faq"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <FileText className="w-5 h-5" /> FAQ
              </Link>
              <Link
                href="/profile"
                className="flex flex-col items-center gap-1 hover:text-blue-600"
              >
                <User className="w-5 h-5" /> Profile
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
