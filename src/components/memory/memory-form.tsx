"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { createMemory, deleteMemory, updateMemory } from "@/features/memory/actions";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LABEL, type MemoryItem } from "@/features/memory/schema";
import type { ProjectOption } from "@/features/tasks/schema";
import { IDLE } from "@/lib/action-state";

export function MemoryForm({ item, projects }: { item?: MemoryItem; projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(item ? updateMemory.bind(null, item.id) : createMemory, IDLE);
  useCloseOnSuccess(state, item ? "Memory diperbarui" : "Memory disimpan");
  const { v, err, onInput } = useFieldHelpers(state);
  // Archived projects stay selectable only when the item already points at one.
  const options = projects.filter((p) => !p.archived || p.id === item?.project_id);

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
        <Field label="Judul" htmlFor="title" error={err("title")}>
          <input
            id="title" name="title" required maxLength={200} autoFocus
            defaultValue={v("title", item?.title)} className={inputClass}
            aria-invalid={Boolean(err("title"))} aria-describedby={err("title") ? "title-error" : undefined}
          />
        </Field>
        <Field label="Kategori" htmlFor="category" error={err("category")}>
          <select id="category" name="category" defaultValue={v("category", item?.category ?? "project_note")} className={inputClass}>
            {MEMORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{MEMORY_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Isi" htmlFor="content" error={err("content")}>
          <textarea
            id="content" name="content" rows={8} required maxLength={10000}
            defaultValue={v("content", item?.content)} className={inputClass + " resize-y"}
            aria-invalid={Boolean(err("content"))} aria-describedby={err("content") ? "content-error" : undefined}
          />
        </Field>
        <Field label="Tag (opsional, pisahkan dengan koma)" htmlFor="tags" error={err("tags")}>
          <input
            id="tags" name="tags" placeholder="supabase, rls"
            defaultValue={v("tags", item?.tags.join(", "))} className={inputClass + " font-mono"}
            aria-invalid={Boolean(err("tags"))} aria-describedby={err("tags") ? "tags-error" : undefined}
          />
        </Field>
        {options.length > 0 && (
          <Field label="Proyek (opsional)" htmlFor="project_id" error={err("project_id")}>
            <select id="project_id" name="project_id" defaultValue={v("project_id", item?.project_id)} className={inputClass}>
              <option value="">Tanpa proyek</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.archived ? " (diarsipkan)" : ""}</option>
              ))}
            </select>
          </Field>
        )}
        <FormActions pending={pending} message={state.message} />
      </form>
      {item && (
        <ConfirmDelete
          action={deleteMemory.bind(null, item.id)}
          label="Hapus memory"
          message="Hapus memory ini secara permanen?"
          doneMessage="Memory dihapus"
        />
      )}
    </div>
  );
}
