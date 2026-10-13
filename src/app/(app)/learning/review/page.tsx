import type { Metadata } from "next";
import { io } from "next/cache";
import { Suspense } from "react";
import { ReviewSession } from "@/components/learning/review-session";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { listDocuments, listFlashcards } from "@/features/learning/queries";
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

/** Due cards (today or earlier), oldest due first; `?d=` limits the session to one document, `?c=` to one course's documents. */
async function ReviewContent({ searchParams }: { searchParams: PageProps<"/learning/review">["searchParams"] }) {
  const { d, c } = await searchParams;
  const doc = z.uuid().safeParse(Array.isArray(d) ? d[0] : d);
  const course = z.uuid().safeParse(Array.isArray(c) ? c[0] : c);
  await io();
  const today = todayISO();
  const inCourse = course.success ? new Set((await listDocuments(course.data)).map((x) => x.id)) : null;
  const cards = (await listFlashcards(doc.success ? doc.data : undefined))
    .filter((x) => x.due_date <= today && (!inCourse || inCourse.has(x.document_id)))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const back = doc.success ? `/learning/${doc.data}` : course.success ? `/courses/${course.data}` : "/learning";
  return <ReviewSession cards={cards} backHref={back} />;
}
