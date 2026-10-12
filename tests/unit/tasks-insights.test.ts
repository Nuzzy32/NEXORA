import { describe, expect, it } from "vitest";
import { daySummary, greetingForHour, pickFocus, weekDays } from "@/features/tasks/insights";
import type { Task } from "@/features/tasks/schema";
import { projectColor, projectHue } from "@/lib/color";

const task = (id: string, o: Partial<Task> = {}): Task => ({
  id, title: id, description: null, status: "todo", priority: "medium",
  due_date: null, project_id: null, completed_at: null, ...o,
});

describe("greetingForHour", () => {
  it("follows the part of the day", () => {
    expect([0, 3, 4, 10, 11, 14, 15, 17, 18, 23].map(greetingForHour)).toEqual([
      "Selamat malam", "Selamat malam", "Selamat pagi", "Selamat pagi", "Selamat siang", "Selamat siang",
      "Selamat sore", "Selamat sore", "Selamat malam", "Selamat malam",
    ]);
  });
});

describe("daySummary", () => {
  it("covers every combination of late / today / week", () => {
    expect(daySummary({ overdue: 3, today: 1, week: 4 })).toBe("3 task terlambat dan 1 untuk hari ini.");
    expect(daySummary({ overdue: 2, today: 0, week: 4 })).toMatch(/^2 task terlambat/);
    expect(daySummary({ overdue: 0, today: 2, week: 4 })).toBe("2 task untuk hari ini.");
    expect(daySummary({ overdue: 0, today: 0, week: 5 })).toMatch(/Hari ini kosong\. 5 task/);
    expect(daySummary({ overdue: 0, today: 0, week: 0 })).toMatch(/Tidak ada tenggat/);
  });
});

describe("pickFocus", () => {
  it("prefers in-progress, then priority, and returns null for nothing", () => {
    const tasks = [
      task("late-high", { priority: "high", due_date: "2026-10-01" }),
      task("doing", { status: "in_progress", priority: "low", due_date: "2026-10-11" }),
    ];
    expect(pickFocus(tasks)?.id).toBe("doing");
    expect(pickFocus([tasks[0]])?.id).toBe("late-high");
    expect(pickFocus([])).toBeNull();
  });
});

describe("weekDays", () => {
  it("lists seven days from today with per-day counts and marks today", () => {
    const days = weekDays("2026-10-11", [
      { due_date: "2026-10-11" }, { due_date: "2026-10-13" }, { due_date: "2026-10-13" },
      { due_date: "2026-10-30" }, { due_date: null },
    ]);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.date)[6]).toBe("2026-10-17");
    expect(days.map((d) => d.count)).toEqual([1, 0, 2, 0, 0, 0, 0]);
    expect(days[0]).toMatchObject({ isToday: true, day: 11, weekday: "Min" });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });
});

describe("projectColor", () => {
  it("is stable per id and stays inside the curated hues", () => {
    expect(projectHue("abc")).toBe(projectHue("abc"));
    expect([28, 78, 128, 172, 214, 262, 310, 352]).toContain(projectHue("b971be94-df5c-469a-a886-84e6460c1182"));
    expect(projectColor("x")).toMatch(/^oklch\(0\.78 0\.09 \d+\)$/);
  });
});
