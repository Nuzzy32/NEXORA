import { describe, expect, it } from "vitest";
import {
  buildBriefInput,
  clean,
  isInputEmpty,
  MAX_INPUT_CHARS,
  MAX_PROJECTS,
  serializeBriefInput,
  type BriefSource,
  type RawDecision,
  type RawTask,
} from "@/features/brief/input";
import type { ProjectWithCounts } from "@/features/projects/schema";

const TODAY = "2026-10-11";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const pid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const project = (n: number, o: Partial<ProjectWithCounts> = {}): ProjectWithCounts => ({
  id: pid(n),
  name: `Proyek ${n}`,
  summary: "RINGKASAN PANJANG YANG TIDAK BOLEH IKUT",
  status: "active",
  starts_on: "2026-09-01",
  due_on: "2026-12-01",
  updated_at: "2026-10-09T03:00:00Z",
  open_count: 0,
  done_count: 0,
  ...o,
});
const task = (n: number, o: Partial<RawTask> = {}): RawTask => ({
  project_id: pid(n),
  title: "Task",
  status: "todo",
  priority: "medium",
  due_date: null,
  updated_at: "2026-10-08T03:00:00Z",
  ...o,
});
const source = (o: Partial<BriefSource> = {}): BriefSource => ({
  today: TODAY,
  projects: [],
  openTasks: [],
  recentDone: [],
  decisions: [],
  coursework: [],
  ...o,
});

describe("buildBriefInput", () => {
  it("summarizes a project: counts, overdue, last activity, top tasks by importance, newest decisions", () => {
    const openTasks = [
      task(1, { title: "Rendah", priority: "low" }),
      task(1, { title: "Terlambat tinggi", priority: "high", due_date: "2026-10-05" }),
      task(1, { title: "Sedang berjalan", status: "in_progress", priority: "medium", due_date: "2026-10-20" }),
      task(1, { title: "Tinggi besok", priority: "high", due_date: "2026-10-12" }),
    ];
    const decisions: RawDecision[] = [
      { project_id: pid(1), title: "K1", updated_at: "2026-10-01T00:00:00Z" },
      { project_id: pid(1), title: "K2", updated_at: "2026-10-02T00:00:00Z" },
      { project_id: pid(1), title: "K3", updated_at: "2026-10-03T00:00:00Z" },
      { project_id: pid(1), title: "K4", updated_at: "2026-10-04T00:00:00Z" },
      { project_id: pid(2), title: "Milik proyek lain", updated_at: "2026-10-04T00:00:00Z" },
    ];
    const input = buildBriefInput(
      source({
        projects: [project(1, { open_count: 4, done_count: 6 })],
        openTasks,
        decisions,
        recentDone: [{ project_id: pid(1), completed_at: "2026-10-10T05:00:00Z" }],
      }),
    );
    const [p] = input.projects;
    expect(p).toMatchObject({ name: "Proyek 1", tasks_open: 4, tasks_done: 6, tasks_overdue: 1, last_activity: "2026-10-10", days_since_activity: 1 });
    expect(p.top_open_tasks.map((t) => t.title)).toEqual(["Sedang berjalan", "Terlambat tinggi", "Tinggi besok", "Rendah"]);
    expect(p.top_open_tasks[1]).toMatchObject({ due: "2026-10-05", due_in_days: -6 });
    expect(p.recent_decision_titles).toEqual(["K4", "K3", "K2"]);
    expect(input.note).toBeUndefined();
  });

  it("never carries ids, emails, summaries or note bodies, and scrubs them from titles", () => {
    const email = "pemilik@example.com";
    const secretBody = "ISI-CATATAN-RAHASIA";
    // Rows as the database could return them, with extra columns: only the allow-listed fields may survive.
    const decisions = [{ project_id: pid(1), title: `Pilih Supabase ${email}`, updated_at: "2026-10-04T00:00:00Z", body: secretBody, id: pid(99) }];
    const openTasks = [{ ...task(1, { title: `Kirim ke ${pid(7)} sekarang` }), description: "DESKRIPSI-PANJANG", id: pid(98) }];
    const memory = { title: "MEMORY-RAHASIA" };
    const text = serializeBriefInput(
      buildBriefInput(source({ projects: [project(1)], openTasks, decisions, coursework: [{ title: "Tugas", due_date: "2026-10-13" }] })),
    );
    expect(text).not.toMatch(UUID_RE);
    expect(text).not.toContain("@");
    expect(text).not.toContain(email);
    for (const forbidden of [secretBody, "DESKRIPSI-PANJANG", "RINGKASAN PANJANG", memory.title, "user_id"]) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain("[email]");
    expect(text).toContain("[id]");
  });

  it("includes at most 10 projects and says so", () => {
    const projects = Array.from({ length: 13 }, (_, i) => project(i + 1));
    const input = buildBriefInput(source({ projects }));
    expect(input.projects).toHaveLength(MAX_PROJECTS);
    expect(input.note).toMatch(/dipotong/);
  });

  it("clips long titles and flags it", () => {
    const input = buildBriefInput(source({ projects: [project(1)], openTasks: [task(1, { title: "x".repeat(500) })] }));
    expect(input.projects[0].top_open_tasks[0].title).toHaveLength(100);
    expect(input.projects[0].top_open_tasks[0].title.endsWith("…")).toBe(true);
    expect(input.note).toMatch(/dipotong/);
  });

  it("shrinks oversized data to fit MAX_INPUT_CHARS and says so", () => {
    const projects = Array.from({ length: 10 }, (_, i) => project(i + 1, { name: "N".repeat(80), open_count: 6 }));
    const openTasks = projects.flatMap((p, i) =>
      Array.from({ length: 8 }, (_, k) => task(i + 1, { title: `${"T".repeat(98)}${k}`, priority: "high", due_date: "2026-10-20" })),
    );
    const decisions = projects.flatMap((p, i) =>
      Array.from({ length: 4 }, (_, k): RawDecision => ({ project_id: pid(i + 1), title: "D".repeat(99) + k, updated_at: `2026-10-0${k + 1}T00:00:00Z` })),
    );
    const coursework = Array.from({ length: 25 }, (_, k) => ({ title: "K".repeat(100), due_date: "2026-10-1" + (k % 4) }));
    const input = buildBriefInput(source({ projects, openTasks, decisions, coursework }));
    expect(serializeBriefInput(input).length).toBeLessThanOrEqual(MAX_INPUT_CHARS);
    expect(input.note).toMatch(/dipotong/);
    expect(input.projects.length).toBeGreaterThan(0);
  });

  it("keeps coursework due within 14 days (overdue included), soonest first, with day offsets", () => {
    const input = buildBriefInput(
      source({
        coursework: [
          { title: "Jauh", due_date: "2026-11-30" },
          { title: "Lusa", due_date: "2026-10-12" },
          { title: "Sudah lewat", due_date: "2026-10-09" },
          { title: "Batas", due_date: "2026-10-25" },
        ],
      }),
    );
    expect(input.coursework_due_soon).toEqual([
      { title: "Sudah lewat", due: "2026-10-09", due_in_days: -2 },
      { title: "Lusa", due: "2026-10-12", due_in_days: 1 },
      { title: "Batas", due: "2026-10-25", due_in_days: 14 },
    ]);
  });

  it("is deterministic and reports emptiness", () => {
    const src = source({ projects: [project(1)], openTasks: [task(1)] });
    expect(serializeBriefInput(buildBriefInput(src))).toBe(serializeBriefInput(buildBriefInput(src)));
    expect(isInputEmpty(buildBriefInput(source()))).toBe(true);
    expect(isInputEmpty(buildBriefInput(src))).toBe(false);
  });
});

describe("clean", () => {
  it("collapses whitespace and control characters", () => {
    expect(clean("a\n\t b\u0000  c", 50)).toEqual({ text: "a b c", clipped: false });
  });
});
