import { z } from "zod";

/** Cheapest Claude model that is still capable (Haiku 5.5). No fallback to another model or provider (CLAUDE.md rule 3). */
export const BRIEF_MODEL = "claude-haiku-5-5";
export const BRIEF_MODEL_LABEL = "Claude Haiku 5.5";

// Harga per 2026-10, prompt <=100K token: $0.10 input / $0.50 output per 1M token. Ubah di sini bila harga berubah.
const PRICE_INPUT_PER_MTOK = 0.1;
const PRICE_OUTPUT_PER_MTOK = 0.5;

/** Output includes adaptive-thinking tokens, so this is the hard ceiling on one brief's output cost. */
export const MAX_OUTPUT_TOKENS = 4000;
/** Forced regenerations per day (the first generation is free of this count). */
export const MAX_REFRESHES_PER_DAY = 5;

export function estimateCostUSD(inputTokens: number, outputTokens: number): number {
  return (inputTokens * PRICE_INPUT_PER_MTOK + outputTokens * PRICE_OUTPUT_PER_MTOK) / 1_000_000;
}

/** "$0.0007" below one cent, "$0.02" above. Always shown next to the word "perkiraan". */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(amount < 0.01 ? 4 : 2)}`;
}

// ---- model output ------------------------------------------------------------

/** The model may write "" instead of null; both mean "no risk". */
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const line = (max: number) => z.string().trim().min(1).max(max);

export const briefContentSchema = z.object({
  headline: line(140),
  projects: z
    .array(
      z.object({
        name: line(120),
        progress: line(400),
        next: z.array(line(200)).min(1).max(3),
        risk: z.preprocess(blankToNull, line(300).nullable()),
      }),
    )
    .max(10),
  watch: z.array(line(200)).max(5),
});
export type BriefContent = z.infer<typeof briefContentSchema>;

/**
 * JSON Schema handed to `output_config.format`. Kept to the plain subset (no length/count keywords);
 * limits are enforced afterwards by `briefContentSchema`.
 */
export const BRIEF_JSON_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          progress: { type: "string" },
          next: { type: "array", items: { type: "string" } },
          risk: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["name", "progress", "next", "risk"],
        additionalProperties: false,
      },
    },
    watch: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "projects", "watch"],
  additionalProperties: false,
} as const;

/** A stored brief row as the UI reads it. */
export type StoredBrief = {
  brief_date: string;
  content: unknown;
  model: string;
  input_tokens: number;
  output_tokens: number;
  refresh_count: number;
  created_at: string;
};
export const BRIEF_COLUMNS = "brief_date,content,model,input_tokens,output_tokens,refresh_count,created_at";

/** A failure whose message is safe to show the user (never the key, the prompt, or a raw upstream error). */
export class BriefError extends Error {}
