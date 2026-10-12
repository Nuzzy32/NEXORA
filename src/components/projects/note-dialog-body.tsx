"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDialogClose } from "@/components/ui/dialog";
import type { Note } from "@/features/projects/schema";
import { DueLabel, KindBadge } from "./note-kind-badge";
import { NoteForm } from "./note-form";

/** Notes open to read first (full text, no accidental typing); "Edit" switches to the form in place. */
export function NoteDialogBody({
  projectId,
  note,
  updatedLabel,
  today,
}: {
  projectId: string;
  note: Note;
  updatedLabel: string;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const close = useDialogClose();

  if (editing) return <NoteForm projectId={projectId} note={note} />;

  return (
    <article className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <KindBadge kind={note.kind} resolved={note.resolved_at !== null} />
          <DueLabel note={note} today={today} />
          {note.resolved_at !== null && <span className="font-mono text-[11px] text-ok">sudah selesai</span>}
          <span className="font-mono">Diperbarui {updatedLabel}</span>
        </div>
        <h3 className="mt-3 text-[1.5rem] leading-8 font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{note.title}</h3>
      </header>
      {note.body ? (
        <div className="text-[14.5px] leading-7 whitespace-pre-wrap text-fg/90 [overflow-wrap:anywhere]">{note.body}</div>
      ) : (
        <p className="text-sm text-muted">Catatan ini belum punya isi.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          Tutup
        </Button>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </article>
  );
}
