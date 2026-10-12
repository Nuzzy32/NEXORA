import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { claudeProvider, replyCostUSD, toRequest, usageLabel, type ChatClient } from "@/features/ai/providers/anthropic";
import { ProviderError } from "@/features/ai/providers/types";

function fakeClient(reply: Partial<Anthropic.Message> | Error) {
  const create = vi.fn<ChatClient["messages"]["create"]>(async () => {
    if (reply instanceof Error) throw reply;
    return {
      model: "claude-haiku-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Halo." }],
      usage: { input_tokens: 120, output_tokens: 40 },
      ...reply,
    } as Anthropic.Message;
  });
  const client: ChatClient = { messages: { create } };
  return { client, create };
}

describe("toRequest", () => {
  it("moves system turns into `system` and starts at the first user turn", () => {
    const r = toRequest([
      { role: "system", content: "KONTEKS" },
      { role: "assistant", content: "sisa riwayat yang terpotong" },
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
    expect(r.system).toContain("NEXORA");
    expect(r.system.endsWith("KONTEKS")).toBe(true);
    expect(r.messages).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });
});

describe("claude provider", () => {
  it("sends the model, a token cap and low effort, and returns text and usage", async () => {
    const { client, create } = fakeClient({});
    const out = await claudeProvider("claude-haiku-5-5", () => client).complete([{ role: "user", content: "hai" }]);
    expect(out).toEqual({ content: "Halo.", model: "claude-haiku-5-5", usage: { inputTokens: 120, outputTokens: 40 } });
    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.max_tokens).toBe(8000);
    expect(params.output_config).toEqual({ effort: "low" });
    // no silent fallback to another model (AI-07)
    expect(params).not.toHaveProperty("fallbacks");
  });

  it("marks a reply cut by the token cap", async () => {
    const { client } = fakeClient({ stop_reason: "max_tokens" });
    const out = await claudeProvider("claude-sonnet-5-5", () => client).complete([{ role: "user", content: "x" }]);
    expect(out.content).toContain("terpotong");
  });

  it("turns refusals and SDK errors into safe ProviderErrors", async () => {
    const refused = claudeProvider("claude-haiku-5-5", () => fakeClient({ stop_reason: "refusal" }).client);
    await expect(refused.complete([{ role: "user", content: "x" }])).rejects.toThrow("menolak");
    const broken = claudeProvider("claude-haiku-5-5", () => fakeClient(new Error("sk-secret raw upstream")).client);
    const err = await broken.complete([{ role: "user", content: "x" }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as Error).message).not.toContain("sk-secret");
  });

  it("refuses to send nothing", async () => {
    const { client, create } = fakeClient({});
    await expect(claudeProvider("claude-haiku-5-5", () => client).complete([{ role: "assistant", content: "x" }])).rejects.toBeInstanceOf(ProviderError);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("cost", () => {
  it("prices known models and nothing else", () => {
    expect(replyCostUSD("claude-sonnet-5-5", 1_000_000, 100_000)).toBeCloseTo(3);
    expect(replyCostUSD("mock-deterministic", 10, 10)).toBeNull();
    expect(replyCostUSD("claude-haiku-5-5", null, 10)).toBeNull();
    expect(usageLabel("claude-haiku-5-5", 1200, 300)).toBe("1.200 → 300 token · ≈ $0.0003");
  });
});
