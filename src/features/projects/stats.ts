import { daysBetween, formatDate, localDate } from "@/lib/date";
import type { ProjectWithCounts } from "./schema";

/** Totals for the Projects overview band. Archived projects are left out of every number. */
export function projectStats(projects: readonly ProjectWithCounts[]) {
  const live = projects.filter((p) => p.status !== "archived");
  const open = live.reduce((n, p) => n + p.open_count, 0);
  const done = live.reduce((n, p) => n + p.done_count, 0);
  const total = open + done;
  return {
    projects: live.length,
    active: live.filter((p) => p.status === "active").length,
    open,
    done,
    total,
    donePct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** "hari ini", "kemarin", "3 hari lalu"; a plain date once it is a month old. Day granularity, so it is stable for a given `today`. */
export function updatedAgo(timestamp: string, today: string): string {
  const date = localDate(timestamp);
  const days = daysBetween(date, today);
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  if (days < 30) return `${days} hari lalu`;
  return formatDate(date, today);
}
