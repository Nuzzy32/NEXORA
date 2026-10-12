import Link from "next/link";
import { Panel } from "@/components/dashboard/panel";
import { dayTitle } from "@/features/tasks/calendar";
import type { ProjectOption, Task } from "@/features/tasks/schema";
import { QuickAddTask } from "./quick-add-task";
import { ScrollToDay } from "./scroll-to-day";
import { TaskList } from "./task-row";

const SHOWN = 8;

/** The selected day in full (edit, finish, add), then what is late and what has no date: nothing falls off the calendar. */
export function CalendarSide({
  day,
  today,
  dayTasks,
  late,
  undated,
  projects,
  lateHref,
  scrollOnSelect,
}: {
  day: string;
  today: string;
  dayTasks: Task[];
  late: Task[];
  undated: Task[];
  projects: ProjectOption[];
  lateHref: string;
  scrollOnSelect: boolean;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <ScrollToDay day={day} enabled={scrollOnSelect} />
      <Panel
        id="cal-day"
        title={day ? dayTitle(day) : "Pilih tanggal"}
        count={day ? dayTasks.length : undefined}
        aside={day === today ? <span className="font-mono text-[10px] tracking-[0.08em] text-accent uppercase">Hari ini</span> : undefined}
        flush
      >
        {day ? (
          <>
            {dayTasks.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-muted">Tidak ada task di tanggal ini.</p>
            ) : (
              <TaskList bare draggable tasks={dayTasks} today={today} projects={projects} showDate={false} />
            )}
            <div className="border-t border-line p-3">
              <QuickAddTask key={day} due={day} placeholder="Tambah task…" />
            </div>
          </>
        ) : (
          <p className="px-4 py-4 text-[13px] text-muted">Pilih tanggal di kalender untuk melihat dan menambah task.</p>
        )}
      </Panel>

      {late.length > 0 && (
        <Panel
          id="cal-late"
          title="Terlambat"
          count={late.length}
          aside={
            late.length > SHOWN ? (
              <Link href={lateHref} className="inline-flex min-h-6 items-center font-mono text-[11px] text-muted transition-colors hover:text-fg">
                Semua
              </Link>
            ) : undefined
          }
          flush
        >
          <TaskList bare draggable tasks={late.slice(0, SHOWN)} today={today} projects={projects} />
        </Panel>
      )}

      {undated.length > 0 && (
        <Panel id="cal-undated" title="Tanpa tanggal" count={undated.length} flush>
          <TaskList bare draggable tasks={undated.slice(0, SHOWN)} today={today} projects={projects} />
        </Panel>
      )}
    </div>
  );
}
