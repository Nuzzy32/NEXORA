import { describe, expect, it } from "vitest";
import { sortByFocus, sortChronological, type Task } from "@/features/tasks/schema";

const task = (id: string, o: Partial<Task> = {}): Task => ({
  id, title: id, description: null, status: "todo", priority: "medium",
  due_date: null, project_id: null, completed_at: null, ...o,
});
const ids = (ts: Task[]) => ts.map((t) => t.id);

describe("task ordering", () => {
  const tasks = [
    task("low-early", { priority: "low", due_date: "2026-10-01" }),
    task("high-late", { priority: "high", due_date: "2026-10-09" }),
    task("high-early", { priority: "high", due_date: "2026-10-02" }),
    task("doing-low", { priority: "low", status: "in_progress", due_date: "2026-10-08" }),
    task("medium-none", { priority: "medium" }),
  ];

  it("focus: in progress first, then priority, then earlier due date, undated last", () => {
    expect(ids(sortByFocus(tasks))).toEqual(["doing-low", "high-early", "high-late", "medium-none", "low-early"]);
  });

  it("chronological: due date first, then focus; undated last", () => {
    expect(ids(sortChronological(tasks))).toEqual(["low-early", "high-early", "doing-low", "high-late", "medium-none"]);
  });

  it("does not mutate its input", () => {
    const before = ids(tasks);
    sortByFocus(tasks);
    sortChronological(tasks);
    expect(ids(tasks)).toEqual(before);
  });
});
