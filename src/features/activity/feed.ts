// Recent activity across the workspace (DASH-06), built only from timestamps the rows already carry.
// No event log: an item shows its latest state ("diperbarui" when it changed after creation).

export type ActivityKind = "task_done" | "task_new" | "project" | "note" | "memory" | "document";
export type ActivityItem = { key: string; kind: ActivityKind; verb: string; title: string; href: string; at: string };

export type ActivitySources = {
  doneTasks: { id: string; title: string; completed_at: string }[];
  newTasks: { id: string; title: string; created_at: string }[];
  projects: { id: string; name: string; created_at: string; updated_at: string }[];
  notes: { id: string; title: string; project_id: string; created_at: string; updated_at: string }[];
  memory: { id: string; title: string; created_at: string; updated_at: string }[];
  documents: { id: string; title: string; created_at: string }[];
};

/** Edits within a minute of creation still count as "added". */
const edited = (created: string, updated: string) => Date.parse(updated) - Date.parse(created) > 60_000;

/** Newest first, at most `limit`. */
export function buildActivity(s: ActivitySources, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [
    ...s.doneTasks.map((t) => ({ key: `done:${t.id}`, kind: "task_done" as const, verb: "Task selesai", title: t.title, href: "/tasks?view=list&status=done", at: t.completed_at })),
    ...s.newTasks.map((t) => ({ key: `task:${t.id}`, kind: "task_new" as const, verb: "Task dibuat", title: t.title, href: "/tasks?view=list", at: t.created_at })),
    ...s.projects.map((p) => ({
      key: `project:${p.id}`,
      kind: "project" as const,
      verb: edited(p.created_at, p.updated_at) ? "Proyek diperbarui" : "Proyek dibuat",
      title: p.name,
      href: `/projects/${p.id}`,
      at: p.updated_at,
    })),
    ...s.notes.map((n) => ({
      key: `note:${n.id}`,
      kind: "note" as const,
      verb: edited(n.created_at, n.updated_at) ? "Catatan diperbarui" : "Catatan ditambahkan",
      title: n.title,
      href: `/projects/${n.project_id}?tab=notes`,
      at: n.updated_at,
    })),
    ...s.memory.map((m) => ({
      key: `memory:${m.id}`,
      kind: "memory" as const,
      verb: edited(m.created_at, m.updated_at) ? "Memory diperbarui" : "Memory disimpan",
      title: m.title,
      href: "/memory",
      at: m.updated_at,
    })),
    ...s.documents.map((d) => ({ key: `doc:${d.id}`, kind: "document" as const, verb: "PDF diunggah", title: d.title, href: `/learning/${d.id}`, at: d.created_at })),
  ];
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
