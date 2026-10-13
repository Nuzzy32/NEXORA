"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { createProject, deleteProject, updateProject } from "@/features/projects/actions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type Project } from "@/features/projects/schema";
import { IDLE } from "@/lib/action-state";

export function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction, pending] = useActionState(project ? updateProject.bind(null, project.id) : createProject, IDLE);
  useCloseOnSuccess(state, project ? "Proyek diperbarui" : undefined);
  const { v, err, onInput } = useFieldHelpers(state);

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
        <Field label="Nama" htmlFor="name" error={err("name")}>
          <input
            id="name" name="name" required maxLength={120} autoFocus
            defaultValue={v("name", project?.name)} className={inputClass}
            aria-invalid={Boolean(err("name"))} aria-describedby={err("name") ? "name-error" : undefined}
          />
        </Field>
        <Field label="Ringkasan (opsional)" htmlFor="summary" error={err("summary")}>
          <textarea
            id="summary" name="summary" rows={3} maxLength={2000}
            defaultValue={v("summary", project?.summary)} className={inputClass}
          />
        </Field>
        <Field label="Status" htmlFor="status" error={err("status")}>
          <select id="status" name="status" defaultValue={v("status", project?.status ?? "active")} className={inputClass}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai (opsional)" htmlFor="starts_on" error={err("starts_on")}>
            <input id="starts_on" name="starts_on" type="date" defaultValue={v("starts_on", project?.starts_on)} className={inputClass} />
          </Field>
          <Field label="Target selesai (opsional)" htmlFor="due_on" error={err("due_on")}>
            <input
              id="due_on" name="due_on" type="date" defaultValue={v("due_on", project?.due_on)} className={inputClass}
              aria-invalid={Boolean(err("due_on"))} aria-describedby={err("due_on") ? "due_on-error" : undefined}
            />
          </Field>
        </div>
        <Field label="Repo GitHub (opsional)" htmlFor="github_repo" error={err("github_repo")}>
          <input
            id="github_repo" name="github_repo" placeholder="pemilik/nama-repo" maxLength={200} autoCapitalize="off" spellCheck={false}
            defaultValue={v("github_repo", project?.github_repo)} className={inputClass + " font-mono"}
            aria-invalid={Boolean(err("github_repo"))} aria-describedby={err("github_repo") ? "github_repo-error" : undefined}
          />
        </Field>
        <FormActions pending={pending} message={state.message} saveLabel={project ? "Simpan" : "Buat proyek"} />
      </form>
      {project && (
        <ConfirmDelete
          action={deleteProject.bind(null, project.id)}
          label="Hapus proyek"
          message="Hapus proyek dan semua catatannya? Task tetap ada tanpa proyek."
        />
      )}
    </div>
  );
}
