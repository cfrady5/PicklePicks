import type { SportKey } from "@/lib/constants";
import type { HypeFormat, MemeReference } from "./types";

/**
 * Trend discovery layer (V1): a curated library of meme FORMATS, not scraped
 * videos. Each recipe describes a rights-safe concept, the mood it conveys,
 * and keywords used to match against (a) Higgsfield's own licensed motion
 * presets and (b) the operator's rights-cleared reference clips.
 */
export interface FormatRecipe {
  id: string;
  name: string;
  mood: string;
  when: { betTypes?: string[]; favorite?: boolean; underdog?: boolean; over?: boolean; under?: boolean; sports?: SportKey[] };
  weight: number;
  scene: string; // image prompt fragment
  action: string; // video prompt fragment
  hook: string[]; // cover hooks, {team} {subject} {selection} {odds}
  motionKeywords: string[];
  referenceTags: string[];
}

export const RECIPES: FormatRecipe[] = [
  { id: "tunnel_walkout", name: "Tunnel Walkout", mood: "swagger", when: {}, weight: 1, scene: "striding out of a stadium tunnel toward the camera, arena lights flaring behind, confident grin, sunglasses", action: "slow confident walk toward camera, subtle head tilt, camera pushes in, lights flare, crowd roar energy", hook: ["LOCKED IN.", "{subject} SAID IT'S A LOCK.", "WALK WITH US."], motionKeywords: ["dolly in", "push in", "zoom in", "walk", "steadicam", "tracking"], referenceTags: ["walkout", "entrance", "swagger", "confident"] },
  { id: "big_dog", name: "Big Dog Energy", mood: "dominant", when: { favorite: true }, weight: 1.2, scene: "flexing both arms, chest out, standing on the center logo of the court or field, dramatic low angle", action: "powerful flex, slow motion, camera orbits low around the subject, confetti drifting", hook: ["BIG DOG ENERGY.", "CHALK. CHALK. CHALK.", "{team} DON'T LOSE TONIGHT."], motionKeywords: ["orbit", "arc", "low angle", "crane", "hero"], referenceTags: ["flex", "dominant", "hero", "celebration"] },
  { id: "chip_on_shoulder", name: "Chip On The Shoulder", mood: "defiant", when: { underdog: true }, weight: 1.3, scene: "arms crossed, chin up, squinting at the camera under a single spotlight, dust in the air", action: "slowly uncrosses arms and points at the camera, spotlight intensifies, dramatic slow push in", hook: ["NOBODY BELIEVES IN {team}.", "DOG WITH A CHIP.", "PLUS MONEY. SAY LESS."], motionKeywords: ["crash zoom", "zoom in", "dolly in", "dramatic"], referenceTags: ["underdog", "defiant", "point", "callout"] },
  { id: "scoreboard_frozen", name: "Ice Cold Under", mood: "cold", when: { under: true }, weight: 1.3, scene: "blowing icy breath at a frozen scoreboard showing low numbers, frost on the glass, blue-green rim light", action: "exhales a cloud of frost toward the camera, scoreboard numbers freeze, slow dolly out", hook: ["ICE. COLD. UNDER.", "DEFENSE PAYS THE BILLS.", "LOW SCORING. HIGH VIBES."], motionKeywords: ["dolly out", "pull back", "zoom out", "slow"], referenceTags: ["cold", "freeze", "under", "calm"] },
  { id: "fireworks_over", name: "Shootout Over", mood: "electric", when: { over: true }, weight: 1.3, scene: "raining three-pointers and fireworks, scoreboard spinning upward, neon green sparks everywhere", action: "fireworks burst behind the subject, scoreboard digits spin up, energetic handheld shake and crash zoom", hook: ["POINTS. POINTS. POINTS.", "SCOREBOARD GOING NUCLEAR.", "OVER IT. ALL NIGHT."], motionKeywords: ["crash zoom", "handheld", "shake", "whip", "energetic", "fpv"], referenceTags: ["over", "fireworks", "hype", "party"] },
  { id: "prop_spotlight", name: "Prop Spotlight", mood: "focused", when: { betTypes: ["player_prop"] }, weight: 1.4, scene: "mid-action highlight pose frozen in time, stat line glowing as neon text behind, dramatic spotlight", action: "time freezes then snaps back to real time as the subject completes the motion, camera orbits the frozen moment", hook: ["{selection}.", "FEED THE STAT SHEET.", "THE NUMBER IS THE NUMBER."], motionKeywords: ["bullet time", "orbit", "freeze", "arc", "360"], referenceTags: ["prop", "highlight", "stat", "spotlight"] },
  { id: "parlay_jenga", name: "Parlay Stack", mood: "chaotic", when: { betTypes: ["parlay"] }, weight: 1.4, scene: "balancing a wobbling tower of betting slips, sweating, one eyebrow raised, crowd gasping", action: "tower wobbles dramatically but holds, subject exhales, slow dolly in on the sweat drop", hook: ["ALL LEGS MUST HIT.", "STACK IT UP.", "ONE SLIP TO RULE THEM ALL."], motionKeywords: ["dolly in", "zoom in", "handheld", "tilt"], referenceTags: ["parlay", "stack", "nervous", "chaos"] },
];

export function pickRecipe(input: { betType: string; odds: number; selection: string; sport: SportKey }, seed = Math.random()): FormatRecipe {
  const sel = input.selection.toLowerCase();
  const over = /\bover\b/.test(sel), under = /\bunder\b/.test(sel);
  const favorite = input.odds < 0 && (input.betType === "moneyline" || input.odds <= -150);
  const underdog = input.odds >= 100 && input.betType !== "parlay";
  const scored = RECIPES.map((r) => {
    let s = r.weight;
    if (r.when.betTypes && !r.when.betTypes.includes(input.betType)) s -= 1.5;
    if (r.when.over && !over) s -= 1.5;
    if (r.when.under && !under) s -= 1.5;
    if (r.when.favorite && !favorite) s -= 0.8;
    if (r.when.underdog && !underdog) s -= 0.8;
    if (r.when.sports && !r.when.sports.includes(input.sport)) s -= 1;
    s += seed * 0.3; // small randomness so repeat picks don't look identical
    return { r, s };
  }).sort((a, b) => b.s - a.s);
  return scored[0].r;
}

export interface MotionLike { id: string; name: string; description?: string }

/** Score Higgsfield's licensed motion presets against a recipe's keywords. */
export function pickMotion(motions: MotionLike[], recipe: FormatRecipe): { motion: MotionLike; score: number } | null {
  if (!motions.length) return null;
  const scored = motions.map((m) => {
    const hay = `${m.name} ${m.description ?? ""}`.toLowerCase();
    let score = 0;
    recipe.motionKeywords.forEach((k, i) => { if (hay.includes(k)) score += 3 - i * 0.25; });
    if (/general|cinematic/.test(hay)) score += 0.2;
    return { motion: m, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0] : { motion: scored[0].motion, score: 0 };
}

/** Choose a rights-cleared reference clip for motion transfer, if one fits well enough. */
export function pickReference(refs: MemeReference[], recipe: FormatRecipe, sport: SportKey, maxDurationSec: number): { ref: MemeReference; score: number } | null {
  const active = refs.filter((r) => r.active && r.aspect === "9:16" && r.durationSec <= maxDurationSec);
  if (!active.length) return null;
  const scored = active.map((ref) => {
    let score = 0;
    for (const t of ref.tags) if (recipe.referenceTags.includes(t.toLowerCase())) score += 2;
    if (ref.mood.toLowerCase() === recipe.mood) score += 2;
    if (ref.sports.includes(sport)) score += 1.5;
    else if (ref.sports.length === 0) score += 0.5;
    return { ref, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0].score >= 2 ? scored[0] : null;
}

export function describeFormat(f: HypeFormat) {
  return f.kind === "reference_clip" ? `${f.name} · reference clip · ${f.durationSec}s @ ${f.resolution}` : `${f.name} · motion "${f.motionName ?? "default"}" · ${f.durationSec}s`;
}
