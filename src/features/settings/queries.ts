import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import type { DataTable } from "./delete";
import { buildExport, EXPORT_ORDER, EXPORT_TABLES, readAll, type ExportTable, type Row, type TableRead } from "./export";
import { TASKS_VIEWS, type TasksView } from "./schema";

export type OwnerSettings = {
  briefEnabled: boolean;
  briefConsentedAt: string | null;
  chatEnabled: boolean;
  chatConsentedAt: string | null;
  tasksView: TasksView;
};

/** One read per request shared by the preferences, the brief status and the Tasks page. `null` means the query failed. */
export const getOwnerSettings = cache(async (): Promise<OwnerSettings | null> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("owner_settings")
    .select("brief_enabled,brief_consented_at,chat_enabled,chat_consented_at,default_tasks_view")
    .maybeSingle<{
      brief_enabled: boolean;
      brief_consented_at: string | null;
      chat_enabled: boolean;
      chat_consented_at: string | null;
      default_tasks_view: TasksView;
    }>();
  if (error) return null;
  return {
    briefEnabled: data?.brief_enabled ?? false,
    briefConsentedAt: data?.brief_consented_at ?? null,
    chatEnabled: data?.chat_enabled ?? false,
    chatConsentedAt: data?.chat_consented_at ?? null,
    tasksView: data && TASKS_VIEWS.includes(data.default_tasks_view) ? data.default_tasks_view : "calendar",
  };
});

/** The saved default for /tasks. Falls back to the calendar if the row is missing or unreadable. */
export async function getTasksViewPref(): Promise<TasksView> {
  return (await getOwnerSettings())?.tasksView ?? "calendar";
}

export type DataCounts = { tables: Record<DataTable, number>; elearningTasks: number };

const COUNTED: DataTable[] = [
  "projects",
  "tasks",
  "project_notes",
  "memory_items",
  "conversations",
  "messages",
  "daily_briefs",
  "integration_syncs",
  "documents",
  "flashcards",
];

/** Row counts shown in the delete dialogs. `null` when any count fails, so the page says so instead of showing zeros. */
export async function getDataCounts(): Promise<DataCounts | null> {
  const { supabase } = await requireUser();
  const [tables, elearning] = await Promise.all([
    Promise.all(COUNTED.map((t) => supabase.from(t).select("*", { count: "exact", head: true }))),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("source", "elearning"),
  ]);
  if (elearning.error || tables.some((r) => r.error)) return null;
  return {
    tables: Object.fromEntries(COUNTED.map((t, i) => [t, tables[i].count ?? 0])) as Record<DataTable, number>,
    elearningTasks: elearning.count ?? 0,
  };
}

/** Everything the signed-in owner can read (RLS), paged. Throws on any query failure rather than exporting a partial file. */
export async function loadExport(now: Date) {
  const { supabase } = await requireUser();
  const reads = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      const read = await readAll(async (from, to) => {
        const { data, error } = await supabase.from(table).select("*").order(EXPORT_ORDER[table]).range(from, to).overrideTypes<Row[]>();
        if (error) throw new Error(`Ekspor gagal membaca ${table}.`);
        return data;
      });
      return [table, read] as const;
    }),
  );
  return buildExport(now, Object.fromEntries(reads) as Record<ExportTable, TableRead>);
}
