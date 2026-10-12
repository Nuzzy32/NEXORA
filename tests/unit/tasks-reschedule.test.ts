import { describe, expect, it } from "vitest";
import { dueDayOf, moveInMap, shortDay, tasksByDay } from "@/features/tasks/calendar";
import { rescheduleSchema, type Task } from "@/features/tasks/schema";

const ID = "00000000-0000-4000-8000-000000000001";

const task = (id: string, due: string | null, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: null,
  status: "todo",
  priority: "medium",
  due_date: due,
  project_id: null,
  completed_at: null,
  ...extra,
});

describe("rescheduleSchema", () => {
  it("accepts a uuid and a real date", () => {
    expect(rescheduleSchema.safeParse({ id: ID, date: "2026-10-16" }).success).toBe(true);
  });
  it("rejects a bad id or date", () => {
    for (const bad of [
      { id: "x", date: "2026-10-16" },
      { id: ID, date: "2026-02-30" },
      { id: ID, date: "16-10-2026" },
      { id: ID, date: "" },
      { id: ID, date: null },
      { id: ID },
    ]) {
      expect(rescheduleSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("moveInMap", () => {
  const base = () => tasksByDay([task("a", "2026-10-14"), task("b", "2026-10-14"), task("c", "2026-10-15")]);

  it("moves a task to another day without touching the original map", () => {
    const before = base();
    const next = moveInMap(before, "a", "2026-10-15");
    expect(next.get("2026-10-14")?.map((t) => t.id)).toEqual(["b"]);
    expect(next.get("2026-10-15")?.map((t) => t.id).sort()).toEqual(["a", "c"]);
    expect(next.get("2026-10-15")?.find((t) => t.id === "a")?.due_date).toBe("2026-10-15");
    expect(before.get("2026-10-14")).toHaveLength(2);
    expect(before.get("2026-10-14")?.find((t) => t.id === "a")?.due_date).toBe("2026-10-14");
  });

  it("moves to an empty day and drops the day it emptied", () => {
    const next = moveInMap(base(), "c", "2026-10-20");
    expect(next.has("2026-10-15")).toBe(false);
    expect(next.get("2026-10-20")?.map((t) => t.id)).toEqual(["c"]);
  });

  it("returns the same map for an unknown id or the same day", () => {
    const m = base();
    expect(moveInMap(m, "nope", "2026-10-20")).toBe(m);
    expect(moveInMap(m, "a", "2026-10-14")).toBe(m);
  });

  it("orders the destination day: high priority first, finished last", () => {
    const m = tasksByDay([
      task("done", "2026-10-15", { status: "done" }),
      task("plain", "2026-10-15"),
      task("moving", "2026-10-14", { priority: "high" }),
    ]);
    expect(moveInMap(m, "moving", "2026-10-15").get("2026-10-15")?.map((t) => t.id)).toEqual(["moving", "plain", "done"]);
  });

  it("moves finished tasks too and finds them with dueDayOf", () => {
    const m = tasksByDay([task("d", "2026-10-14", { status: "done" })]);
    expect(dueDayOf(m, "d")).toBe("2026-10-14");
    const next = moveInMap(m, "d", "2026-10-18");
    expect(dueDayOf(next, "d")).toBe("2026-10-18");
    expect(next.get("2026-10-18")?.[0].status).toBe("done");
    expect(dueDayOf(next, "zzz")).toBeUndefined();
  });
});

describe("shortDay", () => {
  it("formats as day and short month", () => {
    expect(shortDay("2026-10-16")).toBe("16 Okt");
  });
});
