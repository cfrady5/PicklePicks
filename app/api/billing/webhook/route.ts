import { NextResponse } from "next/server";
import { billingStatus, getBillingProvider } from "@/lib/billing";

export async function POST(request: Request) {
  if (!billingStatus().approved) return NextResponse.json({ error: "billing disabled" }, { status: 503 });
  const signature = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();
  try {
    const result = await getBillingProvider().handleWebhook(raw, signature);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
