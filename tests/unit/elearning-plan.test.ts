import { describe, expect, it } from "vitest";
import type { SourceTask } from "@/features/elearning/ical";
import { agoLabel, planSync, sourceHash, type ExistingTask } from "@/features/elearning/plan";

const src = (id: string, over: Partial<SourceTask> = {}): SourceTask => ({
  external_id: id,
  title: `Tugas ${id}`,
  due_date: "2026-10-15",
  description: "Batas: 17:00 WIB",
  ...over,
});
const have = (t: SourceTask, over: Partial<ExistingTask> = {}): ExistingTask => ({
  id: `row-${t.external_id}`,
  external_id: t.external_id,
  external_hash: sourceHash(t),
  status: "todo",
  ...over,
});

describe("sourceHash", () => {
  it("changes with title, due date or description only", () => {
    const a = src("1");
    expect(sourceHash(a)).toBe(sourceHash({ ...a }));
    expect(sourceHash(a)).not.toBe(sourceHash(src("1", { title: "Lain" })));
    expect(sourceHash(a)).not.toBe(sourceHash(src("1", { due_date: "2026-10-16" })));
    expect(sourceHash(a)).not.toBe(sourceHash(src("1", { description: "x" })));
    expect(sourceHash(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("planSync", () => {
  it("inserts items it has not seen", () => {
    const plan = planSync([src("1"), src("2")], [have(src("1"))]);
    expect(plan.inserts.map((r) => r.external_id)).toEqual(["2"]);
    expect(plan.inserts[0].external_hash).toBe(sourceHash(src("2")));
    expect(plan.updates).toEqual([]);
    expect(plan.unchanged).toBe(1);
  });

  it("is idempotent: the same feed twice changes nothing", () => {
    const feed = [src("1"), src("2")];
    const plan = planSync(feed, feed.map((t) => have(t)));
    expect(plan).toEqual({ inserts: [], updates: [], unchanged: 2 });
  });

  it("updates an open task whose source changed", () => {
    const old = src("1");
    const moved = src("1", { due_date: "2026-10-20" });
    const plan = planSync([moved], [have(old, { status: "in_progress" })]);
    expect(plan.updates).toEqual([
      { id: "row-1", title: moved.title, due_date: "2026-10-20", description: moved.description, external_hash: sourceHash(moved) },
    ]);
  });

  it("never rewrites or reopens a done task", () => {
    const plan = planSync([src("1", { title: "Berubah" })], [have(src("1"), { status: "done" })]);
    expect(plan).toEqual({ inserts: [], updates: [], unchanged: 1 });
  });

  it("keeps a local edit while the source is unchanged, and leaves tasks that left the feed", () => {
    // the stored hash still matches the source, so a locally edited title is not touched
    const plan = planSync([src("1")], [have(src("1")), have(src("gone"))]);
    expect(plan).toEqual({ inserts: [], updates: [], unchanged: 1 });
  });

  it("treats a missing stored hash as changed", () => {
    expect(planSync([src("1")], [have(src("1"), { external_hash: null })]).updates).toHaveLength(1);
  });
});

describe("agoLabel", () => {
  it("rounds down to minutes, hours, days", () => {
    expect(agoLabel(10_000)).toBe("baru saja");
    expect(agoLabel(5 * 60_000 + 59_000)).toBe("5 menit lalu");
    expect(agoLabel(3 * 3_600_000)).toBe("3 jam lalu");
    expect(agoLabel(50 * 3_600_000)).toBe("2 hari lalu");
    expect(agoLabel(-5)).toBe("baru saja");
  });
});
