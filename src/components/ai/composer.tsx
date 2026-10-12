"use client";

import { Icon } from "@/components/ui/icons";
import type { BundleItem } from "@/features/ai/context-bundle";
import { MAX_CONTEXT_ITEMS, MAX_USER_MESSAGE, NO_PROVIDER_HINT, NO_PROVIDER_TITLE } from "@/features/ai/schema";

export type ProviderOption = { id: string; label: string; isMock: boolean };

/** Message box + provider picker. Only providers that are available are offered; with none, the box is off. */
export function Composer({
  draft,
  onDraft,
  onSend,
  providers,
  providerId,
  onProvider,
  hasConversation,
  pending,
  error,
  contextItems,
  onPickContext,
  onDetach,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  providers: ProviderOption[];
  providerId: string;
  onProvider: (id: string) => void;
  hasConversation: boolean;
  pending: boolean;
  error: string | null;
  /** Memory and projects the owner attached; they ride along with the next message. */
  contextItems: BundleItem[];
  onPickContext: () => void;
  onDetach: (item: BundleItem) => void;
}) {
  const noProvider = providers.length === 0;
  const off = noProvider || !hasConversation;
  const canSend = !off && !pending && draft.trim() !== "";

  return (
    <div className="shrink-0 border-t border-line bg-bg p-3 md:p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        {noProvider && hasConversation && (
          <p role="note" className="flex items-start gap-2 rounded-md border border-line-strong bg-surface px-3 py-2 text-[13px] text-muted">
            <Icon name="warning" className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>
              <span className="font-medium text-fg">{NO_PROVIDER_TITLE}.</span> {NO_PROVIDER_HINT}
            </span>
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) onSend();
          }}
          className="rounded-lg border border-line-strong bg-surface transition-colors focus-within:border-accent"
        >
          {contextItems.length > 0 && (
            <ul aria-label="Konteks terlampir" className="flex gap-1.5 overflow-x-auto px-2 pt-2">
              {contextItems.map((item) => (
                <li
                  key={`${item.kind}:${item.id}`}
                  className="inline-flex max-w-56 shrink-0 items-center gap-1 rounded-sm border border-line bg-bg pl-2 font-mono text-[11px] text-muted"
                >
                  <Icon name={item.kind === "memory" ? "memory" : "projects"} className="size-3 shrink-0 text-accent" />
                  <span className="truncate" title={item.truncated ? `${item.title} (dipotong)` : item.title}>
                    {item.title}
                  </span>
                  {item.truncated && <span className="shrink-0 text-warn">dipotong</span>}
                  <button
                    type="button"
                    aria-label={`Lepas ${item.title} dari konteks`}
                    disabled={pending}
                    onClick={() => onDetach(item)}
                    className="grid size-7 shrink-0 place-items-center rounded-sm hover:text-fg disabled:opacity-50 pointer-coarse:size-11"
                  >
                    <Icon name="close" className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="ai-message" className="sr-only">
            Pesan
          </label>
          <textarea
            id="ai-message"
            rows={2}
            value={draft}
            maxLength={MAX_USER_MESSAGE}
            disabled={off}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder={
              noProvider ? "Belum ada provider yang tersedia" : hasConversation ? "Tulis pesan…" : "Pilih atau buat percakapan dulu"
            }
            className="field-sizing-content max-h-48 min-h-14 w-full resize-none bg-transparent px-3 pt-3 text-[14px] leading-[22px] text-fg placeholder:text-faint focus-visible:shadow-none! focus-visible:outline-hidden! disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="ai-provider" className="sr-only">
                Provider
              </label>
              <select
                id="ai-provider"
                value={providerId}
                disabled={noProvider || pending}
                onChange={(e) => onProvider(e.target.value)}
                className="min-h-9 max-w-full rounded-md border border-line bg-bg px-2 font-mono text-[11px] text-fg disabled:opacity-50 pointer-coarse:min-h-11"
              >
                {noProvider ? (
                  <option value="">Tidak ada provider</option>
                ) : (
                  providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={onPickContext}
                disabled={off || pending}
                aria-haspopup="dialog"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-bg px-2 font-mono text-[11px] text-fg hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11"
              >
                <Icon name="memory" className="size-3.5 text-accent" />
                Konteks ({contextItems.length})
                <span className="sr-only">dari maksimal {MAX_CONTEXT_ITEMS}</span>
              </button>
              {draft.length > MAX_USER_MESSAGE * 0.8 && (
                <span className="font-mono text-[11px] text-faint">
                  {draft.length.toLocaleString("id-ID")}/{MAX_USER_MESSAGE.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="kbd max-md:hidden" aria-hidden>
                ⌘ ↵
              </span>
              <button
                type="submit"
                disabled={!canSend}
                aria-label={pending ? "Mengirim" : "Kirim pesan"}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11"
              >
                <Icon name="send" className="size-4" />
                {pending ? "Mengirim…" : "Kirim"}
              </button>
            </div>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
