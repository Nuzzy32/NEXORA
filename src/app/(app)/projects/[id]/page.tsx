import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KindBadge } from "@/components/projects/note-kind-badge";
import { NotesPanel } from "@/components/projects/notes-panel";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { TrackingList } from "@/components/projects/tracking-lists";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListSkeleton } from "@/components/ui/skeleton";
import { countNotesByKind, getProject, listNotes } from "@/features/projects/queries";
import { isTrackedKind, parseNoteFilters, parseProjectTab } from "@/features/projects/schema";
import { sortChronological } from "@/features/tasks/schema";
import { listProjectOptions, listTasks } from "@/features/tasks/queries";
import { updatedAgo } from "@/features/projects/stats";
import { milestoneProgress, nextMilestones, openRisks, sortTracked } from "@/features/projects/tracking";
import { todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Project" };

type Props = PageProps<"/projects/[id]">;

export default function ProjectPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <ProjectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProjectContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const project = await getProject(id);
  if (!project) notFound();
  const counts = await countNotesByKind(id);
  const noteCount = counts.all;
  const tab = parseProjectTab(sp);
  const today = todayISO();

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} today={today} />
      <ProjectTabs projectId={id} current={tab} openTasks={project.open_count} notes={noteCount} />
      {tab === "overview" ? (
        <OverviewTab projectId={id} openCount={project.open_count} doneCount={project.done_count} today={today} />
      ) : tab === "tasks" ? (
        <TasksTab projectId={id} today={today} />
      ) : (
        <NotesTab projectId={id} today={today} sp={sp} counts={counts} />
      )}
    </div>
  );
}

const NEXT_TASKS = 5;
const RECENT_NOTES = 3;
const MILESTONES_SHOWN = 4;
const RISKS_SHOWN = 4;

async function OverviewTab({
  projectId,
  openCount,
  doneCount,
  today,
}: {
  projectId: string;
  openCount: number;
  doneCount: number;
  today: string;
}) {
  const [tasks, projects, notes] = await Promise.all([
    listTasks({ status: "all", priority: "all", projectId }),
    listProjectOptions(),
    listNotes(projectId, { q: "", kind: "all" }),
  ]);
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.due_date !== null && t.due_date < today).length;
  const next = sortChronological(open).slice(0, NEXT_TASKS);
  const recent = notes.slice(0, RECENT_NOTES);
  const milestones = nextMilestones(notes, MILESTONES_SHOWN);
  const progress = milestoneProgress(notes);
  const risks = openRisks(notes);
  const base = `/projects/${projectId}`;
  const linkClass = "inline-flex min-h-8 items-center font-mono text-[11px] text-muted hover:text-fg pointer-coarse:min-h-11";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section aria-labelledby="next-tasks" className="lg:col-span-3">
        <SectionHeading
          id="next-tasks"
          title="Task terdekat"
          aside={
            <Link href={base} className={linkClass}>
              Semua task →
            </Link>
          }
        />
        {next.length === 0 ? (
          <EmptyState
            icon="tasks"
            title={tasks.length === 0 ? "Belum ada task di proyek ini" : "Semua task selesai"}
            hint={tasks.length === 0 ? "Tambahkan task dari tab Tasks." : "Tambahkan task baru, atau arsipkan proyek ini bila sudah beres."}
          />
        ) : (
          <TaskList tasks={next} today={today} projects={projects} showProject={false} />
        )}

        <section aria-labelledby="milestones" className="mt-6">
          <SectionHeading
            id="milestones"
            title="Milestone terdekat"
            aside={
              progress.total > 0 ? (
                <Link href={`${base}?tab=notes&kind=milestone`} className={linkClass}>
                  {progress.done}/{progress.total} selesai →
                </Link>
              ) : undefined
            }
          />
          <TrackingList
            items={milestones}
            kind="milestone"
            projectId={projectId}
            today={today}
            emptyTitle={progress.total === 0 ? "Belum ada milestone" : "Semua milestone selesai"}
            emptyHint={
              progress.total === 0
                ? "Catat target penting dari tab Keputusan & Catatan, jenis Milestone."
                : "Tambahkan milestone baru bila ada target berikutnya."
            }
          />
        </section>
      </section>

      <div className="space-y-6 lg:col-span-2">
        <section aria-labelledby="task-summary">
          <SectionHeading id="task-summary" title="Ringkasan task" />
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: "Terbuka", value: openCount, tone: "" },
              { label: "Selesai", value: doneCount, tone: "" },
              { label: "Terlambat", value: overdue, tone: overdue > 0 ? "text-danger" : "" },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-line bg-surface p-3">
                <dt className="font-mono text-[11px] tracking-[0.04em] text-muted uppercase">{c.label}</dt>
                <dd className={`mt-1 text-2xl leading-8 font-semibold tracking-[-0.03em] tabular-nums ${c.tone}`}>{c.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="open-risks">
          <SectionHeading
            id="open-risks"
            title="Risiko terbuka"
            count={risks.length}
            aside={
              risks.length > RISKS_SHOWN ? (
                <Link href={`${base}?tab=notes&kind=risk`} className={linkClass}>
                  Semua →
                </Link>
              ) : undefined
            }
          />
          <TrackingList
            items={risks.slice(0, RISKS_SHOWN)}
            kind="risk"
            projectId={projectId}
            today={today}
            emptyTitle="Tidak ada risiko terbuka"
            emptyHint="Risiko yang dicatat dari tab Keputusan & Catatan muncul di sini sampai ditandai teratasi."
          />
        </section>

        <section aria-labelledby="recent-notes">
          <SectionHeading
            id="recent-notes"
            title="Catatan terbaru"
            aside={
              <Link href={`${base}?tab=notes`} className={linkClass}>
                Semua →
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon="note" title="Belum ada catatan" hint="Simpan keputusan teknis dan hal penting lain dari tab Keputusan & Catatan." />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {recent.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`${base}?tab=notes`}
                    className="relative block px-4 py-3 transition-colors hover:bg-raised"
                  >
                    {n.kind === "decision" && <span aria-hidden className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-accent" />}
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <KindBadge kind={n.kind} resolved={n.resolved_at !== null} />
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-faint">Diperbarui {updatedAgo(n.updated_at, today)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

async function TasksTab({ projectId, today }: { projectId: string; today: string }) {
  const [tasks, projects] = await Promise.all([
    listTasks({ status: "all", priority: "all", projectId }),
    listProjectOptions(),
  ]);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <QuickAddTask projectId={projectId} />
        </div>
        <NewTaskButton projects={projects} defaultProjectId={projectId} />
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          icon="tasks"
          title="Belum ada task di proyek ini"
          hint="Ketik judul di kotak di atas lalu Enter, atau pakai “Task baru” untuk detail."
        />
      ) : (
        <>
          {open.length > 0 ? (
            <TaskList tasks={open} today={today} projects={projects} showProject={false} />
          ) : (
            <EmptyState icon="tasks" title="Semua task selesai" hint="Tambahkan task baru, atau arsipkan proyek ini bila sudah beres." />
          )}
          {done.length > 0 && (
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-1 text-sm text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
                <Icon name="arrowRight" className="size-4 transition-transform group-open:rotate-90" />
                Selesai <span className="font-mono text-xs">{done.length}</span>
              </summary>
              <div className="mt-2">
                <TaskList tasks={done} today={today} projects={projects} showProject={false} />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

async function NotesTab({
  projectId,
  today,
  sp,
  counts,
}: {
  projectId: string;
  today: string;
  sp: Awaited<Props["searchParams"]>;
  counts: Awaited<ReturnType<typeof countNotesByKind>>;
}) {
  const { q, kind } = parseNoteFilters(sp);
  const found = await listNotes(projectId, { q, kind });
  // Milestones, bugs and risks read best open-first by due date; everything else stays newest-first.
  const notes = kind !== "all" && isTrackedKind(kind) ? sortTracked(found) : found;
  return <NotesPanel projectId={projectId} notes={notes} q={q} kind={kind} counts={counts} today={today} />;
}
