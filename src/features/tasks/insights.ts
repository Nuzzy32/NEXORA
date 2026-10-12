import { addDays } from "@/lib/date";
import { sortByFocus, type Task } from "./schema";

export function greetingForHour(hour: number): string {
  if (hour < 4) return "Selamat malam"; // the small hours are still night, not morning
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

/** One calm sentence about the day, from the three counts the dashboard already has. */
export function daySummary({ overdue, today, week }: { overdue: number; today: number; week: number }): string {
  if (overdue > 0 && today > 0) return `${overdue} task terlambat dan ${today} untuk hari ini.`;
  if (overdue > 0) return `${overdue} task terlambat. Hari ini belum ada tenggat.`;
  if (today > 0) return `${today} task untuk hari ini.`;
  if (week > 0) return `Hari ini kosong. ${week} task menunggu dalam seminggu.`;
  return "Tidak ada tenggat dalam seminggu. Ruang untuk berpikir.";
}

/** The one task to look at first: in progress, then priority, then the oldest deadline. */
export function pickFocus(tasks: Task[]): Task | null {
  return sortByFocus(tasks)[0] ?? null;
}

export type WeekDay = { date: string; weekday: string; day: number; count: number; isToday: boolean };

/** Seven days starting today, each with the number of open tasks due that day. */
export function weekDays(today: string, openTasks: Pick<Task, "due_date">[]): WeekDay[] {
  const counts = new Map<string, number>();
  for (const t of openTasks) if (t.due_date) counts.set(t.due_date, (counts.get(t.due_date) ?? 0) + 1);
  const weekday = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const d = new Date(`${date}T00:00:00Z`);
    return { date, weekday: weekday.format(d), day: d.getUTCDate(), count: counts.get(date) ?? 0, isToday: i === 0 };
  });
}
