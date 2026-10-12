import { describe, expect, it } from "vitest";
import { isTrackedKind, noteRow, parseNoteForm, type Note } from "@/features/projects/schema";
import {
  isOverdue,
  milestoneProgress,
  nextMilestones,
  openRisks,
  openRisksByProject,
  sortTracked,
  trackingStats,
  type TrackedItem,
} from "@/features/projects/tracking";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const note = (kind: Note["kind"], due_date: string | null, resolved_at: string | null = null, title = kind): Note => ({
  id: title + due_date, kind, title, body: "", updated_at: "2026-10-10T00:00:00Z", due_date, resolved_at,
});
const DONE = "2026-10-01T00:00:00Z";

describe("note kinds and due date", () => {
  it("accepts every kind", () => {
    for (const kind of ["note", "decision", "milestone", "bug", "risk"]) {
      expect(parseNoteForm(form({ title: "x", kind })).success).toBe(true);
    }
    expect(parseNoteForm(form({ title: "x", kind: "idea" })).success).toBe(false);
  });

  it("parses an optional due date and rejects a malformed one", () => {
    expect(parseNoteForm(form({ title: "x", kind: "milestone", due_date: "2026-12-01" })).data?.due_date).toBe("2026-12-01");
    expect(parseNoteForm(form({ title: "x", kind: "milestone", due_date: "" })).data?.due_date).toBeNull();
    expect(parseNoteForm(form({ title: "x", kind: "milestone", due_date: "2026-02-30" })).success).toBe(false);
    expect(parseNoteForm(form({ title: "x", kind: "milestone", due_date: "besok" })).success).toBe(false);
  });

  it("noteRow keeps the date for tracked kinds and clears date and resolved mark for the rest", () => {
    const data = (kind: string) => parseNoteForm(form({ title: "x", kind, due_date: "2026-12-01" })).data!;
    expect(noteRow(data("risk"))).toMatchObject({ kind: "risk", due_date: "2026-12-01" });
    expect(noteRow(data("risk"))).not.toHaveProperty("resolved_at");
    expect(noteRow(data("decision"))).toMatchObject({ due_date: null, resolved_at: null });
    expect(isTrackedKind("bug")).toBe(true);
    expect(isTrackedKind("note")).toBe(false);
  });
});

describe("tracking helpers", () => {
  const today = "2026-10-11";

  it("isOverdue only for open items past their date", () => {
    expect(isOverdue({ due_date: "2026-10-10", resolved_at: null }, today)).toBe(true);
    expect(isOverdue({ due_date: "2026-10-11", resolved_at: null }, today)).toBe(false);
    expect(isOverdue({ due_date: "2026-10-10", resolved_at: DONE }, today)).toBe(false);
    expect(isOverdue({ due_date: null, resolved_at: null }, today)).toBe(false);
  });

  it("sortTracked puts open first, by date, undated last, without mutating", () => {
    const input = [note("milestone", null), note("milestone", "2026-12-01", DONE), note("milestone", "2026-11-01"), note("milestone", "2026-10-20")];
    const out = sortTracked(input);
    expect(out.map((n) => n.due_date)).toEqual(["2026-10-20", "2026-11-01", null, "2026-12-01"]);
    expect(input[0].due_date).toBeNull();
  });

  it("nextMilestones, openRisks and milestoneProgress read one project's notes", () => {
    const notes = [
      note("milestone", "2026-11-01"), note("milestone", "2026-10-15"), note("milestone", "2026-10-01", DONE),
      note("risk", "2026-10-30"), note("risk", null, DONE), note("bug", null), note("decision", null),
    ];
    expect(nextMilestones(notes, 1).map((n) => n.due_date)).toEqual(["2026-10-15"]);
    expect(openRisks(notes)).toHaveLength(1);
    expect(milestoneProgress(notes)).toEqual({ done: 1, total: 3 });
    expect(milestoneProgress([])).toEqual({ done: 0, total: 0 });
  });

  const item = (project_id: string, kind: TrackedItem["kind"], resolved_at: string | null = null): TrackedItem => ({
    project_id, kind, due_date: null, resolved_at,
  });
  const projects = [
    { id: "a", status: "active" as const }, { id: "b", status: "on_hold" as const },
    { id: "c", status: "completed" as const }, { id: "d", status: "archived" as const },
  ];

  it("trackingStats counts running projects only", () => {
    const items = [
      item("a", "milestone", DONE), item("a", "milestone"), item("b", "milestone"), item("c", "milestone"), item("d", "risk"),
      item("a", "risk"), item("b", "risk", DONE), item("c", "risk"),
    ];
    expect(trackingStats(items, projects)).toEqual({ milestonesTotal: 3, milestonesDone: 1, risksTotal: 2, risksOpen: 1 });
    expect(trackingStats([], [])).toEqual({ milestonesTotal: 0, milestonesDone: 0, risksTotal: 0, risksOpen: 0 });
  });

  it("openRisksByProject counts open risks per project", () => {
    const m = openRisksByProject([item("a", "risk"), item("a", "risk"), item("a", "risk", DONE), item("b", "milestone"), item("c", "risk")]);
    expect(Object.fromEntries(m)).toEqual({ a: 2, c: 1 });
  });
});
