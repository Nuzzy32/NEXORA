"use client";

import type { CSSProperties } from "react";
import { FormDialog } from "@/components/ui/dialog";
import { TASK_DRAG_MIME } from "@/features/tasks/calendar";
import { PRIORITY_LABEL, STATUS_LABEL, type ProjectOption, type Task, type TaskPriority } from "@/features/tasks/schema";
import { projectColor } from "@/lib/color";
import { daysBetween, formatDate } from "@/lib/date";
import { StatusIcon } from "./status-icon";
import { TaskForm } from "./task-form";
import { useTaskActions } from "./use-task-actions";

const PRIORITY_TAG: Record<TaskPriority, string> = {
  high: "bg-accent/15 text-accent",
  medium: "bg-raised text-muted",
  low: "bg-raised text-faint",
};

/** Priority as a small mono tag (Tinggi / Sedang / Rendah). The words come from the task, nothing is invented. */
export function PriorityTag({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={
        "rounded-sm px-1.5 py-0.5 font-mono text-[10px] leading-3 font-semibold tracking-[0.04em] uppercase " +
        PRIORITY_TAG[priority]
      }
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** One dense line: status, title, then project chip, priority tag and date (they drop under the title when the row is narrow, by container width not viewport). */
export function TaskRow({
  task,
  today,
  projects,
  showProject = true,
  showDate = true,
  index = 0,
  draggable = false,
}: {
  task: Task;
  today: string;
  projects: ProjectOption[];
  showProject?: boolean;
  /** Hide the date when the surrounding group already says it (e.g. "Hari ini"). */
  showDate?: boolean;
  /** Position in the list, for the staggered entrance. */
  index?: number;
  /** Can be dragged onto a calendar cell to change the due date (mouse only; touch uses Edit). */
  draggable?: boolean;
}) {
  const { status, toggle, postpone, postponing } = useTaskActions(task);
  const done = status === "done";
  const overdue = !done && task.due_date !== null && task.due_date < today;
  const project = showProject ? projects.find((p) => p.id === task.project_id) : undefined;

  return (
    <li
      draggable={draggable || undefined}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      className={
        "rise @container flex items-center gap-1 pr-2 pl-1 transition-colors hover:bg-raised/60 " +
        (draggable ? "pointer-fine:cursor-grab" : "")
      }
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={done ? `Tandai belum selesai: ${task.title}` : `Selesaikan: ${task.title}`}
        className="group/check grid size-9 shrink-0 place-items-center pointer-coarse:size-11"
      >
        <StatusIcon status={status} late={overdue} />
      </button>

      <FormDialog
        title="Edit task"
        triggerLabel={`Edit task: ${task.title}`}
        triggerClassName="min-w-0 flex-1 rounded-md py-2 pr-1 text-left"
        trigger={
          <span className="flex min-w-0 flex-col gap-1 @lg:flex-row @lg:items-center @lg:gap-3">
            <span
              className={
                "min-w-0 truncate text-[13px] leading-[18px] font-medium @lg:flex-1 " +
                (done ? "text-muted line-through decoration-faint" : "text-fg")
              }
            >
              {task.title}
            </span>
            <span className={"flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 " + (done ? "opacity-70" : "")}>
              {status === "in_progress" && (
                <span className="font-mono text-[11px] text-muted">{STATUS_LABEL.in_progress}</span>
              )}
              {project && (
                <span className="inline-flex max-w-40 items-center gap-1.5 rounded-full bg-raised px-2 py-0.5 font-mono text-[11px] text-muted">
                  <i aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: projectColor(project.id) }} />
                  <span className="truncate">{project.name}</span>
                </span>
              )}
              {task.source === "elearning" && (
                <span
                  title="Diimpor dari e-learning UNAIR"
                  className="rounded-sm border border-line-strong px-1.5 py-px font-mono text-[10px] leading-3 font-semibold tracking-[0.04em] text-muted uppercase"
                >
                  UNAIR
                </span>
              )}
              <PriorityTag priority={task.priority} />
              {task.due_date && overdue && (
                <span className="font-mono text-[11px] text-danger @lg:min-w-24 @lg:text-right" title={formatDate(task.due_date, today)}>
                  Terlambat {daysBetween(task.due_date, today)} hari
                </span>
              )}
              {task.due_date && !overdue && showDate && (
                <span className="font-mono text-[11px] text-muted @lg:min-w-24 @lg:text-right">
                  {formatDate(task.due_date, today)}
                </span>
              )}
            </span>
          </span>
        }
      >
        <TaskForm task={task} projects={projects} />
      </FormDialog>

      {overdue && (
        <button
          type="button"
          onClick={postpone}
          disabled={postponing}
          aria-label={`Pindah ke besok: ${task.title}`}
          className="inline-flex min-h-8 shrink-0 items-center rounded-md px-2.5 font-mono text-[11px] text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-50 pointer-coarse:min-h-11"
        >
          Besok →
        </button>
      )}
    </li>
  );
}

export function TaskList({
  tasks,
  today,
  projects,
  showProject,
  showDate,
  bare = false,
  draggable,
}: {
  tasks: Task[];
  today: string;
  projects: ProjectOption[];
  showProject?: boolean;
  showDate?: boolean;
  /** No frame of its own: the caller wraps it in a card (task groups, dashboard panels). */
  bare?: boolean;
  draggable?: boolean;
}) {
  return (
    <ul className={"divide-y divide-line " + (bare ? "" : "overflow-hidden rounded-lg border border-line bg-surface")}>
      {tasks.map((t, i) => (
        <TaskRow key={t.id} task={t} today={today} projects={projects} showProject={showProject} showDate={showDate} index={i} draggable={draggable} />
      ))}
    </ul>
  );
}
