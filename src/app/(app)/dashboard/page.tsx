import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { BriefCard, BriefSkeleton } from "@/components/brief/brief-card";
import { Panel } from "@/components/dashboard/panel";
import { PriorityQueue } from "@/components/dashboard/priority-queue";
import { PinnedMemory, ProjectsRail, RecentConversations, RecentNotes } from "@/components/dashboard/rail";
import { StatCards } from "@/components/dashboard/stat-cards";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { ElearningAutoSync } from "@/components/elearning/auto-sync";
import { PageHeader } from "@/components/layout/page-header";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { TaskList } from "@/components/tasks/task-row";
import { ListSkeleton } from "@/components/ui/skeleton";
import { listProjects } from "@/features/projects/queries";
import { daySummary, greetingForHour, weekDays } from "@/features/tasks/insights";
import { getDashboardTasks, listProjectOptions } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/schema";
import { requireUser } from "@/lib/auth/session";
import { dayLabel, hourOfDay, longDate } from "@/lib/date";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  const pulse = "motion-safe:animate-pulse rounded bg-raised";
  return (
    <div aria-busy="true" aria-label="Memuat">
      <div className={`h-3 w-44 ${pulse}`} />
      <div className={`mt-4 h-10 w-96 max-w-full ${pulse}`} />
      <div className={`mt-3 h-4 w-72 max-w-full ${pulse}`} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[116px] rounded-lg border border-line bg-surface motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="mt-5">
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}

/** "adrian.s@example.com" -> "Adrian": the first word of the account name, or "" when there is nothing to show. */
function firstName(email: string | null): string {
  const word = (email?.split("@")[0] ?? "").split(/[._+\-\d]+/)[0] ?? "";
  return word ? word[0].toUpperCase() + word.slice(1) : "";
}

/** Today as a small plan: the day in numbers, the queue, the week ahead, and the projects on the side. */
async function Dashboard() {
  await io(); // the greeting and the date depend on the time of day
  const [{ user }, { today, overdue, dueToday, upcoming, doneToday }, projects, running] = await Promise.all([
    requireUser(),
    getDashboardTasks(),
    listProjectOptions(),
    listProjects("open"),
  ]);

  const planned = doneToday + dueToday.length + overdue.length;
  const week = weekDays(today, [...dueToday, ...upcoming]);
  const busyDays = week.filter((d) => d.count > 0).length;
  const runningDone = running.reduce((n, p) => n + p.done_count, 0);
  const runningTotal = running.reduce((n, p) => n + p.open_count + p.done_count, 0);
  const name = firstName(user.email);

  const byDay = new Map<string, Task[]>();
  for (const t of upcoming) byDay.set(t.due_date!, [...(byDay.get(t.due_date!) ?? []), t]);

  return (
    <>
      <PageHeader
        eyebrow={longDate()}
        title={name ? `${greetingForHour(hourOfDay())}, ${name}.` : `${greetingForHour(hourOfDay())}.`}
        description={daySummary({ overdue: overdue.length, today: dueToday.length, week: dueToday.length + upcoming.length })}
        actions={<NewTaskButton projects={projects} />}
      />

      <ElearningAutoSync />

      <div className="mt-6 space-y-5">
        <StatCards
          stats={[
            {
              label: "Task prioritas",
              value: overdue.length + dueToday.length,
              unit: "hari ini & terlambat",
              chip: overdue.length > 0 ? { text: `${overdue.length} terlambat`, late: true } : undefined,
              progress: {
                done: doneToday,
                total: planned,
                caption: planned === 0 ? "Belum ada rencana hari ini" : `${doneToday} dari ${planned} selesai hari ini`,
              },
              href: overdue.length > 0 ? "/tasks?status=overdue" : `/tasks?due=${today}`,
            },
            {
              label: "Proyek aktif",
              value: running.length,
              unit: "berjalan",
              chip: running.length > 0 ? { text: `${runningTotal - runningDone} task terbuka` } : undefined,
              progress: {
                done: runningDone,
                total: runningTotal,
                caption: runningTotal === 0 ? "Belum ada task di proyek" : `${runningDone} dari ${runningTotal} task selesai`,
              },
              href: "/projects",
            },
            {
              label: "7 hari ke depan",
              value: dueToday.length + upcoming.length,
              unit: "task bertenggat",
              progress: {
                done: busyDays,
                total: 7,
                caption: `${busyDays} dari 7 hari punya tenggat`,
              },
              href: "/tasks",
            },
          ]}
        />

        <Suspense fallback={<BriefSkeleton />}>
          <BriefCard />
        </Suspense>

        <div className="grid items-start gap-5 lg:grid-cols-12">
          <div className="min-w-0 space-y-5 lg:col-span-7">
            <PriorityQueue overdue={overdue} dueToday={dueToday} today={today} projects={projects} />

            {byDay.size > 0 && (
              <Panel id="sec-week" title="7 hari ke depan" count={upcoming.length} flush>
                <div className="divide-y divide-line">
                  {[...byDay].map(([day, tasks]) => (
                    <div key={day}>
                      <h3 className="bg-raised/40 px-4 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
                        {dayLabel(day, today)}
                      </h3>
                      <TaskList bare tasks={tasks} today={today} projects={projects} showDate={false} />
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Link
              href="/tasks"
              className="inline-flex min-h-11 items-center font-mono text-[11px] text-muted transition-colors hover:text-fg"
            >
              Lihat semua task aktif →
            </Link>
          </div>

          <aside className="min-w-0 space-y-5 lg:col-span-5">
            <Panel id="rail-week" title="Minggu ini">
              <WeekStrip days={week} />
            </Panel>
            <ProjectsRail projects={running} />
            <Suspense fallback={null}>
              <RecentNotes />
            </Suspense>
            <Suspense fallback={null}>
              <PinnedMemory />
            </Suspense>
            <Suspense fallback={null}>
              <RecentConversations />
            </Suspense>
          </aside>
        </div>
      </div>
    </>
  );
}
