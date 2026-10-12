import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContextBundle } from "@/features/ai/context-bundle";
import { MOCK_FAIL_COMMAND, MOCK_MODEL, mockProvider } from "@/features/ai/providers/mock";
import { getProvider, listProviders, providerLabel } from "@/features/ai/providers/registry";
import { ProviderError } from "@/features/ai/providers/types";

afterEach(() => vi.unstubAllEnvs());

describe("provider registry", () => {
  it("lists only the labelled mock outside production", () => {
    for (const env of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      const list = listProviders();
      expect(list.map((p) => p.id)).toEqual(["mock"]);
      expect(list.every((p) => p.isMock)).toBe(true);
      expect(list[0].label).toBe("MOCK · DEV");
    }
  });

  it("lists nothing in production, so no provider can be picked or resolved", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(listProviders()).toEqual([]);
    expect(getProvider("mock")).toBeUndefined();
  });

  it("resolves a provider by id and rejects unknown ids", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getProvider("mock")).toBe(mockProvider);
    expect(getProvider("openai")).toBeUndefined();
    expect(getProvider("anthropic")).toBeUndefined();
  });

  it("keeps a readable label for old mock replies even in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(providerLabel("mock")).toBe("MOCK · DEV");
    expect(providerLabel("other")).toBe("other");
  });
});

describe("mock provider", () => {
  const history = [
    { role: "user" as const, content: "pertanyaan pertama" },
    { role: "assistant" as const, content: "jawaban" },
    { role: "user" as const, content: "pertanyaan kedua" },
  ];

  it("is deterministic and says it is a mock", async () => {
    const a = await mockProvider.complete(history);
    const b = await mockProvider.complete(history);
    expect(a).toEqual(b);
    expect(a.model).toBe(MOCK_MODEL);
    expect(a.content).toContain("MOCK · DEV");
    expect(a.content).toContain("bukan dari model AI");
    expect(a.content).toContain("pertanyaan kedua");
  });

  it("replies differently to different input", async () => {
    const other = await mockProvider.complete([{ role: "user", content: "lain" }]);
    expect(other.content).not.toBe((await mockProvider.complete(history)).content);
  });

  it("reports how many context items it received, without repeating their content", async () => {
    const bundle = buildContextBundle([{ kind: "memory", id: "m1" }, { kind: "memory", id: "m2" }], {
      memory: [
        { id: "m1", title: "Satu", content: "ISI-RAHASIA-SATU", category: "preference", tags: [] },
        { id: "m2", title: "Dua", content: "ISI-RAHASIA-DUA", category: "preference", tags: [] },
      ],
      projects: [],
    });
    const withContext = await mockProvider.complete([{ role: "system", content: bundle.text }, ...history]);
    expect(withContext.content).toContain("(mock) konteks: 2 item");
    expect(withContext.content).not.toContain("RAHASIA");
    expect(withContext.content).not.toContain("Satu");
    expect(withContext.content).toContain("Aku menerima 3 pesan"); // the system message is not a chat turn
    expect((await mockProvider.complete(history)).content).toContain("(mock) konteks: 0 item");
  });

  it("fails with a safe ProviderError on the fail command", async () => {
    await expect(mockProvider.complete([{ role: "user", content: ` ${MOCK_FAIL_COMMAND} ` }])).rejects.toBeInstanceOf(ProviderError);
  });
});
