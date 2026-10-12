import { z } from "zod";
import { DOCUMENTS_BUCKET, storagePath } from "@/features/learning/schema";
import { requireUser } from "@/lib/auth/session";

/** Opens the owner's PDF through a 60-second signed URL. The bucket is private; RLS limits signing to the owner's folder. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await requireUser(); // outside any try: its redirect to /login must not be swallowed
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new Response("Dokumen tidak ditemukan.", { status: 404 });
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(storagePath(user.id, id.data), 60);
  if (error) return new Response("Dokumen tidak ditemukan.", { status: 404 });
  return Response.redirect(data.signedUrl, 303);
}
