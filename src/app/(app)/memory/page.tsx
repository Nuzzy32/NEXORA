import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MemoryCard } from "@/components/memory/memory-card";
import { MemoryFilterBar } from "@/components/memory/memory-filters";
import { NewMemoryAction, NewMemoryButton } from "@/components/memory/new-memory-button";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { ActionSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { listMemory, memoryCategoryCounts } from "@/features/memory/queries";
import { memoryHref, parseMemoryFilters } from "@/features/memory/schema";
import { listProjectOptions } from "@/features/tasks/queries";
import { todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Memory" };

export default function MemoryPage({ searchParams }: PageProps<"/memory">) {
  return (
    <>
      <PageHeader
        title="Memory"
        eyebrow="Konteks pribadi"
        description="Aturan, preferensi, dan keputusan yang kamu tulis sendiri agar mudah dipakai lagi."
        actions={
          <Suspense fallback={<ActionSkeleton />}>
            <NewMemoryAction />
          </Suspense>
        }
      />
      <OwnershipNote />
      <Suspense fallback={<div className="mt-6"><ListSkeleton rows={3} /></div>}>
        <MemoryContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Only states what is true today: nothing is sent to an AI, and Nexora memory is separate from the providers' own. */
function OwnershipNote() {
  return (
    <aside className="rise mt-6 flex items-start gap-3 rounded-lg border border-line bg-surface p-4" style={{ "--i": 1 } as React.CSSProperties}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-raised text-muted">
        <Icon name="shield" className="size-4" />
      </span>
      <p className="min-w-0 text-sm text-muted">
        Memory tersimpan di database Supabase milikmu dan hanya akunmu yang bisa membacanya (RLS). Ini memory Nexora, terpisah dari
        memory bawaan ChatGPT atau Claude dan tidak disinkronkan dengan keduanya. Belum ada yang dikirim ke AI: menyematkan hanya
        menandai item untuk dipakai sebagai konteks chat nanti, dan memory tidak pernah dibuat otomatis dari percakapan.
      </p>
    </aside>
  );
}

async function MemoryContent({ searchParams }: { searchParams: PageProps<"/memory">["searchParams"] }) {
  const filters = parseMemoryFilters(await searchParams);
  const [items, counts, projects] = await Promise.all([listMemory(filters), memoryCategoryCounts(), listProjectOptions()]);
  const today = todayISO();
  const filtered = filters.q !== "" || filters.category !== "all";
  const clear = memoryHref({ q: "", category: "all", sort: filters.sort });

  return (
    <div className="mt-6 space-y-4">
      {counts.total > 0 && <MemoryFilterBar filters={filters} total={counts.total} byCategory={counts.byCategory} />}
      {items.length > 0 && filtered && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>
            <span className="font-mono text-fg">{items.length}</span> hasil{filters.q ? ` untuk “${filters.q}”` : ""}
          </span>
          <Link href={clear} className="inline-flex min-h-8 items-center text-fg underline underline-offset-2 hover:text-accent pointer-coarse:min-h-11">
            Hapus filter
          </Link>
        </p>
      )}
      {items.length === 0 ? (
        counts.total === 0 ? (
          <EmptyState
            icon="memory"
            title="Belum ada memory"
            hint="Simpan aturan, preferensi, atau keputusan yang ingin kamu ingat. Hanya kamu yang menulis dan mengubahnya."
          >
            <NewMemoryButton projects={projects} />
          </EmptyState>
        ) : (
          <EmptyState icon="search" title="Tidak ada memory yang cocok" hint="Coba kata kunci lain atau ubah kategori.">
            <Link href={clear} className={buttonClass("ghost")}>Hapus filter</Link>
          </EmptyState>
        )
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <MemoryCard key={item.id} item={item} projects={projects} today={today} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
