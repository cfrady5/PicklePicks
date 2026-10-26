import type { SportKey, BetTypeKey } from "@/lib/constants";

export type HypeStep =
  | "resolve_subject"
  | "select_format"
  | "generate_image"
  | "generate_video"
  | "compose_cover"
  | "store_assets"
  | "notify"
  | "done";

export const HYPE_STEPS: HypeStep[] = ["resolve_subject", "select_format", "generate_image", "generate_video", "compose_cover", "store_assets", "notify", "done"];

export type HypeStatus = "queued" | "running" | "waiting_provider" | "budget_blocked" | "failed" | "completed" | "canceled";

export type HypeMode = "live" | "simulated";

export interface LedgerEntry {
  at: string;
  step: HypeStep;
  kind: "reserve" | "settle" | "release";
  usd: number;
  note: string;
}

export interface HypeEvent { at: string; level: "info" | "warn" | "error"; message: string }

export interface HypeSubject {
  kind: "mascot" | "athlete" | "generic";
  name: string;
  team: string;
  teamNickname: string;
  sport: SportKey;
  descriptor: string; // visual description used in prompts (never a real person's likeness unless allowed)
  colors: [string, string];
  source: "library" | "llm" | "fallback";
  likenessAllowed: boolean;
}

export interface HypeFormat {
  recipeId: string;
  name: string;
  mood: string;
  kind: "motion_preset" | "reference_clip";
  motionId?: string | null;
  motionName?: string | null;
  referenceClipId?: string | null;
  referenceClipUrl?: string | null;
  referenceDurationSec?: number | null;
  durationSec: number;
  resolution: "480p" | "720p" | "1080p";
  trendScore: number;
  rationale: string;
}

export interface HypeBrief {
  imagePrompt: string;
  videoPrompt: string;
  hook: string; // big text on the cover
  caption: string; // SMS / social caption
  hashtags: string[];
}

export interface ProviderRef {
  provider: "higgsfield" | "simulated";
  endpoint: string;
  requestId: string; // job-set id
  submittedAt: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";
  url?: string | null;
  thumbnailUrl?: string | null;
  attempts: number;
  lastPolledAt?: string | null;
}

export interface HypeDelivery {
  mode: "twilio" | "dry_run";
  to: string;
  body: string;
  mediaUrls: string[];
  sid?: string | null;
  sentAt: string;
}

export interface HypeJob {
  id: string;
  pickId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: HypeStatus;
  step: HypeStep;
  mode: HypeMode;
  capUsd: number;
  reservedUsd: number;
  spentUsd: number;
  ledger: LedgerEntry[];
  events: HypeEvent[];
  error?: string | null;
  // pick snapshot (so the job stays meaningful even if the pick is later settled)
  pick: { sport: SportKey; betType: BetTypeKey; matchup: string; awayTeam: string; homeTeam: string; selection: string; odds: number; stake: number; startTime: string };
  subject?: HypeSubject | null;
  format?: HypeFormat | null;
  brief?: HypeBrief | null;
  image?: ProviderRef | null;
  video?: ProviderRef | null;
  cover?: { assetId: string; url: string; width: number; height: number } | null;
  assets?: { videoUrl?: string | null; coverUrl?: string | null; imageUrl?: string | null } | null;
  delivery?: HypeDelivery | null;
}

/** A rights-cleared 9:16 reference clip the operator has uploaded and is licensed to reuse. */
export interface MemeReference {
  id: string;
  title: string;
  videoUrl: string;
  durationSec: number;
  aspect: "9:16";
  tags: string[];
  sports: SportKey[];
  mood: string;
  licenseNote: string;
  source: string;
  active: boolean;
  createdAt: string;
}
