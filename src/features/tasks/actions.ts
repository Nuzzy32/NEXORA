"use server";

import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { addDays, todayISO } from "@/lib/date";
import { refreshApp } from "@/lib/revalidate";
import { parseTaskForm, quickAddSchema, rescheduleSchema, TASK_FIELDS, TASK_STATUSES, type TaskStatus } from "./schema";

const idSchema = z.uuid();

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, TASK_FIELDS);
  const input = parsed.data;
  const { error } = await supabase.from("tasks").insert({
    ...input,
    completed_at: input.status === "done" ? new Date().toISOString() : null,
  });
  if (error) return failed("Task gagal disimpan. Coba lagi.", formData, TASK_FIELDS);
  refreshApp();
  return { status: "ok" };
}

/** One-field create: title only, optionally inside a project and/or due today (computed here, in the app timezone) or on a given date. */
export async function quickAddTask(
  projectId: string | null,
  due: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const pid = projectId === null ? null : idSchema.safeParse(projectId);
  if (pid !== null && !pid.success) return failed("Proyek tidak ditemukan.", formData, ["title"]);
  const dueParsed = due === null || due === "today" ? null : z.iso.date().safeParse(due);
  if (dueParsed !== null && !dueParsed.success) return failed("Tanggal tidak valid.", formData, ["title"]);
  const dueDate = due === null ? null : due === "today" ? todayISO() : dueParsed!.data;
  const parsed = quickAddSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return invalid(parsed.error, formData, ["title"]);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.data.title,
      project_id: pid === null ? null : pid.data,
      due_date: dueDate,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return failed("Task gagal ditambahkan. Coba lagi.", formData, ["title"]);
  refreshApp();
  return { status: "ok", message: `Ditambahkan: ${parsed.data.title}`, id: data.id };
}

export async function updateTask(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const taskId = idSchema.safeParse(id);
  if (!taskId.success) return failed("Task tidak ditemukan.");
  const parsed = parseTaskForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, TASK_FIELDS);
  const input = parsed.data;

  // Keep the original completion time when a finished task is merely edited.
  let completedAt: string | null = null;
  if (input.status === "done") {
    const { data: current } = await supabase.from("tasks").select("completed_at").eq("id", taskId.data).maybeSingle();
    completedAt = current?.completed_at ?? new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ ...input, completed_at: completedAt })
    .eq("id", taskId.data)
    .select("id");
  if (error) return failed("Task gagal disimpan. Coba lagi.", formData, TASK_FIELDS);
  if (data.length === 0) return failed("Task tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const taskId = idSchema.parse(id);
  const { error } = await supabase
    .from("tasks")
    .update(done ? { status: "done", completed_at: new Date().toISOString() } : { status: "todo", completed_at: null })
    .eq("id", taskId);
  if (error) throw new Error("Status task gagal diubah.");
  refreshApp();
}

/** Set an exact status; used to undo a status change (e.g. back to "in progress", not just "todo"). */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { supabase } = await requireUser();
  const taskId = idSchema.parse(id);
  const next = z.enum(TASK_STATUSES).parse(status);
  const { error } = await supabase
    .from("tasks")
    .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) throw new Error("Status task gagal diubah.");
  refreshApp();
}

/** Set (or clear) a due date; used to undo a postponement. */
export async function setTaskDueDate(id: string, date: string | null): Promise<void> {
  const { supabase } = await requireUser();
  const taskId = idSchema.parse(id);
  const due = z.iso.date().nullable().parse(date);
  const { error } = await supabase.from("tasks").update({ due_date: due }).eq("id", taskId);
  if (error) throw new Error("Tanggal task gagal diubah.");
  refreshApp();
}

/**
 * Calendar drag: move a task (finished or not, imported or not) to another due date. Returns the old date so the
 * caller can offer Undo with `setTaskDueDate`. RLS hides other users' tasks, so a missing row means "not found".
 */
export async function rescheduleTask(id: string, date: string): Promise<{ from: string | null; changed: boolean }> {
  const { supabase } = await requireUser();
  const { id: taskId, date: due } = rescheduleSchema.parse({ id, date });
  const { data: current, error: readError } = await supabase.from("tasks").select("due_date").eq("id", taskId).maybeSingle<{ due_date: string | null }>();
  if (readError) throw new Error("Task gagal dipindahkan.");
  if (!current) throw new Error("Task tidak ditemukan.");
  if (current.due_date === due) return { from: current.due_date, changed: false };
  const { data, error } = await supabase.from("tasks").update({ due_date: due }).eq("id", taskId).select("id");
  if (error) throw new Error("Task gagal dipindahkan.");
  if (data.length === 0) throw new Error("Task tidak ditemukan.");
  refreshApp();
  return { from: current.due_date, changed: true };
}

/** Overdue task: push it to tomorrow without opening the edit form. */
export async function postponeTask(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const taskId = idSchema.parse(id);
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: addDays(todayISO(), 1) })
    .eq("id", taskId)
    .neq("status", "done");
  if (error) throw new Error("Task gagal dipindahkan.");
  refreshApp();
}

export async function deleteTask(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const taskId = idSchema.safeParse(id);
  if (!taskId.success) return failed("Task tidak ditemukan.");
  const { error } = await supabase.from("tasks").delete().eq("id", taskId.data);
  if (error) return failed("Task gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}
