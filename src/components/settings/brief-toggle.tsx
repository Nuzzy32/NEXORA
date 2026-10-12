"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { disableBrief, enableBrief } from "@/features/brief/actions";

/** Uses the same consent actions as the dashboard card. Enabling only flips the opt-in; nothing is sent yet. */
export function BriefToggle({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const { notify } = useToast();
  const fallback = enabled ? "Brief harian gagal dimatikan. Coba lagi." : "Brief harian gagal diaktifkan. Coba lagi.";

  return (
    <Button
      variant={enabled ? "ghost" : "primary"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const r = await (enabled ? disableBrief() : enableBrief());
            if (r.status === "error") notify(r.message ?? fallback, { tone: "error" });
            else if (r.message) notify(r.message);
          } catch {
            notify(fallback, { tone: "error" });
          }
        })
      }
    >
      {pending ? "Memproses…" : enabled ? "Matikan" : "Aktifkan brief harian"}
    </Button>
  );
}
