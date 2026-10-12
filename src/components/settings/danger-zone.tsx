"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, buttonClass, inputClass } from "@/components/ui/button";
import { FormDialog, useDialogClose } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { deleteData } from "@/features/settings/actions";
import { CONFIRM_WORD, type DeleteCategory } from "@/features/settings/schema";
import { IDLE } from "@/lib/action-state";

export type DangerItem = {
  category: DeleteCategory;
  title: string;
  /** Question in the dialog header. */
  dialogTitle: string;
  hint: string;
  /** "12 memory", or "" when there is nothing to delete. Computed on the server. */
  summary: string;
};

/** Body of one confirm dialog. States the row counts and that it is permanent; "all" also needs the typed word. */
function DeleteBody({ item }: { item: DangerItem }) {
  const [state, action, pending] = useActionState(deleteData.bind(null, item.category), IDLE);
  const [typed, setTyped] = useState("");
  const close = useDialogClose();
  const { notify } = useToast();
  const needsWord = item.category === "all";
  const ready = !needsWord || typed.trim() === CONFIRM_WORD;

  useEffect(() => {
    if (state.status === "ok") {
      close();
      notify(state.message ?? "Data dihapus.");
    }
  }, [state, close, notify]);

  const typedError = state.fieldErrors?.confirm?.[0];
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm">
        Akan terhapus: <span className="font-mono text-[13px]">{item.summary}</span>. {item.hint}
      </p>
      <p className="text-sm font-medium text-danger">Penghapusan ini permanen dan tidak bisa diurungkan.</p>
      {needsWord && (
        <Field label={`Ketik ${CONFIRM_WORD} untuk mengonfirmasi`} htmlFor="confirm-word" error={typedError}>
          <input
            id="confirm-word"
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(typedError)}
            aria-describedby={typedError ? "confirm-word-error" : undefined}
            className={inputClass + " font-mono"}
          />
        </Field>
      )}
      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" variant="danger" disabled={pending || !ready}>
          {pending ? "Menghapus…" : "Ya, hapus permanen"}
        </Button>
      </div>
    </form>
  );
}

export function DangerList({ items }: { items: DangerItem[] }) {
  return (
    <ul className="divide-y divide-danger/20">
      {items.map((item) => (
        <li key={item.category} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4">
          <div className="min-w-0 flex-1 basis-72">
            <p className="text-[13px] font-medium">{item.title}</p>
            <p className="mt-1 text-[13px] leading-5 text-muted">{item.hint}</p>
            <p className="mt-1 font-mono text-[11px] text-faint">{item.summary || "Tidak ada data"}</p>
          </div>
          {item.summary ? (
            <FormDialog
              title={item.dialogTitle}
              trigger="Hapus…"
              triggerClassName={buttonClass("danger", "shrink-0")}
              triggerLabel={`Hapus ${item.title}`}
            >
              <DeleteBody item={item} />
            </FormDialog>
          ) : (
            <Button variant="danger" disabled className="shrink-0">
              Hapus…
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
