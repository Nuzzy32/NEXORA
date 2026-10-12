"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { createNote, deleteNote, updateNote } from "@/features/projects/note-actions";
import { NOTE_KINDS, NOTE_KIND_LABEL, type Note } from "@/features/projects/schema";
import { IDLE } from "@/lib/action-state";

// Literal class names (Tailwind only sees whole strings): shown while milestone, bug or risk is selected.
const SHOW_FOR_TRACKED =
  "hidden group-has-[option[value=milestone]:checked]/form:block group-has-[option[value=bug]:checked]/form:block group-has-[option[value=risk]:checked]/form:block";

export function NoteForm({ projectId, note }: { projectId: string; note?: Note }) {
  const [state, formAction, pending] = useActionState(
    note ? updateNote.bind(null, note.id) : createNote.bind(null, projectId),
    IDLE,
  );
  useCloseOnSuccess(state, note ? "Catatan diperbarui" : "Catatan disimpan");
  const { v, err, onInput } = useFieldHelpers(state);

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="group/form space-y-4" noValidate>
        <Field label="Judul" htmlFor="title" error={err("title")}>
          <input
            id="title" name="title" required maxLength={200} autoFocus
            defaultValue={v("title", note?.title)} className={inputClass}
            aria-invalid={Boolean(err("title"))} aria-describedby={err("title") ? "title-error" : undefined}
          />
        </Field>
        <Field label="Jenis" htmlFor="kind" error={err("kind")}>
          <select id="kind" name="kind" defaultValue={v("kind", note?.kind ?? "note")} className={inputClass}>
            {NOTE_KINDS.map((k) => (
              <option key={k} value={k}>{NOTE_KIND_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        {/* Pure CSS: follows the <select> (also after a restored draft) and needs no state. A hidden date is ignored server-side. */}
        <div className={SHOW_FOR_TRACKED}>
          <Field label="Target / tenggat (opsional)" htmlFor="due_date" error={err("due_date")}>
            <input
              id="due_date" name="due_date" type="date" defaultValue={v("due_date", note?.due_date)}
              className={inputClass} aria-invalid={Boolean(err("due_date"))}
              aria-describedby={err("due_date") ? "due_date-error" : undefined}
            />
          </Field>
        </div>
        <Field label="Isi" htmlFor="body" error={err("body")}>
          <textarea
            id="body" name="body" rows={9} maxLength={20000}
            defaultValue={v("body", note?.body)} className={inputClass + " resize-y"}
          />
        </Field>
        <FormActions pending={pending} message={state.message} />
      </form>
      {note && (
        <ConfirmDelete
          action={deleteNote.bind(null, note.id)}
          label="Hapus catatan"
          message="Hapus catatan ini secara permanen?"
          doneMessage="Catatan dihapus"
        />
      )}
    </div>
  );
}
