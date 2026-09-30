import { NextRequest, NextResponse } from "next/server";
import {
  Billing,
  PLANS,
  PaidPlan,
  normalizeCameroonPhone,
  planPrice,
} from "@/lib/plans";
import { CampayError, campayConfigured, collect } from "@/lib/server/campay";
import { HttpError, commit, getDocument, serverConfigured, verifyUser } from "@/lib/server/firebase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Starts a Mobile Money payment: the customer receives a prompt on their
// phone to confirm with their PIN.
export async function POST(req: NextRequest) {
  try {
    if (!campayConfigured() || !serverConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not configured yet. Please try again later." },
        { status: 503 },
      );
    }
    const { uid, email } = await verifyUser(req.headers.get("authorization"));

    const body = await req.json().catch(() => ({}));
    const plan = body.plan as PaidPlan;
    const billing = body.billing as Billing;
    if (!(plan in PLANS) || (billing !== "monthly" && billing !== "annual")) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }
    const phone = normalizeCameroonPhone(String(body.phone || ""));
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid MTN or Orange number, e.g. 6XXXXXXXX." },
        { status: 400 },
      );
    }

    const profile = await getDocument(`users/${uid}`);
    if (profile?.data?.blocked || profile?.data?.deleted) {
      return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
    }

    const price = planPrice(plan, billing);
    const testAmount = Number(process.env.CAMPAY_TEST_AMOUNT || 0);
    const chargedAmount = testAmount > 0 ? testAmount : price;
    const externalReference = `cp_${uid}_${Date.now()}`;

    const result = await collect({
      amount: chargedAmount,
      from: phone,
      description: `Career Pulse AI - ${PLANS[plan].name} (${billing})`,
      external_reference: externalReference,
    });

    const now = new Date();
    await commit([
      {
        path: `payments/${result.reference}`,
        fields: {
          uid,
          email: email || "",
          plan,
          billing,
          price,
          chargedAmount,
          currency: "XAF",
          phone: `${phone.slice(0, 5)}****${phone.slice(-2)}`,
          operator: result.operator || "",
          reference: result.reference,
          externalReference,
          status: "PENDING",
          applied: false,
          provider: "campay",
          createdAt: now,
          updatedAt: now,
        },
        precondition: { exists: false },
      },
    ]);

    return NextResponse.json({
      reference: result.reference,
      ussdCode: result.ussd_code || "",
      operator: result.operator || "",
      amount: chargedAmount,
    });
  } catch (error: any) {
    if (error instanceof HttpError || error instanceof CampayError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Campay collect failed", error);
    return NextResponse.json({ error: "Payment could not be started. Please try again." }, { status: 500 });
  }
}
