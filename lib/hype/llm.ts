import Anthropic from "@anthropic-ai/sdk";
import type { HypeSubject } from "./types";
import type { SportKey } from "@/lib/constants";

/**
 * Optional LLM resolver for teams missing from the curated library (college,
 * international, "Other" sports). Only used when ANTHROPIC_API_KEY is set.
 * It returns a stylized, rights-conscious description — never instructions to
 * reproduce a real person's likeness unless the operator has allowed it.
 */
export async function llmResolveSubject(input: { sport: SportKey; team: string; selection: string; likenessAllowed: boolean }): Promise<HypeSubject | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "name", "teamNickname", "descriptor", "colors"],
    properties: {
      kind: { type: "string", enum: ["mascot", "athlete", "generic"] },
      name: { type: "string" },
      teamNickname: { type: "string" },
      descriptor: { type: "string" },
      colors: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
    },
  };
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system:
        "You identify the best on-screen character for a short sports hype video. Prefer the team's official mascot if one exists; otherwise a widely known current star athlete; otherwise a generic superfan. descriptor must be a visual description for an image generator. " +
        (input.likenessAllowed ? "Naming the real athlete is allowed." : "Do NOT describe any real person's face or ask for a real person's likeness; describe a stylized cartoon athlete in team colors instead.") +
        " colors are two hex strings of the team's primary colors.",
      messages: [{ role: "user", content: `Sport: ${input.sport}\nTeam: ${input.team}\nPick: ${input.selection}` }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as { kind: HypeSubject["kind"]; name: string; teamNickname: string; descriptor: string; colors: [string, string] };
    return { ...parsed, team: input.team, sport: input.sport, source: "llm", likenessAllowed: input.likenessAllowed };
  } catch (e) {
    console.warn("[hype] llm subject resolution failed", e);
    return null;
  }
}
