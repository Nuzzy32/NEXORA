import { planGeneration, type GeneratedBrief } from "./generate";
import { isInputEmpty, type BriefInput } from "./input";
import { BriefError } from "./schema";

/** What the daily brief job did. No brief text, no input, no error from a library: counts and fixed sentences only. */
export type BriefCronResult =
  | { status: "generated"; inputTokens: number; outputTokens: number }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

/** Everything the job touches, injected so the policy can be tested without a database or the network. */
export type BriefCronDeps = {
  hasKey: boolean;
  loadSettings: () => Promise<{ enabled: boolean } | null>;
  loadExisting: () => Promise<{ refresh_count: number } | null>;
  loadInput: () => Promise<BriefInput>;
  generate: (input: BriefInput) => Promise<GeneratedBrief>;
  save: (brief: GeneratedBrief) => Promise<void>;
};

/**
 * The scheduled brief: same rules as the button. Consent first (only the owner's "Aktifkan" click sets it, never this job),
 * then the key, then "already made today". Anything that is not a clean run is reported, not retried.
 */
export async function runBriefCron(deps: BriefCronDeps): Promise<BriefCronResult> {
  try {
    const [settings, existing] = await Promise.all([deps.loadSettings(), deps.loadExisting()]);
    const plan = planGeneration({ enabled: settings?.enabled ?? false, hasKey: deps.hasKey, existing, force: false });
    if (plan.kind === "deny") return { status: "skipped", reason: plan.reason };
    if (plan.kind === "existing") return { status: "skipped", reason: "Brief hari ini sudah ada." };

    const input = await deps.loadInput();
    if (isInputEmpty(input)) return { status: "skipped", reason: "Belum ada proyek berjalan atau tugas kuliah yang bisa diringkas." };

    const brief = await deps.generate(input);
    await deps.save(brief);
    return { status: "generated", inputTokens: brief.inputTokens, outputTokens: brief.outputTokens };
  } catch (e) {
    return { status: "error", message: e instanceof BriefError ? e.message : "Brief harian gagal dibuat." };
  }
}
