"use client";

import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { syncElearning } from "@/features/elearning/actions";

const AUTO_SYNC_AFTER_MS = 6 * 60 * 60_000;

export function SyncButton() {
  const [pending, start] = useTransition();
  const { notify } = useToast();

  const run = () =>
    start(async () => {
      try {
        const r = await syncElearning();
        if (r.status === "ok") {
          notify(r.created + r.updated === 0 ? "E-learning sudah mutakhir" : `${r.created} task baru, ${r.updated} diperbarui`);
        } else if (r.status === "throttled") {
          notify("E-learning baru saja disinkronkan. Coba lagi sebentar lagi.");
        } else notify(r.message, { tone: "error" });
      } catch {
        notify("Sinkronisasi e-learning gagal. Coba lagi.", { tone: "error" });
      }
    });

  return (
    <Button variant="ghost" onClick={run} disabled={pending} aria-busy={pending}>
      {pending ? "Menyinkronkan…" : "Sinkronkan e-learning"}
    </Button>
  );
}

/**
 * Syncs once on mount when connected and the last sync is over six hours old. Silent on failure
 * (the tasks panel shows the last error); the ref keeps StrictMode's second effect run from syncing twice.
 */
export function AutoSyncRunner({ connected, lastSyncedAt }: { connected: boolean; lastSyncedAt: string | null }) {
  const started = useRef(false);
  const { notify } = useToast();

  useEffect(() => {
    if (!connected || started.current) return;
    if (lastSyncedAt && Date.now() - Date.parse(lastSyncedAt) < AUTO_SYNC_AFTER_MS) return;
    started.current = true;
    syncElearning()
      .then((r) => {
        if (r.status === "ok" && r.created > 0) notify(`${r.created} task baru dari e-learning`);
      })
      .catch(() => {});
  }, [connected, lastSyncedAt, notify]);

  return null;
}
