import { z } from "zod";
import { searchTerm } from "@/lib/search";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "Dikerjakan",
  done: "Selesai",
};
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  completed_at: string | null;
  /** Where the task was imported from; null/absent for tasks written in Nexora. */
  source?: "elearning" | null;
};
export const TASK_COLUMNS = "id,title,description,status,priority,due_date,project_id,completed_at,source";

/** Archived projects stay in the list so a task linked to one keeps its link when edited. */
export type ProjectOption = { id: string; name: string; archived: boolean };

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const taskInputSchema = z.object({
  title: z
    .string("Judul wajib diisi")
    .trim()
    .min(1, "Judul wajib diisi")
    .max(200, "Judul maksimal 200 karakter"),
  description: z.preprocess(blankToNull, z.string().trim().max(5000, "Deskripsi maksimal 5000 karakter").nullable()),
  status: z.enum(TASK_STATUSES, "Status tidak valid"),
  priority: z.enum(TASK_PRIORITIES, "Prioritas tidak valid"),
  due_date: z.preprocess(blankToNull, z.iso.date("Tanggal tidak valid").nullable()),
  project_id: z.preprocess(blankToNull, z.uuid("Proyek tidak valid").nullable()),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

/** Quick-add takes only a title; everything else gets the defaults (todo, medium, no date). */
export const quickAddSchema = z.object({ title: taskInputSchema.shape.title });

export const TASK_FIELDS = ["title", "description", "status", "priority", "due_date", "project_id"] as const;

export function parseTaskForm(formData: FormData) {
  return taskInputSchema.safeParse(Object.fromEntries(TASK_FIELDS.map((f) => [f, formData.get(f)])));
}

// Ordering. "Focus": in progress first, then priority, then due date. "Chronological": due date first.
export const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const dueKey = (t: Task) => t.due_date ?? "9999-12-31";
const byFocus = (a: Task, b: Task) =>
  Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  dueKey(a).localeCompare(dueKey(b));
export const sortByFocus = (tasks: Task[]) => tasks.toSorted(byFocus);
export const sortChronological = (tasks: Task[]) =>
  tasks.toSorted((a, b) => dueKey(a).localeCompare(dueKey(b)) || byFocus(a, b));

// List filters (query string). Unknown values fall back to the default instead of erroring.
export const STATUS_FILTERS = ["open", "overdue", "todo", "in_progress", "done", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const PRIORITY_FILTERS = ["all", ...TASK_PRIORITIES] as const;
export type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

export function parseFilters(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const status = STATUS_FILTERS.find((s) => s === one("status")) ?? "open";
  const priority = PRIORITY_FILTERS.find((p) => p === one("priority")) ?? "all";
  const dueParsed = z.iso.date().safeParse(one("due"));
  return { status, priority, q: searchTerm(sp.q), due: dueParsed.success ? dueParsed.data : "" } satisfies {
    status: StatusFilter;
    priority: PriorityFilter;
    q: string;
    due: string;
  };
}

/** Calendar drag: which task, to which day. */
export const rescheduleSchema = z.object({ id: z.uuid(), date: z.iso.date() });
