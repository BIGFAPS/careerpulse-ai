// Server-only helpers to (1) check who is calling an API route and
// (2) write to Firestore with administrator rights, using the Firebase REST
// APIs (no extra dependency).
//
//   FIREBASE_SERVICE_ACCOUNT  the JSON key of a Firebase service account
//                             (Firebase console > Project settings >
//                             Service accounts > Generate new private key),
//                             pasted as-is or base64-encoded.
import crypto from "crypto";
import firebaseConfig from "@/firebase-applet-config.json";

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || "(default)";
const DOCS_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ---------- Caller identity ----------

/** Verifies a Firebase ID token and returns the user's uid. */
export async function verifyUser(authorization: string | null): Promise<{ uid: string; email?: string }> {
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!idToken) throw new HttpError("Please log in first.", 401);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  const user = data?.users?.[0];
  if (!res.ok || !user?.localId) throw new HttpError("Your session has expired. Please log in again.", 401);
  if (user.disabled) throw new HttpError("This account is disabled.", 403);
  return { uid: user.localId, email: user.email };
}

// ---------- Service account access token ----------

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError("Payments are not configured yet (missing FIREBASE_SERVICE_ACCOUNT).", 503);
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const sa = JSON.parse(text);
  return {
    email: sa.client_email as string,
    key: String(sa.private_key).replace(/\\n/g, "\n"),
  };
}

export function serverConfigured() {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

let cachedAccess: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(sa.key)
    .toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("Service account token failed", res.status, data?.error, data?.error_description);
    throw new HttpError("Server could not access the database.", 500);
  }
  cachedAccess = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

// ---------- Firestore REST (value encoding) ----------

type Plain = string | number | boolean | null | Date | Plain[] | { [k: string]: Plain };

function encode(value: Plain): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function encodeFields(obj: Record<string, Plain>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encode(v);
  return out;
}

function decode(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

function decodeFields(fields: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
  return out;
}

export interface StoredDoc {
  data: Record<string, any>;
  updateTime: string;
}

export async function getDocument(path: string): Promise<StoredDoc | null> {
  const token = await accessToken();
  const res = await fetch(`${DOCS_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) {
    console.error("Firestore read failed", res.status, data?.error?.message);
    throw new HttpError("Database read failed.", 500);
  }
  return { data: decodeFields(data.fields || {}), updateTime: data.updateTime };
}

export interface Write {
  path: string;
  fields: Record<string, Plain>;
  merge?: boolean; // only update the given fields
  precondition?: { updateTime?: string; exists?: boolean };
}

/** Atomically applies several writes. Returns false if a precondition failed. */
export async function commit(writes: Write[]): Promise<boolean> {
  const token = await accessToken();
  const root = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
  const body = {
    writes: writes.map((w) => ({
      update: { name: `${root}/${w.path}`, fields: encodeFields(w.fields) },
      ...(w.merge ? { updateMask: { fieldPaths: Object.keys(w.fields) } } : {}),
      ...(w.precondition ? { currentDocument: w.precondition } : {}),
    })),
  };
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${root.replace("/documents", "")}/documents:commit`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  if (res.status === 409 || res.status === 412) return false;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.error?.status === "FAILED_PRECONDITION" || err?.error?.status === "ABORTED") return false;
    console.error("Firestore commit failed", res.status, err?.error?.message);
    throw new HttpError("Database write failed.", 500);
  }
  return true;
}
