"use client";

import { useActionState, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { IDLE, type ActionState } from "@/lib/action-state";
import { Button } from "./button";
import { useDialogClose } from "./dialog";
import { useToast } from "./toast";

const NONE: ReadonlySet<string> = new Set();

/**
 * Read a field's value (re-seeded after a failed submit) and error from an action state.
 * A field's error disappears once the user edits it, until the next submit returns new ones;
 * put `onInput` on the <form>.
 */
export function useFieldHelpers(state: ActionState) {
  const [edited, setEdited] = useState<{ state: ActionState; names: ReadonlySet<string> }>({ state, names: NONE });
  const names = edited.state === state ? edited.names : NONE;
  return {
    v: (name: string, fallback?: string | null) => state.values?.[name] ?? fallback ?? "",
    err: (name: string) => (names.has(name) ? undefined : state.fieldErrors?.[name]?.[0]),
    onInput: (e: FormEvent<HTMLFormElement>) => {
      const name = (e.target as HTMLInputElement).name;
      if (name && !names.has(name)) setEdited({ state, names: new Set(names).add(name) });
    },
  };
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-mono text-[11px] tracking-[0.04em] text-muted uppercase">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Cancel / save row with the operation-level error message above it. */
export function FormActions({ pending, message, saveLabel = "Simpan" }: { pending: boolean; message?: string; saveLabel?: string }) {
  const close = useDialogClose();
  return (
    <>
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : saveLabel}
        </Button>
      </div>
    </>
  );
}

/**
 * Destructive action behind a second click (PRD §12). `action` is a bound Server Action that either
 * returns { status: "ok" } (the dialog then closes) or redirects.
 */
export function ConfirmDelete({
  action,
  label,
  message,
  doneMessage,
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  label: string;
  message: string;
  /** Toast shown after the item is gone (not used when the action redirects). */
  doneMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [confirming, setConfirming] = useState(false);
  const close = useDialogClose();
  const { notify } = useToast();

  useEffect(() => {
    if (state.status === "ok") {
      close();
      if (doneMessage) notify(doneMessage);
    }
  }, [state, close, notify, doneMessage]);

  return (
    <div className="border-t border-line-strong pt-4">
      {state.status === "error" && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">{message}</span>
          <span className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </span>
        </form>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          {label}
        </Button>
      )}
    </div>
  );
}
