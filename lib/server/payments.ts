// Payment bookkeeping (server only).
// payments/{reference}: one document per Campay transaction.
// When a payment is SUCCESSFUL the user's plan is activated exactly once.
import { Billing, PaidPlan, planDurationDays } from "@/lib/plans";
import { CampayTransaction, getTransaction } from "@/lib/server/campay";
import { commit, getDocument } from "@/lib/server/firebase-server";

export type PaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED";

function normalizeStatus(s: string | undefined): PaymentStatus {
  const v = (s || "").toUpperCase();
  if (v === "SUCCESSFUL" || v === "SUCCESS") return "SUCCESSFUL";
  if (v === "FAILED" || v === "CANCELLED" || v === "EXPIRED") return "FAILED";
  return "PENDING";
}

/**
 * Asks Campay for the real status of a transaction and, if it succeeded,
 * activates the plan. Safe to call many times (polling + webhook).
 */
export async function syncPayment(reference: string): Promise<{
  status: PaymentStatus;
  payment: Record<string, any> | null;
}> {
  const path = `payments/${reference}`;
  const stored = await getDocument(path);
  if (!stored) return { status: "FAILED", payment: null };
  const payment = stored.data;
  if (payment.applied) return { status: "SUCCESSFUL", payment };
  if (payment.status === "FAILED") return { status: "FAILED", payment };

  let tx: CampayTransaction;
  try {
    tx = await getTransaction(reference);
  } catch {
    return { status: "PENDING", payment };
  }
  const status = normalizeStatus(tx.status);
  const now = new Date();

  if (status === "PENDING") return { status, payment };

  if (status === "FAILED") {
    await commit([
      {
        path,
        merge: true,
        fields: { status: "FAILED", reason: tx.reason || "", updatedAt: now },
        precondition: { updateTime: stored.updateTime },
      },
    ]);
    return { status, payment: { ...payment, status } };
  }

  // SUCCESSFUL: make sure the amount matches what we asked for
  if (tx.amount !== undefined && Number(tx.amount) < Number(payment.chargedAmount)) {
    await commit([
      {
        path,
        merge: true,
        fields: { status: "FAILED", reason: "Amount mismatch", updatedAt: now },
        precondition: { updateTime: stored.updateTime },
      },
    ]);
    return { status: "FAILED", payment };
  }

  const uid = String(payment.uid);
  const user = await getDocument(`users/${uid}`);
  const currentExpiry: Date | null =
    user?.data?.planExpiresAt instanceof Date ? user.data.planExpiresAt : null;
  const samePlan = user?.data?.plan === payment.plan;
  // Renewing the same plan early extends it; otherwise start from today
  const start = samePlan && currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(
    start.getTime() + planDurationDays(payment.billing as Billing) * 24 * 60 * 60 * 1000,
  );

  const ok = await commit([
    {
      path,
      merge: true,
      fields: {
        status: "SUCCESSFUL",
        applied: true,
        operator: tx.operator || payment.operator || "",
        operatorReference: tx.operator_reference || "",
        code: tx.code || "",
        paidAt: now,
        updatedAt: now,
        planExpiresAt: expiresAt,
      },
      // Only one caller can apply the payment (polling and webhook may race)
      precondition: { updateTime: stored.updateTime },
    },
    {
      path: `users/${uid}`,
      merge: true,
      fields: {
        plan: payment.plan as PaidPlan,
        planBilling: payment.billing,
        planExpiresAt: expiresAt,
        planUpdatedAt: now,
        lastPaymentRef: reference,
      },
    },
  ]);
  if (!ok) {
    const again = await getDocument(path);
    return { status: again?.data?.applied ? "SUCCESSFUL" : "PENDING", payment: again?.data || payment };
  }
  return { status: "SUCCESSFUL", payment: { ...payment, applied: true, planExpiresAt: expiresAt } };
}
