"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/button";
import type { ConversationGroup } from "@/features/ai/group";
import { NewConversationButton } from "./new-conversation-button";

/** History column: new-conversation button, title filter, and conversations grouped by last activity. */
export function ConversationList({
  groups,
  activeId,
  canCreate,
}: {
  groups: ConversationGroup[];
  activeId: string | null;
  canCreate: boolean;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: g.items.filter((c) => c.title.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length > 0);
  const empty = groups.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <NewConversationButton disabled={!canCreate} />
      {!empty && (
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            aria-label="Cari percakapan"
            placeholder="Cari judul…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={inputClass + " pl-8 text-[13px]"}
          />
        </div>
      )}
      <nav aria-label="Riwayat percakapan" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {empty && <p className="px-1 text-[13px] text-muted">Belum ada percakapan.</p>}
        {!empty && shown.length === 0 && <p className="px-1 text-[13px] text-muted">Tidak ada judul yang cocok.</p>}
        {shown.map((g) => (
          <section key={g.label}>
            <h3 className="px-2 pb-1 font-mono text-[10px] font-semibold tracking-[0.04em] text-faint uppercase">{g.label}</h3>
            <ul className="space-y-0.5">
              {g.items.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/ai?c=${c.id}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        "flex min-h-9 items-center gap-2 rounded-md px-2 text-[13px] transition-colors pointer-coarse:min-h-11 " +
                        (active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg")
                      }
                    >
                      <span aria-hidden className={"size-1.5 shrink-0 rounded-full " + (active ? "bg-accent" : "bg-transparent")} />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
      <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
        Riwayat ini disimpan di Nexora, bukan riwayat native ChatGPT atau Claude.
      </p>
    </div>
  );
}
