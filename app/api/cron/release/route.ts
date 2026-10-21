import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";

/**
 * Releases scheduled picks whose release time has passed.
 * Protect with CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await getRepo().releaseScheduledPicks();
  return NextResponse.json({ released: released.map((p) => p.id) });
}
