import { isTrackedKind, NOTE_DUE_LABEL, NOTE_KIND_LABEL, type NoteKind } from "@/features/projects/schema";
import { isOverdue } from "@/features/projects/tracking";
import { formatDate } from "@/lib/date";

// One tone per kind, from the existing tokens. A plain note gets no badge; a finished item turns neutral.
const TONE: Record<NoteKind, string | null> = {
  note: null,
  decision: "bg-accent/10 text-accent",
  milestone: "bg-info/10 text-info",
  bug: "bg-danger/10 text-danger",
  risk: "bg-warn/10 text-warn",
};

export function KindBadge({ kind, resolved = false }: { kind: NoteKind; resolved?: boolean }) {
  const tone = TONE[kind];
  if (!tone) return null;
  return (
    <span
      className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${resolved ? "bg-overlay text-muted" : tone}`}
    >
      {NOTE_KIND_LABEL[kind]}
    </span>
  );
}

/** "target 12 Okt"; red and "terlambat" once past due and still open. Nothing without a date. */
export function DueLabel({
  note,
  today,
}: {
  note: { kind: NoteKind; due_date: string | null; resolved_at: string | null };
  today: string;
}) {
  if (!note.due_date || !isTrackedKind(note.kind)) return null;
  const label = NOTE_DUE_LABEL[note.kind].toLowerCase();
  const late = isOverdue(note, today);
  return (
    <span className={`font-mono text-[11px] ${late ? "text-danger" : "text-muted"}`}>
      {late ? "terlambat" : label} · {formatDate(note.due_date, today)}
    </span>
  );
}
