import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { likePattern } from "@/lib/search";
import { addDays, localDate, todayISO } from "@/lib/date";
import {
  PRIORITY_RANK,
  sortByFocus,
  sortChronological,
  TASK_COLUMNS,
  type PriorityFilter,
  type ProjectOption,
  type StatusFilter,
  type Task,
} from "./schema";

export async function listTasks(filters: {
  status: StatusFilter;
  priority: PriorityFilter;
  projectId?: string;
  q?: string;
  due?: string;
  /** Due date range, inclusive (the calendar's visible weeks). */
  from?: string;
  to?: string;
  /** Only tasks without a due date. */
  undated?: boolean;
}) {
  const { supabase } = await requireUser();
  let q = supabase.from("tasks").select(TASK_COLUMNS);
  if (filters.status === "open") q = q.neq("status", "done");
  else if (filters.status === "overdue") q = q.neq("status", "done").lt("due_date", todayISO());
  else if (filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.priority !== "all") q = q.eq("priority", filters.priority);
  if (filters.projectId) q = q.eq("project_id", filters.projectId);
  if (filters.q) q = q.ilike("title", likePattern(filters.q));
  if (filters.due) q = q.eq("due_date", filters.due);
  if (filters.from) q = q.gte("due_date", filters.from);
  if (filters.to) q = q.lte("due_date", filters.to);
  if (filters.undated) q = q.is("due_date", null);

  const { data, error } = await q
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .overrideTypes<Task[]>();
  if (error) throw new Error("Gagal memuat task.");
  // Open tasks first, then by priority; the SQL order (due date) is kept within a group.
  return data.toSorted(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

/** Open tasks that have a due date, bucketed for the dashboard (DASH-01), plus how many were finished today. */
export async function getDashboardTasks() {
  const { supabase } = await requireUser();
  const today = todayISO();
  const horizon = addDays(today, 7);
  const [open, done] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .neq("status", "done")
      .not("due_date", "is", null)
      .lte("due_date", horizon)
      .order("due_date", { ascending: true })
      .limit(200)
      .overrideTypes<Task[]>(),
    // Completion time is a timestamp: fetch the last two days and keep today's by the app timezone.
    supabase
      .from("tasks")
      .select("completed_at")
      .eq("status", "done")
      .gte("completed_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
      .limit(200)
      .overrideTypes<{ completed_at: string }[]>(),
  ]);
  if (open.error || done.error) throw new Error("Gagal memuat dashboard.");
  const data = open.data;
  return {
    today,
    overdue: sortByFocus(data.filter((t) => t.due_date! < today)),
    dueToday: sortByFocus(data.filter((t) => t.due_date === today)),
    upcoming: sortChronological(data.filter((t) => t.due_date! > today)),
    doneToday: done.data.filter((t) => localDate(t.completed_at) === today).length,
  };
}

/** Memoized per request: a page header and the page body can both ask without two queries. */
export const listProjectOptions = cache(async (): Promise<ProjectOption[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,status")
    .order("name")
    .limit(500)
    .overrideTypes<{ id: string; name: string; status: string }[]>();
  if (error) throw new Error("Gagal memuat proyek.");
  return data.map((p) => ({ id: p.id, name: p.name, archived: p.status === "archived" }));
});
