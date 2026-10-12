"use client";

import { useActionState } from "react";
import { Button, buttonClass, inputClass } from "@/components/ui/button";
import { FormDialog, useCloseOnSuccess, useDialogClose } from "@/components/ui/dialog";
import { Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { deleteConversation, renameConversation } from "@/features/ai/actions";
import { MAX_TITLE } from "@/features/ai/schema";
import { IDLE } from "@/lib/action-state";

const iconButton =
  "grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg pointer-coarse:size-11";

/** Rename and delete for the open conversation. Each opens a dialog; delete asks for confirmation. */
export function ConversationActions({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex items-center">
      <FormDialog title="Ganti judul" trigger={<Icon name="edit" className="size-4" />} triggerLabel="Ganti judul" triggerClassName={iconButton}>
        <RenameForm id={id} title={title} />
      </FormDialog>
      <FormDialog title="Hapus percakapan?" trigger={<Icon name="trash" className="size-4" />} triggerLabel="Hapus percakapan" triggerClassName={iconButton}>
        <DeleteForm id={id} title={title} />
      </FormDialog>
    </div>
  );
}

function RenameForm({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState(renameConversation.bind(null, id), IDLE);
  useCloseOnSuccess(state, "Judul diperbarui");
  const { v, err, onInput } = useFieldHelpers(state);
  return (
    <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
      <Field label="Judul" htmlFor="conversation-title" error={err("title")}>
        <input
          id="conversation-title"
          name="title"
          required
          autoFocus
          maxLength={MAX_TITLE}
          defaultValue={v("title", title)}
          className={inputClass}
          aria-invalid={Boolean(err("title"))}
          aria-describedby={err("title") ? "conversation-title-error" : undefined}
        />
      </Field>
      <FormActions pending={pending} message={state.message} />
    </form>
  );
}

function DeleteForm({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState(deleteConversation.bind(null, id), IDLE);
  const close = useDialogClose();
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        “<span className="text-fg [overflow-wrap:anywhere]">{title}</span>” dan semua pesannya dihapus permanen dari Nexora.
      </p>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close} disabled={pending}>
          Batal
        </Button>
        <button type="submit" disabled={pending} className={buttonClass("danger")}>
          {pending ? "Menghapus…" : "Ya, hapus"}
        </button>
      </div>
    </form>
  );
}
