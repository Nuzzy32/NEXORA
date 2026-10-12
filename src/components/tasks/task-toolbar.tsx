"use client";

import Form from "next/form";
import { inputClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import {
  PRIORITY_LABEL,
  TASK_PRIORITIES,
  type PriorityFilter,
  type ProjectOption,
  type StatusFilter,
} from "@/features/tasks/schema";

const select =
  "min-h-9 max-w-full min-w-0 flex-[1_1_0] rounded-md border sm:flex-none border-line bg-surface px-2.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-fg pointer-coarse:min-h-11";

/**
 * Search box + priority and project selects in one GET form, so every filter lives in the URL.
 * Native selects (best on phones); picking one submits at once, Enter submits the search.
 * Remounts when the URL changes, so the fields never show stale values.
 */
export function TaskToolbar({
  status,
  priority,
  projectId,
  q,
  due,
  projects,
  hidden,
}: {
  status: StatusFilter;
  priority: PriorityFilter;
  projectId: string;
  q: string;
  due: string;
  projects: ProjectOption[];
  /** Extra fields kept across a submit (e.g. the calendar view and month). */
  hidden?: Record<string, string>;
}) {
  const submit = (e: { currentTarget: HTMLSelectElement }) => e.currentTarget.form?.requestSubmit();
  return (
    <Form key={`${q}|${priority}|${projectId}`} action="/tasks" role="search" className="flex flex-wrap items-center gap-2">
      {status !== "open" && <input type="hidden" name="status" value={status} />}
      {due && <input type="hidden" name="due" value={due} />}
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="relative min-w-0 flex-[1_1_100%] sm:flex-[1_1_14rem] sm:max-w-sm">
        <label htmlFor="task-search" className="sr-only">
          Cari task
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          id="task-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari task…"
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          className={inputClass + " pl-9"}
        />
      </div>
      <label htmlFor="priority-filter" className="sr-only">
        Prioritas
      </label>
      <select id="priority-filter" name="priority" defaultValue={priority} onChange={submit} className={select}>
        <option value="all">Semua prioritas</option>
        {TASK_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            Prioritas {PRIORITY_LABEL[p].toLowerCase()}
          </option>
        ))}
      </select>
      {projects.length > 0 && (
        <>
          <label htmlFor="project-filter" className="sr-only">
            Proyek
          </label>
          <select id="project-filter" name="project" defaultValue={projectId} onChange={submit} className={select + " sm:max-w-52"}>
            <option value="">Semua proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived ? " (diarsipkan)" : ""}
              </option>
            ))}
          </select>
        </>
      )}
    </Form>
  );
}
