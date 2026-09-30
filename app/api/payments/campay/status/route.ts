import { NextRequest, NextResponse } from "next/server";
import { HttpError, getDocument, verifyUser } from "@/lib/server/firebase-server";
import { syncPayment } from "@/lib/server/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Polled by the checkout window until the payment is confirmed or failed.
export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyUser(req.headers.get("authorization"));
    const reference = req.nextUrl.searchParams.get("reference") || "";
    if (!/^[\w-]{6,80}$/.test(reference)) {
      return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
    }
    const stored = await getDocument(`payments/${reference}`);
    if (!stored || stored.data.uid !== uid) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    const { status, payment } = await syncPayment(reference);
    return NextResponse.json({
      status,
      plan: payment?.plan,
      billing: payment?.billing,
      planExpiresAt: payment?.planExpiresAt || null,
      reason: payment?.reason || "",
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Campay status failed", error);
    return NextResponse.json({ status: "PENDING" });
  }
}
