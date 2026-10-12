import { describe, expect, it } from "vitest";
import {
  contextRefSchema,
  DEFAULT_TITLE,
  MAX_CONTEXT_ITEMS,
  MAX_TITLE,
  MAX_USER_MESSAGE,
  messageInputSchema,
  parseMessageContext,
  parseTitleForm,
  setContextInputSchema,
  titleFromMessage,
} from "@/features/ai/schema";

const CID = "00000000-0000-4000-8000-000000000001";

describe("messageInputSchema", () => {
  const valid = { conversationId: CID, providerId: "mock", content: "halo" };

  it("accepts a message and trims it", () => {
    expect(messageInputSchema.parse({ ...valid, content: "  halo \n" }).content).toBe("halo");
  });

  it("rejects empty or whitespace-only content", () => {
    expect(messageInputSchema.safeParse({ ...valid, content: "   " }).success).toBe(false);
    expect(messageInputSchema.safeParse({ ...valid, content: undefined }).success).toBe(false);
  });

  it("enforces the length limit", () => {
    expect(messageInputSchema.safeParse({ ...valid, content: "x".repeat(MAX_USER_MESSAGE) }).success).toBe(true);
    expect(messageInputSchema.safeParse({ ...valid, content: "x".repeat(MAX_USER_MESSAGE + 1) }).success).toBe(false);
  });

  it("rejects a malformed conversation id and a missing provider", () => {
    expect(messageInputSchema.safeParse({ ...valid, conversationId: "abc" }).success).toBe(false);
    expect(messageInputSchema.safeParse({ ...valid, providerId: "" }).success).toBe(false);
  });
});

describe("parseTitleForm", () => {
  const form = (title: string) => {
    const f = new FormData();
    f.set("title", title);
    return f;
  };

  it("trims and accepts a title", () => {
    expect(parseTitleForm(form("  Rencana  ")).data).toEqual({ title: "Rencana" });
  });

  it("rejects a blank or too long title", () => {
    expect(parseTitleForm(form("  ")).success).toBe(false);
    expect(parseTitleForm(form("x".repeat(MAX_TITLE + 1))).success).toBe(false);
    expect(parseTitleForm(form("x".repeat(MAX_TITLE))).success).toBe(true);
  });
});

describe("titleFromMessage", () => {
  it("uses the first line and keeps short titles whole", () => {
    expect(titleFromMessage("Halo dunia\nbaris dua")).toBe("Halo dunia");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const t = titleFromMessage("kata ".repeat(30), 20);
    expect(t.endsWith("…")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(21);
    expect(t).not.toMatch(/\s…$/);
  });

  it("falls back to the default title for blank input", () => {
    expect(titleFromMessage("   ")).toBe(DEFAULT_TITLE);
  });
});

describe("context schemas", () => {
  const ID = "00000000-0000-4000-8000-0000000000aa";
  const item = (i: number) => ({ kind: "memory" as const, id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` });

  it("accepts up to MAX_CONTEXT_ITEMS valid picks and an empty list", () => {
    expect(setContextInputSchema.safeParse({ conversationId: CID, items: [] }).success).toBe(true);
    const ten = Array.from({ length: MAX_CONTEXT_ITEMS }, (_, i) => item(i));
    expect(setContextInputSchema.safeParse({ conversationId: CID, items: ten }).success).toBe(true);
  });

  it("refuses more than the limit with a clear message", () => {
    const r = setContextInputSchema.safeParse({ conversationId: CID, items: Array.from({ length: MAX_CONTEXT_ITEMS + 1 }, (_, i) => item(i)) });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].message).toBe(`Maksimal ${MAX_CONTEXT_ITEMS} item konteks`);
  });

  it("rejects an unknown kind, a malformed id and a malformed conversation id", () => {
    expect(contextRefSchema.safeParse({ kind: "note", id: ID }).success).toBe(false);
    expect(contextRefSchema.safeParse({ kind: "project", id: "bukan-uuid" }).success).toBe(false);
    expect(contextRefSchema.safeParse({ kind: "project", id: ID }).success).toBe(true);
    expect(setContextInputSchema.safeParse({ conversationId: "x", items: [] }).success).toBe(false);
    expect(setContextInputSchema.safeParse({ conversationId: CID, items: "x" }).success).toBe(false);
  });

  it("reads a message snapshot defensively: bad shapes mean no context", () => {
    const good = { items: [{ kind: "memory", title: "Arsitektur" }], chars: 120 };
    expect(parseMessageContext(good)).toEqual(good);
    expect(parseMessageContext({ ...good, truncated: true })?.truncated).toBe(true);
    expect(parseMessageContext(null)).toBeNull();
    expect(parseMessageContext({ items: [], chars: 0 })).toBeNull();
    expect(parseMessageContext({ items: [{ kind: "x", title: "t" }], chars: 1 })).toBeNull();
    expect(parseMessageContext({ items: [{ kind: "memory", title: 1 }], chars: 1 })).toBeNull();
    expect(parseMessageContext("teks")).toBeNull();
  });
});
