"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { CONTEXT_KIND_LABEL, type Message } from "@/features/ai/schema";
import { MessageContent } from "./message-content";

export type ViewMessage = Message & {
  /** "10:42" in the app timezone, formatted on the server (empty for a message not yet saved). */
  time: string;
  /** Readable name of the provider that answered. */
  providerLabel: string | null;
};

const meta = "flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted";

/** Messages of one conversation. `waiting` shows that an answer is being produced. */
export function Thread({
  messages,
  waiting,
  retryingId,
  canRetry,
  onRetry,
}: {
  messages: ViewMessage[];
  waiting: boolean;
  retryingId: string | null;
  canRetry: boolean;
  onRetry: (id: string) => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, waiting]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState icon="ai" title="Percakapan masih kosong" hint="Tulis pesan pertamamu di kotak bawah." />
      </div>
    );
  }

  return (
    <div role="log" aria-label="Pesan percakapan" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
        {messages.map((m) =>
          m.role === "user" ? (
            <article key={m.id} className="flex flex-col items-end gap-1.5">
              <p className={meta}>
                <span>Kamu</span>
                {m.time ? <><span aria-hidden>•</span><time>{m.time}</time></> : <span>mengirim…</span>}
              </p>
              <div className="max-w-[min(100%,42rem)] rounded-lg rounded-tr-none border border-line-strong bg-raised px-4 py-3 text-[14px] leading-[22px]">
                <MessageContent content={m.content} />
              </div>
              {m.context && (
                <details className="group max-w-[min(100%,42rem)]">
                  <summary className="ml-auto flex min-h-9 w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm border border-line px-2 font-mono text-[11px] text-muted hover:text-fg pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
                    <Icon name="memory" className="size-3 text-accent" />
                    Konteks: {m.context.items.length} item
                    <Icon name="chevronDown" className="size-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-1 space-y-0.5 rounded-md border border-line bg-surface px-3 py-2 text-[12px]">
                    {m.context.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 font-mono text-[11px] text-faint">{CONTEXT_KIND_LABEL[item.kind]}</span>
                        <span className="min-w-0 [overflow-wrap:anywhere] text-muted">{item.title}</span>
                      </li>
                    ))}
                    <li className="pt-1 font-mono text-[10px] text-faint">
                      Judul saat pesan dikirim · {m.context.chars.toLocaleString("id-ID")} karakter
                      {m.context.truncated ? " · sebagian dipotong" : ""}. Isinya dibaca dari Memory atau Proyek saat itu.
                    </li>
                  </ul>
                </details>
              )}
            </article>
          ) : (
            <article key={m.id} className="flex flex-col items-start gap-1.5">
              <p className={meta}>
                <span className="font-medium text-agent">{m.providerLabel ?? "Asisten"}</span>
                {m.model && <><span aria-hidden>•</span><span>{m.model}</span></>}
                <span aria-hidden>•</span>
                <time>{m.time}</time>
              </p>
              {m.status === "error" ? (
                <div role="alert" className="w-full max-w-[min(100%,42rem)] rounded-lg rounded-tl-none border border-danger/40 bg-danger/5 px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-danger">
                    <Icon name="warning" className="size-4 shrink-0" />
                    Balasan gagal
                  </p>
                  <p className="mt-1 text-[13px] text-muted">{m.error}</p>
                  <Button
                    variant="ghost"
                    className="mt-3"
                    disabled={!canRetry || retryingId !== null}
                    onClick={() => onRetry(m.id)}
                  >
                    {retryingId === m.id ? "Mencoba lagi…" : "Coba lagi"}
                  </Button>
                  {!canRetry && <p className="mt-2 text-xs text-faint">Tidak ada provider yang tersedia untuk mencoba lagi.</p>}
                </div>
              ) : (
                <div className="max-w-[min(100%,42rem)] rounded-lg rounded-tl-none border border-line bg-surface px-4 py-3 text-[14px] leading-[22px]">
                  <MessageContent content={m.content} />
                </div>
              )}
            </article>
          ),
        )}
        {waiting && (
          <div role="status" className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <span aria-hidden className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 rounded-full bg-agent motion-safe:animate-pulse" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
            Menunggu balasan…
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
