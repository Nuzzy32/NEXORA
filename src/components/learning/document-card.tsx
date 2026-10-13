"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState, useTransition } from "react";
import { Button, buttonClass, inputClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { setDocumentCourse } from "@/features/courses/actions";
import { deleteDocument, discardDraft, saveSummary, summarizeDocument } from "@/features/learning/actions";
import type { CardStats } from "@/features/learning/flashcards";
import { formatBytes, MAX_SUMMARY, type LearningDocument } from "@/features/learning/schema";
import type { ActionState } from "@/lib/action-state";

export type DocumentView = LearningDocument & {
  /** "12 Okt" in the app timezone, built on the server. */
  addedLabel: string;
  /** Tokens and estimated cost of the last generated summary, built on the server. */
  usage: string | null;
  cards: CardStats;
};

const meta = "font-mono text-[11px] text-muted";

/**
 * One PDF: metadata and status (LEARN-02), and its summary (LEARN-03/05). A generated summary arrives as a draft the owner
 * reads and edits; only "Simpan ringkasan" makes it the summary.
 */
export function DocumentCard({
  doc,
  index,
  summarizeBlocked,
  courses,
}: {
  doc: DocumentView;
  index: number;
  /** Courses the document can be linked to (D-033); the picker is hidden when there are none. */
  courses: { id: string; name: string }[];
  /** Why summarizing is unavailable (no key, no opt-in); null when it is allowed. */
  summarizeBlocked: string | null;
}) {
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const draftText = doc.summary_draft ?? (editing ? (doc.summary ?? "") : null);
  const [text, setText] = useState(draftText ?? "");
  const ready = doc.status === "ready";

  function run(action: () => Promise<ActionState>, after?: () => void) {
    start(async () => {
      try {
        const r = await action();
        if (r.status === "error") return notify(r.message ?? "Gagal. Coba lagi.", { tone: "error" });
        after?.();
        if (r.message) notify(r.message);
      } catch {
        notify("Gagal. Periksa koneksi lalu coba lagi.", { tone: "error" });
      }
    });
  }

  return (
    <li className="rise" style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      <article className="rounded-lg border border-line bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-medium tracking-[-0.01em] [overflow-wrap:anywhere]">{doc.title}</h2>
            <p className={`mt-1 flex flex-wrap gap-x-2 ${meta}`}>
              <span className="[overflow-wrap:anywhere]">{doc.file_name}</span>
              <span aria-hidden>•</span>
              <span>{formatBytes(doc.size_bytes)}</span>
              <span aria-hidden>•</span>
              <span>Ditambahkan {doc.addedLabel}</span>
            </p>
            {courses.length > 0 && (
              <label className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
                Mata kuliah
                <select
                  value={doc.course_id ?? ""}
                  disabled={pending}
                  onChange={(e) => run(() => setDocumentCourse(doc.id, e.target.value || null))}
                  className="min-h-8 max-w-[14rem] rounded-md border border-line bg-surface px-2 font-sans text-[12px] text-fg pointer-coarse:min-h-11"
                >
                  <option value="">Tidak ada</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <span className="flex items-center gap-1.5">
            <span
              className={
                "rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase " +
                (!ready ? "border-warn/40 text-warn" : doc.summary_draft ? "border-agent/40 text-agent" : doc.summary ? "border-ok/40 text-ok" : "border-line text-faint")
              }
            >
              {!ready ? "Upload tertunda" : doc.summary_draft ? "Draf ringkasan" : doc.summary ? "Diringkas" : "Siap"}
            </span>
            {ready && (
              <a href={`/learning/file/${doc.id}`} target="_blank" rel="noopener" className={buttonClass("ghost", "min-h-8 px-2.5 text-xs")}>
                Buka PDF
              </a>
            )}
            <FormDialog
              title="Hapus dokumen"
              triggerLabel={`Hapus dokumen: ${doc.title}`}
              triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-overlay hover:text-danger pointer-coarse:size-11"
              trigger={<Icon name="trash" className="size-4" />}
            >
              <p className="mb-4 text-sm [overflow-wrap:anywhere]">
                “{doc.title}” beserta berkas PDF dan ringkasannya dihapus permanen dari penyimpanan.
              </p>
              <ConfirmDelete action={deleteDocument.bind(null, doc.id)} label="Hapus dokumen" message="Yakin?" doneMessage="Dokumen dihapus" />
            </FormDialog>
          </span>
        </div>

        {!ready ? (
          <p className="mt-3 text-[13px] text-muted">Berkas belum terkonfirmasi di penyimpanan. Hapus dokumen ini lalu unggah lagi.</p>
        ) : draftText !== null ? (
          <div className="mt-4 space-y-2">
            <label htmlFor={`summary-${doc.id}`} className={meta}>
              {doc.summary_draft ? "Tinjau draf dari Claude, ubah bila perlu, lalu simpan" : doc.summary ? "Ubah ringkasan" : "Tulis ringkasan"}
            </label>
            <textarea
              id={`summary-${doc.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_SUMMARY}
              rows={12}
              className={`${inputClass} font-[inherit] text-[14px] leading-[22px]`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={meta}>{doc.summary_draft && doc.usage}</span>
              <span className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => (doc.summary_draft ? run(() => discardDraft(doc.id), () => setEditing(false)) : setEditing(false))}
                >
                  {doc.summary_draft ? "Buang draf" : "Batal"}
                </Button>
                <Button disabled={pending || text.trim() === ""} onClick={() => run(() => saveSummary(doc.id, text), () => setEditing(false))}>
                  {pending ? "Menyimpan…" : "Simpan ringkasan"}
                </Button>
              </span>
            </div>
          </div>
        ) : doc.summary ? (
          <div className="mt-4">
            <p className="whitespace-pre-wrap text-[14px] leading-[22px] [overflow-wrap:anywhere]">{doc.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="ghost" disabled={pending} onClick={() => { setText(doc.summary ?? ""); setEditing(true); }}>
                <Icon name="edit" className="mr-1.5 size-4" /> Ubah
              </Button>
              {summarizeBlocked === null && (
                <SummarizeButton blocked={null} pending={pending} again onRun={() => run(() => summarizeDocument(doc.id))} />
              )}
              {doc.usage && <span className={meta}>Terakhir dibuat: {doc.usage}</span>}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {summarizeBlocked === null && (
              <SummarizeButton blocked={null} pending={pending} onRun={() => run(() => summarizeDocument(doc.id))} />
            )}
            <Button variant={summarizeBlocked === null ? "ghost" : "primary"} disabled={pending} onClick={() => { setText(""); setEditing(true); }}>
              Tulis ringkasan
            </Button>
            {summarizeBlocked === null && (
              <p className="min-w-0 flex-1 basis-60 text-[13px] text-muted">
                “Buat ringkasan” mengirim seluruh PDF sekali ke Claude Haiku 5.5 (Anthropic API, berbayar). Hasilnya jadi draf yang kamu tinjau dulu.
              </p>
            )}
          </div>
        )}
        {ready && (
          <Link
            href={`/learning/${doc.id}`}
            className="mt-4 flex min-h-9 flex-wrap items-center gap-x-2 border-t border-line pt-3 font-mono text-[12px] text-muted hover:text-fg pointer-coarse:min-h-11"
          >
            <Icon name="book" className="size-4 text-accent" />
            <span>Flashcard: {doc.cards.total} kartu</span>
            {doc.cards.due > 0 && <span className="text-accent">· {doc.cards.due} jatuh tempo</span>}
            {doc.cards.mastered > 0 && <span>· {doc.cards.mastered} dikuasai</span>}
            <Icon name="arrowRight" className="ml-auto size-4" />
          </Link>
        )}
        {pending && (
          <p role="status" className={`mt-3 ${meta}`}>
            Memproses… meringkas PDF bisa butuh hingga satu menit.
          </p>
        )}
      </article>
    </li>
  );
}

function SummarizeButton({ blocked, pending, again, onRun }: { blocked: string | null; pending: boolean; again?: boolean; onRun: () => void }) {
  return (
    <Button variant={again ? "ghost" : "primary"} disabled={pending || blocked !== null} title={blocked ?? undefined} onClick={onRun}>
      {again ? "Buat ulang" : "Buat ringkasan"}
    </Button>
  );
}
