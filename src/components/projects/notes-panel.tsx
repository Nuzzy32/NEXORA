import type { CSSProperties } from "react";
import Form from "next/form";
import Link from "next/link";
import { Button, buttonClass, inputClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog } from "@/components/ui/dialog";
import { FilterGroup } from "@/components/ui/filter-group";
import { isTrackedKind, NOTE_KIND_FILTERS, NOTE_KIND_LABEL, type Note, type NoteKindFilter } from "@/features/projects/schema";
import { formatDate, localDate } from "@/lib/date";
import { NoteDialogBody } from "./note-dialog-body";
import { NoteForm } from "./note-form";
import { DueLabel, KindBadge } from "./note-kind-badge";
import { ResolveButton } from "./resolve-button";

export function NotesPanel({
  projectId,
  notes,
  q,
  kind,
  counts,
  today,
}: {
  projectId: string;
  notes: Note[];
  q: string;
  kind: NoteKindFilter;
  /** Notes per kind for the whole project, ignoring the search box; `all` is the total. */
  counts: Record<NoteKindFilter, number>;
  today: string;
}) {
  const hasAnyNotes = counts.all > 0;
  const kindOptions = NOTE_KIND_FILTERS.map((value) => ({
    value,
    label: value === "all" ? "Semua" : NOTE_KIND_LABEL[value],
    count: counts[value],
  }));
  const base = `/projects/${projectId}`;
  const href = (k: NoteKindFilter) => {
    const p = new URLSearchParams({ tab: "notes" });
    if (k !== "all") p.set("kind", k);
    if (q) p.set("q", q);
    return `${base}?${p}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Form action={base} className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
          <input type="hidden" name="tab" value="notes" />
          {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          <input
            type="search" name="q" defaultValue={q} placeholder="Cari catatan…" aria-label="Cari catatan"
            maxLength={100} className={inputClass}
          />
          <Button type="submit" variant="ghost">Cari</Button>
        </Form>
        <FormDialog
          title="Catatan baru"
          trigger="Catatan baru"
          triggerClassName={buttonClass("primary")}
          draftKey={`note:${projectId}`}
        >
          <NoteForm projectId={projectId} />
        </FormDialog>
      </div>

      {hasAnyNotes && <FilterGroup label="Jenis" options={kindOptions} current={kind} build={href} />}

      {notes.length > 0 && (q || kind !== "all") && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>
            {notes.length} hasil{q ? ` untuk “${q}”` : ""}
          </span>
          <Link href={`${base}?tab=notes`} className="inline-flex min-h-8 items-center text-fg underline underline-offset-2 hover:text-accent pointer-coarse:min-h-11">
            Hapus filter
          </Link>
        </p>
      )}

      {notes.length === 0 ? (
        hasAnyNotes ? (
          <EmptyState
            icon={kind !== "all" && !q ? "note" : "search"}
            title={kind !== "all" && !q ? `Belum ada ${NOTE_KIND_LABEL[kind].toLowerCase()}` : "Tidak ada catatan yang cocok"}
            hint={
              kind !== "all" && !q
                ? "Tambahkan lewat “Catatan baru” dan pilih jenis ini."
                : "Coba kata kunci lain atau ubah filter jenis."
            }
          >
            <Link href={`${base}?tab=notes`} className={buttonClass("ghost")}>Hapus filter</Link>
          </EmptyState>
        ) : (
          <EmptyState
            icon="note"
            title="Belum ada catatan"
            hint="Simpan keputusan teknis, milestone, bug, risiko, dan hal penting lain tentang proyek ini."
          />
        )
      ) : (
        <ul className="space-y-2">
          {notes.map((n, i) => (
            <li key={n.id} className="rise flex items-stretch gap-1" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
              {isTrackedKind(n.kind) && (
                <ResolveButton noteId={n.id} kind={n.kind} resolved={n.resolved_at !== null} title={n.title} />
              )}
              <FormDialog
                title="Catatan"
                triggerLabel={`Buka catatan: ${n.title}`}
                triggerClassName="relative block min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface p-4 text-left transition-colors duration-200 hover:border-line-strong hover:bg-raised"
                trigger={
                  <>
                    {/* Decisions carry the accent edge, the same mark as high-priority tasks. */}
                    {n.kind === "decision" && (
                      <span aria-hidden className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent" />
                    )}
                    <span className="flex items-center gap-3">
                      <span
                        className={
                          "truncate text-[15px] leading-6 font-semibold tracking-[-0.01em] " +
                          (n.resolved_at !== null ? "text-muted line-through decoration-faint" : "")
                        }
                      >
                        {n.title}
                      </span>
                      <KindBadge kind={n.kind} resolved={n.resolved_at !== null} />
                    </span>
                    {n.body && <span className="mt-1.5 line-clamp-2 text-sm text-muted">{n.body}</span>}
                    <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
                      <DueLabel note={n} today={today} />
                      <span>Diperbarui {formatDate(localDate(n.updated_at), today)}</span>
                    </span>
                  </>
                }
              >
                <NoteDialogBody
                  projectId={projectId}
                  note={n}
                  today={today}
                  updatedLabel={formatDate(localDate(n.updated_at), today)}
                />
              </FormDialog>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
