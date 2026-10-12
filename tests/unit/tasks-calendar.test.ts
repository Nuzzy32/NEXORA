import { describe, expect, it } from "vitest";
import { monthDays, monthLabel, parseDay, parseMonth, shiftMonth, tasksByDay } from "@/features/tasks/calendar";
import type { Task } from "@/features/tasks/schema";

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

describe("parseMonth / parseDay", () => {
  it("accepts YYYY-MM and falls back to today's month", () => {
    expect(parseMonth("2026-12", "2026-10-11")).toBe("2026-12");
    for (const bad of [undefined, "", "2026-13", "2026-00", "26-10", "2026-1", "1999-05", "2026-10-01"]) {
      expect(parseMonth(bad, "2026-10-11")).toBe("2026-10");
    }
  });
  it("accepts only real dates", () => {
    expect(parseDay("2026-10-14")).toBe("2026-10-14");
    for (const bad of [undefined, "", "2026-02-30", "14-10-2026", "x"]) expect(parseDay(bad)).toBe("");
  });
});

describe("shiftMonth / monthLabel", () => {
  it("rolls over years in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });
  it("names the month in Indonesian", () => {
    expect(monthLabel("2026-10")).toBe("Oktober 2026");
  });
});

describe("monthDays", () => {
  it("pads to whole Monday-first weeks", () => {
    // October 2026 starts on a Thursday: Mon 28 Sep ... Sun 1 Nov = 5 weeks
    const days = monthDays("2026-10");
    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2026-09-28");
    expect(days[3]).toBe("2026-10-01");
    expect(days.at(-1)).toBe("2026-11-01");
  });
  it("uses six rows when the month needs them", () => {
    // August 2026 starts on a Saturday and has 31 days: 5 + 31 = 36 -> 6 weeks
    expect(monthDays("2026-08")).toHaveLength(42);
  });
  it("starts on the 1st when the month starts on a Monday", () => {
    // June 2026 starts on a Monday
    expect(monthDays("2026-06")[0]).toBe("2026-06-01");
  });
  it("handles February in a leap year", () => {
    const days = monthDays("2028-02");
    expect(days).toContain("2028-02-29");
    expect(days.length % 7).toBe(0);
  });
});

describe("tasksByDay", () => {
  it("groups by due date, skips undated tasks, puts finished tasks last", () => {
    const m = tasksByDay([
      task("done", "2026-10-14", { status: "done" }),
      task("low", "2026-10-14", { priority: "low" }),
      task("high", "2026-10-14", { priority: "high" }),
      task("other", "2026-10-15"),
      task("undated", null),
    ]);
    expect(m.get("2026-10-14")?.map((t) => t.id)).toEqual(["high", "low", "done"]);
    expect(m.get("2026-10-15")?.map((t) => t.id)).toEqual(["other"]);
    expect(m.size).toBe(2);
  });
});
