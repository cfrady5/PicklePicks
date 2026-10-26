import { getRepo } from "@/lib/data";
import type { Pick } from "@/lib/data/types";
import { env } from "@/lib/env";
import { getHypeStore } from "./store";
import type { HypeJob, HypeStep, ProviderRef } from "./types";
import { HYPE_STEPS } from "./types";
import { PRICES, estimateVideoUsd, reserve, settle, release, available } from "./budget";
import { resolveFromLibrary, type SubjectPolicy } from "./teams";
import { llmResolveSubject } from "./llm";
import { pickRecipe, pickMotion, pickReference, RECIPES } from "./formats";
import { buildBrief, safeImagePrompt } from "./prompts";
import { HiggsfieldApi, HF_ENDPOINTS, higgsfieldConfigured, simulatedJobSet, summarizeJobSet, HiggsfieldError } from "./higgsfield";
import { renderCover } from "./cover";
import { sendResultText } from "./sms";

const ACTIVE = new Set(["queued", "running", "waiting_provider"]);
const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const HYPE_SETTINGS = {
  provider: (process.env.HYPE_VIDEO_PROVIDER === "genjutsu_light" ? "genjutsu_light" : "dop") as "dop" | "genjutsu_light",
  durationSec: Math.min(15, Math.max(4, Number(process.env.HYPE_VIDEO_DURATION_SEC) || 8)),
  resolution: (["480p", "720p", "1080p"].includes(process.env.HYPE_VIDEO_RESOLUTION ?? "") ? process.env.HYPE_VIDEO_RESOLUTION : "480p") as "480p" | "720p" | "1080p",
  dopModel: process.env.HYPE_DOP_MODEL || "dop-turbo",
  subjectPolicy: (["mascot_first", "athlete_first", "mascot_only"].includes(process.env.HYPE_SUBJECT_POLICY ?? "") ? process.env.HYPE_SUBJECT_POLICY : "mascot_first") as SubjectPolicy,
  allowLikeness: process.env.HYPE_ALLOW_LIKENESS === "true",
  autoOnPublish: process.env.HYPE_AUTO_ON_PUBLISH === "true",
  webhookSecret: process.env.HYPE_WEBHOOK_SECRET ?? "",
};

function log(job: HypeJob, message: string, level: "info" | "warn" | "error" = "info") {
  job.events.push({ at: nowIso(), level, message });
  if (job.events.length > 200) job.events.splice(0, job.events.length - 200);
}

function nextStep(step: HypeStep): HypeStep {
  return HYPE_STEPS[Math.min(HYPE_STEPS.length - 1, HYPE_STEPS.indexOf(step) + 1)];
}

export async function createHypeJob(pick: Pick, actorId: string, opts: { capUsd?: number } = {}): Promise<HypeJob> {
  const store = getHypeStore();
  const live = higgsfieldConfigured();
  const job = await store.createJob({
    pickId: pick.id,
    createdBy: actorId,
    status: "queued",
    step: "resolve_subject",
    mode: live ? "live" : "simulated",
    capUsd: Math.min(opts.capUsd ?? PRICES.maxSpendUsd, PRICES.maxSpendUsd),
    reservedUsd: 0,
    spentUsd: 0,
    ledger: [],
    events: [{ at: nowIso(), level: "info", message: live ? "Job created (live providers)" : "Job created in SIMULATED mode: Higgsfield credentials are not set, so no video will be rendered and nothing is billed." }],
    pick: { sport: pick.sport, betType: pick.betType, matchup: pick.matchup, awayTeam: pick.awayTeam, homeTeam: pick.homeTeam, selection: pick.selection, odds: pick.odds, stake: pick.stake, startTime: pick.startTime },
  });
  return job;
}

/**
 * Advance a job as far as possible within `budgetMs`. Safe to call repeatedly
 * from the submit handler, the admin UI, the webhook and the cron worker:
 * every paid call is guarded by a reservation and a worker lock.
 */
export async function advanceJob(jobId: string, opts: { budgetMs?: number } = {}): Promise<HypeJob> {
  const store = getHypeStore();
  const budgetMs = opts.budgetMs ?? 45_000;
  const deadline = Date.now() + budgetMs;
  let job = await store.getJob(jobId);
  if (!job) throw new Error("Hype job not found");
  if (!ACTIVE.has(job.status)) return job;
  if (!(await store.tryLock(jobId, budgetMs + 5_000))) {
    // Another worker holds this job; give it a moment and return the freshest state.
    await sleep(1_500);
    return (await store.getJob(jobId)) ?? job;
  }
  try {
    while (Date.now() < deadline) {
      job = (await store.getJob(jobId))!;
      if (!ACTIVE.has(job.status)) break;
      const before = `${job.step}:${job.status}:${job.image?.status}:${job.video?.status}`;
      try {
        await runStep(job);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        job.status = "failed";
        job.error = msg;
        log(job, `Step ${job.step} failed: ${msg}`, "error");
      }
      job = await store.saveJob(job);
      const after = `${job.step}:${job.status}:${job.image?.status}:${job.video?.status}`;
      if (job.status === "waiting_provider" && before === after) {
        // Provider still rendering. Wait a bit and poll again while we have time.
        if (Date.now() + 4_000 > deadline) break;
        await sleep(job.mode === "simulated" ? 50 : 4_000);
      }
    }
  } finally {
    await store.unlock(jobId);
  }
  return job;
}

async function runStep(job: HypeJob) {
  job.status = job.status === "queued" ? "running" : job.status;
  switch (job.step) {
    case "resolve_subject": return stepResolveSubject(job);
    case "select_format": return stepSelectFormat(job);
    case "generate_image": return stepGenerateImage(job);
    case "generate_video": return stepGenerateVideo(job);
    case "compose_cover": return stepComposeCover(job);
    case "store_assets": return stepStoreAssets(job);
    case "notify": return stepNotify(job);
    case "done": job.status = "completed"; return;
  }
}

/* ---------------- steps ---------------- */

async function stepResolveSubject(job: HypeJob) {
  const p = job.pick;
  let subject = resolveFromLibrary({ sport: p.sport, betType: p.betType, selection: p.selection, awayTeam: p.awayTeam, homeTeam: p.homeTeam }, HYPE_SETTINGS.subjectPolicy, HYPE_SETTINGS.allowLikeness);
  if (subject.source === "fallback") {
    const viaLlm = await llmResolveSubject({ sport: p.sport, team: subject.team, selection: p.selection, likenessAllowed: HYPE_SETTINGS.allowLikeness });
    if (viaLlm) subject = viaLlm;
  }
  job.subject = subject;
  log(job, `Subject: ${subject.kind} "${subject.name}" for ${subject.team} (${subject.source})`);
  job.step = nextStep(job.step);
}

async function stepSelectFormat(job: HypeJob) {
  const p = job.pick;
  const seed = Math.random();
  const recipe = pickRecipe({ betType: p.betType, odds: p.odds, selection: p.selection, sport: p.sport }, seed);
  const store = getHypeStore();
  const refs = await store.listReferences();
  const wantReference = HYPE_SETTINGS.provider === "genjutsu_light";
  const ref = wantReference ? pickReference(refs, recipe, p.sport, HYPE_SETTINGS.durationSec) : null;

  if (ref) {
    job.format = { recipeId: recipe.id, name: recipe.name, mood: recipe.mood, kind: "reference_clip", referenceClipId: ref.ref.id, referenceClipUrl: ref.ref.videoUrl, referenceDurationSec: ref.ref.durationSec, durationSec: ref.ref.durationSec, resolution: HYPE_SETTINGS.resolution, trendScore: ref.score, motionId: null, motionName: null, rationale: `Rights-cleared clip "${ref.ref.title}" matched ${recipe.name} (score ${ref.score.toFixed(1)}).` };
  } else {
    let motionId: string | null = null, motionName: string | null = null, score = 0;
    if (job.mode === "live") {
      try {
        const motions = await new HiggsfieldApi().motions();
        const m = pickMotion(motions, recipe);
        if (m) { motionId = m.motion.id; motionName = m.motion.name; score = m.score; }
      } catch (e) {
        log(job, `Could not load Higgsfield motions (${(e as Error).message}); using prompt-only motion.`, "warn");
      }
    } else {
      motionName = recipe.motionKeywords[0];
    }
    job.format = { recipeId: recipe.id, name: recipe.name, mood: recipe.mood, kind: "motion_preset", motionId, motionName, referenceClipId: null, referenceClipUrl: null, referenceDurationSec: null, durationSec: Math.min(HYPE_SETTINGS.durationSec, 8), resolution: HYPE_SETTINGS.resolution, trendScore: score, rationale: wantReference ? `No rights-cleared reference clip matched ${recipe.name}; fell back to Higgsfield's licensed motion library.` : `Format ${recipe.name} with Higgsfield motion "${motionName ?? "prompt-driven"}".` };
  }
  job.brief = buildBrief(job, job.subject!, recipe, seed);
  const est = PRICES.imageUsd + estimateVideoUsd(job.format.kind, job.format.resolution, job.format.durationSec, job.format.referenceDurationSec ?? 0) + PRICES.smsUsd;
  log(job, `Format: ${job.format.name} (${job.format.kind}). Estimated metered cost $${est.toFixed(2)} of $${job.capUsd.toFixed(2)} cap.`);
  if (est > job.capUsd) {
    job.status = "budget_blocked";
    log(job, `Estimated cost $${est.toFixed(2)} exceeds the $${job.capUsd.toFixed(2)} cap. Lower HYPE_VIDEO_RESOLUTION/DURATION or raise HYPE_MAX_SPEND_USD.`, "warn");
    return;
  }
  job.step = nextStep(job.step);
}

async function submitOrSimulate(job: HypeJob, kind: "image" | "video", endpoint: string, params: Record<string, unknown>): Promise<ProviderRef> {
  const attempts = (kind === "image" ? job.image?.attempts : job.video?.attempts) ?? 0;
  if (job.mode === "simulated") {
    const js = simulatedJobSet(kind, `${job.id}_${attempts + 1}`);
    const s = summarizeJobSet(js);
    return { provider: "simulated", endpoint, requestId: js.id, submittedAt: nowIso(), status: s.status, url: s.url, thumbnailUrl: s.thumbnailUrl, attempts: attempts + 1 };
  }
  const api = new HiggsfieldApi();
  const webhook = HYPE_SETTINGS.webhookSecret ? { url: `${env.siteUrl}/api/hype/webhook`, secret: HYPE_SETTINGS.webhookSecret } : undefined;
  const js = await api.submit(endpoint, params, webhook);
  const s = summarizeJobSet(js);
  return { provider: "higgsfield", endpoint, requestId: js.id, submittedAt: nowIso(), status: s.status, url: s.url, thumbnailUrl: s.thumbnailUrl, attempts: attempts + 1 };
}

async function refreshRef(job: HypeJob, ref: ProviderRef): Promise<ProviderRef> {
  if (ref.provider === "simulated" || ["completed", "failed", "nsfw", "canceled"].includes(ref.status)) return ref;
  const js = await new HiggsfieldApi().status(ref.requestId);
  const s = summarizeJobSet(js);
  return { ...ref, status: s.status, url: s.url ?? ref.url, thumbnailUrl: s.thumbnailUrl ?? ref.thumbnailUrl, lastPolledAt: nowIso() };
}

async function stepGenerateImage(job: HypeJob) {
  const cost = PRICES.imageUsd;
  if (!job.image) {
    if (!reserve(job, "generate_image", cost, "Soul text-to-image (estimate)")) { job.status = "budget_blocked"; log(job, `Cannot reserve $${cost} for the image; $${available(job)} available.`, "warn"); return; }
    job.image = await submitOrSimulate(job, "image", HF_ENDPOINTS.textToImage, { prompt: job.brief!.imagePrompt, width_and_height: "1152x2048", quality: "1080p", batch_size: 1, enhance_prompt: true });
    job.status = "waiting_provider";
    log(job, `Image submitted (${job.image.requestId}).`);
    return;
  }
  job.image = await refreshRef(job, job.image);
  if (job.image.status === "completed" && job.image.url) {
    settle(job, "generate_image", cost, job.mode === "simulated" ? 0 : cost, job.mode === "simulated" ? "Simulated — not billed" : "Image rendered");
    job.status = "running";
    job.step = nextStep(job.step);
    log(job, "Image ready.");
    return;
  }
  if (job.image.status === "failed" || job.image.status === "nsfw" || job.image.status === "canceled") {
    release(job, "generate_image", cost, `Image ${job.image.status} (provider refunds failed/nsfw jobs)`);
    if (job.image.attempts < 2) {
      log(job, `Image ${job.image.status}; retrying once with a safer prompt.`, "warn");
      if (!reserve(job, "generate_image", cost, "Image retry (estimate)")) { job.status = "budget_blocked"; return; }
      job.image = await submitOrSimulate(job, "image", HF_ENDPOINTS.textToImage, { prompt: safeImagePrompt(job.brief!, job.subject!), width_and_height: "1152x2048", quality: "1080p", batch_size: 1, enhance_prompt: true });
      return;
    }
    throw new Error(`Image generation ${job.image.status} twice`);
  }
}

async function stepGenerateVideo(job: HypeJob) {
  const f = job.format!;
  const cost = estimateVideoUsd(f.kind, f.resolution, f.durationSec, f.referenceDurationSec ?? 0);
  const imageUrl = job.image?.url;
  if (!imageUrl) throw new Error("No image available for video generation");
  const params =
    f.kind === "reference_clip"
      ? { prompt: job.brief!.videoPrompt, input_images: [{ type: "image_url", image_url: imageUrl }], input_video: { type: "video_url", video_url: f.referenceClipUrl }, resolution: f.resolution }
      : { model: HYPE_SETTINGS.dopModel, prompt: job.brief!.videoPrompt, input_images: [{ type: "image_url", image_url: imageUrl }], ...(f.motionId ? { motions: [{ id: f.motionId, strength: 0.85 }] } : {}), enhance_prompt: true };
  const endpoint = f.kind === "reference_clip" ? HF_ENDPOINTS.motionTransfer : HF_ENDPOINTS.imageToVideo;

  if (!job.video) {
    if (!reserve(job, "generate_video", cost, `${f.kind === "reference_clip" ? "Genjutsu Light motion transfer" : "DoP image-to-video"} (estimate)`)) { job.status = "budget_blocked"; log(job, `Cannot reserve $${cost.toFixed(2)} for the video; $${available(job).toFixed(2)} available.`, "warn"); return; }
    job.video = await submitOrSimulate(job, "video", endpoint, params);
    job.status = "waiting_provider";
    log(job, `Video submitted via ${endpoint} (${job.video.requestId}).`);
    return;
  }
  job.video = await refreshRef(job, job.video);
  if (job.video.status === "completed" && job.video.url) {
    settle(job, "generate_video", cost, job.mode === "simulated" ? 0 : cost, job.mode === "simulated" ? "Simulated — not billed" : "Video rendered");
    job.status = "running";
    job.step = nextStep(job.step);
    log(job, "Video ready.");
    return;
  }
  if (job.video.status === "failed" || job.video.status === "nsfw" || job.video.status === "canceled") {
    release(job, "generate_video", cost, `Video ${job.video.status}`);
    if (job.video.attempts < 2 && cost <= available(job)) {
      log(job, `Video ${job.video.status}; one controlled retry within budget.`, "warn");
      reserve(job, "generate_video", cost, "Video retry (estimate)");
      job.video = await submitOrSimulate(job, "video", endpoint, params);
      return;
    }
    if (job.video.attempts >= 2) throw new Error(`Video generation ${job.video.status} twice`);
    job.status = "budget_blocked";
    log(job, "Video failed and a retry would exceed the budget.", "warn");
  }
}

async function stepComposeCover(job: HypeJob) {
  const store = getHypeStore();
  const { jpeg, png } = await renderCover(job, job.image?.url ?? null);
  const key = `${job.id}/cover.jpg`;
  const url = await store.putAsset(key, jpeg, "image/jpeg");
  await store.putAsset(`${job.id}/cover.png`, png, "image/png");
  job.cover = { assetId: key, url, width: 1080, height: 1920 };
  log(job, `Cover rendered (${Math.round(jpeg.length / 1024)} KB JPEG).`);
  job.step = nextStep(job.step);
}

async function stepStoreAssets(job: HypeJob) {
  const store = getHypeStore();
  const assets: NonNullable<HypeJob["assets"]> = { coverUrl: job.cover?.url ?? null, imageUrl: job.image?.url ?? null, videoUrl: job.video?.url ?? null };
  if (job.mode === "live") {
    // Copy provider CDN outputs into our own storage so links in the text stay valid.
    for (const [k, url, name, type] of [["videoUrl", job.video?.url, "video.mp4", "video/mp4"], ["imageUrl", job.image?.url, "image.jpg", "image/jpeg"]] as const) {
      if (!url) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        assets[k] = await store.putAsset(`${job.id}/${name}`, buf, res.headers.get("content-type") ?? type);
      } catch (e) {
        log(job, `Could not copy ${name} to storage (${(e as Error).message}); keeping provider URL.`, "warn");
      }
    }
  } else {
    assets.videoUrl = null;
    assets.imageUrl = null;
    log(job, "Simulated mode: no video/image assets to store.");
  }
  job.assets = assets;
  job.step = nextStep(job.step);
}

async function stepNotify(job: HypeJob) {
  const cost = PRICES.smsUsd;
  if (!reserve(job, "notify", cost, "Twilio MMS (estimate)")) { job.status = "budget_blocked"; return; }
  const lines = [
    `🥒 Mr. Pickle's Picks — hype content ready`,
    job.brief?.caption ?? "",
    job.assets?.videoUrl ? `Video: ${job.assets.videoUrl}` : job.mode === "simulated" ? "Video: (simulated run — no Higgsfield credentials configured)" : "Video: not available",
    job.assets?.coverUrl ? `Cover: ${job.assets.coverUrl}` : "",
    `Spent ≈ $${job.spentUsd.toFixed(2)} of $${job.capUsd.toFixed(2)}`,
  ].filter(Boolean);
  const delivery = await sendResultText({ body: lines.join("\n"), mediaUrls: job.assets?.coverUrl ? [job.assets.coverUrl] : [] });
  job.delivery = delivery;
  settle(job, "notify", cost, delivery.mode === "twilio" ? cost : 0, delivery.mode === "twilio" ? `MMS sent (${delivery.sid})` : "Dry run — Twilio not configured");
  log(job, delivery.mode === "twilio" ? `Text sent to ${delivery.to}.` : "Twilio not configured; delivery logged as a dry run.");
  job.step = "done";
  job.status = "completed";
}

/* ---------------- helpers for routes / actions ---------------- */

export async function startHypeForPick(pickId: string, actorId: string, opts: { capUsd?: number } = {}) {
  const pick = await getRepo().getPick(pickId);
  if (!pick) throw new Error("Pick not found");
  if (!pick.publishedAt) throw new Error("Publish the pick before generating content for it");
  return createHypeJob(pick, actorId, opts);
}

export async function retryHypeJob(jobId: string) {
  const store = getHypeStore();
  const job = await store.getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (!["failed", "budget_blocked", "canceled"].includes(job.status)) return job;
  job.status = "queued";
  job.error = null;
  // Clear a failed provider ref so the step resubmits (reservations were already released).
  if (job.step === "generate_image" && job.image && job.image.status !== "completed") job.image = null;
  if (job.step === "generate_video" && job.video && job.video.status !== "completed") job.video = null;
  log(job, "Manually re-queued.");
  return store.saveJob(job);
}

export async function cancelHypeJob(jobId: string) {
  const store = getHypeStore();
  const job = await store.getJob(jobId);
  if (!job || !ACTIVE.has(job.status)) return job;
  job.status = "canceled";
  if (job.reservedUsd > 0) release(job, job.step, job.reservedUsd, "Canceled; reservation released");
  log(job, "Canceled by operator.");
  return store.saveJob(job);
}

export async function advanceActiveJobs(budgetMs = 50_000) {
  const store = getHypeStore();
  const jobs = await store.listJobs({ active: true, limit: 20 });
  const results: { id: string; status: string; step: string }[] = [];
  const perJob = Math.max(8_000, Math.floor(budgetMs / Math.max(1, jobs.length)));
  for (const j of jobs) {
    const r = await advanceJob(j.id, { budgetMs: perJob });
    results.push({ id: r.id, status: r.status, step: r.step });
  }
  return results;
}

export async function findJobByProviderRequest(requestId: string) {
  const jobs = await getHypeStore().listJobs({ active: true, limit: 100 });
  return jobs.find((j) => j.image?.requestId === requestId || j.video?.requestId === requestId) ?? null;
}

export function isHiggsfieldError(e: unknown): e is HiggsfieldError { return e instanceof HiggsfieldError; }
export const RECIPE_COUNT = RECIPES.length;
