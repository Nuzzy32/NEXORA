import { describe, expect, it } from "vitest";
import {
  buildPalette,
  EMPTY_RESULTS,
  MIN_QUERY_LENGTH,
  moveActive,
  noteHref,
  projectHref,
  taskHref,
  type SearchHit,
  type SearchResults,
} from "@/features/search/schema";

const hit = (kind: SearchHit["kind"], id: string, extra: Partial<SearchHit> = {}): SearchHit => ({
  id,
  kind,
  title: `${kind} ${id}`,
  href: `/${kind}/${id}`,
  ...extra,
});
const results = (o: Partial<SearchResults> = {}): SearchResults => ({ ...EMPTY_RESULTS, ...o });
const sectionIds = (query: string, r: SearchResults | null) => buildPalette(query, r).sections.map((s) => s.id);

describe("search links", () => {
  it("builds the three link shapes", () => {
    expect(taskHref("Beli susu")).toBe("/tasks?status=all&q=Beli%20susu");
    expect(projectHref("abc")).toBe("/projects/abc");
    expect(noteHref("p1", "q & a")).toBe("/projects/p1?tab=notes&q=q%20%26%20a");
  });

  it("encodes reserved and unicode characters so the text survives a round trip", () => {
    const tricky = ["a&b=c#d?e/f", "50% + 1", "café ☕ 日本語", "😀 emoji", `"kutip" 'tunggal' <tag>`, "baris\nbaru"];
    for (const text of tricky) {
      const task = new URL(taskHref(text), "http://nexora.test");
      expect([...task.searchParams.keys()]).toEqual(["status", "q"]);
      expect(task.searchParams.get("q")).toBe(text);
      expect(task.hash).toBe("");

      const note = new URL(noteHref("p1", text), "http://nexora.test");
      expect(note.pathname).toBe("/projects/p1");
      expect([...note.searchParams.keys()]).toEqual(["tab", "q"]);
      expect(note.searchParams.get("q")).toBe(text);
    }
  });

  it("keeps the project id as a single path segment", () => {
    expect(projectHref("../x?y#z")).toBe("/projects/..%2Fx%3Fy%23z");
    expect(new URL(noteHref("a/b", "t"), "http://nexora.test").pathname).toBe("/projects/a%2Fb");
  });
});

describe("moveActive", () => {
  it("ArrowDown and ArrowUp wrap around", () => {
    expect(moveActive(0, "ArrowDown", 3)).toBe(1);
    expect(moveActive(2, "ArrowDown", 3)).toBe(0);
    expect(moveActive(2, "ArrowUp", 3)).toBe(1);
    expect(moveActive(0, "ArrowUp", 3)).toBe(2);
  });

  it("Home and End jump to the ends", () => {
    expect(moveActive(1, "Home", 4)).toBe(0);
    expect(moveActive(1, "End", 4)).toBe(3);
  });

  it("starts from the ends when nothing is active yet", () => {
    expect(moveActive(-1, "ArrowDown", 3)).toBe(0);
    expect(moveActive(-1, "ArrowUp", 3)).toBe(2);
  });

  it("copes with a single option and with a stale index after the list shrank", () => {
    expect(moveActive(0, "ArrowDown", 1)).toBe(0);
    expect(moveActive(0, "ArrowUp", 1)).toBe(0);
    expect(moveActive(9, "ArrowDown", 3)).toBe(0);
    expect(moveActive(9, "ArrowUp", 3)).toBe(1);
  });

  it("returns -1 for an empty list", () => {
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"] as const) expect(moveActive(0, key, 0)).toBe(-1);
  });
});

describe("buildPalette", () => {
  it("offers only the shortcuts below the minimum length, in this order", () => {
    for (const q of ["", "   ", "a", " a ", "a   "]) {
      const { sections, options } = buildPalette(q, results({ tasks: [hit("task", "1")] }));
      expect(sections.map((s) => [s.id, s.label])).toEqual([["go", "Pergi ke"]]);
      expect(options.map((o) => [o.title, "href" in o && o.href])).toEqual([
        ["Dashboard", "/dashboard"],
        ["Tasks", "/tasks"],
        ["Task terlambat", "/tasks?status=overdue"],
        ["Projects", "/projects"],
        ["AI Workspace", "/ai"],
        ["Memory", "/memory"],
        ["Learning", "/learning"],
        ["Kuliah", "/courses"],
        ["Settings", "/settings"],
      ]);
      expect(options.some((o) => o.kind === "create")).toBe(false);
    }
  });

  it("keeps the section order fixed: Tasks, Proyek, Catatan, Aksi", () => {
    // Deliberately built in another key order: the layout must not depend on it.
    const r: SearchResults = { notes: [hit("note", "n")], projects: [hit("project", "p")], tasks: [hit("task", "t")] };
    const { sections } = buildPalette("susu", r);
    expect(sections.map((s) => s.id)).toEqual(["tasks", "projects", "notes", "actions"]);
    expect(sections.map((s) => s.label)).toEqual(["Tasks", "Proyek", "Catatan", "Aksi"]);
  });

  it("always ends with the create-task action once the query is long enough", () => {
    expect(MIN_QUERY_LENGTH).toBe(2);
    for (const r of [null, EMPTY_RESULTS, results({ tasks: [hit("task", "1")] })]) {
      const { options } = buildPalette("  beli susu ", r);
      const last = options.at(-1);
      expect(last).toMatchObject({ key: "create", kind: "create", title: "Buat task “beli susu”", taskTitle: "beli susu" });
    }
    expect(buildPalette("ab", null).options.at(-1)?.kind).toBe("create");
    expect(buildPalette("a", null).options.some((o) => o.kind === "create")).toBe(false);
  });

  it("does not render empty sections", () => {
    expect(sectionIds("susu", null)).toEqual(["actions"]);
    expect(sectionIds("susu", EMPTY_RESULTS)).toEqual(["actions"]);
    expect(sectionIds("susu", results({ notes: [hit("note", "n")] }))).toEqual(["notes", "actions"]);
    expect(sectionIds("susu", results({ tasks: [hit("task", "t")], projects: [hit("project", "p")] }))).toEqual([
      "tasks",
      "projects",
      "actions",
    ]);
  });

  it("numbers options consecutively across sections so keyboard index and section line up", () => {
    const r = results({
      tasks: [hit("task", "1"), hit("task", "2")],
      projects: [hit("project", "1")],
      notes: [hit("note", "1"), hit("note", "2"), hit("note", "3")],
    });
    const { sections, options } = buildPalette("susu", r);
    expect(sections.map((s) => s.start)).toEqual([0, 2, 3, 6]);
    expect(options).toHaveLength(7);
    for (const s of sections) s.options.forEach((o, j) => expect(options[s.start + j]).toBe(o));
  });

  it("gives every option a unique key, even when ids collide across kinds", () => {
    const { options } = buildPalette("susu", results({ tasks: [hit("task", "1")], projects: [hit("project", "1")] }));
    const keys = options.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(["task:1", "project:1", "create"]);
  });

  it("passes title, hint and href through untouched", () => {
    const h = hit("task", "1", { title: "Beli susu", hint: "Rumah", href: "/tasks?status=all&q=Beli%20susu" });
    const { options } = buildPalette("susu", results({ tasks: [h] }));
    expect(options[0]).toEqual({ key: "task:1", kind: "task", title: "Beli susu", hint: "Rumah", href: h.href });
  });
});
