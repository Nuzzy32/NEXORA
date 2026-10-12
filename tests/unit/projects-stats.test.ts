import { describe, expect, it } from "vitest";
import type { ProjectWithCounts } from "@/features/projects/schema";
import { projectStats, updatedAgo } from "@/features/projects/stats";

const project = (status: ProjectWithCounts["status"], open_count: number, done_count: number): ProjectWithCounts => ({
  id: status + open_count, name: "p", summary: null, status, starts_on: null, due_on: null,
  updated_at: "2026-10-10T00:00:00Z", open_count, done_count,
});

describe("projectStats", () => {
  it("counts active projects and tasks, ignoring archived ones", () => {
    const s = projectStats([project("active", 3, 1), project("on_hold", 1, 1), project("completed", 0, 5), project("archived", 9, 9)]);
    expect(s).toEqual({ projects: 3, active: 1, open: 4, done: 7, total: 11, donePct: 64 });
  });

  it("is all zeros with no projects", () => {
    expect(projectStats([])).toEqual({ projects: 0, active: 0, open: 0, done: 0, total: 0, donePct: 0 });
  });
});

describe("updatedAgo", () => {
  const today = "2026-10-11";
  it("uses days relative to today in the app timezone", () => {
    expect(updatedAgo("2026-10-11T03:00:00Z", today)).toBe("hari ini");
    expect(updatedAgo("2026-10-10T10:00:00Z", today)).toBe("kemarin");
    expect(updatedAgo("2026-10-08T10:00:00Z", today)).toBe("3 hari lalu");
    expect(updatedAgo("2026-08-01T10:00:00Z", today)).toBe("1 Agu");
  });
});
