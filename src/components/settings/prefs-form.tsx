"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { savePrefs } from "@/features/settings/actions";
import { TASKS_VIEW_LABEL, TASKS_VIEWS, type TasksView } from "@/features/settings/schema";
import { IDLE } from "@/lib/action-state";

const HINT: Record<TasksView, string> = {
  calendar: "Grid bulan dengan panel hari terpilih.",
  list: "Daftar task dikelompokkan per tenggat.",
};

/** The saved view is only the default: `?view=` in a link and status/due links still decide first (D-019). */
export function PrefsForm({ view }: { view: TasksView }) {
  const [state, action, pending] = useActionState(savePrefs, IDLE);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status === "ok") notify(state.message ?? "Preferensi disimpan.");
  }, [state, notify]);

  const error = state.fieldErrors?.default_tasks_view?.[0];
  return (
    <form action={action} className="space-y-3">
      <fieldset aria-describedby={error ? "view-error" : undefined} className="min-w-0 space-y-2">
        <legend className="mb-2 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">Tampilan Tasks bawaan</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TASKS_VIEWS.map((v) => (
            <label key={v} className="relative block cursor-pointer">
              <input
                type="radio"
                name="default_tasks_view"
                value={v}
                defaultChecked={(state.values?.default_tasks_view ?? view) === v}
                className="peer sr-only"
              />
              <span className="block min-h-11 rounded-md border border-line bg-surface px-3 py-2 transition-colors peer-checked:border-accent peer-checked:bg-raised peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:bg-raised/60">
                <span className="block text-[13px] font-medium">{TASKS_VIEW_LABEL[v]}</span>
                <span className="block text-xs text-muted">{HINT[v]}</span>
              </span>
            </label>
          ))}
        </div>
        {error && (
          <p id="view-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </fieldset>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan preferensi"}
      </Button>
    </form>
  );
}
