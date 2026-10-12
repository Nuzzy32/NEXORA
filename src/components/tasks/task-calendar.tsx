import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { monthLabel, WEEKDAYS } from "@/features/tasks/calendar";
import type { Task } from "@/features/tasks/schema";
import { CalendarGrid } from "./calendar-grid";

/**
 * Month grid, Monday first. Every cell is a link that selects the day (`?day=`), so it works without JavaScript and
 * the selection survives reload and back. On wide screens a cell lists up to three tasks; on phones it shows dots.
 * The cells live in `CalendarGrid` (client) because tasks can be dragged between them.
 */
export function TaskCalendar({
  month,
  days,
  byDay,
  today,
  selected,
  dayHref,
  prevHref,
  nextHref,
  todayHref,
}: {
  month: string;
  days: string[];
  byDay: Map<string, Task[]>;
  today: string;
  selected: string;
  dayHref: (day: string) => string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const hrefs = Object.fromEntries(days.map((d) => [d, dayHref(d)]));
  const nav =
    "inline-flex size-8 items-center justify-center rounded-md border border-line-strong text-muted transition-colors hover:bg-raised hover:text-fg pointer-coarse:size-11";
  return (
    <section aria-labelledby="cal-title" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="cal-title" className="text-lg leading-none font-semibold tracking-[-0.02em]">
          {monthLabel(month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href={todayHref}
            className="inline-flex min-h-8 items-center rounded-md border border-line-strong px-3 font-mono text-[11px] text-muted transition-colors hover:bg-raised hover:text-fg pointer-coarse:min-h-11"
          >
            Hari ini
          </Link>
          <Link href={prevHref} aria-label="Bulan sebelumnya" className={nav}>
            <Icon name="chevronDown" className="size-4 rotate-90" />
          </Link>
          <Link href={nextHref} aria-label="Bulan berikutnya" className={nav}>
            <Icon name="chevronDown" className="size-4 -rotate-90" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-7 gap-px bg-line" role="row">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="bg-surface px-2 py-1.5 text-center font-mono text-[10px] font-semibold tracking-[0.08em] text-faint uppercase md:text-left"
            >
              {d}
            </div>
          ))}
        </div>
        <CalendarGrid month={month} days={days} byDay={byDay} today={today} selected={selected} hrefs={hrefs} />
      </div>
      <p className="mt-2 font-mono text-[10px] text-faint">
        <span className="text-danger">terlambat</span> · <span className="text-accent">prioritas tinggi</span> · outline = e-learning
      </p>
    </section>
  );
}
