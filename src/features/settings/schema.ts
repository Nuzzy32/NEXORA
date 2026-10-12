import { z } from "zod";

// Pure: shared by the Server Actions, the page and the tests. No server-only imports.

export const TASKS_VIEWS = ["calendar", "list"] as const;
export type TasksView = (typeof TASKS_VIEWS)[number];
export const TASKS_VIEW_LABEL: Record<TasksView, string> = { calendar: "Kalender", list: "Daftar" };

export const PREFS_FIELDS = ["default_tasks_view"] as const;
export const prefsSchema = z.object({ default_tasks_view: z.enum(TASKS_VIEWS, "Pilih Kalender atau Daftar.") });

export function parsePrefsForm(formData: FormData) {
  return prefsSchema.safeParse({ default_tasks_view: formData.get("default_tasks_view") });
}

// ---- delete requests -----------------------------------------------------------

export const DELETE_CATEGORIES = ["memory", "conversations", "briefs", "elearning", "all"] as const;
export type DeleteCategory = (typeof DELETE_CATEGORIES)[number];

/** Typed by the owner before "Hapus semua data" goes through. */
export const CONFIRM_WORD = "HAPUS";

export const deleteRequestSchema = z
  .object({ category: z.enum(DELETE_CATEGORIES), confirm: z.string().default("") })
  .refine((v) => v.category !== "all" || v.confirm.trim() === CONFIRM_WORD, {
    path: ["confirm"],
    message: `Ketik ${CONFIRM_WORD} untuk melanjutkan.`,
  });

export function parseDeleteRequest(category: unknown, confirm: unknown) {
  return deleteRequestSchema.safeParse({ category, confirm: typeof confirm === "string" ? confirm : "" });
}
