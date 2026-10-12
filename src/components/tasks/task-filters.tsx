import Link from "next/link";
import { FilterGroup } from "@/components/ui/filter-group";
import type { PriorityFilter, ProjectOption, StatusFilter } from "@/features/tasks/schema";
import { formatDate } from "@/lib/date";
import { TaskToolbar } from "./task-toolbar";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Aktif" },
  { value: "overdue", label: "Terlambat" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "done", label: "Selesai" },
  { value: "all", label: "Semua" },
];

type Current = { status: StatusFilter; priority: PriorityFilter; projectId: string; q: string; due: string };

function href({ status, priority, projectId, q, due }: Current) {
  const p = new URLSearchParams();
  if (status !== "open") p.set("status", status);
  if (priority !== "all") p.set("priority", priority);
  if (projectId) p.set("project", projectId);
  if (q) p.set("q", q);
  if (due) p.set("due", due);
  const qs = p.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

const clearLink =
  "inline-flex min-h-8 items-center text-fg underline underline-offset-2 hover:text-accent pointer-coarse:min-h-11";

export function TaskFilters({
  status,
  priority,
  projectId,
  q,
  due,
  count,
  counts,
  projects,
}: Current & {
  /** Number of tasks currently listed; the search summary only appears when there are some. */
  count: number;
  /** Tasks per status chip, under the current priority/project/search/date filters. */
  counts: Record<StatusFilter, number>;
  projects: ProjectOption[];
}) {
  const now: Current = { status, priority, projectId, q, due };
  return (
    <div className="space-y-3">
      <TaskToolbar status={status} priority={priority} projectId={projectId} q={q} due={due} projects={projects} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <FilterGroup
          label="Status"
          hideLabel
          options={STATUS_OPTIONS.map((o) => ({ ...o, count: counts[o.value] }))}
          current={status}
          build={(s) => href({ ...now, status: s })}
        />
        <p role="status" className="font-mono text-[11px] text-muted">
          {count} task
        </p>
      </div>
      {due && (
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>
            Tenggat <span className="font-mono text-fg">{formatDate(due, due)}</span>
          </span>
          <Link href={href({ ...now, due: "" })} className={clearLink}>
            Semua tanggal
          </Link>
        </p>
      )}
      {q && count > 0 && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>
            {count} hasil untuk “{q}”
          </span>
          <Link href={href({ ...now, q: "" })} className={clearLink}>
            Hapus pencarian
          </Link>
        </p>
      )}
    </div>
  );
}
