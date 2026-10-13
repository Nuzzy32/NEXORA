import "server-only";
import { requireUser } from "@/lib/auth/session";
import { buildActivity, type ActivityItem, type ActivitySources } from "./feed";

const N = 8;

/** The latest few rows of each source (RLS), merged. Imported e-learning tasks are left out: one sync would flood the list. */
export async function listActivity(): Promise<ActivityItem[]> {
  const { supabase } = await requireUser();
  const [doneTasks, newTasks, projects, notes, memory, documents] = await Promise.all([
    supabase.from("tasks").select("id,title,completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(N),
    supabase.from("tasks").select("id,title,created_at").is("source", null).order("created_at", { ascending: false }).limit(N),
    supabase.from("projects").select("id,name,created_at,updated_at").order("updated_at", { ascending: false }).limit(N),
    supabase.from("project_notes").select("id,title,project_id,created_at,updated_at").order("updated_at", { ascending: false }).limit(N),
    supabase.from("memory_items").select("id,title,created_at,updated_at").order("updated_at", { ascending: false }).limit(N),
    supabase.from("documents").select("id,title,created_at").eq("status", "ready").order("created_at", { ascending: false }).limit(N),
  ]);
  const all = [doneTasks, newTasks, projects, notes, memory, documents];
  if (all.some((r) => r.error)) throw new Error("Gagal memuat aktivitas.");
  return buildActivity({
    doneTasks: doneTasks.data,
    newTasks: newTasks.data,
    projects: projects.data,
    notes: notes.data,
    memory: memory.data,
    documents: documents.data,
  } as ActivitySources);
}
