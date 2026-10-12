"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { browserStore, readDraft, removeDraft, writeDraft, type DraftValues } from "@/lib/draft";
import { useToast } from "./toast";

type DialogApi = { close: () => void; clearDraft: () => void };
const DialogContext = createContext<DialogApi>({ close: () => {}, clearDraft: () => {} });

/** Lets a form rendered inside <FormDialog> close it. */
export const useDialogClose = () => useContext(DialogContext).close;

/** After a successful submit: drop the saved draft, close the surrounding dialog, and confirm with a toast. */
export function useCloseOnSuccess(state: ActionState, successMessage?: string) {
  const { close, clearDraft } = useContext(DialogContext);
  const { notify } = useToast();
  useEffect(() => {
    if (state.status === "ok") {
      clearDraft();
      close();
      if (successMessage) notify(successMessage);
    }
  }, [state, close, clearDraft, notify, successMessage]);
}

type FieldEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const isField = (el: unknown): el is FieldEl =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

/**
 * Trigger button + native <dialog> (focus trap and Esc come from the platform).
 * Children mount only while open, so forms start fresh every time.
 * With `draftKey`, what the user typed survives an accidental close and is restored next time.
 */
export function FormDialog({
  title,
  trigger,
  triggerClassName,
  triggerLabel,
  draftKey,
  children,
}: {
  title: string;
  trigger: ReactNode;
  triggerClassName: string;
  triggerLabel?: string;
  draftKey?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftValues | null>(null);
  const dirty = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const savePending = useRef(false);
  const titleId = useId();
  const close = useCallback(() => ref.current?.close(), []);

  const saveNow = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    if (!savePending.current || !draftKey) return;
    savePending.current = false;
    const form = ref.current?.querySelector("form");
    if (!form) return;
    const values: DraftValues = {};
    let hasText = false;
    for (const el of Array.from(form.elements)) {
      if (!isField(el) || !el.name) continue;
      values[el.name] = el.value;
      if (!(el instanceof HTMLSelectElement) && el.value.trim() !== "") hasText = true;
    }
    if (hasText) writeDraft(browserStore(), draftKey, values);
    else removeDraft(browserStore(), draftKey);
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    savePending.current = false;
    if (draftKey) removeDraft(browserStore(), draftKey);
  }, [draftKey]);

  // Callback ref: runs when the content mounts (the form already exists then) and fills in a saved draft.
  const restoreDraft = useCallback(
    (node: HTMLDivElement | null) => {
      const form = node?.querySelector("form");
      if (!form || !draft) return;
      for (const [name, value] of Object.entries(draft)) {
        const el = form.elements.namedItem(name);
        if (isField(el)) el.value = value;
      }
    },
    [draft],
  );

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        onClick={() => {
          const saved = draftKey ? readDraft(browserStore(), draftKey) : null;
          dirty.current = saved !== null;
          savePending.current = false;
          setDraft(saved);
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => {
          saveNow(); // closing with Esc right after typing must still keep the text
          setOpen(false);
        }}
        // A stray click on the backdrop must not throw away typed text; Esc and Batal still close.
        onClick={(e) => e.target === ref.current && !dirty.current && close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-line-strong bg-overlay p-0 text-fg shadow-[0_24px_64px_-16px_rgb(0_0_0/0.7)] max-md:m-0 max-md:mt-auto max-md:max-h-[92dvh] max-md:w-full max-md:max-w-none max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0"
      >
        {open && (
          <DialogContext value={{ close, clearDraft }}>
            <div
              ref={restoreDraft}
              className="p-5 max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
              onInput={() => {
                dirty.current = true;
                if (!draftKey) return;
                savePending.current = true;
                window.clearTimeout(saveTimer.current);
                saveTimer.current = window.setTimeout(saveNow, 300);
              }}
            >
              <h2 id={titleId} className="mb-5 text-[17px] leading-6 font-semibold tracking-[-0.02em]">
                {title}
              </h2>
              {draft && (
                <p role="status" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-1 font-mono text-[11px] text-muted">
                  <span>Draft dipulihkan</span>
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center px-1 text-fg underline underline-offset-2 hover:text-accent"
                    onClick={() => {
                      clearDraft();
                      ref.current?.querySelector("form")?.reset();
                      dirty.current = false;
                      setDraft(null);
                    }}
                  >
                    Buang
                  </button>
                </p>
              )}
              {children}
            </div>
          </DialogContext>
        )}
      </dialog>
    </>
  );
}
