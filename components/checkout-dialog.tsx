"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";
import { Billing, PLANS, PaidPlan, normalizeCameroonPhone, planPrice } from "@/lib/plans";
import { formatDate } from "@/lib/history";

type Step = "form" | "waiting" | "success" | "failed";

const POLL_MS = 5000;
const MAX_WAIT_MS = 5 * 60 * 1000;

async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function operatorHint(phone: string) {
  const n = normalizeCameroonPhone(phone);
  if (!n) return "";
  const second = n[4]; // 6X...
  const third = Number(n[5]);
  // MTN: 650-654, 67x, 680-684 · Orange: 655-659, 69x, 685-689
  if (second === "7" || ((second === "5" || second === "8") && third <= 4)) return "MTN Mobile Money";
  if (second === "9" || ((second === "5" || second === "8") && third >= 5)) return "Orange Money";
  return "";
}

export function CheckoutDialog({
  plan,
  billing,
  onClose,
  onPaid,
}: {
  plan: PaidPlan;
  billing: Billing;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ussd, setUssd] = useState("");
  const [charged, setCharged] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);

  const price = planPrice(plan, billing);
  const hint = operatorHint(phone);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const poll = async (reference: string) => {
    try {
      const res = await fetch(
        `/api/payments/campay/status?reference=${encodeURIComponent(reference)}`,
        { headers: await authHeader(), cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (data.status === "SUCCESSFUL") {
        setExpiresAt(data.planExpiresAt || null);
        setStep("success");
        onPaid?.();
        return;
      }
      if (data.status === "FAILED") {
        setReason(data.reason || "");
        setStep("failed");
        return;
      }
    } catch {
      // network hiccup: keep polling
    }
    if (Date.now() - started.current > MAX_WAIT_MS) {
      setReason("We did not receive a confirmation in time. If you were charged, your plan will activate automatically once Campay confirms.");
      setStep("failed");
      return;
    }
    timer.current = setTimeout(() => poll(reference), POLL_MS);
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!normalizeCameroonPhone(phone)) {
      setError("Enter a valid MTN or Orange number, e.g. 6XXXXXXXX.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payments/campay/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ plan, billing, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reference) {
        setError(data.error || "The payment could not be started. Please try again.");
        return;
      }
      setUssd(data.ussdCode || "");
      setCharged(Number(data.amount) || price);
      setStep("waiting");
      started.current = Date.now();
      timer.current = setTimeout(() => poll(data.reference), POLL_MS);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Upgrade to {PLANS[plan].name}</h2>
            <p className="text-[11px] text-slate-500">
              {price.toLocaleString("fr-FR")} XAF / {billing === "annual" ? "year" : "month"}
            </p>
          </div>
          <button onClick={close} className="rounded p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          {step === "form" && (
            <form onSubmit={pay} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mobile Money number
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">+237</span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="6XXXXXXXX"
                    className="h-9 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  {hint || "MTN Mobile Money or Orange Money"}
                </span>
              </label>
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              <Button type="submit" className="w-full h-9 text-xs font-bold" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                Pay {price.toLocaleString("fr-FR")} XAF
              </Button>
              <p className="text-[10px] leading-relaxed text-slate-400">
                Secure payment processed by Campay. You will receive a request on your phone to
                confirm with your Mobile Money PIN.
              </p>
            </form>
          )}

          {step === "waiting" && (
            <div className="space-y-3 text-center py-2">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-800">Confirm the payment on your phone</p>
              <p className="text-xs text-slate-600">
                A request of <b>{(charged ?? price).toLocaleString("fr-FR")} XAF</b> was sent to your
                number. Enter your Mobile Money PIN to approve it.
              </p>
              {ussd && (
                <p className="text-xs text-slate-600">
                  No prompt? Dial <b className="font-mono">{ussd}</b> to approve it.
                </p>
              )}
              <p className="text-[10px] text-slate-400">This window updates automatically. If you close it, your plan will still be activated once the payment is confirmed.</p>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-3 text-center py-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="text-sm font-bold text-slate-800">Payment received. Thank you!</p>
              <p className="text-xs text-slate-600">
                Your {PLANS[plan].name} plan is active
                {expiresAt ? ` until ${formatDate(expiresAt)}` : ""}.
              </p>
              <Button className="w-full h-9 text-xs font-bold" onClick={close}>
                Continue
              </Button>
            </div>
          )}

          {step === "failed" && (
            <div className="space-y-3 text-center py-2">
              <XCircle className="mx-auto h-10 w-10 text-red-600" />
              <p className="text-sm font-bold text-slate-800">Payment not completed</p>
              <p className="text-xs text-slate-600">
                {reason || "The payment was declined or cancelled. No plan change was made."}
              </p>
              <Button
                className="w-full h-9 text-xs font-bold"
                onClick={() => {
                  setStep("form");
                  setReason("");
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
