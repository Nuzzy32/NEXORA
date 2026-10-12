import { describe, expect, it, vi } from "vitest";
import { runBriefCron, type BriefCronDeps } from "@/features/brief/cron";
import { handleCron } from "@/features/elearning/cron";
import type { BriefInput } from "@/features/brief/input";
import { BriefError } from "@/features/brief/schema";

const input: BriefInput = {
  today: "2026-10-12",
  projects: [
    { name: "NEXORA", status: "active", starts_on: null, due_on: null, tasks_open: 3, tasks_done: 1, tasks_overdue: 0, last_activity: "2026-10-11", days_since_activity: 1, top_open_tasks: [], recent_decision_titles: [] },
  ],
  coursework_due_soon: [],
};
const brief = { content: { headline: "h", projects: [], watch: [] }, model: "claude-haiku-5-5", inputTokens: 1800, outputTokens: 650 };

function deps(over: Partial<BriefCronDeps> = {}): BriefCronDeps {
  return {
    hasKey: true,
    loadSettings: vi.fn().mockResolvedValue({ enabled: true }),
    loadExisting: vi.fn().mockResolvedValue(null),
    loadInput: vi.fn().mockResolvedValue(input),
    generate: vi.fn().mockResolvedValue(brief),
    save: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe("runBriefCron", () => {
  it("generates and stores today's brief when consent, key and data are there", async () => {
    const d = deps();
    expect(await runBriefCron(d)).toEqual({ status: "generated", inputTokens: 1800, outputTokens: 650 });
    expect(d.generate).toHaveBeenCalledTimes(1);
    expect(d.save).toHaveBeenCalledWith(brief);
  });

  it("sends nothing without consent: no settings row, or switched off", async () => {
    for (const settings of [null, { enabled: false }]) {
      const d = deps({ loadSettings: vi.fn().mockResolvedValue(settings) });
      const r = await runBriefCron(d);
      expect(r.status).toBe("skipped");
      expect(d.loadInput).not.toHaveBeenCalled();
      expect(d.generate).not.toHaveBeenCalled();
    }
  });

  it("sends nothing without an API key", async () => {
    const d = deps({ hasKey: false });
    expect((await runBriefCron(d)).status).toBe("skipped");
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("does not spend twice: a brief that already exists today is left alone, even a refreshed one", async () => {
    for (const existing of [{ refresh_count: 0 }, { refresh_count: 5 }]) {
      const d = deps({ loadExisting: vi.fn().mockResolvedValue(existing) });
      expect(await runBriefCron(d)).toEqual({ status: "skipped", reason: "Brief hari ini sudah ada." });
      expect(d.generate).not.toHaveBeenCalled();
    }
  });

  it("skips quietly when there is nothing to summarize, without calling the model", async () => {
    const d = deps({ loadInput: vi.fn().mockResolvedValue({ today: "2026-10-12", projects: [], coursework_due_soon: [] }) });
    expect((await runBriefCron(d)).status).toBe("skipped");
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("reports a failure with a safe sentence and stores nothing", async () => {
    const d = deps({ generate: vi.fn().mockRejectedValue(new BriefError("Brief terpotong karena terlalu panjang. Coba lagi.")) });
    expect(await runBriefCron(d)).toEqual({ status: "error", message: "Brief terpotong karena terlalu panjang. Coba lagi." });
    expect(d.save).not.toHaveBeenCalled();

    const leaky = deps({ loadInput: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED sk-ant-secret postgres://u:p@h")) });
    const r = await runBriefCron(leaky);
    expect(r).toEqual({ status: "error", message: "Brief harian gagal dibuat." });
    expect(JSON.stringify(r)).not.toMatch(/sk-ant|postgres/);
  });
});

describe("handleCron with the brief job", () => {
  const env = { CRON_SECRET: "s3cret-value", OWNER_USER_ID: "5f0d1c2e-8b3a-4c6d-9e1f-0a2b3c4d5e6f", SUPABASE_SERVICE_ROLE_KEY: "k" };
  it("answers 200 for generated and skipped, 502 for an error, and never runs for a wrong token", async () => {
    expect((await handleCron("Bearer s3cret-value", env, async () => ({ status: "skipped", reason: "x" }))).status).toBe(200);
    expect((await handleCron("Bearer s3cret-value", env, async () => ({ status: "generated" }))).status).toBe(200);
    expect((await handleCron("Bearer s3cret-value", env, async () => ({ status: "error", message: "m" }))).status).toBe(502);
    const run = vi.fn();
    expect((await handleCron("Bearer salah", env, run)).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });
});
