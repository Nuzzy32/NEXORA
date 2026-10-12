import type { CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { ProjectWithCounts } from "@/features/projects/schema";
import { updatedAgo } from "@/features/projects/stats";
import { projectColor } from "@/lib/color";
import { formatDate } from "@/lib/date";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";

/** One workstream: name, status, real task progress, last change. The project colour is only the dot. */
export function ProjectCard({
  project: p,
  today,
  index,
  openRisks = 0,
}: {
  project: ProjectWithCounts;
  today: string;
  index: number;
  openRisks?: number;
}) {
  const total = p.open_count + p.done_count;
  const running = p.status === "active" || p.status === "on_hold";
  const late = running && p.due_on !== null && p.due_on < today;
  const pct = total === 0 ? 0 : Math.round((p.done_count / total) * 100);

  return (
    <li className="rise" style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      <Link
        href={`/projects/${p.id}`}
        className="flex h-full min-h-44 flex-col gap-4 rounded-lg border border-line bg-surface p-4 transition-colors duration-200 hover:border-line-strong hover:bg-raised"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <i aria-hidden className="mt-2 size-2 shrink-0 rounded-full" style={{ background: projectColor(p.id) }} />
            <h3 className="min-w-0 text-[15px] leading-6 font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{p.name}</h3>
          </div>
          <StatusBadge status={p.status} />
        </div>
        {p.summary && <p className="-mt-2 line-clamp-2 text-sm text-muted">{p.summary}</p>}
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted">
            <span>Progres</span>
            <span className="text-fg tabular-nums">{total === 0 ? "–" : `${pct}%`}</span>
          </div>
          <ProgressBar value={pct} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="list" className="size-3.5" />
            {total === 0 ? "belum ada task" : `${p.done_count}/${total} task`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5" />
            diperbarui {updatedAgo(p.updated_at, today)}
          </span>
          {openRisks > 0 && (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <Icon name="warning" className="size-3.5" />
              {openRisks} risiko
            </span>
          )}
          {p.due_on && (
            <span className={`inline-flex items-center gap-1.5 ${late ? "text-danger" : ""}`}>
              <Icon name="calendar" className="size-3.5" />
              {late ? "terlambat · " : "target "}
              {formatDate(p.due_on, today)}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

export function ProjectGrid({
  projects,
  today,
  tail,
  risks,
}: {
  projects: ProjectWithCounts[];
  today: string;
  /** Open risks per project id; projects without any are absent. */
  risks?: ReadonlyMap<string, number>;
  /** Optional last tile (e.g. "new project"). */
  tail?: React.ReactNode;
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p, i) => (
        <ProjectCard key={p.id} project={p} today={today} index={i} openRisks={risks?.get(p.id)} />
      ))}
      {tail}
    </ul>
  );
}
