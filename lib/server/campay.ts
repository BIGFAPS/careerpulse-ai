// Server-only Campay client (Cameroon MTN Mobile Money / Orange Money).
// Credentials never reach the browser: they are read from Vercel
// environment variables.
//
//   CAMPAY_BASE_URL        https://demo.campay.net/api (default, sandbox)
//                          or https://www.campay.net/api for live payments
//   CAMPAY_USERNAME        App username  } from the Campay dashboard
//   CAMPAY_PASSWORD        App password  } (Application > App keys)
//   CAMPAY_PERMANENT_TOKEN optional, used instead of username/password
//   CAMPAY_WEBHOOK_KEY     optional, verifies webhook signatures
//   CAMPAY_TEST_AMOUNT     optional, charge this amount instead of the real
//                          price (useful for sandbox testing)
import crypto from "crypto";

const BASE_URL = (process.env.CAMPAY_BASE_URL || "https://demo.campay.net/api").replace(/\/+$/, "");

export class CampayError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export function campayConfigured() {
  return !!(
    process.env.CAMPAY_PERMANENT_TOKEN ||
    (process.env.CAMPAY_USERNAME && process.env.CAMPAY_PASSWORD)
  );
}

export function isSandbox() {
  return BASE_URL.includes("demo.campay.net");
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (process.env.CAMPAY_PERMANENT_TOKEN) return process.env.CAMPAY_PERMANENT_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch(`${BASE_URL}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.CAMPAY_USERNAME,
      password: process.env.CAMPAY_PASSWORD,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new CampayError("Could not authenticate with Campay. Check the app username/password.");
  }
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return data.token;
}

async function campayFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message || data?.detail || data?.error || `Campay request failed (${res.status})`;
    throw new CampayError(String(message), res.status >= 500 ? 502 : 400);
  }
  return data;
}

export interface CollectResult {
  reference: string;
  ussd_code?: string;
  operator?: string;
}

export async function collect(params: {
  amount: number;
  from: string;
  description: string;
  external_reference: string;
}): Promise<CollectResult> {
  const data = await campayFetch("/collect/", {
    method: "POST",
    body: JSON.stringify({
      amount: String(params.amount),
      currency: "XAF",
      from: params.from,
      description: params.description,
      external_reference: params.external_reference,
    }),
  });
  if (!data.reference) throw new CampayError("Campay did not return a transaction reference.");
  return data;
}

export interface CampayTransaction {
  reference: string;
  external_reference?: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | string;
  amount?: number | string;
  currency?: string;
  operator?: string;
  code?: string;
  operator_reference?: string;
  reason?: string;
}

export async function getTransaction(reference: string): Promise<CampayTransaction> {
  return campayFetch(`/transaction/${encodeURIComponent(reference)}/`, { method: "GET" });
}

/** Verifies the HS256 JWT "signature" sent by Campay webhooks. */
export function verifyWebhookSignature(signature: string | null): boolean {
  const key = process.env.CAMPAY_WEBHOOK_KEY;
  if (!key) return true; // not configured: we always re-check the status with the API anyway
  if (!signature) return false;
  const parts = signature.split(".");
  if (parts.length !== 3) return false;
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
