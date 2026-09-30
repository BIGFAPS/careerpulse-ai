"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const questionsDb = {
  technology: [
    { q: "Can you describe a time you had to learn a new technology quickly?", category: "Behavioral" },
    { q: "How do you handle technical debt?", category: "Technical" },
    { q: "Explain the concept of RESTful APIs to someone who isn't technical.", category: "Communication" },
    { q: "Describe a challenging bug you fixed and your debugging process.", category: "Technical" },
  ],
  finance: [
    { q: "Walk me through the three financial statements.", category: "Technical" },
    { q: "Describe a time when you had to manage a complex financial model.", category: "Technical" },
    { q: "How do you stay updated with market trends?", category: "Behavioral" },
  ],
  marketing: [
    { q: "How do you measure the success of a campaign?", category: "Technical" },
    { q: "Describe a campaign that failed and what you learned from it.", category: "Behavioral" },
    { q: "What's an example of a brand whose marketing you admire?", category: "General" },
  ]
};

export default function QuestionsBankPage() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6 bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Industry Questions</h1>
        <p className="text-xs text-slate-500">Browse common interview questions categorized by industry.</p>
      </div>

      <Tabs defaultValue="technology" className="w-full">
        <TabsList className="mb-4 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="technology" className="rounded-md text-[10px] font-bold uppercase tracking-wider px-3">Technology</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-md text-[10px] font-bold uppercase tracking-wider px-3">Finance</TabsTrigger>
          <TabsTrigger value="marketing" className="rounded-md text-[10px] font-bold uppercase tracking-wider px-3">Marketing</TabsTrigger>
        </TabsList>
        
        {Object.entries(questionsDb).map(([industry, questions]) => (
          <TabsContent key={industry} value={industry}>
            <div className="grid gap-3 md:grid-cols-2">
              {questions.map((item, idx) => (
                <Card key={idx} className="rounded-xl border-slate-200 shadow-sm bg-white">
                  <CardHeader className="p-4 pb-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{item.category}</div>
                    <CardTitle className="text-sm font-bold text-slate-800 leading-snug">{item.q}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                      Use the STAR method (Situation, Task, Action, Result) to answer this effectively.
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
