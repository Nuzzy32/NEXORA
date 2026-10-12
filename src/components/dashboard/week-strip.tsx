import Link from "next/link";
import type { WeekDay } from "@/features/tasks/insights";

/** Seven days at a glance: the date, one dot per task due. Each day opens the task list for that day. */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <ul className="grid grid-cols-7 gap-1">
      {days.map((d) => (
        <li key={d.date}>
          <Link
            href={`/tasks?due=${d.date}`}
            aria-label={`${d.weekday} ${d.day}: ${d.count} task`}
            className={
              "flex flex-col items-center gap-1 rounded-md border py-2 transition-colors " +
              (d.isToday ? "border-accent/45 bg-accent/10" : "border-line bg-bg/40 hover:border-line-strong hover:bg-raised")
            }
          >
            <span className="font-mono text-[10px] tracking-[0.04em] text-faint uppercase">{d.weekday}</span>
            <span className={"text-[15px] leading-5 font-semibold tabular-nums " + (d.isToday ? "text-accent" : "")}>
              {d.day}
            </span>
            <span aria-hidden className="flex h-1.5 items-center gap-[3px]">
              {Array.from({ length: Math.min(d.count, 4) }, (_, i) => (
                <i key={i} className="size-1 rounded-full bg-accent" />
              ))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
