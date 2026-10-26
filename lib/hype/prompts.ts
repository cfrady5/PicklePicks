import type { HypeBrief, HypeJob, HypeSubject } from "./types";
import type { FormatRecipe } from "./formats";
import { formatOdds } from "@/lib/utils";
import { SPORTS } from "@/lib/constants";

const BRAND_LOOK = "Mr. Pickle's Picks brand look: electric pickle-green (#8DFF32) neon rim light and accents, deep near-black green background, premium sportsbook energy, crisp 3D-cartoon render, vertical 9:16 composition with headroom at the top and the bottom third left uncluttered for text";
const SAFETY = "no logos of real sportsbooks, no real-world brand marks, no text, no watermarks, no gore, family-friendly";

function fill(tpl: string, job: HypeJob, subject: HypeSubject) {
  return tpl
    .replaceAll("{team}", subject.teamNickname.toUpperCase())
    .replaceAll("{subject}", subject.name.toUpperCase())
    .replaceAll("{selection}", job.pick.selection.toUpperCase())
    .replaceAll("{odds}", formatOdds(job.pick.odds));
}

export function buildBrief(job: HypeJob, subject: HypeSubject, recipe: FormatRecipe, seed: number): HypeBrief {
  const sportLabel = SPORTS.find((s) => s.key === job.pick.sport)?.label ?? job.pick.sport;
  const hook = fill(recipe.hook[Math.floor(seed * recipe.hook.length) % recipe.hook.length], job, subject);
  const imagePrompt = `${subject.descriptor}, ${recipe.scene}. ${BRAND_LOOK}. Mood: ${recipe.mood}. ${SAFETY}.`;
  const videoPrompt = `${recipe.action}. Keep the character's design, colors and outfit consistent with the input image. ${recipe.mood} mood, ${sportLabel} game-day energy, smooth cinematic motion, 9:16 vertical. ${SAFETY}.`;
  const unitLabel = `${job.pick.stake.toFixed(1)}u`;
  const caption = `${hook} ${subject.teamNickname}: ${job.pick.selection} (${formatOdds(job.pick.odds)}, ${unitLabel}). Full read on the dashboard. Picks are opinions, not guarantees. 21+ · gamble responsibly.`;
  const hashtags = ["#MrPicklesPicks", `#${job.pick.sport}`, `#${subject.teamNickname.replace(/\s+/g, "")}`, "#FreshPicks"];
  return { imagePrompt, videoPrompt, hook, caption, hashtags };
}

/** Safer re-prompt after an NSFW / policy rejection: strip the subject's name and soften the scene. */
export function safeImagePrompt(brief: HypeBrief, subject: HypeSubject) {
  const base = brief.imagePrompt.replaceAll(subject.name, "a cartoon team mascot character");
  return `${base} Wholesome, PG, stylized cartoon, no real people.`;
}
