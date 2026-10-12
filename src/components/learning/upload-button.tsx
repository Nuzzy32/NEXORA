"use client";

import { createClient } from "@supabase/supabase-js";
import { useRef, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { finishUpload, startUpload } from "@/features/learning/actions";
import { DOCUMENTS_BUCKET, MAX_PDF_BYTES, uploadInputSchema } from "@/features/learning/schema";
import { supabaseEnv } from "@/lib/db/env";

/**
 * Picks a PDF and sends it straight to Supabase Storage with a one-time signed token from the server, then asks the
 * server to confirm it. The token is the only credential used here; the session stays in its cookie.
 */
export function UploadButton({ className = "" }: { className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const { notify } = useToast();

  function upload(file: File) {
    const checked = uploadInputSchema.safeParse({ fileName: file.name, size: file.size });
    if (!checked.success) return notify(checked.error.issues[0].message, { tone: "error" });
    if (file.type && file.type !== "application/pdf") return notify("Hanya berkas PDF", { tone: "error" });
    start(async () => {
      try {
        const ticket = await startUpload(file.name, file.size);
        if (ticket.status === "error") return notify(ticket.message, { tone: "error" });
        const { url, key } = supabaseEnv();
        const storage = createClient(url, key, { auth: { persistSession: false } }).storage;
        const sent = await storage
          .from(DOCUMENTS_BUCKET)
          .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: "application/pdf" });
        if (sent.error) return notify("Upload gagal. Hapus dokumen yang tertunda lalu coba lagi.", { tone: "error" });
        const done = await finishUpload(ticket.id);
        notify(done.message ?? (done.status === "ok" ? "PDF diunggah." : "Upload gagal."), {
          tone: done.status === "error" ? "error" : "default",
        });
      } catch {
        notify("Upload gagal. Periksa koneksi lalu coba lagi.", { tone: "error" });
      }
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className={buttonClass("primary", `gap-2 ${className}`)}
        title={`PDF, maksimal ${MAX_PDF_BYTES / 1024 / 1024} MB`}
      >
        <Icon name="plus" className="size-4" />
        {pending ? "Mengunggah…" : "Unggah PDF"}
      </button>
    </>
  );
}
