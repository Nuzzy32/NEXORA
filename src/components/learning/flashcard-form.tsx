"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { createFlashcard, deleteFlashcard, updateFlashcard } from "@/features/learning/flashcard-actions";
import type { Flashcard } from "@/features/learning/flashcards";
import { IDLE } from "@/lib/action-state";

/** Add (with `documentId`) or edit (with `card`) one hand-written card. Editing keeps the schedule. */
export function FlashcardForm({ documentId, card }: { documentId: string; card?: Flashcard }) {
  const [state, formAction, pending] = useActionState(
    card ? updateFlashcard.bind(null, card.id) : createFlashcard.bind(null, documentId),
    IDLE,
  );
  useCloseOnSuccess(state, card ? "Kartu diperbarui" : "Kartu ditambahkan");
  const { v, err, onInput } = useFieldHelpers(state);

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
        <Field label="Pertanyaan" htmlFor="front" error={err("front")}>
          <textarea
            id="front" name="front" rows={3} required maxLength={1000} autoFocus
            defaultValue={v("front", card?.front)} className={inputClass + " resize-y"}
            aria-invalid={Boolean(err("front"))} aria-describedby={err("front") ? "front-error" : undefined}
          />
        </Field>
        <Field label="Jawaban" htmlFor="back" error={err("back")}>
          <textarea
            id="back" name="back" rows={5} required maxLength={2000}
            defaultValue={v("back", card?.back)} className={inputClass + " resize-y"}
            aria-invalid={Boolean(err("back"))} aria-describedby={err("back") ? "back-error" : undefined}
          />
        </Field>
        <FormActions pending={pending} message={state.message} saveLabel={card ? "Simpan" : "Tambah kartu"} />
      </form>
      {card && (
        <ConfirmDelete action={deleteFlashcard.bind(null, card.id)} label="Hapus kartu" message="Hapus kartu ini?" doneMessage="Kartu dihapus" />
      )}
    </div>
  );
}
