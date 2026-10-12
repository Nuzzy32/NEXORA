"use server";

import { z } from "zod";
import { PROJECT_STATUS_LABEL, type NoteKind, type ProjectStatus } from "@/features/projects/schema";
import type { TaskStatus } from "@/features/tasks/schema";
import { requireUser } from "@/lib/auth/session";
import { likePattern, searchTerm } from "@/lib/search";
import {
  EMPTY_RESULTS,
  MIN_QUERY_LENGTH,
  noteHref,
  projectHref,
  RESULT_LIMIT,
  taskHref,
  type SearchResults,
} from "./schema";

type TaskRow = { id: string; title: string; status: TaskStatus; project_id: string | null };
type ProjectRow = { id: string; name: string; status: ProjectStatus };
type NoteRow = { id: string; title: string; kind: NoteKind; project_id: string };

// Anything longer is not a real query; searchTerm still caps what reaches the database at 100 characters.
const queryInput = z.string().max(1000);

/** Command-palette search over tasks, projects and project notes: at most five of each, newest first. */
export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const { supabase } = await requireUser();
  const input = queryInput.safeParse(rawQuery);
  const term = input.success ? searchTerm(input.data) : "";
  if (term.length < MIN_QUERY_LENGTH) return EMPTY_RESULTS;

  // RLS scopes every query to the caller's rows.
  const pattern = likePattern(term);
  const [tasks, projects, notes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,status,project_id")
      .ilike("title", pattern)
      .order("updated_at", { ascending: false })
      .limit(RESULT_LIMIT)
      .overrideTypes<TaskRow[]>(),
    supabase
      .from("projects")
      .select("id,name,status")
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(RESULT_LIMIT)
      .overrideTypes<ProjectRow[]>(),
    supabase
      .from("project_notes")
      .select("id,title,kind,project_id")
      .ilike("search_text", pattern)
      .order("updated_at", { ascending: false })
      .limit(RESULT_LIMIT)
      .overrideTypes<NoteRow[]>(),
  ]);
  if (tasks.error || projects.error || notes.error) throw new Error("Pencarian gagal.");

  // One extra lookup (at most ten ids) beats relying on a PostgREST embed over the composite (project_id, user_id) FK.
  const projectIds = [...new Set([...tasks.data, ...notes.data].flatMap((r) => (r.project_id ? [r.project_id] : [])))];
  const names = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id,name")
      .in("id", projectIds)
      .overrideTypes<{ id: string; name: string }[]>();
    if (error) throw new Error("Pencarian gagal.");
    for (const p of data) names.set(p.id, p.name);
  }
  const projectName = (id: string | null) => (id === null ? undefined : names.get(id));

  return {
    tasks: tasks.data.map((t) => ({
      id: t.id,
      kind: "task",
      title: t.title,
      hint: projectName(t.project_id),
      href: taskHref(t.title),
    })),
    projects: projects.data.map((p) => ({
      id: p.id,
      kind: "project",
      title: p.name,
      hint: PROJECT_STATUS_LABEL[p.status],
      href: projectHref(p.id),
    })),
    notes: notes.data.map((n) => ({
      id: n.id,
      kind: "note",
      title: n.title,
      hint: projectName(n.project_id),
      href: noteHref(n.project_id, term),
    })),
  };
}
