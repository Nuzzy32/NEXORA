import type { Metadata } from "next";
import { io } from "next/cache";
import { Suspense } from "react";
import { ReviewSession } from "@/components/learning/review-session";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { listFlashcards } from "@/features/learning/queries";
import { todayISO } from "@/lib/date";
import { z } from "zod";

export const metadata: Metadata = { title: "Latihan" };

export default function ReviewPage({ searchParams }: PageProps<"/learning/review">) {
  return (
    <>
      <PageHeader title="Latihan" eyebrow="Flashcard" />
      <div className="mt-6">
        <Suspense fallback={<ListSkeleton rows={2} />}>
          <ReviewContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

/** Due cards (today or earlier), oldest due first; `?d=` limits the session to one document. */
async function ReviewContent({ searchParams }: { searchParams: PageProps<"/learning/review">["searchParams"] }) {
  const { d } = await searchParams;
  const doc = z.uuid().safeParse(Array.isArray(d) ? d[0] : d);
  await io();
  const today = todayISO();
  const cards = (await listFlashcards(doc.success ? doc.data : undefined))
    .filter((c) => c.due_date <= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  return <ReviewSession cards={cards} backHref={doc.success ? `/learning/${doc.data}` : "/learning"} />;
}
