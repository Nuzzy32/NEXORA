import { describe, expect, it } from "vitest";
import {
  likePattern,
  parseNoteFilters,
  parseNoteForm,
  parseProjectFilter,
  parseProjectForm,
  parseProjectTab,
  searchTerm,
} from "@/features/projects/schema";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("parseProjectForm", () => {
  const valid = { name: "Nexora", status: "active" };

  it("accepts a minimal project and nulls blank optional fields", () => {
    const r = parseProjectForm(form({ ...valid, summary: " ", starts_on: "", due_on: "" }));
    expect(r.data).toEqual({ ...valid, summary: null, starts_on: null, due_on: null });
  });

  it("rejects a target date before the start date, reporting it on due_on", () => {
    const r = parseProjectForm(form({ ...valid, starts_on: "2026-10-10", due_on: "2026-10-01" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["due_on"]);
    expect(parseProjectForm(form({ ...valid, starts_on: "2026-10-10", due_on: "2026-10-10" })).success).toBe(true);
  });

  it("rejects empty name, bad status and over-long name", () => {
    expect(parseProjectForm(form({ ...valid, name: "  " })).success).toBe(false);
    expect(parseProjectForm(form({ ...valid, status: "deleted" })).success).toBe(false);
    expect(parseProjectForm(form({ ...valid, name: "x".repeat(121) })).success).toBe(false);
  });
});

describe("parseNoteForm", () => {
  it("accepts a note with an empty or missing body", () => {
    expect(parseNoteForm(form({ title: "Ide", kind: "note", body: "" })).data).toEqual({ title: "Ide", kind: "note", body: "" });
    expect(parseNoteForm(form({ title: "Ide", kind: "decision" })).data?.body).toBe("");
  });

  it("rejects empty title, unknown kind and oversized body", () => {
    expect(parseNoteForm(form({ title: " ", kind: "note" })).success).toBe(false);
    expect(parseNoteForm(form({ title: "x", kind: "idea" })).success).toBe(false);
    expect(parseNoteForm(form({ title: "x", kind: "note", body: "y".repeat(20001) })).success).toBe(false);
  });
});

describe("search and filters", () => {
  it("searchTerm collapses whitespace, caps length, tolerates arrays and undefined", () => {
    expect(searchTerm("  halo   dunia ")).toBe("halo dunia");
    expect(searchTerm(["a", "b"])).toBe("a");
    expect(searchTerm(undefined)).toBe("");
    expect(searchTerm("x".repeat(500))).toHaveLength(100);
  });

  it("likePattern escapes LIKE wildcards so user input matches literally", () => {
    expect(likePattern("abc")).toBe("%abc%");
    expect(likePattern("100%")).toBe("%100\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("a\\b")).toBe("%a\\\\b%");
  });

  it("falls back to defaults for unknown query values", () => {
    expect(parseProjectFilter({})).toBe("open");
    expect(parseProjectFilter({ status: "bogus" })).toBe("open");
    expect(parseProjectFilter({ status: "archived" })).toBe("archived");
    expect(parseNoteFilters({ q: " ide ", kind: "bogus" })).toEqual({ q: "ide", kind: "all" });
    expect(parseNoteFilters({ kind: "decision" }).kind).toBe("decision");
    expect(parseProjectTab({})).toBe("tasks");
    expect(parseProjectTab({ tab: "notes" })).toBe("notes");
    expect(parseProjectTab({ tab: "overview" })).toBe("overview");
    expect(parseProjectTab({ tab: "x" })).toBe("tasks");
  });
});
