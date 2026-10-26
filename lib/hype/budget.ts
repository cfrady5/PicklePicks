import type { HypeJob, HypeStep } from "./types";
import { round2 } from "@/lib/odds";

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };

/**
 * Metered price assumptions. These are ESTIMATES used to reserve budget before
 * a provider is called. Confirm the live rates in the Higgsfield console and
 * Twilio pricing page and override via env. Actual billing is reconciled by
 * the operator against the provider's invoice; the job ledger records what
 * was reserved and what we believe was spent.
 */
export const PRICES = {
  maxSpendUsd: num(process.env.HYPE_MAX_SPEND_USD, 2.0),
  imageUsd: num(process.env.HYPE_PRICE_IMAGE_USD, 0.1),
  dopVideoUsd: num(process.env.HYPE_PRICE_DOP_VIDEO_USD, 0.6),
  genjutsuLightPerSecUsd: { "480p": num(process.env.HYPE_PRICE_GENJUTSU_LIGHT_480P_PER_SEC_USD, 0.05), "720p": num(process.env.HYPE_PRICE_GENJUTSU_LIGHT_720P_PER_SEC_USD, 0.1), "1080p": num(process.env.HYPE_PRICE_GENJUTSU_LIGHT_1080P_PER_SEC_USD, 0.2) },
  smsUsd: num(process.env.HYPE_PRICE_SMS_USD, 0.03),
};

export function estimateVideoUsd(kind: "motion_preset" | "reference_clip", resolution: "480p" | "720p" | "1080p", durationSec: number, referenceDurationSec = 0) {
  if (kind === "motion_preset") return PRICES.dopVideoUsd;
  // Genjutsu Light bills on reference + output seconds, rounded up.
  const billable = Math.ceil(durationSec) + Math.ceil(referenceDurationSec);
  return round2(billable * PRICES.genjutsuLightPerSecUsd[resolution]);
}

export function available(job: HypeJob) {
  return round2(job.capUsd - job.spentUsd - job.reservedUsd);
}

/** Reserve `usd` for a step. Returns false (and leaves the job untouched) if it would exceed the cap. */
export function reserve(job: HypeJob, step: HypeStep, usd: number, note: string): boolean {
  if (usd > available(job) + 1e-9) return false;
  job.reservedUsd = round2(job.reservedUsd + usd);
  job.ledger.push({ at: new Date().toISOString(), step, kind: "reserve", usd, note });
  return true;
}

/** Convert a reservation into spend (actual may differ from reserved once the provider reports it). */
export function settle(job: HypeJob, step: HypeStep, reservedUsd: number, actualUsd: number, note: string) {
  job.reservedUsd = round2(Math.max(0, job.reservedUsd - reservedUsd));
  job.spentUsd = round2(job.spentUsd + actualUsd);
  job.ledger.push({ at: new Date().toISOString(), step, kind: "settle", usd: actualUsd, note });
}

export function release(job: HypeJob, step: HypeStep, reservedUsd: number, note: string) {
  job.reservedUsd = round2(Math.max(0, job.reservedUsd - reservedUsd));
  job.ledger.push({ at: new Date().toISOString(), step, kind: "release", usd: reservedUsd, note });
}
