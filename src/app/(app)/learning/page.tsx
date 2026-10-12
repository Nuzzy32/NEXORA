import type { Metadata } from "next";
import { io } from "next/cache";
import { Suspense } from "react";
import { DocumentCard } from "@/components/learning/document-card";
import { UploadButton } from "@/components/learning/upload-button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { usageLabel } from "@/features/ai/providers/anthropic";
import { listDocuments } from "@/features/learning/queries";
import { MAX_PDF_BYTES } from "@/features/learning/schema";
import { MAX_SUMMARY_INPUT_TOKENS } from "@/features/learning/summarize";
import { getOwnerSettings } from "@/features/settings/queries";
import { formatDate, localDate, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Learning" };

export default function LearningPage() {
  return (
    <>
      <PageHeader
        title="Learning"
        eyebrow="Materi kuliah"
        description={`Simpan PDF materi (maksimal ${MAX_PDF_BYTES / 1024 / 1024} MB) dan buat ringkasan belajar yang kamu tinjau sebelum disimpan.`}
        actions={
          <Suspense fallback={<ActionSkeleton />}>
            <UploadButton />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="mt-6"><ListSkeleton rows={3} /></div>}>
        <LearningContent />
      </Suspense>
    </>
  );
}

async function LearningContent() {
  await io(); // "today" for the date labels
  const [docs, settings] = await Promise.all([listDocuments(), getOwnerSettings()]);
  const today = todayISO();
  const blocked = !process.env.ANTHROPIC_API_KEY?.trim()
    ? "Ringkasan belum tersedia: ANTHROPIC_API_KEY belum diisi di server."
    : !settings?.chatEnabled
      ? "Ringkasan memakai Anthropic API berbayar. Aktifkan chat Claude di Settings dulu."
      : null;

  return (
    <div className="mt-6 space-y-4">
      <p className="rise text-[13px] text-muted" style={{ "--i": 1 } as React.CSSProperties}>
        PDF tersimpan di Supabase Storage privat milikmu. Isinya hanya dikirim ke Anthropic saat kamu menekan “Buat ringkasan”, dan
        hanya untuk PDF hingga {MAX_SUMMARY_INPUT_TOKENS.toLocaleString("id-ID")} token (perkiraan 30–50 halaman, tergantung isi).
      </p>
      {docs.length === 0 ? (
        <EmptyState icon="book" title="Belum ada materi" hint="Unggah PDF materi kuliah untuk disimpan dan diringkas.">
          <UploadButton />
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {docs.map((d, i) => (
            <DocumentCard
              // Remount when a draft appears or goes, so the editor starts from the current text.
              key={`${d.id}:${d.summary_draft ? "draft" : "none"}`}
              index={i}
              summarizeBlocked={blocked}
              doc={{
                ...d,
                addedLabel: formatDate(localDate(d.created_at), today),
                usage: usageLabel(d.summary_model, d.summary_input_tokens, d.summary_output_tokens),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
