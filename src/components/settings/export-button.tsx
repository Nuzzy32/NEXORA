"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Fetches /settings/export so a failure shows a message here instead of navigating to a bare error page. */
export function ExportButton() {
  const [pending, setPending] = useState(false);
  const { notify } = useToast();

  async function download() {
    setPending(true);
    try {
      const res = await fetch("/settings/export", { cache: "no-store" });
      if (!res.ok) throw new Error("export");
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "nexora-export.json";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      notify("Data diunduh.");
    } catch {
      notify("Ekspor gagal. Coba lagi.", { tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" onClick={download} disabled={pending} aria-busy={pending}>
      {pending ? "Menyiapkan…" : "Unduh data (JSON)"}
    </Button>
  );
}
