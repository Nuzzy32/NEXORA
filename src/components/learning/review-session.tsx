"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { reviewFlashcard } from "@/features/learning/flashcard-actions";
import type { Flashcard } from "@/features/learning/flashcards";

/**
 * One card at a time: question, reveal, then "Lupa" / "Ingat". Each answer is saved before the next card shows;
 * a failed save keeps the card so nothing is lost. Forgotten cards are due again tomorrow, not repeated in this session.
 */
export function ReviewSession({ cards, backHref }: { cards: Flashcard[]; backHref: string }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState({ remembered: 0, forgotten: 0 });
  const [pending, start] = useTransition();
  const { notify } = useToast();
  const router = useRouter();
  const card = cards[index];

  function answer(remembered: boolean) {
    if (!card || pending) return;
    start(async () => {
      try {
        const r = await reviewFlashcard(card.id, remembered);
        if (r.status === "error") return notify(r.message ?? "Jawaban gagal disimpan.", { tone: "error" });
        setScore((s) => (remembered ? { ...s, remembered: s.remembered + 1 } : { ...s, forgotten: s.forgotten + 1 }));
        setShown(false);
        setIndex((i) => i + 1);
        if (index + 1 === cards.length) router.refresh();
      } catch {
        notify("Jawaban gagal disimpan. Periksa koneksi lalu coba lagi.", { tone: "error" });
      }
    });
  }

  if (!card) {
    return (
      <EmptyState
        icon="check"
        title={cards.length === 0 ? "Tidak ada kartu jatuh tempo" : "Latihan selesai"}
        hint={
          cards.length === 0
            ? "Semua kartu sudah dilatih untuk hari ini, atau belum ada kartu."
            : `${score.remembered} diingat, ${score.forgotten} lupa. Kartu yang lupa muncul lagi besok.`
        }
      >
        <Link href={backHref} className={buttonClass("ghost")}>
          Kembali
        </Link>
      </EmptyState>
    );
  }

  return (
    <section aria-label="Latihan flashcard" className="mx-auto max-w-2xl">
      <p className="mb-2 font-mono text-[11px] text-muted">
        Kartu {index + 1} dari {cards.length} · kotak {card.box}
      </p>
      <div className="rounded-lg border border-line bg-surface p-5 md:p-6">
        <p className="font-mono text-[11px] tracking-[0.04em] text-faint uppercase">Pertanyaan</p>
        <p className="mt-2 text-[17px] leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">{card.front}</p>
        {shown && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="font-mono text-[11px] tracking-[0.04em] text-faint uppercase">Jawaban</p>
            <p className="mt-2 text-[15px] leading-6 whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">{card.back}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {shown ? (
          <>
            <Button variant="danger" disabled={pending} onClick={() => answer(false)}>
              Lupa
            </Button>
            <Button disabled={pending} onClick={() => answer(true)}>
              {pending ? "Menyimpan…" : "Ingat"}
            </Button>
          </>
        ) : (
          <Button autoFocus onClick={() => setShown(true)}>
            Tampilkan jawaban
          </Button>
        )}
      </div>
    </section>
  );
}
