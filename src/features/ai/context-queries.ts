import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MemoryCategory } from "@/features/memory/schema";
import type { TaskPriority, TaskStatus } from "@/features/tasks/schema";
import { requireUser } from "@/lib/auth/session";
import { buildContextBundle, EMPTY_BUNDLE, type ContextBundle, type MemorySource, type ProjectSource } from "./context-bundle";
import type { ContextCandidates, ContextKind, ContextRef } from "./schema";

/** A pick as stored for a conversation, oldest first. RLS limits it to the caller's rows. */
export async function listContextRefs(supabase: SupabaseClient, conversationId: string): Promise<ContextRef[]> {
  const { data, error } = await supabase
    .from("conversation_context")
    .select("kind,ref_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<{ kind: ContextKind; ref_id: string }[]>();
  if (error) throw new Error("Gagal memuat konteks.");
  return data.map((r) => ({ kind: r.kind, id: r.ref_id }));
}

async function loadMemory(supabase: SupabaseClient, ids: string[]): Promise<MemorySource[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("memory_items")
    .select("id,title,content,category,tags")
    .in("id", ids)
    .overrideTypes<{ id: string; title: string; content: string; category: MemoryCategory; tags: string[] }[], { merge: false }>();
  if (error) throw new Error("Gagal memuat memory.");
  return data;
}

type ProjectRow = Omit<ProjectSource, "open_count" | "done_count" | "open_tasks" | "decision_titles">;
type TaskRow = { project_id: string; title: string; status: TaskStatus; priority: TaskPriority; due_date: string | null };

/** Project fields, task counts, open tasks and decision NOTE TITLES. Note bodies and task descriptions are never selected. */
async function loadProjects(supabase: SupabaseClient, ids: string[]): Promise<ProjectSource[]> {
  if (ids.length === 0) return [];
  const [projects, counts, tasks, decisions] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,summary,starts_on,due_on")
      .in("id", ids)
      .overrideTypes<ProjectRow[], { merge: false }>(),
    supabase
      .from("project_task_counts")
      .select("project_id,open_count,done_count")
      .in("project_id", ids)
      .overrideTypes<{ project_id: string; open_count: number; done_count: number }[]>(),
    supabase
      .from("tasks")
      .select("project_id,title,status,priority,due_date")
      .in("project_id", ids)
      .neq("status", "done")
      .limit(500)
      .overrideTypes<TaskRow[]>(),
    supabase
      .from("project_notes")
      .select("project_id,title")
      .eq("kind", "decision")
      .in("project_id", ids)
      .order("updated_at", { ascending: false })
      .limit(100)
      .overrideTypes<{ project_id: string; title: string }[]>(),
  ]);
  if (projects.error || counts.error || tasks.error || decisions.error) throw new Error("Gagal memuat proyek.");
  return projects.data.map((p) => {
    const c = counts.data.find((r) => r.project_id === p.id);
    return {
      ...p,
      open_count: c?.open_count ?? 0,
      done_count: c?.done_count ?? 0,
      open_tasks: tasks.data.filter((t) => t.project_id === p.id),
      decision_titles: decisions.data.filter((d) => d.project_id === p.id).map((d) => d.title),
    };
  });
}

/**
 * The bundle for a conversation, read fresh from the database: an edited memory item is current, a deleted one is
 * skipped. Both the page (Inspector) and the send actions call this, so what is shown is what is sent.
 */
export async function loadContextBundle(supabase: SupabaseClient, conversationId: string): Promise<ContextBundle> {
  if (!z.uuid().safeParse(conversationId).success) return EMPTY_BUNDLE;
  const refs = await listContextRefs(supabase, conversationId);
  if (refs.length === 0) return EMPTY_BUNDLE;
  const idsOf = (kind: ContextKind) => refs.filter((r) => r.kind === kind).map((r) => r.id);
  const [memory, projects] = await Promise.all([loadMemory(supabase, idsOf("memory")), loadProjects(supabase, idsOf("project"))]);
  return buildContextBundle(refs, { memory, projects });
}

/** Of the given refs, the ones that exist and belong to the caller (RLS plus the explicit filter in the query). */
export async function findOwnedRefs(supabase: SupabaseClient, refs: readonly ContextRef[]): Promise<Set<string>> {
  const ids = (kind: ContextKind) => refs.filter((r) => r.kind === kind).map((r) => r.id);
  const found = (table: "memory_items" | "projects", list: string[]) =>
    list.length === 0
      ? Promise.resolve({ data: [] as { id: string }[], error: null })
      : supabase.from(table).select("id").in("id", list).overrideTypes<{ id: string }[]>();
  const [memory, projects] = await Promise.all([found("memory_items", ids("memory")), found("projects", ids("project"))]);
  if (memory.error || projects.error) throw new Error("Gagal memeriksa item konteks.");
  return new Set([...memory.data.map((r) => `memory:${r.id}`), ...projects.data.map((r) => `project:${r.id}`)]);
}

/** What the picker can offer: titles only, newest first (memory: pinned first). Nothing here is sent anywhere. */
export async function listContextCandidates(): Promise<ContextCandidates> {
  const { supabase } = await requireUser();
  const [memory, projects] = await Promise.all([
    supabase
      .from("memory_items")
      .select("id,title,category,pinned")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200)
      .overrideTypes<ContextCandidates["memory"]>(),
    supabase
      .from("projects")
      .select("id,name,status")
      .order("updated_at", { ascending: false })
      .limit(200)
      .overrideTypes<ContextCandidates["projects"]>(),
  ]);
  if (memory.error || projects.error) throw new Error("Gagal memuat daftar konteks.");
  return { memory: memory.data, projects: projects.data };
}

/** The bundle for the page's active conversation. */
export async function getContextBundle(conversationId: string): Promise<ContextBundle> {
  const { supabase } = await requireUser();
  return loadContextBundle(supabase, conversationId);
}
