"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { disableChat, enableChat } from "@/features/ai/actions";
import { disableBrief, enableBrief } from "@/features/brief/actions";

const KINDS = {
  brief: { on: enableBrief, off: disableBrief, name: "Brief harian", enableLabel: "Aktifkan brief harian" },
  chat: { on: enableChat, off: disableChat, name: "Chat Claude", enableLabel: "Aktifkan chat Claude" },
};

/** Opt-in for a paid Anthropic path (brief uses the same actions as the dashboard card). Enabling only flips consent; nothing is sent yet. */
export function ConsentToggle({ kind, enabled }: { kind: keyof typeof KINDS; enabled: boolean }) {
  const [pending, start] = useTransition();
  const { notify } = useToast();
  const k = KINDS[kind];
  const fallback = `${k.name} gagal ${enabled ? "dimatikan" : "diaktifkan"}. Coba lagi.`;

  return (
    <Button
      variant={enabled ? "ghost" : "primary"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const r = await (enabled ? k.off() : k.on());
            if (r.status === "error") notify(r.message ?? fallback, { tone: "error" });
            else if (r.message) notify(r.message);
          } catch {
            notify(fallback, { tone: "error" });
          }
        })
      }
    >
      {pending ? "Memproses…" : enabled ? "Matikan" : k.enableLabel}
    </Button>
  );
}
