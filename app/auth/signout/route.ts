import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    (await cookies()).delete(DEMO_COOKIE);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
