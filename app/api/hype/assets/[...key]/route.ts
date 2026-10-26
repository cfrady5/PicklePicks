import { NextResponse } from "next/server";
import { getHypeStore } from "@/lib/hype/store";

export const dynamic = "force-dynamic";

/** Serves generated assets (demo mode keeps them in memory; Supabase mode serves from the bucket). */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.map(decodeURIComponent).join("/");
  const asset = await getHypeStore().getAsset(key);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(asset.data), { headers: { "Content-Type": asset.contentType, "Cache-Control": "public, max-age=3600" } });
}
