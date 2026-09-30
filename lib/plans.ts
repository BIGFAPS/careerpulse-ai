// Membership plans and prices (XAF). Shared by the pricing page and the
// payment API so the amount charged is always computed on the server.
export type PaidPlan = "pro" | "elite";
export type Billing = "monthly" | "annual";

export const PLANS: Record<PaidPlan, { name: string; monthly: number; annual: number }> = {
  pro: { name: "Career Pro", monthly: 4500, annual: 43200 },
  elite: { name: "Elite Prep", monthly: 12000, annual: 115200 },
};

export function planPrice(plan: PaidPlan, billing: Billing) {
  return billing === "annual" ? PLANS[plan].annual : PLANS[plan].monthly;
}

export function planDurationDays(billing: Billing) {
  return billing === "annual" ? 365 : 30;
}

export function planLabel(plan?: string) {
  if (plan === "pro") return "Career Pro";
  if (plan === "elite") return "Elite Prep";
  return "Free Tier";
}

/** A paid plan whose end date has passed is treated as the free plan. */
export function effectivePlan(plan?: string, expiresAt?: any): "free" | PaidPlan {
  if (plan !== "pro" && plan !== "elite") return "free";
  if (!expiresAt) return plan; // set manually by an admin without an end date
  const date =
    typeof expiresAt?.toDate === "function" ? expiresAt.toDate() : new Date(expiresAt);
  return isNaN(date.getTime()) || date.getTime() > Date.now() ? plan : "free";
}

/** Cameroon mobile money number: 237 + 9 digits starting with 6. */
export function normalizeCameroonPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("237") ? digits.slice(3) : digits;
  if (!/^6\d{8}$/.test(local)) return null;
  return `237${local}`;
}
