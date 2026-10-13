import { describe, expect, it } from "vitest";
import { buildTimeline, byMonth } from "@/features/projects/timeline";

const today = "2026-10-13";

describe("buildTimeline", () => {
  it("orders dated items, marks today and states, and counts undated ones", () => {
    const { entries, undated } = buildTimeline(
      { starts_on: "2026-10-01", due_on: "2026-11-30", status: "active" },
      [
        { id: "t1", title: "Lewat", status: "todo", due_date: "2026-10-10" },
        { id: "t2", title: "Beres", status: "done", due_date: "2026-10-11" },
        { id: "t3", title: "Tanpa tanggal", status: "todo", due_date: null },
      ],
      [
        { id: "n1", kind: "milestone", title: "Rilis beta", due_date: "2026-10-20", resolved_at: null },
        { id: "n2", kind: "decision", title: "Pakai Supabase", due_date: null, resolved_at: null },
        { id: "n3", kind: "risk", title: "Tanpa tenggat", due_date: null, resolved_at: null },
      ],
      today,
    );
    expect(entries.map((e) => [e.kind, e.date, "state" in e ? e.state : "-"])).toEqual([
      ["start", "2026-10-01", "done"],
      ["task", "2026-10-10", "overdue"],
      ["task", "2026-10-11", "done"],
      ["today", today, "-"],
      ["milestone", "2026-10-20", "upcoming"],
      ["target", "2026-11-30", "upcoming"],
    ]);
    expect(undated).toBe(2);
    expect(byMonth(entries).map(([m, es]) => [m, es.length])).toEqual([
      ["2026-10", 5],
      ["2026-11", 1],
    ]);
  });

  it("is empty (no lone 'today') for a project without dates", () => {
    expect(buildTimeline({ starts_on: null, due_on: null, status: "active" }, [], [], today).entries).toEqual([]);
  });

  it("marks a past target done when the project is completed", () => {
    const { entries } = buildTimeline({ starts_on: null, due_on: "2026-10-01", status: "completed" }, [], [], today);
    expect(entries[0]).toMatchObject({ kind: "target", state: "done" });
  });
});
