import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/campay";
import { syncPayment } from "@/lib/server/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Campay calls this URL when a transaction changes status.
// Set it in the Campay dashboard as:
//   https://<your-domain>/api/payments/campay/webhook
// The data sent is never trusted directly: the status is re-checked with the
// Campay API before a plan is activated.
async function handle(params: URLSearchParams | Record<string, any>) {
  const get = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) : params?.[k] ?? null;
  const reference = String(get("reference") || "");
  if (!verifyWebhookSignature(get("signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (!/^[\w-]{6,80}$/.test(reference)) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }
  try {
    const { status } = await syncPayment(reference);
    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error("Campay webhook failed", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    return handle(await req.json().catch(() => ({})));
  }
  const text = await req.text();
  return handle(new URLSearchParams(text));
}
