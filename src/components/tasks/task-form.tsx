"use client";

import { useActionState } from "react";
import { createTask, deleteTask, updateTask } from "@/features/tasks/actions";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ProjectOption,
  type Task,
} from "@/features/tasks/schema";
import { inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { IDLE } from "@/lib/action-state";

export function TaskForm({
  task,
  projects,
  defaultProjectId,
}: {
  task?: Task;
  projects: ProjectOption[];
  defaultProjectId?: string;
}) {
  const [state, formAction, pending] = useActionState(task ? updateTask.bind(null, task.id) : createTask, IDLE);
  useCloseOnSuccess(state, task ? "Task diperbarui" : "Task dibuat");
  const { v, err, onInput } = useFieldHelpers(state);
  const options = projects.filter((p) => !p.archived || p.id === task?.project_id || p.id === defaultProjectId);

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
        <Field label="Judul" htmlFor="title" error={err("title")}>
          <input
            id="title" name="title" required maxLength={200} autoFocus
            defaultValue={v("title", task?.title)} className={inputClass}
            aria-invalid={Boolean(err("title"))} aria-describedby={err("title") ? "title-error" : undefined}
          />
        </Field>
        <Field label="Deskripsi (opsional)" htmlFor="description" error={err("description")}>
          <textarea
            id="description" name="description" rows={3} maxLength={5000}
            defaultValue={v("description", task?.description)} className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="status" error={err("status")}>
            <select id="status" name="status" defaultValue={v("status", task?.status ?? "todo")} className={inputClass}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioritas" htmlFor="priority" error={err("priority")}>
            <select id="priority" name="priority" defaultValue={v("priority", task?.priority ?? "medium")} className={inputClass}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jatuh tempo (opsional)" htmlFor="due_date" error={err("due_date")}>
            <input
              id="due_date" name="due_date" type="date"
              defaultValue={v("due_date", task?.due_date)} className={inputClass}
            />
          </Field>
          {options.length > 0 && (
            <Field label="Proyek (opsional)" htmlFor="project_id" error={err("project_id")}>
              <select
                id="project_id" name="project_id" className={inputClass}
                defaultValue={v("project_id", task?.project_id ?? defaultProjectId)}
              >
                <option value="">Tanpa proyek</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.archived ? " (diarsipkan)" : ""}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <FormActions pending={pending} message={state.message} />
      </form>
      {task && (
        <ConfirmDelete
          action={deleteTask.bind(null, task.id)}
          label="Hapus task"
          message="Hapus task ini secara permanen?"
          doneMessage="Task dihapus"
        />
      )}
    </div>
  );
}
