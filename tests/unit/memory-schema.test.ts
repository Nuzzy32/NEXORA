import { describe, expect, it } from "vitest";
import {
  memoryAsContext,
  memoryHref,
  parseMemoryFilters,
  parseMemoryForm,
  parseTags,
} from "@/features/memory/schema";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { title: "RLS wajib", content: "Setiap tabel pakai auth.uid() = user_id", category: "decision" };

describe("parseTags", () => {
  it("normalises, strips #, joins words and removes duplicates and blanks", () => {
    expect(parseTags("#API, rls ,  Row Level, api,,\n#rls")).toEqual(["api", "rls", "row-level"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("parseMemoryForm", () => {
  it("accepts a minimal item: no tags, no project", () => {
    const r = parseMemoryForm(form(valid));
    expect(r.data).toEqual({ ...valid, tags: [], project_id: null });
  });

  it("trims text and parses tags and project", () => {
    const pid = "00000000-0000-4000-8000-000000000001";
    const r = parseMemoryForm(form({ ...valid, title: "  RLS  ", tags: "supabase, #rls", project_id: pid }));
    expect(r.data).toMatchObject({ title: "RLS", tags: ["supabase", "rls"], project_id: pid });
  });

  it("rejects empty title or content, unknown category and a malformed project id", () => {
    expect(parseMemoryForm(form({ ...valid, title: "  " })).success).toBe(false);
    expect(parseMemoryForm(form({ ...valid, content: "" })).success).toBe(false);
    expect(parseMemoryForm(form({ ...valid, category: "secret" })).success).toBe(false);
    expect(parseMemoryForm(form({ ...valid, project_id: "abc" })).success).toBe(false);
  });

  it("enforces length limits and reports tag problems on the tags field", () => {
    expect(parseMemoryForm(form({ ...valid, title: "x".repeat(201) })).success).toBe(false);
    expect(parseMemoryForm(form({ ...valid, content: "x".repeat(10001) })).success).toBe(false);
    for (const tags of ["x".repeat(31), Array.from({ length: 11 }, (_, i) => `t${i}`).join(",")]) {
      const r = parseMemoryForm(form({ ...valid, tags }));
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].path[0]).toBe("tags");
    }
  });
});

describe("parseMemoryFilters / memoryHref", () => {
  it("defaults, and ignores unknown values", () => {
    expect(parseMemoryFilters({})).toEqual({ q: "", category: "all", sort: "updated" });
    expect(parseMemoryFilters({ category: "x", sort: "y" })).toEqual({ q: "", category: "all", sort: "updated" });
  });

  it("reads category, sort and a trimmed query; first value wins for repeated params", () => {
    expect(parseMemoryFilters({ q: "  rls   baru ", category: ["decision", "preference"], sort: "pinned" })).toEqual({
      q: "rls baru",
      category: "decision",
      sort: "pinned",
    });
  });

  it("builds a short URL that keeps only non-default filters", () => {
    expect(memoryHref({ q: "", category: "all", sort: "updated" })).toBe("/memory");
    expect(memoryHref({ q: "a b", category: "decision", sort: "created" })).toBe("/memory?q=a+b&category=decision&sort=created");
  });
});

describe("memoryAsContext", () => {
  it("renders title, category and tags, then the content", () => {
    expect(memoryAsContext({ title: "T", content: "Isi", category: "architecture", tags: ["a", "b"] })).toBe(
      "T\nArsitektur #a #b\n\nIsi",
    );
    expect(memoryAsContext({ title: "T", content: "Isi", category: "preference", tags: [] })).toBe("T\nPreferensi\n\nIsi");
  });
});
