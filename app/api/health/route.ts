import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { billingStatus } from "@/lib/billing";
import { emailConfigured } from "@/lib/email";

export function GET() {
  return NextResponse.json({ ok: true, mode: isDemoMode() ? "demo" : "supabase", billing: billingStatus(), email: emailConfigured() });
}
