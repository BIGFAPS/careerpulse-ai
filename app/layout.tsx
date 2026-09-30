import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/components/auth-provider";
import { StatsProvider } from "@/components/stats-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Career Pulse AI",
  description: "AI resume analyzer and interview coach.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className="min-h-screen bg-slate-50 text-foreground antialiased flex flex-col pb-16 sm:pb-0"
        suppressHydrationWarning
      >
        <AuthProvider>
          <StatsProvider>
            <Navbar />
            <main className="flex-1 overflow-auto">{children}</main>

            {/* Footer Info Bar */}
            <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 px-6 shrink-0 z-10 relative hidden sm:block">
              <div className="container max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-lg mb-4">
                    CareerPulse AI
                  </h3>
                  <p className="text-xs leading-relaxed opacity-80">
                    Empowering job seekers with AI-driven resume analysis,
                    insightful mock interviews, and tailored cover letters.
                  </p>
                  <div className="flex gap-4 pt-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors pt-safe">
                      <span className="text-xs">𝕏</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                      <span className="text-[10px] font-bold">IN</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors">
                      <span className="text-[10px] font-bold">GH</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-semibold text-sm mb-4">
                    Platform
                  </h4>
                  <ul className="text-xs space-y-2 opacity-80">
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Resume Analyzer
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Mock Interviews
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Cover Letter Gen
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Career Dashboard
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-semibold text-sm mb-4">
                    Resources
                  </h4>
                  <ul className="text-xs space-y-2 opacity-80">
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Pricing
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      Blog
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors">
                      FAQ
                    </li>
                    <li className="hover:text-blue-400 cursor-pointer transition-colors text-amber-500 font-bold">
                      <a href="/admin">Admin Login</a>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-semibold text-sm mb-4">
                    Legal
                  </h4>
                  <ul className="text-xs space-y-2 opacity-80">
                    <li className="hover:text-white cursor-pointer transition-colors">
                      Privacy Policy
                    </li>
                    <li className="hover:text-white cursor-pointer transition-colors">
                      Terms of Service
                    </li>
                    <li className="hover:text-white cursor-pointer transition-colors">
                      Cookie Policy
                    </li>
                  </ul>
                </div>
              </div>
              <div className="container max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] opacity-60">
                <div>© 2024 CareerPulse AI. All rights reserved.</div>
                <div className="flex gap-4">
                  <span>Version 1.3.0</span>
                </div>
              </div>
            </footer>
          </StatsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
