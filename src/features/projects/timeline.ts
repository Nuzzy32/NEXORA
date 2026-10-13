import type { Task } from "@/features/tasks/schema";
import { NOTE_KIND_LABEL, type Note, type Project } from "./schema";

// Project timeline (Phase 5): every dated thing the project already has, in date order, with "today" marked.
// Nothing is invented: undated tasks and notes are counted, not placed.

export type TimelineState = "done" | "overdue" | "upcoming";
export type TimelineEntry =
  | { kind: "today"; date: string }
  | { kind: "start" | "target"; date: string; label: string; state: TimelineState }
  | { kind: "milestone" | "bug" | "risk" | "task"; date: string; label: string; title: string; state: TimelineState; id: string };

const RANK: Record<TimelineEntry["kind"], number> = { start: 0, milestone: 1, risk: 2, bug: 3, task: 4, target: 5, today: 6 };

const stateOf = (done: boolean, date: string, today: string): TimelineState => (done ? "done" : date < today ? "overdue" : "upcoming");

export function buildTimeline(
  project: Pick<Project, "starts_on" | "due_on" | "status">,
  tasks: Pick<Task, "id" | "title" | "status" | "due_date">[],
  notes: Pick<Note, "id" | "kind" | "title" | "due_date" | "resolved_at">[],
  today: string,
): { entries: TimelineEntry[]; undated: number } {
  const entries: TimelineEntry[] = [];
  const finished = project.status === "completed";
  if (project.starts_on) entries.push({ kind: "start", date: project.starts_on, label: "Mulai", state: project.starts_on <= today ? "done" : "upcoming" });
  if (project.due_on) entries.push({ kind: "target", date: project.due_on, label: "Target selesai", state: stateOf(finished, project.due_on, today) });
  for (const n of notes) {
    if ((n.kind === "milestone" || n.kind === "bug" || n.kind === "risk") && n.due_date) {
      entries.push({ kind: n.kind, date: n.due_date, label: NOTE_KIND_LABEL[n.kind], title: n.title, state: stateOf(n.resolved_at !== null, n.due_date, today), id: n.id });
    }
  }
  for (const t of tasks) {
    if (t.due_date) entries.push({ kind: "task", date: t.due_date, label: "Task", title: t.title, state: stateOf(t.status === "done", t.due_date, today), id: t.id });
  }
  const undated =
    tasks.filter((t) => !t.due_date).length +
    notes.filter((n) => (n.kind === "milestone" || n.kind === "bug" || n.kind === "risk") && !n.due_date).length;
  if (entries.length > 0) entries.push({ kind: "today", date: today });
  entries.sort((a, b) => a.date.localeCompare(b.date) || RANK[a.kind] - RANK[b.kind]);
  return { entries, undated };
}

/** "2026-10" groups for month headings, in order. */
export function byMonth(entries: TimelineEntry[]): [string, TimelineEntry[]][] {
  const groups = new Map<string, TimelineEntry[]>();
  for (const e of entries) groups.set(e.date.slice(0, 7), [...(groups.get(e.date.slice(0, 7)) ?? []), e]);
  return [...groups];
}
