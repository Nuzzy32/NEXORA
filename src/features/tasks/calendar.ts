import { z } from "zod";
import { addDays } from "@/lib/date";
import { sortByFocus, type Task } from "./schema";

/** Monday first, as in Indonesia. */
export const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

const MONTH = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** YYYY-MM from `?month=`, falling back to the month of `today`. */
export function parseMonth(raw: string | undefined, today: string): string {
  return raw && MONTH.test(raw) ? raw : today.slice(0, 7);
}

/** `?day=` as YYYY-MM-DD, or "" when missing or malformed. */
export function parseDay(raw: string | undefined): string {
  const r = z.iso.date().safeParse(raw);
  return r.success ? r.data : "";
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** "Oktober 2026" */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

/** Whole weeks (Monday to Sunday) covering the month: 35 or 42 dates, including the neighbours' days. */
export function monthDays(month: string): string[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const start = addDays(`${month}-01`, -offset);
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, i) => addDays(start, i));
}

/** One day's tasks in the order of "what to do next", finished ones last. */
const orderDay = (list: Task[]) => sortByFocus(list).toSorted((a, b) => Number(a.status === "done") - Number(b.status === "done"));

/** Tasks that have a due date, grouped by day. */
export function tasksByDay(tasks: Task[]): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.due_date) byDay.set(t.due_date, [...(byDay.get(t.due_date) ?? []), t]);
  }
  for (const [day, list] of byDay) byDay.set(day, orderDay(list));
  return byDay;
}

/** The only thing a calendar drag carries: a task id. No title or other data goes into the drag payload. */
export const TASK_DRAG_MIME = "application/x-nexora-task";

/** Where a task sits in the calendar map, or undefined when it is not there (late, undated or out of range). */
export const dueDayOf = (byDay: Map<string, Task[]>, id: string): string | undefined =>
  [...byDay].find(([, list]) => list.some((t) => t.id === id))?.[0];

/**
 * Optimistic move of a task to another day: a new map, the old one untouched. Unknown id or same day returns the
 * same map (nothing to show; the server decides). The destination day is re-sorted, an emptied day is dropped.
 */
export function moveInMap(byDay: Map<string, Task[]>, id: string, to: string): Map<string, Task[]> {
  const from = dueDayOf(byDay, id);
  if (from === undefined || from === to) return byDay;
  const task = byDay.get(from)!.find((t) => t.id === id)!;
  const next = new Map(byDay);
  const rest = byDay.get(from)!.filter((t) => t.id !== id);
  if (rest.length > 0) next.set(from, rest);
  else next.delete(from);
  next.set(to, orderDay([...(byDay.get(to) ?? []), { ...task, due_date: to }]));
  return next;
}

/** "16 Okt" */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${day}T00:00:00Z`));
}

/** "Rabu, 14 Oktober" */
export function dayTitle(day: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export type TasksUrl = {
  view?: "calendar" | "list";
  month?: string;
  day?: string;
  status?: string;
  priority?: string;
  project?: string;
  q?: string;
};

/** /tasks URL that keeps only what is set (empty and default values are left out). */
export function tasksHref(u: TasksUrl): string {
  const p = new URLSearchParams();
  if (u.view) p.set("view", u.view);
  if (u.month) p.set("month", u.month);
  if (u.day) p.set("day", u.day);
  if (u.status && u.status !== "open") p.set("status", u.status);
  if (u.priority && u.priority !== "all") p.set("priority", u.priority);
  if (u.project) p.set("project", u.project);
  if (u.q) p.set("q", u.q);
  const qs = p.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}
