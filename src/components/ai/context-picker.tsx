"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button, inputClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { MEMORY_CATEGORY_LABEL } from "@/features/memory/schema";
import { PROJECT_STATUS_LABEL } from "@/features/projects/schema";
import { MAX_CONTEXT_ITEMS, type ContextCandidates, type ContextKind, type ContextRef } from "@/features/ai/schema";

const keyOf = (kind: ContextKind, id: string) => `${kind}:${id}`;
const refOf = (key: string): ContextRef => {
  const [kind, id] = key.split(":") as [ContextKind, string];
  return { kind, id };
};

/**
 * Where the owner picks which memory items and projects ride along with the next messages (MEM-07, AI-09).
 * A native modal <dialog>: bottom sheet on phones, centred on wider screens. Nothing is applied until "Terapkan",
 * and applying only stores the choice; the Inspector shows the exact text before anything is sent.
 */
export function ContextPicker({
  open,
  onClose,
  candidates,
  selected,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  /** Null when the lists could not be loaded. */
  candidates: ContextCandidates | null;
  /** Currently attached items, as "kind:id" keys. */
  selected: readonly ContextRef[];
  /** Resolves to an error message, or null when applied. */
  onApply: (items: ContextRef[]) => Promise<string | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[min(40rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden open:flex rounded-lg border border-line-strong bg-overlay p-0 text-fg shadow-[0_24px_64px_-16px_rgb(0_0_0/0.7)] max-md:m-0 max-md:mt-auto max-md:max-h-[88dvh] max-md:w-full max-md:max-w-none max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0"
    >
      {open && <PickerBody titleId={titleId} onClose={onClose} candidates={candidates} selected={selected} onApply={onApply} />}
    </dialog>
  );
}

function PickerBody({
  titleId,
  onClose,
  candidates,
  selected,
  onApply,
}: {
  titleId: string;
  onClose: () => void;
  candidates: ContextCandidates | null;
  selected: readonly ContextRef[];
  onApply: (items: ContextRef[]) => Promise<string | null>;
}) {
  const initial = selected.map((r) => keyOf(r.kind, r.id));
  const [tab, setTab] = useState<ContextKind>("memory");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needle = q.trim().toLowerCase();
  const full = picked.size >= MAX_CONTEXT_ITEMS;
  const changed = picked.size !== initial.length || initial.some((k) => !picked.has(k));
  const count = (kind: ContextKind) => [...picked].filter((k) => k.startsWith(`${kind}:`)).length;

  function toggle(key: string) {
    setError(null);
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(key) && next.size < MAX_CONTEXT_ITEMS) next.add(key);
      return next;
    });
  }

  async function apply() {
    setPending(true);
    setError(null);
    const message = await onApply([...picked].map(refOf));
    setPending(false);
    if (message) setError(message);
  }

  const rows =
    candidates === null
      ? []
      : tab === "memory"
        ? candidates.memory
            .filter((m) => m.title.toLowerCase().includes(needle))
            .map((m) => ({
              key: keyOf("memory", m.id),
              title: m.title,
              meta: MEMORY_CATEGORY_LABEL[m.category],
              pinned: m.pinned,
            }))
        : candidates.projects
            .filter((p) => p.name.toLowerCase().includes(needle))
            .map((p) => ({ key: keyOf("project", p.id), title: p.name, meta: PROJECT_STATUS_LABEL[p.status], pinned: false }));
  const total = candidates === null ? 0 : tab === "memory" ? candidates.memory.length : candidates.projects.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 id={titleId} className="text-[17px] leading-6 font-semibold tracking-[-0.02em]">
            Konteks percakapan
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Item yang kamu centang ikut terkirim bersama pesan berikutnya ke provider yang dipilih. Tidak ada yang dilampirkan
            otomatis, termasuk memory yang disematkan. Tinjau teksnya di Inspektur konteks.
          </p>
        </div>
        <button
          type="button"
          aria-label="Tutup"
          onClick={onClose}
          className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg pointer-coarse:size-11"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Jenis konteks" className="mt-4 flex gap-1 border-b border-line px-5">
        {(["memory", "project"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            id={`${titleId}-${kind}`}
            aria-selected={tab === kind}
            aria-controls={`${titleId}-panel`}
            onClick={() => setTab(kind)}
            className={
              "-mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-2 text-[13px] pointer-coarse:min-h-11 " +
              (tab === kind ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")
            }
          >
            {kind === "memory" ? "Memory" : "Proyek"}
            <span className="font-mono text-[11px] text-faint">
              {candidates === null ? "–" : `${count(kind)}/${kind === "memory" ? candidates.memory.length : candidates.projects.length}`}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-${tab}`} className="flex min-h-0 flex-1 flex-col gap-3 p-5">
        {candidates === null ? (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[13px] text-danger">
            Daftar memory dan proyek gagal dimuat. Muat ulang halaman lalu coba lagi.
          </p>
        ) : total === 0 ? (
          <EmptyState
            icon={tab === "memory" ? "memory" : "projects"}
            title={tab === "memory" ? "Belum ada memory" : "Belum ada proyek"}
            hint={
              tab === "memory"
                ? "Tulis catatan di Memory, lalu pilih di sini untuk dijadikan konteks."
                : "Buat proyek dulu, lalu pilih di sini untuk dijadikan konteks."
            }
          >
            <Link href={tab === "memory" ? "/memory" : "/projects"} className="inline-flex min-h-9 items-center rounded-md border border-line-strong px-4 text-sm hover:bg-raised pointer-coarse:min-h-11">
              {tab === "memory" ? "Buka Memory" : "Buka Proyek"}
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                aria-label={tab === "memory" ? "Cari judul memory" : "Cari nama proyek"}
                placeholder="Cari judul…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={inputClass + " pl-8 text-[13px]"}
              />
            </div>
            {rows.length === 0 ? (
              <p className="px-1 py-4 text-center text-[13px] text-muted">Tidak ada judul yang cocok.</p>
            ) : (
              <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                {rows.map((r) => {
                  const checked = picked.has(r.key);
                  const blocked = !checked && full;
                  return (
                    <li key={r.key}>
                      <label
                        className={
                          "flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 " +
                          (blocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-raised")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={blocked}
                          onChange={() => toggle(r.key)}
                          className="size-4 shrink-0 accent-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{r.title}</span>
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
                            {r.pinned && <Icon name="pin" className="size-3 text-accent" />}
                            {r.pinned && <span className="sr-only">Disematkan,</span>}
                            {r.meta}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="border-t border-line px-5 py-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <p role="status" className={"mb-2 font-mono text-[11px] " + (full ? "text-warn" : "text-muted")}>
          {picked.size}/{MAX_CONTEXT_ITEMS} dipilih
          {full && ` · batas ${MAX_CONTEXT_ITEMS} item tercapai, lepas satu untuk memilih yang lain`}
        </p>
        {error && (
          <p role="alert" className="mb-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="border-transparent text-muted" disabled={picked.size === 0 || pending} onClick={() => setPicked(new Set())}>
            Kosongkan
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Batal
            </Button>
            <Button onClick={apply} disabled={pending || !changed || candidates === null}>
              {pending ? "Menerapkan…" : "Terapkan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
