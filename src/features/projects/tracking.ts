import type { Note, NoteKind, ProjectWithCounts } from "./schema";

/** The columns the aggregates need from a milestone or risk row. */
export type TrackedItem = { project_id: string; kind: NoteKind; due_date: string | null; resolved_at: string | null };

/** Open (not done) and past its due date, by calendar day. */
export const isOverdue = (n: Pick<Note, "due_date" | "resolved_at">, today: string) =>
  n.resolved_at === null && n.due_date !== null && n.due_date < today;

/** Open items first, earliest due date first (undated last), then done ones. Does not mutate. */
export function sortTracked<T extends Pick<Note, "due_date" | "resolved_at">>(items: readonly T[]): T[] {
  const rank = (n: T) => (n.resolved_at === null ? 0 : 1);
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"),
  );
}

/** Milestones not done yet, nearest due date first, at most `limit`. */
export const nextMilestones = (notes: readonly Note[], limit = 3) =>
  sortTracked(notes.filter((n) => n.kind === "milestone" && n.resolved_at === null)).slice(0, limit);

export const openRisks = (notes: readonly Note[]) =>
  sortTracked(notes.filter((n) => n.kind === "risk" && n.resolved_at === null));

export const milestoneProgress = (notes: readonly Pick<Note, "kind" | "resolved_at">[]) => {
  const ms = notes.filter((n) => n.kind === "milestone");
  return { done: ms.filter((n) => n.resolved_at !== null).length, total: ms.length };
};

/** Running = active or on hold, the same meaning as the "Berjalan" filter. */
export const isRunning = (p: Pick<ProjectWithCounts, "status">) => p.status === "active" || p.status === "on_hold";

/** Milestone and risk totals over the given projects only (a completed or archived project's items do not count). */
export function trackingStats(items: readonly TrackedItem[], projects: readonly Pick<ProjectWithCounts, "id" | "status">[]) {
  const running = new Set(projects.filter(isRunning).map((p) => p.id));
  const mine = items.filter((i) => running.has(i.project_id));
  const milestones = mine.filter((i) => i.kind === "milestone");
  const risks = mine.filter((i) => i.kind === "risk");
  return {
    milestonesTotal: milestones.length,
    milestonesDone: milestones.filter((i) => i.resolved_at !== null).length,
    risksTotal: risks.length,
    risksOpen: risks.filter((i) => i.resolved_at === null).length,
  };
}
export type TrackingStats = ReturnType<typeof trackingStats>;

/** Open risks per project, for the badge on a project card. Projects without any are absent. */
export function openRisksByProject(items: readonly TrackedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const i of items) {
    if (i.kind === "risk" && i.resolved_at === null) counts.set(i.project_id, (counts.get(i.project_id) ?? 0) + 1);
  }
  return counts;
}
