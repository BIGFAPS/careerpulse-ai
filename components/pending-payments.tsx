"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";

// Re-checks Mobile Money payments that were not confirmed while the checkout
// window was open (e.g. the user closed it before approving on the phone).
export function PendingPaymentsCheck() {
  const { user, refreshProfile } = useAuth();
  const [state, setState] = useState<"idle" | "checking" | "activated">("idle");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "payments"),
            where("uid", "==", user.uid),
            where("status", "==", "PENDING"),
          ),
        );
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const pending = snap.docs.filter((d) => {
          const c = d.data().createdAt;
          const t = typeof c?.toDate === "function" ? c.toDate().getTime() : 0;
          return t > dayAgo;
        });
        if (pending.length === 0 || cancelled) return;
        setState("checking");
        const token = await auth.currentUser?.getIdToken();
        let activated = false;
        for (const d of pending) {
          const res = await fetch(
            `/api/payments/campay/status?reference=${encodeURIComponent(d.id)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
          );
          const data = await res.json().catch(() => ({}));
          if (data.status === "SUCCESSFUL") activated = true;
        }
        if (cancelled) return;
        if (activated) {
          await refreshProfile();
          setState("activated");
        } else {
          setState("idle");
        }
      } catch (e) {
        console.error("Pending payment check failed", e);
        if (!cancelled) setState("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshProfile]);

  if (state === "checking") {
    return (
      <div className="mx-auto mb-4 flex max-w-xl items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your recent Mobile Money payment…
      </div>
    );
  }
  if (state === "activated") {
    return (
      <div className="mx-auto mb-4 flex max-w-xl items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <CheckCircle2 className="h-4 w-4" /> Your payment was confirmed and your plan is now active.
      </div>
    );
  }
  return null;
}
