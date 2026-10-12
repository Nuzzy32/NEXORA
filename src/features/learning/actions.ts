"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { failed, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import {
  DOCUMENTS_BUCKET,
  isPdf,
  MAX_PDF_BYTES,
  storagePath,
  summaryTextSchema,
  titleFromFileName,
  uploadInputSchema,
} from "./schema";
import { LearningError, summarizePdf } from "./summarize";

const idSchema = z.uuid();
type UploadTicket = { status: "ok"; id: string; path: string; token: string } | { status: "error"; message: string };

/**
 * Step 1 of an upload: records the document as "uploading" and returns a one-time signed URL token, so the browser sends
 * the file straight to Storage (Vercel caps a server action body at 4.5 MB). The bucket enforces 20 MB and PDF only.
 */
export async function startUpload(fileName: string, size: number): Promise<UploadTicket> {
  const { user, supabase } = await requireUser();
  const parsed = uploadInputSchema.safeParse({ fileName, size });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { data, error } = await supabase
    .from("documents")
    .insert({ title: titleFromFileName(parsed.data.fileName), file_name: parsed.data.fileName, size_bytes: parsed.data.size })
    .select("id")
    .single<{ id: string }>();
  if (error) return { status: "error", message: "Dokumen gagal dicatat. Coba lagi." };
  const path = storagePath(user.id, data.id);
  const signed = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (signed.error) {
    await supabase.from("documents").delete().eq("id", data.id);
    return { status: "error", message: "Upload gagal disiapkan. Coba lagi." };
  }
  refreshApp();
  return { status: "ok", id: data.id, path, token: signed.data.token };
}

/** Step 2: marks the document ready only once Storage holds a PDF of an allowed size at its path. */
export async function finishUpload(id: string): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const docId = idSchema.safeParse(id);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const info = await supabase.storage.from(DOCUMENTS_BUCKET).info(storagePath(user.id, docId.data));
  const size = info.data?.size ?? 0;
  if (info.error || size < 1 || size > MAX_PDF_BYTES || info.data?.contentType !== "application/pdf") {
    return failed("Berkas belum sampai di penyimpanan. Hapus dokumen ini lalu unggah lagi.");
  }
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "ready", size_bytes: size })
    .eq("id", docId.data)
    .select("id");
  if (error || data.length === 0) return failed("Dokumen gagal diperbarui. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "PDF diunggah." };
}

/** Removes the file first, then the row, so a failure never leaves a file without a row that can delete it. */
export async function deleteDocument(id: string): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const docId = idSchema.safeParse(id);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const removed = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath(user.id, docId.data)]);
  if (removed.error) return failed("Berkas gagal dihapus. Coba lagi.");
  const { data, error } = await supabase.from("documents").delete().eq("id", docId.data).select("id");
  if (error) return failed("Dokumen gagal dihapus. Coba lagi.");
  refreshApp();
  return data.length === 0 ? failed("Dokumen tidak ditemukan.") : { status: "ok" };
}

/** Paid path: requires the chat opt-in from Settings (D-027) and a key. Unreadable settings count as "off". */
async function claudeAllowed(supabase: SupabaseClient): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return "ANTHROPIC_API_KEY belum diisi di server.";
  const { data } = await supabase.from("owner_settings").select("chat_enabled").maybeSingle<{ chat_enabled: boolean }>();
  return data?.chat_enabled ? null : "Aktifkan chat Claude di Settings dulu. Ringkasan memakai Anthropic API berbayar.";
}

/**
 * Sends the whole PDF to Claude Haiku 5.5 once, on the owner's click, and stores the answer as a draft for review
 * (LEARN-03, LEARN-05). The saved summary is untouched until the owner saves the draft.
 */
export async function summarizeDocument(id: string): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const docId = idSchema.safeParse(id);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const denied = await claudeAllowed(supabase);
  if (denied) return failed(denied);

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", docId.data)
    .eq("status", "ready")
    .maybeSingle();
  if (error) return failed("Dokumen gagal dimuat. Coba lagi.");
  if (!doc) return failed("Dokumen belum siap. Selesaikan unggahan dulu.");

  const file = await supabase.storage.from(DOCUMENTS_BUCKET).download(storagePath(user.id, docId.data));
  if (file.error) return failed("Berkas gagal dibaca dari penyimpanan. Coba lagi.");
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  if (!isPdf(bytes)) return failed("Berkas ini bukan PDF yang valid.");

  try {
    const summary = await summarizePdf(new Anthropic({ timeout: 240_000 }), Buffer.from(bytes).toString("base64"));
    const { error: saveError } = await supabase
      .from("documents")
      .update({
        summary_draft: summary.text.slice(0, 20000),
        summary_model: summary.model.slice(0, 120),
        summary_input_tokens: summary.inputTokens,
        summary_output_tokens: summary.outputTokens,
      })
      .eq("id", docId.data);
    if (saveError) return failed("Ringkasan dibuat tetapi gagal disimpan. Coba lagi.");
  } catch (e) {
    if (e instanceof LearningError) return failed(e.message);
    console.error("learning: kegagalan tak terduga", e instanceof Error ? e.name : typeof e);
    return failed("Ringkasan gagal dibuat. Coba lagi.");
  }
  refreshApp();
  return { status: "ok", message: "Draf ringkasan siap ditinjau." };
}

/** Saves the reviewed (possibly edited) text as the summary and clears the draft. Also used to edit a saved summary. */
export async function saveSummary(id: string, text: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const docId = idSchema.safeParse(id);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const parsed = summaryTextSchema.safeParse(text);
  if (!parsed.success) return failed(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from("documents")
    .update({ summary: parsed.data, summary_draft: null, summarized_at: new Date().toISOString() })
    .eq("id", docId.data)
    .eq("status", "ready")
    .select("id");
  if (error || data.length === 0) return failed("Ringkasan gagal disimpan. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Ringkasan disimpan." };
}

export async function discardDraft(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const docId = idSchema.safeParse(id);
  if (!docId.success) return failed("Dokumen tidak ditemukan.");
  const { error } = await supabase.from("documents").update({ summary_draft: null }).eq("id", docId.data);
  if (error) return failed("Draf gagal dibuang. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Draf dibuang." };
}
