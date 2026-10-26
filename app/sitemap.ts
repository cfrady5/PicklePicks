import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getRepo } from "@/lib/data";
import { isSettled } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["", "/results", "/how-it-works", "/pricing", "/legal/terms", "/legal/privacy", "/responsible-gambling"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));
  let picks: MetadataRoute.Sitemap = [];
  try {
    picks = (await getRepo().listPublicPicks()).filter(isSettled).slice(0, 500).map((p) => ({ url: `${SITE_URL}/picks/${p.id}`, lastModified: p.settledAt ?? undefined, changeFrequency: "yearly" as const, priority: 0.4 }));
  } catch { /* ignore */ }
  return [...statics, ...picks];
}
