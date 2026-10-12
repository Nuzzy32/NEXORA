import "server-only";
import { requireUser } from "@/lib/auth/session";
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
