"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { disableBrief, enableBrief, generateTodayBrief } from "@/features/brief/actions";
import type { ActionState } from "@/lib/action-state";

/** Runs an action, toasts its outcome. A thrown error (network, server) becomes the same generic message. */
function useBriefAction() {
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<ActionState>, fallback: string) =>
    start(async () => {
      try {
        const r = await action();
        if (r.status === "error") notify(r.message ?? fallback, { tone: "error" });
        else if (r.message) notify(r.message);
      } catch {
        notify(fallback, { tone: "error" });
      }
    });
  return { pending, run };
}

/** The consent button: the only way the daily brief gets switched on. */
export function EnableBriefButton() {
  const { pending, run } = useBriefAction();
  return (
    <Button disabled={pending} onClick={() => run(enableBrief, "Brief harian gagal diaktifkan. Coba lagi.")}>
      {pending ? "Mengaktifkan…" : "Aktifkan brief harian"}
    </Button>
  );
}

/** Refresh (forced, capped per day) and turn off. */
export function BriefActions({ refreshesLeft }: { refreshesLeft: number }) {
  const { pending, run } = useBriefAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        disabled={pending || refreshesLeft <= 0}
        onClick={() => run(() => generateTodayBrief(true), "Brief gagal diperbarui. Coba lagi.")}
      >
        {pending ? "Memproses…" : "Perbarui"}
        <span className="ml-2 font-mono text-[11px] text-muted">sisa {refreshesLeft}</span>
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => run(disableBrief, "Brief harian gagal dimatikan. Coba lagi.")}>
        Matikan
      </Button>
    </div>
  );
}

/**
 * Generates today's brief once when the dashboard opens with the feature on and no brief yet.
 * A failure stops here with a retry button; it never loops by itself.
 */
export function AutoGenerate() {
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const go = useCallback(async () => {
    try {
      const r = await generateTodayBrief(false);
      if (r.status !== "error") {
        router.refresh(); // the card re-renders with the stored brief; keep showing "loading" until it does
        return;
      }
      setError(r.message ?? "Brief gagal dibuat. Coba lagi.");
    } catch {
      setError("Brief gagal dibuat. Coba lagi.");
    }
    setBusy(false);
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void go();
  }, [go]);

  if (busy) {
    return (
      <div role="status" aria-busy="true" className="space-y-2.5">
        <p className="text-[13px] text-muted">Menyusun brief hari ini…</p>
        <div className="h-3 w-4/5 motion-safe:animate-pulse rounded bg-raised" />
        <div className="h-3 w-3/5 motion-safe:animate-pulse rounded bg-raised" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="alert" className="min-w-0 text-[13px] break-words text-danger">
        {error}
      </p>
      <Button
        variant="ghost"
        onClick={() => {
          setError(null);
          setBusy(true);
          void go();
        }}
      >
        Coba lagi
      </Button>
    </div>
  );
}
