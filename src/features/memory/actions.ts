"use server";

import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { MEMORY_FIELDS, parseMemoryForm } from "./schema";

const idSchema = z.uuid();

// Memory is only ever written from these explicit form actions; nothing creates or edits it from a conversation (CLAUDE.md rule 10).

export async function createMemory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseMemoryForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, MEMORY_FIELDS);
  // The composite FK (project_id, user_id) rejects a project that is not the caller's.
  const { error } = await supabase.from("memory_items").insert(parsed.data);
  if (error) return failed("Memory gagal disimpan. Coba lagi.", formData, MEMORY_FIELDS);
  refreshApp();
  return { status: "ok" };
}

export async function updateMemory(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const memoryId = idSchema.safeParse(id);
  if (!memoryId.success) return failed("Memory tidak ditemukan.");
  const parsed = parseMemoryForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, MEMORY_FIELDS);
  const { data, error } = await supabase.from("memory_items").update(parsed.data).eq("id", memoryId.data).select("id");
  if (error) return failed("Memory gagal disimpan. Coba lagi.", formData, MEMORY_FIELDS);
  if (data.length === 0) return failed("Memory tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

export async function setMemoryPinned(id: string, pinned: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memory_items")
    .update({ pinned: z.boolean().parse(pinned) })
    .eq("id", idSchema.parse(id))
    .select("id");
  if (error || data.length === 0) throw new Error("Gagal mengubah sematan.");
  refreshApp();
}

export async function deleteMemory(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const memoryId = idSchema.safeParse(id);
  if (!memoryId.success) return failed("Memory tidak ditemukan.");
  const { error } = await supabase.from("memory_items").delete().eq("id", memoryId.data);
  if (error) return failed("Memory gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}
