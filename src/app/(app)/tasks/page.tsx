import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ElearningPanel } from "@/components/elearning/elearning-panel";
import { PageHeader } from "@/components/layout/page-header";
import { NewTaskAction } from "@/components/tasks/new-task-action";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { CalendarSide } from "@/components/tasks/calendar-side";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskGroups } from "@/components/tasks/task-groups";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterGroup } from "@/components/ui/filter-group";
import { ActionSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { monthDays, parseDay, parseMonth, shiftMonth, tasksByDay, tasksHref } from "@/features/tasks/calendar";
import { listProjectOptions, listTasks } from "@/features/tasks/queries";
import { parseFilters, type PriorityFilter, type StatusFilter, type Task } from "@/features/tasks/schema";
import { getTasksViewPref } from "@/features/settings/queries";
import { resolveTasksView, urlDecidesView } from "@/features/settings/view";
import { todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Semua task pribadi dan yang terhubung ke proyek."
        actions={
          <Suspense fallback={<ActionSkeleton />}>
            <NewTaskAction />
          </Suspense>
        }
      />
      <div className="mt-6">
        <Suspense fallback={<div className="h-[68px] rounded-lg border border-line bg-surface motion-safe:animate-pulse" />}>
          <ElearningPanel />
        </Suspense>
      </div>
      <Suspense fallback={<div className="mt-6"><ListSkeleton /></div>}>
        <TasksContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Chip numbers: the same search, priority, project and date filters, split by status. */
function statusCounts(all: Task[], today: string): Record<StatusFilter, number> {
  const open = all.filter((t) => t.status !== "done");
  return {
    open: open.length,
    overdue: open.filter((t) => t.due_date !== null && t.due_date < today).length,
    todo: all.filter((t) => t.status === "todo").length,
    in_progress: all.filter((t) => t.status === "in_progress").length,
    done: all.length - open.length,
    all: all.length,
  };
}

const VIEWS = [
  { value: "calendar", label: "Kalender" },
  { value: "list", label: "Daftar" },
] as const;

/** `view` in the URL wins, a link with a status or a day opens the list (D-019), otherwise the saved preference (Settings) decides. */
async function pickView(sp: Record<string, string | string[] | undefined>): Promise<"calendar" | "list"> {
  return resolveTasksView(sp, urlDecidesView(sp) ? "calendar" : await getTasksViewPref());
}

async function TasksContent({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const project = z.uuid().safeParse(Array.isArray(sp.project) ? sp.project[0] : sp.project);
  const projectId = project.success ? project.data : "";
  const view = await pickView(sp);
  if (view === "calendar") {
    const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
    return (
      <CalendarContent
        month={one("month")}
        day={one("day")}
        priority={filters.priority}
        q={filters.q}
        projectId={projectId}
      />
    );
  }
  const rest = { priority: filters.priority, q: filters.q, due: filters.due, projectId: projectId || undefined };

  const [tasks, all, projects] = await Promise.all([
    listTasks({ status: filters.status, ...rest }),
    // ponytail: a second query only for the chip counts; one grouped count query if lists ever outgrow 500 rows.
    filters.status === "all" ? null : listTasks({ status: "all", ...rest }),
    listProjectOptions(),
  ]);
  const today = todayISO();
  const counts = statusCounts(all ?? tasks, today);
  const filtered =
    filters.status !== "open" || filters.priority !== "all" || filters.q !== "" || filters.due !== "" || projectId !== "";

  return (
    <div className="mt-6 space-y-4">
      <ViewToggle current="list" priority={filters.priority} q={filters.q} project={projectId} />
      <TaskFilters
        status={filters.status}
        priority={filters.priority}
        projectId={projectId}
        q={filters.q}
        due={filters.due}
        count={tasks.length}
        counts={counts}
        projects={projects}
      />
      <QuickAddTask />
      {tasks.length === 0 ? (
        <EmptyState
          icon={filtered ? "search" : "tasks"}
          title={filtered ? "Tidak ada task yang cocok" : "Belum ada task"}
          hint={filtered ? "Ubah filter untuk melihat task lain." : "Ketik judul di kotak di atas lalu Enter."}
        >
          {filtered && (
            <Link href="/tasks" className={buttonClass("ghost")}>Hapus filter</Link>
          )}
        </EmptyState>
      ) : (
        <TaskGroups tasks={tasks} today={today} projects={projects} />
      )}
    </div>
  );
}

function ViewToggle({
  current,
  priority,
  q,
  project,
  month,
  day,
}: {
  current: "calendar" | "list";
  priority: string;
  q: string;
  project: string;
  month?: string;
  day?: string;
}) {
  return (
    <FilterGroup
      label="Tampilan"
      hideLabel
      options={VIEWS}
      current={current}
      build={(v) => tasksHref({ view: v, priority, q, project, ...(v === "calendar" ? { month, day } : {}) })}
    />
  );
}

/** Month grid with the selected day beside it. Filters (search, priority, project) apply; status chips do not. */
async function CalendarContent({
  month: rawMonth,
  day: rawDay,
  priority,
  q,
  projectId,
}: {
  month: string | undefined;
  day: string | undefined;
  priority: PriorityFilter;
  q: string;
  projectId: string;
}) {
  await io(); // "today" picks the month before any data is read, so it must be kept out of the static shell (D-012)
  const today = todayISO();
  const month = parseMonth(rawMonth, today);
  const days = monthDays(month);
  const selected = parseDay(rawDay) || (today.startsWith(month) ? today : "");
  const rest = { priority, q, projectId: projectId || undefined };

  const [inRange, late, undated, projects] = await Promise.all([
    listTasks({ status: "all", from: days[0], to: days[days.length - 1], ...rest }),
    listTasks({ status: "overdue", ...rest }),
    listTasks({ status: "open", undated: true, ...rest }),
    listProjectOptions(),
  ]);
  const byDay = tasksByDay(inRange);
  const url = { priority, q, project: projectId };
  const link = (m: string, d?: string) => tasksHref({ view: "calendar", month: m === today.slice(0, 7) ? undefined : m, day: d, ...url });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ViewToggle current="calendar" priority={priority} q={q} project={projectId} month={rawMonth} day={rawDay} />
        <p role="status" className="font-mono text-[11px] text-muted">
          {inRange.filter((t) => t.due_date?.startsWith(month)).length} task bulan ini
        </p>
      </div>
      <TaskToolbar
        status="open"
        priority={priority}
        projectId={projectId}
        q={q}
        due=""
        projects={projects}
        hidden={{ view: "calendar", ...(rawMonth ? { month } : {}) }}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <TaskCalendar
          month={month}
          days={days}
          byDay={byDay}
          today={today}
          selected={selected}
          dayHref={(d) => link(month, d)}
          prevHref={link(shiftMonth(month, -1))}
          nextHref={link(shiftMonth(month, 1))}
          todayHref={link(today.slice(0, 7), today)}
        />
        <CalendarSide
          day={selected}
          today={today}
          dayTasks={byDay.get(selected) ?? []}
          late={late}
          undated={undated}
          projects={projects}
          lateHref={tasksHref({ view: "list", status: "overdue", ...url })}
          scrollOnSelect={Boolean(rawDay)}
        />
      </div>
    </div>
  );
}
