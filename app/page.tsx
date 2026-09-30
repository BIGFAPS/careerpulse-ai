import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MessageSquare,
  LineChart,
  ChevronRight,
  Video,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-200 font-sans">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 relative overflow-hidden shrink-0 border-b border-slate-200 bg-white">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center space-y-6 text-center bg-">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl md:text-6xl">
                Elevate Your Career with{" "}
                <span className="text-blue-600">Insights</span>
              </h1>
              <p className="mx-auto max-w-[600px] text-xs text-slate-500 sm:text-sm">
                Optimize your resume, master your interviews, and track your
                success with Career Pulse AI. Your ultimate career coaching
                companion.
              </p>
            </div>
            <div className="space-x-3">
              <Link href="/signup">
                <Button className="h-10 px-6 text-xs font-bold shadow-md shadow-blue-200">
                  Get Started <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="h-10 px-6 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[80px] rounded-full z-0 pointer-events-none" />
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-16 flex-1">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-3 text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Everything You Need to Succeed
            </h2>
            <p className="max-w-[700px] text-xs text-slate-500">
              Our suite of tools is designed to give you the competitive edge in
              your job search.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-4 lg:grid-cols-3">
            <div className="flex flex-col space-y-3 text-left p-5 bg-white rounded-xl border border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 border border-blue-100 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Smart Resume Analyzer
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Get instant feedback on your resume. We analyze keywords,
                formatting, and impact to help you pass the ATS.
              </p>
            </div>
            <div className="flex flex-col space-y-3 text-left p-5 bg-white rounded-xl border border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 border border-blue-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                AI Mock Interviews
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Practice with real-world scenarios. Our AI provides real-time
                personalized feedback on your delivery and answers.
              </p>
            </div>
            <div className="flex flex-col space-y-3 text-left p-5 bg-white rounded-xl border border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 border border-blue-100 rounded-lg">
                <LineChart className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Progress Tracking
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Monitor your improvement over time with our comprehensive
                dashboard tracking your success rates and skill growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About App Section */}
      <section className="w-full py-16 bg-white border-y border-slate-200">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                Advanced AI for Your Career
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Career Pulse AI utilizes Google&apos;s latest models to
                understand the nuances of the job market. Our system
                doesn&apos;t just match keywords; it understands the semantic
                context of your experience, providing precise, actionable advice
                that sets you apart.
              </p>
              <ul className="space-y-2 mt-4 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />{" "}
                  Parses DOCX, PDF, and Markdown
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />{" "}
                  Multimodal Interview Analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />{" "}
                  Personalized Cover Letters
                </li>
              </ul>
            </div>
            <div className="bg-slate-200 rounded-xl aspect-[4/3] border border-slate-200 shadow-inner relative overflow-hidden flex items-center justify-center text-slate-400">
              {/* Visual placeholder for app screenshot */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 opacity-50" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <Video className="w-10 h-10 text-blue-500 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Live Video Coaching Module
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="w-full py-16 bg-slate-200 border-t border-slate-100"
      >
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Everything you need to know about Career Pulse AI.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "How does the AI analyze my resume?",
                a: "Our AI model, powered by Google Gemini, compares your resume against industry standards and specific job descriptions. It looks for impactful keywords, formatting consistency, and quantifiable achievements.",
              },
              {
                q: "Is the video interview simulator realistic?",
                a: "Yes. The simulator asks dynamic follow-up questions based on your responses, just like a real interviewer would. It assesses your content as well as non-verbal cues.",
              },
              {
                q: "Can I use the generated cover letters directly?",
                a: "While the AI generates highly tailored options, we recommend reviewing and adding your personal touch before submitting to employers.",
              },
              {
                q: "Is my data secure?",
                a: "Absolutely. We do not store your resume content or interview recordings beyond the session without your explicit permission, adhering to strict privacy protocols.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-sm font-bold text-slate-800 mb-2">
                  {faq.q}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-8">
            Trusted by Job Seekers
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {[
              {
                text: "Career Pulse AI caught mistakes in my resume that I had missed for months. The video interview simulator honestly felt like a real technical screening.",
                author: "Sarah J.",
                role: "Software Engineer",
              },
              {
                text: "The cover letter generator writes better letters than I ever could. It accurately captures my tone and aligns perfectly with the job description.",
                author: "Michael T.",
                role: "Product Manager",
              },
              {
                text: "Getting scored out of 100 on my resume made optimizing it feel like a game. Once I hit 100/100, I got 3 callbacks in one week!",
                author: "Amanda R.",
                role: "Marketing Director",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-amber-400 flex mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg
                      key={j}
                      className="w-3 h-3 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  &quot;{t.text}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {t.author[0]}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-800">
                      {t.author}
                    </h4>
                    <p className="text-[10px] text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
