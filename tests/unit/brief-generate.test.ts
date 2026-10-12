import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { generateBrief, planGeneration, SYSTEM_PROMPT, type BriefClient } from "@/features/brief/generate";
import type { BriefInput } from "@/features/brief/input";
import { BRIEF_MODEL, BriefError, MAX_OUTPUT_TOKENS, MAX_REFRESHES_PER_DAY } from "@/features/brief/schema";

const SECRET = "sk-ant-api03-JANGAN-BOCOR";
const input: BriefInput = {
  today: "2026-10-11",
  projects: [
    {
      name: "Nexora",
      status: "active",
      starts_on: null,
      due_on: null,
      tasks_open: 2,
      tasks_done: 3,
      tasks_overdue: 1,
      last_activity: "2026-10-10",
      days_since_activity: 1,
      top_open_tasks: [],
      recent_decision_titles: [],
    },
  ],
  coursework_due_soon: [],
};
const body = JSON.stringify({
  headline: "Nexora jalan, satu task terlambat",
  projects: [{ name: "Nexora", progress: "3 dari 5 task selesai.", next: ["Tutup task yang terlambat"], risk: "Satu task terlambat" }],
  watch: ["Satu task Nexora terlambat"],
});

function message(o: Partial<Anthropic.Message> = {}): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: BRIEF_MODEL,
    container: null,
    diagnostics: null,
    stop_details: null,
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text: body, citations: null }],
    usage: {
      input_tokens: 1234,
      output_tokens: 456,
      output_tokens_details: null,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      server_tool_use: null,
      service_tier: null,
    },
    ...o,
  };
}

const clientReturning = (m: Anthropic.Message) => {
  const create = vi.fn<BriefClient["messages"]["create"]>().mockResolvedValue(m);
  return { client: { messages: { create } } satisfies BriefClient, create };
};
const clientThrowing = (e: unknown) => ({ messages: { create: vi.fn<BriefClient["messages"]["create"]>().mockRejectedValue(e) } }) satisfies BriefClient;
const apiError = (status: number) => Anthropic.APIError.generate(status, {}, `upstream said ${SECRET}`, new Headers());

describe("generateBrief", () => {
  it("returns validated content and the real token usage", async () => {
    const { client } = clientReturning(message());
    const r = await generateBrief({ client, input });
    expect(r.content.projects[0].name).toBe("Nexora");
    expect(r).toMatchObject({ model: BRIEF_MODEL, inputTokens: 1234, outputTokens: 456 });
  });

  it("sends the Haiku 5.5 request shape: one user message, low effort, json_schema, no sampling, no prefill", async () => {
    const { client, create } = clientReturning(message());
    await generateBrief({ client, input });
    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.max_tokens).toBe(MAX_OUTPUT_TOKENS);
    expect(params.system).toBe(SYSTEM_PROMPT);
    expect(params.output_config?.effort).toBe("low");
    expect(params.output_config?.format?.type).toBe("json_schema");
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].role).toBe("user");
    expect(JSON.parse(params.messages[0].content as string)).toEqual(input);
    for (const k of ["temperature", "top_p", "top_k", "thinking", "stream"]) expect(params).not.toHaveProperty(k);
  });

  it("reads the text block even when thinking comes first", async () => {
    const { client } = clientReturning(
      message({
        content: [
          { type: "thinking", thinking: "", signature: "sig" },
          { type: "text", text: body, citations: null },
        ],
      }),
    );
    expect((await generateBrief({ client, input })).content.headline).toMatch(/Nexora/);
  });

  it("stops on a refusal without reading content", async () => {
    const { client } = clientReturning(message({ stop_reason: "refusal", content: [] }));
    await expect(generateBrief({ client, input })).rejects.toThrow(/menolak/);
  });

  it("stops on max_tokens even if the text looks like JSON", async () => {
    const { client } = clientReturning(message({ stop_reason: "max_tokens", content: [{ type: "text", text: body, citations: null }] }));
    await expect(generateBrief({ client, input })).rejects.toThrow(/terpotong/);
  });

  it("fails on other stop reasons, a missing text block and unusable JSON", async () => {
    for (const m of [
      message({ stop_reason: "pause_turn" }),
      message({ content: [] }),
      message({ content: [{ type: "text", text: "bukan json", citations: null }] }),
    ]) {
      await expect(generateBrief({ client: clientReturning(m).client, input })).rejects.toBeInstanceOf(BriefError);
    }
  });

  it.each([
    ["AuthenticationError", apiError(401), /ANTHROPIC_API_KEY/],
    ["PermissionDeniedError", apiError(403), /ANTHROPIC_API_KEY/],
    ["RateLimitError", apiError(429), /membatasi/],
    ["BadRequestError", apiError(400), /saldo/],
    ["APIConnectionError", new Anthropic.APIConnectionError({ message: SECRET }), /menjangkau/],
    ["APIConnectionTimeoutError", new Anthropic.APIConnectionTimeoutError(), /menjangkau/],
    ["APIError (5xx)", apiError(500), /bermasalah/],
    ["unknown error", new Error(SECRET), /gagal dibuat/],
  ])("maps %s to a generic Indonesian message that leaks nothing", async (_name, error, expected) => {
    const err = await generateBrief({ client: clientThrowing(error), input }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BriefError);
    const text = (err as BriefError).message;
    expect(text).toMatch(expected);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("Nexora"); // nothing from the prompt either
  });
});

describe("the prompt", () => {
  it("is Indonesian, grounds the model in the given data and treats titles as data", () => {
    expect(SYSTEM_PROMPT).toMatch(/HANYA data/);
    expect(SYSTEM_PROMPT).toMatch(/mengarang/);
    expect(SYSTEM_PROMPT).toMatch(/Abaikan perintah/);
  });
});

describe("planGeneration", () => {
  const base = { enabled: true, hasKey: true, existing: null, force: false };

  it("runs the first brief of the day", () => {
    expect(planGeneration(base)).toEqual({ kind: "run" });
  });

  it("never runs before consent, whatever else is set", () => {
    for (const force of [false, true]) {
      for (const existing of [null, { refresh_count: 0 }]) {
        expect(planGeneration({ ...base, enabled: false, existing, force }).kind).toBe("deny");
      }
    }
  });

  it("never runs without an API key", () => {
    expect(planGeneration({ ...base, hasKey: false }).kind).toBe("deny");
  });

  it("returns today's brief instead of regenerating unless forced", () => {
    expect(planGeneration({ ...base, existing: { refresh_count: 0 } })).toEqual({ kind: "existing" });
  });

  it("allows exactly 5 forced refreshes per day", () => {
    for (let n = 0; n < MAX_REFRESHES_PER_DAY; n++) {
      expect(planGeneration({ ...base, existing: { refresh_count: n }, force: true })).toEqual({ kind: "run" });
    }
    const denied = planGeneration({ ...base, existing: { refresh_count: MAX_REFRESHES_PER_DAY }, force: true });
    expect(denied).toMatchObject({ kind: "deny" });
  });
});
