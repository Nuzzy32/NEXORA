"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { retryMessage, sendMessage, setConversationContext } from "@/features/ai/actions";
import type { BundleItem, ContextBundle } from "@/features/ai/context-bundle";
import type { ConversationGroup } from "@/features/ai/group";
import { NO_PROVIDER_HINT, NO_PROVIDER_TITLE, type ContextCandidates, type ContextRef } from "@/features/ai/schema";
import { Composer, type ProviderOption } from "./composer";
import { ContextPicker } from "./context-picker";
import { ConversationActions } from "./conversation-actions";
import { ConversationList } from "./conversation-list";
import { Inspector } from "./inspector";
import { NewConversationButton } from "./new-conversation-button";
import { Sheet } from "./sheet";
import { Thread, type ViewMessage } from "./thread";

export type ActiveConversation = { id: string; title: string; messages: ViewMessage[] };

const headerButton =
  "inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-raised hover:text-fg pointer-coarse:min-h-11";

/**
 * Three columns on desktop (history, thread, context inspector); on narrow screens the history and the
 * inspector open as drawers. The page remounts this with a new `key` per conversation, so drafts never leak across.
 */
export function Workspace({
  groups,
  total,
  active,
  missing,
  providers,
  context,
  candidates,
}: {
  groups: ConversationGroup[];
  total: number;
  active: ActiveConversation | null;
  /** The URL names a conversation that does not exist (deleted, or not the user's). */
  missing: boolean;
  providers: ProviderOption[];
  /** The conversation's attached memory and projects, built from the same code the send action runs. */
  context: ContextBundle;
  /** What the picker offers; null when it could not be loaded. */
  candidates: ContextCandidates | null;
}) {
  const { notify } = useToast();
  const [draft, setDraft] = useState("");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sending, startSend] = useTransition();
  const [retryId, setRetryId] = useState<string | null>(null);
  const [, startRetry] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detaching, startDetach] = useTransition();

  // The user's message appears at once; it is replaced by the saved one when the server answers.
  const [messages, addPending] = useOptimistic<ViewMessage[], string>(active?.messages ?? [], (current, content) => [
    ...current,
    {
      id: "pending",
      role: "user",
      content,
      status: "complete",
      provider_id: null,
      model: null,
      error: null,
      created_at: "",
      context: context.items.length
        ? { items: context.items.map(({ kind, title }) => ({ kind, title })), chars: context.chars }
        : null,
      input_tokens: null,
      output_tokens: null,
      time: "",
      providerLabel: null,
      usage: null,
    },
  ]);

  const provider = providers.find((p) => p.id === providerId);
  const busy = sending || retryId !== null;
  const attached: ContextRef[] = context.items.map(({ kind, id }) => ({ kind, id }));

  /** Stores the chosen items for this conversation. Resolves to an error message, or null when applied. */
  async function applyContext(items: ContextRef[]): Promise<string | null> {
    if (!active) return "Pilih percakapan dulu.";
    try {
      const result = await setConversationContext(active.id, items);
      return result.status === "error" ? (result.message ?? "Konteks gagal diterapkan.") : null;
    } catch {
      return "Konteks gagal diterapkan. Periksa koneksi lalu coba lagi.";
    }
  }

  async function applyFromPicker(items: ContextRef[]) {
    const message = await applyContext(items);
    if (message === null) {
      setPickerOpen(false);
      notify(items.length === 0 ? "Konteks dikosongkan" : `Konteks diterapkan: ${items.length} item`);
    }
    return message;
  }

  function detach(item: BundleItem) {
    if (busy || detaching) return;
    const rest = attached.filter((r) => !(r.kind === item.kind && r.id === item.id));
    startDetach(async () => {
      const message = await applyContext(rest);
      if (message) return notify(message, { tone: "error" });
      notify(`Dilepas dari konteks: ${item.title}`, {
        action: {
          label: "Urungkan",
          run: async () => {
            const undo = await applyContext(attached);
            if (undo) notify(undo, { tone: "error" });
          },
        },
      });
    });
  }

  function send() {
    const text = draft.trim();
    if (!active || !provider || busy || !text) return;
    setError(null);
    setDraft("");
    startSend(async () => {
      addPending(text);
      try {
        const result = await sendMessage(active.id, provider.id, text);
        if (result.status === "error") {
          setDraft(text);
          setError(result.message ?? "Pesan gagal dikirim.");
        }
      } catch {
        setDraft(text);
        setError("Pesan gagal dikirim. Periksa koneksi lalu coba lagi.");
      }
    });
  }

  function retry(id: string) {
    if (!provider || busy) return;
    startRetry(async () => {
      setRetryId(id);
      try {
        const result = await retryMessage(id, provider.id);
        if (result.status === "error") notify(result.message ?? "Gagal mencoba lagi.", { tone: "error" });
      } catch {
        notify("Gagal mencoba lagi. Periksa koneksi.", { tone: "error" });
      } finally {
        setRetryId(null);
      }
    });
  }

  const list = <ConversationList groups={groups} activeId={active?.id ?? null} canCreate={providers.length > 0} />;
  const inspector = (
    <Inspector
      messages={messages}
      draft={draft}
      provider={provider}
      hasConversation={active !== null}
      context={context}
      onPickContext={() => setPickerOpen(true)}
      onDetach={detach}
      busy={busy || detaching}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 overflow-hidden rounded-lg border border-line bg-surface md:h-[calc(100dvh-4rem)]">
      <aside aria-label="Percakapan" className="hidden w-56 shrink-0 flex-col border-r border-line md:flex">
        {list}
      </aside>

      <section aria-label="Utas pesan" className="flex min-w-0 flex-1 flex-col bg-bg">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 md:px-4">
          <button type="button" onClick={() => setListOpen(true)} aria-label="Buka daftar percakapan" className={headerButton + " md:hidden"}>
            <Icon name="menu" className="size-4" />
          </button>
          <h2 className="min-w-0 flex-1 truncate px-1 text-[15px] font-semibold tracking-[-0.01em]">
            {active ? active.title : "AI Workspace"}
          </h2>
          {active && <ConversationActions id={active.id} title={active.title} />}
          <button type="button" onClick={() => setInspectorOpen(true)} className={headerButton + " xl:hidden"}>
            <Icon name="list" className="size-4" />
            <span className="max-sm:sr-only">Inspektur</span>
          </button>
        </header>

        {active ? (
          <Thread messages={messages} waiting={sending} retryingId={retryId} canRetry={provider !== undefined} onRetry={retry} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            {missing ? (
              <EmptyState icon="warning" title="Percakapan tidak ditemukan" hint="Mungkin sudah dihapus.">
                <Link href="/ai" className={buttonClass("ghost")}>
                  Kembali ke AI Workspace
                </Link>
              </EmptyState>
            ) : providers.length === 0 ? (
              <EmptyState icon="ai" title={NO_PROVIDER_TITLE} hint={NO_PROVIDER_HINT} />
            ) : (
              <EmptyState
                icon="ai"
                title={total === 0 ? "Belum ada percakapan" : "Pilih percakapan"}
                hint={total === 0 ? "Mulai percakapan baru untuk menulis ke provider AI." : "Buka salah satu dari daftar, atau mulai yang baru."}
              >
                <NewConversationButton className="w-48" />
              </EmptyState>
            )}
          </div>
        )}

        <Composer
          draft={draft}
          onDraft={setDraft}
          onSend={send}
          providers={providers}
          providerId={providerId}
          onProvider={setProviderId}
          hasConversation={active !== null}
          pending={busy || detaching}
          error={error}
          contextItems={context.items}
          onPickContext={() => setPickerOpen(true)}
          onDetach={detach}
        />
      </section>

      <aside aria-label="Inspektur konteks" className="hidden w-64 shrink-0 flex-col border-l border-line xl:flex">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Inspektur konteks</h2>
          <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold text-faint">PRATINJAU</span>
        </div>
        {inspector}
      </aside>

      <ContextPicker
        open={pickerOpen && active !== null}
        onClose={() => setPickerOpen(false)}
        candidates={candidates}
        selected={attached}
        onApply={applyFromPicker}
      />
      <Sheet open={listOpen} onClose={() => setListOpen(false)} side="left" title="Percakapan">
        {list}
      </Sheet>
      <Sheet open={inspectorOpen} onClose={() => setInspectorOpen(false)} side="right" title="Inspektur konteks">
        {inspector}
      </Sheet>
    </div>
  );
}
