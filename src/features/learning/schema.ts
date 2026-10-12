import { z } from "zod";

/** Same cap as the bucket's file_size_limit and the table CHECK (D-028). */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const DOCUMENTS_BUCKET = "documents";
export const MAX_SUMMARY = 20000;

export type DocumentStatus = "uploading" | "ready";
export type LearningDocument = {
  id: string;
  title: string;
  file_name: string;
  size_bytes: number;
  status: DocumentStatus;
  summary: string | null;
  summary_draft: string | null;
  summary_model: string | null;
  summary_input_tokens: number | null;
  summary_output_tokens: number | null;
  summarized_at: string | null;
  created_at: string;
};
export const DOCUMENT_COLUMNS =
  "id,title,file_name,size_bytes,status,summary,summary_draft,summary_model,summary_input_tokens,summary_output_tokens,summarized_at,created_at";

/** `<user_id>/<document_id>.pdf`: the storage policies only allow the caller's own first folder. */
export const storagePath = (userId: string, id: string) => `${userId}/${id}.pdf`;

export const uploadInputSchema = z.object({
  fileName: z
    .string("Nama berkas tidak valid")
    .trim()
    .min(1, "Nama berkas tidak valid")
    .max(255, "Nama berkas terlalu panjang")
    .refine((n) => n.toLowerCase().endsWith(".pdf"), "Hanya berkas PDF"),
  size: z
    .number("Ukuran berkas tidak valid")
    .int()
    .min(1, "Berkas kosong")
    .max(MAX_PDF_BYTES, `Ukuran maksimal ${MAX_PDF_BYTES / 1024 / 1024} MB`),
});

export const summaryTextSchema = z
  .string("Ringkasan wajib diisi")
  .trim()
  .min(1, "Ringkasan wajib diisi")
  .max(MAX_SUMMARY, `Ringkasan maksimal ${MAX_SUMMARY.toLocaleString("id-ID")} karakter`);

/** "Bab 3 - Basis Data" from "Bab_3-Basis Data.pdf". */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return (base || "Dokumen").slice(0, 200);
}

/** "1,2 MB" / "640 KB". */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(n / 1024)).toLocaleString("id-ID")} KB`;
}

/** Every PDF starts with this header; anything else is refused before it costs a request. */
export const isPdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
