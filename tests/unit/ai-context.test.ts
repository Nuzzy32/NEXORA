import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/features/ai/blocks";
import { estimateTokens, MAX_CONTEXT_MESSAGES, selectContext } from "@/features/ai/context";
import { groupConversations } from "@/features/ai/group";

describe("estimateTokens", () => {
  it("is characters / 4, rounded up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("x".repeat(400))).toBe(100);
  });
});

describe("selectContext", () => {
  const m = (role: "user" | "assistant", content: string, status: "complete" | "error" = "complete") => ({ role, content, status });

  it("appends the trimmed draft as a user message", () => {
    expect(selectContext([m("user", "a"), m("assistant", "b")], "  c ")).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });

  it("leaves out failed replies and a blank draft", () => {
    expect(selectContext([m("user", "a"), m("assistant", "", "error")], "  ")).toEqual([{ role: "user", content: "a" }]);
  });

  it("keeps only the newest messages", () => {
    const history = Array.from({ length: 60 }, (_, i) => m(i % 2 ? "assistant" : "user", `p${i}`));
    const sent = selectContext(history, "baru");
    expect(sent).toHaveLength(MAX_CONTEXT_MESSAGES);
    expect(sent.at(-1)?.content).toBe("baru");
    expect(sent[0].content).toBe(`p${60 - (MAX_CONTEXT_MESSAGES - 1)}`);
  });
});

describe("groupConversations", () => {
  const today = "2026-10-11";
  const at = (updated_at: string, id: string) => ({ id, title: id, updated_at });

  it("buckets by last activity and drops empty groups", () => {
    const groups = groupConversations(
      [
        at("2026-10-11T05:00:00Z", "hari-ini"),
        at("2026-10-10T05:00:00Z", "kemarin"),
        at("2026-10-05T05:00:00Z", "enam-hari"),
        at("2026-09-01T05:00:00Z", "lama"),
      ],
      today,
    );
    expect(groups.map((g) => [g.label, g.items.map((c) => c.id)])).toEqual([
      ["Hari ini", ["hari-ini"]],
      ["Kemarin", ["kemarin"]],
      ["7 hari terakhir", ["enam-hari"]],
      ["Lebih lama", ["lama"]],
    ]);
    expect(groupConversations([at("2026-10-11T05:00:00Z", "x")], today).map((g) => g.label)).toEqual(["Hari ini"]);
    expect(groupConversations([], today)).toEqual([]);
  });
});

describe("parseBlocks", () => {
  it("splits prose and fenced code", () => {
    expect(parseBlocks("Lihat ini:\n```ts\nconst a = 1;\n```\nSelesai.")).toEqual([
      { kind: "text", text: "Lihat ini:" },
      { kind: "code", lang: "ts", code: "const a = 1;" },
      { kind: "text", text: "Selesai." },
    ]);
  });

  it("keeps an unclosed fence as plain text", () => {
    expect(parseBlocks("```ts\nbelum ditutup")).toEqual([{ kind: "text", text: "```ts\nbelum ditutup" }]);
  });

  it("returns nothing for empty content", () => {
    expect(parseBlocks("")).toEqual([]);
  });
});
