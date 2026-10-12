"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { PROJECT_FIELDS, PROJECT_STATUSES, parseProjectForm, type ProjectStatus } from "./schema";

const idSchema = z.uuid();

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, PROJECT_FIELDS);
  const { data, error } = await supabase.from("projects").insert(parsed.data).select("id").single();
  if (error) return failed("Proyek gagal disimpan. Coba lagi.", formData, PROJECT_FIELDS);
  refreshApp();
  redirect(`/projects/${data.id}`);
}

export async function updateProject(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const projectId = idSchema.safeParse(id);
  if (!projectId.success) return failed("Proyek tidak ditemukan.");
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, PROJECT_FIELDS);
  const { data, error } = await supabase.from("projects").update(parsed.data).eq("id", projectId.data).select("id");
  if (error) return failed("Proyek gagal disimpan. Coba lagi.", formData, PROJECT_FIELDS);
  if (data.length === 0) return failed("Proyek tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

/** Archive / restore / complete without opening the edit form. */
export async function setProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  const { supabase } = await requireUser();
  const projectId = idSchema.parse(id);
  const next = z.enum(PROJECT_STATUSES).parse(status);
  const { error } = await supabase.from("projects").update({ status: next }).eq("id", projectId);
  if (error) throw new Error("Status proyek gagal diubah.");
  refreshApp();
}

/** Deletes the project and its notes (FK cascade); its tasks are kept, just unlinked. */
export async function deleteProject(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const projectId = idSchema.safeParse(id);
  if (!projectId.success) return failed("Proyek tidak ditemukan.");
  const { error } = await supabase.from("projects").delete().eq("id", projectId.data);
  if (error) return failed("Proyek gagal dihapus. Coba lagi.");
  refreshApp();
  redirect("/projects");
}
