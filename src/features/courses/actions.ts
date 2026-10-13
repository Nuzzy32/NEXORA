"use server";

import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { COURSE_FIELDS, parseCourseForm, parseSessionForm, SESSION_FIELDS } from "./schema";

const idSchema = z.uuid();

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseCourseForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, COURSE_FIELDS);
  const { data, error } = await supabase.from("courses").insert(parsed.data).select("id").single<{ id: string }>();
  if (error) return failed("Mata kuliah gagal disimpan. Coba lagi.", formData, COURSE_FIELDS);
  refreshApp();
  return { status: "ok", id: data.id };
}

export async function updateCourse(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const courseId = idSchema.safeParse(id);
  if (!courseId.success) return failed("Mata kuliah tidak ditemukan.");
  const parsed = parseCourseForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, COURSE_FIELDS);
  const { data, error } = await supabase.from("courses").update(parsed.data).eq("id", courseId.data).select("id");
  if (error) return failed("Mata kuliah gagal disimpan. Coba lagi.", formData, COURSE_FIELDS);
  if (data.length === 0) return failed("Mata kuliah tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

/** Its weekly sessions go with it (FK cascade). */
export async function deleteCourse(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const courseId = idSchema.safeParse(id);
  if (!courseId.success) return failed("Mata kuliah tidak ditemukan.");
  const { error } = await supabase.from("courses").delete().eq("id", courseId.data);
  if (error) return failed("Mata kuliah gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}

/** The composite FK (course_id, user_id) rejects a course that is not the caller's. */
export async function addSession(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cid = idSchema.safeParse(courseId);
  if (!cid.success) return failed("Mata kuliah tidak ditemukan.");
  const parsed = parseSessionForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, SESSION_FIELDS);
  const { error } = await supabase.from("course_sessions").insert({ ...parsed.data, course_id: cid.data });
  if (error) return failed("Jadwal gagal disimpan. Coba lagi.", formData, SESSION_FIELDS);
  refreshApp();
  return { status: "ok" };
}

export async function deleteSession(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const sid = idSchema.safeParse(id);
  if (!sid.success) return failed("Jadwal tidak ditemukan.");
  const { error } = await supabase.from("course_sessions").delete().eq("id", sid.data);
  if (error) return failed("Jadwal gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}
