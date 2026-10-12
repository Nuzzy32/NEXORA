import { describe, expect, it } from "vitest";
import { readDraft, removeDraft, writeDraft, type DraftStore } from "@/lib/draft";

const memoryStore = (): DraftStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};
const brokenStore: DraftStore = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("quota"); },
  removeItem: () => { throw new Error("blocked"); },
};
const DAY = 24 * 60 * 60 * 1000;

describe("drafts", () => {
  it("round-trips values under a namespaced key", () => {
    const s = memoryStore();
    writeDraft(s, "note:p1", { title: "Ide", body: "Isi panjang" }, 1000);
    expect([...s.data.keys()]).toEqual(["nexora:draft:note:p1"]);
    expect(readDraft(s, "note:p1", 2000)).toEqual({ title: "Ide", body: "Isi panjang" });
    expect(readDraft(s, "note:other", 2000)).toBeNull();
  });

  it("expires after 30 days and cleans up the stale entry", () => {
    const s = memoryStore();
    writeDraft(s, "k", { title: "x" }, 0);
    expect(readDraft(s, "k", 29 * DAY)).toEqual({ title: "x" });
    expect(readDraft(s, "k", 31 * DAY)).toBeNull();
    expect(s.data.size).toBe(0);
  });

  it("ignores corrupt or malformed data instead of throwing", () => {
    const s = memoryStore();
    s.data.set("nexora:draft:a", "{not json");
    s.data.set("nexora:draft:b", JSON.stringify({ t: 1, v: "oops" }));
    s.data.set("nexora:draft:c", JSON.stringify({ t: 1, v: { n: 5, ok: "ya" } }));
    expect(readDraft(s, "a", 2)).toBeNull();
    expect(readDraft(s, "b", 2)).toBeNull();
    expect(readDraft(s, "c", 2)).toEqual({ ok: "ya" }); // non-string values are dropped
  });

  it("removeDraft deletes, and unavailable or blocked storage never throws", () => {
    const s = memoryStore();
    writeDraft(s, "k", { title: "x" });
    removeDraft(s, "k");
    expect(readDraft(s, "k")).toBeNull();
    expect(() => writeDraft(undefined, "k", { a: "b" })).not.toThrow();
    expect(readDraft(undefined, "k")).toBeNull();
    expect(() => writeDraft(brokenStore, "k", { a: "b" })).not.toThrow();
    expect(() => removeDraft(brokenStore, "k")).not.toThrow();
    expect(readDraft(brokenStore, "k")).toBeNull();
  });
});
