import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { taskCounts } from "@/features/projects/queries";
import { PROJECT_COLUMNS, type Project, type ProjectWithCounts } from "@/features/projects/schema";
import { requireUser } from "@/lib/auth/session";
import { addDays, todayISO } from "@/lib/date";
import {
  buildBriefInput,
  COURSEWORK_DAYS,
  MAX_PROJECTS,
  type BriefInput,
  type RawCoursework,
  type RawDecision,
  type RawDone,
  type RawTask,
} from "./input";
import { BRIEF_COLUMNS, type StoredBrief } from "./schema";

export type BriefState =
  | { status: "error" }
  | { status: "ok"; today: string; enabled: boolean; brief: StoredBrief | null };

/** Opt-in flag and today's stored brief. A query failure becomes `error` so the dashboard still renders around the card. */
export async function getBriefState(): Promise<BriefState> {
  const { supabase } = await requireUser();
  const today = todayISO();
  const [settings, brief] = await Promise.all([
    supabase.from("owner_settings").select("brief_enabled").maybeSingle<{ brief_enabled: boolean }>(),
    supabase.from("daily_briefs").select(BRIEF_COLUMNS).eq("brief_date", today).maybeSingle<StoredBrief>(),
  ]);
  if (settings.error || brief.error) return { status: "error" };
  return { status: "ok", today, enabled: settings.data?.brief_enabled ?? false, brief: brief.data };
}

const UNDEFINED_COLUMN = "42703";

/**
 * Loads exactly the rows the brief is built from, then builds the model input. Titles, statuses, dates and counts only:
 * note bodies, descriptions and memory are never selected.
 * `userId` is applied to every query on purpose: the cron job calls this with a service-role client that bypasses RLS,
 * so the filter, not RLS, is what keeps the read to one owner. In the signed-in path RLS says the same thing twice.
 */
export async function loadBriefInputFor(supabase: SupabaseClient, userId: string, today: string): Promise<BriefInput> {
  const { data: rows, error: projectError } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("user_id", userId)
    .in("status", ["active", "on_hold"])
    .order("updated_at", { ascending: false })
    .limit(200)
    .overrideTypes<Project[]>();
  if (projectError) throw new Error("Gagal memuat data brief.");
  const counts = await taskCounts(supabase, rows.map((p) => p.id));
  const projects: ProjectWithCounts[] = rows.map((p) => ({ ...p, ...(counts.get(p.id) ?? { open_count: 0, done_count: 0 }) }));
  const ids = projects.slice(0, MAX_PROJECTS).map((p) => p.id);

  const none = { data: [], error: null };
  const [open, done, decisions, coursework] = await Promise.all([
    ids.length === 0
      ? none
      : supabase
          .from("tasks")
          .select("project_id,title,status,priority,due_date,updated_at")
          .eq("user_id", userId)
          .in("project_id", ids)
          .neq("status", "done")
          .limit(1000)
          .overrideTypes<RawTask[]>(),
    ids.length === 0
      ? none
      : supabase
          .from("tasks")
          .select("project_id,completed_at")
          .eq("user_id", userId)
          .in("project_id", ids)
          .eq("status", "done")
          .order("completed_at", { ascending: false })
          .limit(200)
          .overrideTypes<RawDone[]>(),
    ids.length === 0
      ? none
      : supabase
          .from("project_notes")
          .select("project_id,title,updated_at")
          .eq("user_id", userId)
          .eq("kind", "decision")
          .in("project_id", ids)
          .order("updated_at", { ascending: false })
          .limit(100)
          .overrideTypes<RawDecision[]>(),
    // Coursework from the e-learning sync: overdue up to 30 days back, due within the next 14.
    supabase
      .from("tasks")
      .select("title,due_date")
      .eq("user_id", userId)
      .eq("source", "elearning")
      .neq("status", "done")
      .gte("due_date", addDays(today, -30))
      .lte("due_date", addDays(today, COURSEWORK_DAYS))
      .order("due_date", { ascending: true })
      .limit(20)
      .overrideTypes<RawCoursework[]>(),
  ]);
  if (open.error || done.error || decisions.error) throw new Error("Gagal memuat data brief.");
  // Until the e-learning migration (tasks.source) is applied there is simply no coursework.
  if (coursework.error && coursework.error.code !== UNDEFINED_COLUMN) throw new Error("Gagal memuat data brief.");

  return buildBriefInput({
    today,
    projects,
    openTasks: open.data,
    recentDone: done.data,
    decisions: decisions.data,
    coursework: coursework.error ? [] : coursework.data,
  });
}

/** The signed-in owner's input (RLS applies on top of the explicit user filter). */
export async function loadBriefInput(): Promise<BriefInput> {
  const { user, supabase } = await requireUser();
  return loadBriefInputFor(supabase, user.id, todayISO());
}
