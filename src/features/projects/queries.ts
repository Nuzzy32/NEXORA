import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  likePattern,
  NOTE_COLUMNS,
  PROJECT_COLUMNS,
  type Note,
  type NoteKind,
  type NoteKindFilter,
  type Project,
  type ProjectFilter,
  type ProjectWithCounts,
  type TaskCounts,
} from "./schema";
import type { TrackedItem } from "./tracking";

const NO_TASKS: TaskCounts = { open_count: 0, done_count: 0 };

async function taskCounts(supabase: SupabaseClient, projectIds: string[]) {
  const counts = new Map<string, TaskCounts>();
  if (projectIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("project_task_counts")
    .select("project_id,open_count,done_count")
    .in("project_id", projectIds)
    .overrideTypes<(TaskCounts & { project_id: string })[]>();
  if (error) throw new Error("Gagal memuat jumlah task.");
  for (const r of data) counts.set(r.project_id, { open_count: r.open_count, done_count: r.done_count });
  return counts;
}

/** Memoized per request: the sidebar and the Projects page share one load. */
export const listProjects = cache(async (filter: ProjectFilter): Promise<ProjectWithCounts[]> => {
  const { supabase } = await requireUser();
  let q = supabase.from("projects").select(PROJECT_COLUMNS);
  if (filter === "open") q = q.in("status", ["active", "on_hold"]);
  else if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(200).overrideTypes<Project[]>();
  if (error) throw new Error("Gagal memuat proyek.");
  const counts = await taskCounts(supabase, data.map((p) => p.id));
  return data.map((p) => ({ ...p, ...(counts.get(p.id) ?? NO_TASKS) }));
});

/** Returns null for an unknown id, a malformed id, or another user's project (RLS hides it). */
export async function getProject(id: string): Promise<ProjectWithCounts | null> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle<Project>();
  if (error) throw new Error("Gagal memuat proyek.");
  if (!data) return null;
  const counts = await taskCounts(supabase, [id]);
  return { ...data, ...(counts.get(id) ?? NO_TASKS) };
}

export async function countNotes(projectId: string): Promise<number> {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("project_notes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw new Error("Gagal memuat catatan.");
  return count ?? 0;
}

/** Notes of one project per kind, for the filter chips; `all` is the sum. */
export async function countNotesByKind(projectId: string): Promise<Record<NoteKindFilter, number>> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("project_notes")
    .select("kind")
    .eq("project_id", projectId)
    .limit(1000)
    .overrideTypes<{ kind: NoteKind }[]>();
  if (error) throw new Error("Gagal memuat catatan.");
  const counts: Record<NoteKindFilter, number> = { all: data.length, note: 0, decision: 0, milestone: 0, bug: 0, risk: 0 };
  for (const r of data) counts[r.kind] += 1;
  return counts;
}

/**
 * Every milestone and risk of the owner (RLS), for the Command Center cards.
 * ponytail: capped at 1000 rows, far above personal scale; move to a counting view if that ever binds.
 */
export async function listTrackedItems(): Promise<TrackedItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("project_notes")
    .select("project_id,kind,due_date,resolved_at")
    .in("kind", ["milestone", "risk"])
    .limit(1000)
    .overrideTypes<TrackedItem[]>();
  if (error) throw new Error("Gagal memuat milestone dan risiko.");
  return data;
}

export async function listNotes(projectId: string, filters: { q: string; kind: NoteKindFilter }): Promise<Note[]> {
  const { supabase } = await requireUser();
  let q = supabase.from("project_notes").select(NOTE_COLUMNS).eq("project_id", projectId);
  if (filters.kind !== "all") q = q.eq("kind", filters.kind);
  if (filters.q) q = q.ilike("search_text", likePattern(filters.q));
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(200).overrideTypes<Note[]>();
  if (error) throw new Error("Gagal memuat catatan.");
  return data;
}

export type RecentNote = { id: string; title: string; kind: NoteKind; project_id: string; updated_at: string };

/** Latest notes across all projects (dashboard rail). */
export async function listRecentNotes(limit = 3): Promise<RecentNote[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("project_notes")
    .select("id,title,kind,project_id,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit)
    .overrideTypes<RecentNote[]>();
  if (error) throw new Error("Gagal memuat catatan.");
  return data;
}
