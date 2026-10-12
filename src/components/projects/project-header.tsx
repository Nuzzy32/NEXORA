import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import type { ProjectWithCounts } from "@/features/projects/schema";
import { projectColor } from "@/lib/color";
import { formatDate } from "@/lib/date";
import { ArchiveButton } from "./archive-button";
import { ProgressBar } from "./progress-bar";
import { ProjectForm } from "./project-form";
import { StatusBadge } from "./status-badge";

export function ProjectHeader({ project, today }: { project: ProjectWithCounts; today: string }) {
  const { open_count: open, done_count: done } = project;
  const total = open + done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const running = project.status === "active" || project.status === "on_hold";
  const late = running && project.due_on !== null && project.due_on < today;

  return (
    <header className="rise space-y-3">
      <Link
        href="/projects"
        className="inline-flex min-h-8 items-center font-mono text-[11px] tracking-[0.04em] text-faint uppercase transition-colors hover:text-fg pointer-coarse:min-h-11"
      >
        ← Proyek
      </Link>

      <div className="rounded-lg border border-line bg-surface p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-72">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusBadge status={project.status} />
              {project.starts_on && <span className="font-mono text-xs text-muted">Mulai {formatDate(project.starts_on, today)}</span>}
              {project.due_on && (
                <span className={"font-mono text-xs " + (late ? "text-danger" : "text-muted")}>
                  {late ? "Terlambat · " : ""}Target {formatDate(project.due_on, today)}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-start gap-3">
              <i aria-hidden className="mt-3 size-2.5 shrink-0 rounded-full" style={{ background: projectColor(project.id) }} />
              <h1 className="min-w-0 text-[1.75rem] leading-9 font-semibold tracking-[-0.025em] [overflow-wrap:anywhere] md:text-[2rem] md:leading-10">
                {project.name}
              </h1>
            </div>
            {project.summary && (
              <p className="mt-3 max-w-prose text-sm leading-relaxed whitespace-pre-wrap text-muted">{project.summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <FormDialog title="Edit proyek" trigger="Edit" triggerClassName={buttonClass("ghost")}>
              <ProjectForm project={project} />
            </FormDialog>
            <ArchiveButton id={project.id} status={project.status} />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4">
          <div className="flex items-center justify-between font-mono text-xs text-muted">
            <span>{total === 0 ? "Belum ada task" : `${done} dari ${total} task selesai`}</span>
            <span className="text-fg tabular-nums">{total === 0 ? "–" : `${pct}%`}</span>
          </div>
          <ProgressBar value={pct} />
        </div>
      </div>
    </header>
  );
}
