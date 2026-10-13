import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { FLASHCARD_COLUMNS, type Flashcard } from "./flashcards";
import { DOCUMENT_COLUMNS, type LearningDocument } from "./schema";

/** Newest first. RLS limits this to the caller's documents. */
export async function listDocuments(): Promise<LearningDocument[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200)
    .overrideTypes<LearningDocument[]>();
  if (error) throw new Error("Gagal memuat dokumen.");
  return data;
}

/** All cards of the caller's documents (RLS), for per-document progress. Personal scale: one query, capped. */
export async function listFlashcards(documentId?: string): Promise<Flashcard[]> {
  const { supabase } = await requireUser();
  let q = supabase.from("flashcards").select(FLASHCARD_COLUMNS);
  if (documentId) q = q.eq("document_id", documentId);
  const { data, error } = await q.order("created_at", { ascending: true }).limit(2000).overrideTypes<Flashcard[]>();
  if (error) throw new Error("Gagal memuat flashcard.");
  return data;
}

/** One document of the caller, or null for an unknown, malformed or foreign id. */
export async function getDocument(id: string): Promise<LearningDocument | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("documents").select(DOCUMENT_COLUMNS).eq("id", id).maybeSingle<LearningDocument>();
  if (error) throw new Error("Gagal memuat dokumen.");
  return data;
}
