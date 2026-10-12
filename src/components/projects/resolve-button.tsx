"use client";

import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { toggleNoteResolved } from "@/features/projects/note-actions";
import { NOTE_RESOLVE_LABEL, type TrackedKind } from "@/features/projects/schema";

/**
 * Round check for a milestone, bug or risk. Flips at once and snaps back by itself if the server refuses;
 * the toast offers "Urungkan".
 */
export function ResolveButton({
  noteId,
  kind,
  resolved,
  title,
}: {
  noteId: string;
  kind: TrackedKind;
  resolved: boolean;
  title: string;
}) {
  const [shown, setShown] = useOptimistic<boolean, boolean>(resolved, (_, next) => next);
  const [pending, start] = useTransition();
  const { notify } = useToast();
  const verb = NOTE_RESOLVE_LABEL[kind];

  const set = (next: boolean) =>
    start(async () => {
      setShown(next);
      const r = await toggleNoteResolved(noteId, next).catch(() => null);
      if (r?.status !== "ok") {
        notify(r?.message ?? "Status gagal diubah. Coba lagi.", { tone: "error" });
        return;
      }
      notify(next ? `${verb}: ${title}` : "Dibuka lagi", {
        action: { label: "Urungkan", run: () => set(!next) },
      });
    });

  return (
    <button
      type="button"
      onClick={() => set(!shown)}
      aria-pressed={shown}
      aria-busy={pending}
      aria-label={`${verb}: ${title}`}
      className="group/check grid size-9 shrink-0 place-items-center self-start pointer-coarse:size-11"
    >
      <span
        className={
          "grid size-5 place-items-center rounded-full border transition-colors group-hover/check:border-ok " +
          (shown ? "border-ok bg-ok text-ok-ink" : "border-line-strong text-transparent group-hover/check:text-ok")
        }
      >
        <Icon name="check" className="size-3" />
      </span>
    </button>
  );
}
