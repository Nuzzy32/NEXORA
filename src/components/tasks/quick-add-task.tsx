"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, inputClass } from "@/components/ui/button";
import { useFieldHelpers } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { deleteTask, quickAddTask } from "@/features/tasks/actions";
import { IDLE } from "@/lib/action-state";

const TYPING = "input, textarea, select, [contenteditable]";

/** One input, Enter adds. Detail (priority, date, project) stays in the "Task baru" dialog. */
export function QuickAddTask({
  projectId,
  due,
  placeholder = "Tambah task, lalu Enter…",
  shortcut,
}: {
  projectId?: string;
  /** "today" (resolved on the server) or a YYYY-MM-DD date. */
  due?: string;
  placeholder?: string;
  /** A single key (e.g. "c") that focuses the input from anywhere on the page, unless the user is typing. */
  shortcut?: string;
}) {
  const [state, formAction, pending] = useActionState(quickAddTask.bind(null, projectId ?? null, due ?? null), IDLE);
  const { v, err, onInput } = useFieldHelpers(state);
  const input = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status !== "ok") return;
    // Keep the keyboard flow going: the cursor is back in the box, and the toast offers an undo.
    input.current?.focus();
    const id = state.id;
    notify(state.message ?? "Task ditambahkan", {
      action: id
        ? {
            label: "Urungkan",
            run: async () => {
              const result = await deleteTask(id);
              if (result.status === "error") throw new Error(result.message);
            },
          }
        : undefined,
    });
  }, [state, notify]);

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== shortcut || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest(TYPING)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault(); // otherwise the key would be typed into the freshly focused input
      input.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  const error = err("title") ?? (state.status === "error" ? state.message : undefined);
  return (
    <form action={formAction} onInput={onInput} noValidate>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="plus" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            name="title"
            aria-label="Tambah task"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "quick-add-error" : undefined}
            aria-keyshortcuts={shortcut?.toUpperCase()}
            placeholder={placeholder}
            maxLength={200}
            autoComplete="off"
            defaultValue={v("title")}
            className={inputClass + " pr-10 pl-9"}
          />
          {shortcut && (
            <kbd aria-hidden className="kbd pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 max-md:hidden">
              {shortcut.toUpperCase()}
            </kbd>
          )}
        </div>
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "Menambah…" : "Tambah"}
        </Button>
      </div>
      {error && (
        <p id="quick-add-error" role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
