"use server";

import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { todayISO } from "@/lib/date";
import { refreshApp } from "@/lib/revalidate";
import { FLASHCARD_FIELDS, nextReview, parseFlashcardForm } from "./flashcards";

const idSchema = z.uuid();

/** New cards are due today. The composite FK (document_id, user_id) rejects a document that is not the caller's. */
export async function createFlashcard(documentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const docId = idSchema.safeParse(documentId);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const parsed = parseFlashcardForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, FLASHCARD_FIELDS);
  const { error } = await supabase.from("flashcards").insert({ ...parsed.data, document_id: docId.data, due_date: todayISO() });
  if (error) return failed("Kartu gagal disimpan. Coba lagi.", formData, FLASHCARD_FIELDS);
  refreshApp();
  return { status: "ok" };
}

/** Editing the text keeps the card's schedule. */
export async function updateFlashcard(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cardId = idSchema.safeParse(id);
  if (!cardId.success) return failed("Kartu tidak ditemukan.");
  const parsed = parseFlashcardForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, FLASHCARD_FIELDS);
  const { data, error } = await supabase.from("flashcards").update(parsed.data).eq("id", cardId.data).select("id");
  if (error) return failed("Kartu gagal disimpan. Coba lagi.", formData, FLASHCARD_FIELDS);
  if (data.length === 0) return failed("Kartu tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

export async function deleteFlashcard(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cardId = idSchema.safeParse(id);
  if (!cardId.success) return failed("Kartu tidak ditemukan.");
  const { error } = await supabase.from("flashcards").delete().eq("id", cardId.data);
  if (error) return failed("Kartu gagal dihapus. Coba lagi.");
  refreshApp();
  return { status: "ok" };
}

/** One answer in a review session. The new box and due date are computed here from the stored box, not sent by the client. */
export async function reviewFlashcard(id: string, remembered: boolean): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cardId = idSchema.safeParse(id);
  const answer = z.boolean().safeParse(remembered);
  if (!cardId.success || !answer.success) return failed("Kartu tidak ditemukan.");
  const { data: card, error } = await supabase
    .from("flashcards")
    .select("box,review_count")
    .eq("id", cardId.data)
    .maybeSingle<{ box: number; review_count: number }>();
  if (error) return failed("Kartu gagal dimuat. Coba lagi.");
  if (!card) return failed("Kartu tidak ditemukan.");
  const next = nextReview(card.box, answer.data, todayISO());
  const { error: saveError } = await supabase
    .from("flashcards")
    .update({ ...next, review_count: card.review_count + 1, last_reviewed_at: new Date().toISOString() })
    .eq("id", cardId.data);
  if (saveError) return failed("Jawaban gagal disimpan. Coba lagi.");
  // No refreshApp: the session keeps its own queue; the page reloads when the session ends.
  return { status: "ok" };
}
