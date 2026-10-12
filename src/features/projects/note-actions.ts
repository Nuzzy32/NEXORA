"use server";

import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { isTrackedKind, NOTE_FIELDS, noteRow, parseNoteForm } from "./schema";

const idSchema = z.uuid();

export async function createNote(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const pid = idSchema.safeParse(projectId);
  if (!pid.success) return failed("Proyek tidak ditemukan.");
  const parsed = parseNoteForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, NOTE_FIELDS);
  // The composite FK (project_id, user_id) rejects a project that is not the caller's.
  const { error } = await supabase.from("project_notes").insert({ ...noteRow(parsed.data), project_id: pid.data });
  if (error) return failed("Catatan gagal disimpan. Coba lagi.", formData, NOTE_FIELDS);
  refreshApp();
  return { status: "ok" };
}

export async function updateNote(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const noteId = idSchema.safeParse(id);
  if (!noteId.success) return failed("Catatan tidak ditemukan.");
  const parsed = parseNoteForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, NOTE_FIELDS);
  const { data, error } = await supabase.from("project_notes").update(noteRow(parsed.data)).eq("id", noteId.data).select("id");
  if (error) return failed("Catatan gagal disimpan. Coba lagi.", formData, NOTE_FIELDS);
  if (data.length === 0) return failed("Catatan tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

export async function deleteNote(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const noteId = idSchema.safeParse(id);
  if (!noteId.success) return failed("Catatan tidak ditemukan.");
  const { error } = await supabase.from("project_notes").delete().eq("id", noteId.data);
  if (error) return failed("Catatan gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}

export type ResolveResult = { status: "ok"; resolved: boolean } | { status: "error"; message: string };

/**
 * Marks a milestone, bug or risk done (`resolved_at = now`) or open again (null).
 * Pass `resolved` to set a state outright (an optimistic click and its "Urungkan" stay correct even if
 * the row changed meanwhile); without it the current state is flipped.
 */
export async function toggleNoteResolved(id: string, resolved?: boolean): Promise<ResolveResult> {
  const { supabase } = await requireUser();
  const noteId = idSchema.safeParse(id);
  if (!noteId.success) return { status: "error", message: "Catatan tidak ditemukan." };
  const { data: row, error: readError } = await supabase
    .from("project_notes")
    .select("kind,resolved_at")
    .eq("id", noteId.data)
    .maybeSingle<{ kind: string; resolved_at: string | null }>();
  if (readError) return { status: "error", message: "Gagal memuat catatan. Coba lagi." };
  if (!row) return { status: "error", message: "Catatan tidak ditemukan." };
  if (!isTrackedKind(row.kind)) {
    return { status: "error", message: "Hanya milestone, bug, dan risiko yang bisa ditandai selesai." };
  }
  const next = resolved ?? row.resolved_at === null;
  const { error } = await supabase
    .from("project_notes")
    .update({ resolved_at: next ? new Date().toISOString() : null })
    .eq("id", noteId.data);
  if (error) return { status: "error", message: "Status gagal diubah. Coba lagi." };
  refreshApp();
  return { status: "ok", resolved: next };
}
