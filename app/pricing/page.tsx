"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useState } from "react";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const handleCheckout = (planName: string) => {
    alert(`Checkout for ${planName} plan is not implemented in this demo.`);
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 bg-slate-50 min-h-[calc(100vh-3.5rem)] pb-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl mb-2">Membership Plans</h1>
        <p className="text-xs text-slate-500 mb-6">
          Invest in your career with plans that scale to your needs. Prices are in XAF.
        </p>

        <div className="inline-flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg shadow-sm relative">
          <button 
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer z-10 ${!isAnnual ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-800"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer z-10 ${isAnnual ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-800"}`}
          >
            Annually (Save 20%)
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-6">
        {/* Free Plan */}
        <Card className="flex flex-col rounded-xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-all hover:border-slate-300 hover:-translate-y-1">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Essential</CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Essential tools to get started</CardDescription>
            <div className="mt-2 flexItems-baseline text-2xl font-black text-slate-800">
              Free
            </div>
            <p className="text-[10px] text-slate-400 mt-0">Forever</p>
          </CardHeader>
          <CardContent className="flex-1 p-5 pt-4">
            <ul className="space-y-2.5">
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">1 Resume Analysis per month</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">1 Cover Letter Generation per month</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">Basic Mock Interview Access (Questions only)</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">Standard Progress Tracking</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button className="w-full h-8 text-xs font-bold border-slate-200 cursor-pointer" variant="outline" onClick={() => handleCheckout("Essential")}>Start for Free</Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-2 border-blue-500 rounded-xl shadow-md bg-blue-50/30 relative hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="absolute -top-3 inset-x-0 flex justify-center">
            <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
              Best Value
            </span>
          </div>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-blue-900">Career Pro</CardTitle>
            <CardDescription className="text-[10px] text-blue-700/80">Comprehensive toolkit</CardDescription>
            <div className="mt-2 flex items-baseline text-2xl font-black text-blue-700">
              {isAnnual ? "43,200" : "4,500"} <span className="ml-1 text-[10px] font-bold text-blue-600/80 uppercase">XAF/{isAnnual ? "yr" : "mo"}</span>
            </div>
            <p className="text-[10px] text-blue-600 mt-0">Billed {isAnnual ? "annually" : "monthly"}</p>
          </CardHeader>
          <CardContent className="flex-1 p-5 pt-4">
            <ul className="space-y-2.5">
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] font-bold text-blue-900 leading-tight">Unlimited Resume Analyzer</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] font-bold text-blue-900 leading-tight">Unlimited Cover Letter Generator</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] font-bold text-blue-900 leading-tight">AI Mock Interviews with Feedback</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-blue-800 leading-tight">Advanced Dashboard Analytics</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-blue-800 leading-tight">Access to Premium Question Banks</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button className="w-full h-8 text-xs font-bold shadow-md shadow-blue-200 cursor-pointer" onClick={() => handleCheckout("Career Pro")}>Upgrade to Pro</Button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col rounded-xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-all hover:border-slate-300 hover:-translate-y-1">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Elite Prep</CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Ultimate interview prep</CardDescription>
            <div className="mt-2 flex items-baseline text-2xl font-black text-slate-800">
              {isAnnual ? "115,200" : "12,000"} <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase">XAF/{isAnnual ? "yr" : "mo"}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0">Billed {isAnnual ? "annually" : "monthly"}</p>
          </CardHeader>
          <CardContent className="flex-1 p-5 pt-4">
            <ul className="space-y-2.5">
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] font-bold text-slate-700 leading-tight">Everything in Pro</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] font-bold text-slate-700 leading-tight">1-on-1 Human Coach Review (Monthly)</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">Priority Email Support</span>
              </li>
              <li className="flex items-start">
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mr-1.5 mt-0.5" />
                <span className="text-[10px] text-slate-600 leading-tight">Custom Interview Scenarios</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button className="w-full h-8 text-xs font-bold border-slate-200 cursor-pointer" variant="outline" onClick={() => handleCheckout("Elite Prep")}>Subscribe Elite</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
