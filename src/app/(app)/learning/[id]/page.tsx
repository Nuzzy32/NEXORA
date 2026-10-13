import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlashcardForm } from "@/components/learning/flashcard-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { ListSkeleton } from "@/components/ui/skeleton";
import { cardStats, MAX_BOX } from "@/features/learning/flashcards";
import { getDocument, listFlashcards } from "@/features/learning/queries";
import { formatDate, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Flashcard" };

type Props = PageProps<"/learning/[id]">;

export default function DocumentPage({ params }: Props) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <DocumentContent params={params} />
    </Suspense>
  );
}

async function DocumentContent({ params }: Pick<Props, "params">) {
  const { id } = await params;
  await io(); // "today" decides which cards are due
  const doc = await getDocument(id);
  if (!doc) notFound();
  const cards = await listFlashcards(doc.id);
  const today = todayISO();
  const stats = cardStats(cards, today);

  return (
    <>
      <Link href="/learning" className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-[13px] text-muted hover:text-fg pointer-coarse:min-h-11">
        <Icon name="arrowRight" className="size-4 rotate-180" /> Learning
      </Link>
      <PageHeader
        title={<span className="[overflow-wrap:anywhere]">{doc.title}</span>}
        eyebrow="Flashcard"
        description="Kartu tanya-jawab yang kamu tulis sendiri. Diingat: kartu naik kotak dan muncul lebih jarang. Lupa: kembali ke kotak 1, muncul lagi besok."
        actions={
          <span className="flex flex-wrap gap-2">
            {stats.due > 0 && (
              <Link href={`/learning/review?d=${doc.id}`} className={buttonClass("primary")}>
                Latihan ({stats.due})
              </Link>
            )}
            <FormDialog title="Tambah kartu" triggerClassName={buttonClass(stats.due > 0 ? "ghost" : "primary", "gap-2")} trigger={<><Icon name="plus" className="size-4" /> Tambah kartu</>} draftKey={`flashcard:new:${doc.id}`}>
              <FlashcardForm documentId={doc.id} />
            </FormDialog>
          </span>
        }
      />
      <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
        {[
          ["Kartu", stats.total],
          ["Jatuh tempo", stats.due],
          [`Dikuasai (kotak ${MAX_BOX})`, stats.mastered],
        ].map(([label, n]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="font-mono text-[11px] text-muted">{label}</dt>
            <dd className="mt-1 font-mono text-xl text-fg">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        {cards.length === 0 ? (
          <EmptyState icon="book" title="Belum ada kartu" hint="Tulis pertanyaan dan jawaban dari materi ini untuk dilatih berkala." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {cards.map((c) => (
              <li key={c.id}>
                <FormDialog
                  title="Ubah kartu"
                  triggerLabel={`Ubah kartu: ${c.front}`}
                  triggerClassName="flex w-full flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-raised/50"
                  trigger={
                    <>
                      <span className="min-w-0 flex-1 basis-56 text-[14px] [overflow-wrap:anywhere]">{c.front}</span>
                      <span className="font-mono text-[11px] text-muted">
                        kotak {c.box} · {c.due_date <= today ? <span className="text-accent">jatuh tempo</span> : `berikutnya ${formatDate(c.due_date, today)}`}
                      </span>
                    </>
                  }
                >
                  <FlashcardForm documentId={doc.id} card={c} />
                </FormDialog>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
