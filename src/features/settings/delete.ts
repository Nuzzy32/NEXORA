import type { DeleteCategory } from "./schema";

// Pure description of what each "Hapus" removes. The action runs these steps through RLS in this order
// (children before parents); the integration test replays the same steps as SQL.

export type DataTable =
  | "projects"
  | "tasks"
  | "project_notes"
  | "memory_items"
  | "conversations"
  | "messages"
  | "daily_briefs"
  | "integration_syncs";

/** `key` is a column that is never null, because PostgREST wants a filter on every delete. `eq` narrows the rows. */
export type DeleteStep = { table: DataTable; key: "id" | "source"; eq?: readonly [column: string, value: string] };

const step = (table: DataTable, eq?: DeleteStep["eq"]): DeleteStep => ({ table, key: table === "integration_syncs" ? "source" : "id", eq });

export const DELETE_PLANS: Record<DeleteCategory, DeleteStep[]> = {
  memory: [step("memory_items")],
  // messages go first only so their count can be reported; deleting a conversation would cascade them anyway
  conversations: [step("messages"), step("conversations")],
  briefs: [step("daily_briefs")],
  elearning: [step("tasks", ["source", "elearning"])],
  all: [
    step("messages"),
    step("conversations"),
    step("memory_items"),
    step("project_notes"),
    step("tasks"),
    step("daily_briefs"),
    step("integration_syncs"),
    step("projects"),
  ],
};

/** After "Hapus semua" the settings row is reset (brief off, consent cleared). The row itself stays: the app role cannot delete it. */
export const SETTINGS_RESET = { brief_enabled: false, brief_consented_at: null, default_tasks_view: "calendar" } as const;

const LABEL: Record<DataTable, string> = {
  projects: "proyek",
  tasks: "task",
  project_notes: "catatan",
  memory_items: "memory",
  conversations: "percakapan",
  messages: "pesan",
  daily_briefs: "brief",
  integration_syncs: "status sinkron",
};

/** "3 proyek, 40 task"; zero counts are left out. Same wording for "will be deleted" and "was deleted". */
export function describeCounts(counts: Partial<Record<DataTable, number>>): string {
  const parts = (Object.keys(LABEL) as DataTable[])
    .filter((t) => (counts[t] ?? 0) > 0)
    .map((t) => `${new Intl.NumberFormat("id-ID").format(counts[t] ?? 0)} ${LABEL[t]}`);
  return parts.join(", ");
}

/** The rows a category would remove right now, read from the per-table counts (e-learning tasks are counted apart). */
export function countsFor(category: DeleteCategory, c: { tables: Record<DataTable, number>; elearningTasks: number }): Partial<Record<DataTable, number>> {
  const out: Partial<Record<DataTable, number>> = {};
  for (const s of DELETE_PLANS[category]) out[s.table] = s.eq ? c.elearningTasks : c.tables[s.table];
  return out;
}
