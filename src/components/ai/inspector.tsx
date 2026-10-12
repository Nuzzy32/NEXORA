import { Icon } from "@/components/ui/icons";
import { estimateTokens, MAX_CONTEXT_MESSAGES, selectContext } from "@/features/ai/context";
import { MAX_BUNDLE_CHARS, MAX_MEMORY_CHARS, type BundleItem, type ContextBundle } from "@/features/ai/context-bundle";
import { CONTEXT_KIND_LABEL, MAX_CONTEXT_ITEMS, type Message } from "@/features/ai/schema";
import type { ProviderOption } from "./composer";

const label = "font-mono text-[10px] font-semibold tracking-[0.04em] text-faint uppercase";

const chars = (n: number) => `${n.toLocaleString("id-ID")} karakter`;

/**
 * What the next request would carry, computed from the same selectContext() the server action uses, with the same
 * context bundle the action reads. Only facts: counts, a character-based estimate, the chosen provider, and the exact
 * context text. Nothing here is a model or price claim.
 */
export function Inspector({
  messages,
  draft,
  provider,
  hasConversation,
  context,
  onPickContext,
  onDetach,
  busy,
}: {
  messages: Pick<Message, "role" | "content" | "status">[];
  draft: string;
  provider: ProviderOption | undefined;
  hasConversation: boolean;
  context: ContextBundle;
  onPickContext: () => void;
  onDetach: (item: BundleItem) => void;
  /** A message is being sent or retried: the attached items are fixed until it is done. */
  busy: boolean;
}) {
  const sent = hasConversation ? selectContext(messages, draft, context.text) : [];
  const turns = sent.filter((m) => m.role !== "system").length;
  const tokens = sent.reduce((n, m) => n + estimateTokens(m.content), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <p className="text-[13px] text-muted">
        Isi permintaan berikutnya ke provider: percakapan ini, ditambah memory dan proyek yang kamu lampirkan. Tidak ada yang
        ikut otomatis.
      </p>

      {!hasConversation ? (
        <p className="text-[13px] text-faint">Pilih percakapan untuk melihat konteksnya.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-line bg-bg p-3">
              <dt className={label}>Pesan</dt>
              <dd className="mt-1 font-mono text-xl text-fg">{turns}</dd>
              <dd className="font-mono text-[10px] text-faint">maks {MAX_CONTEXT_MESSAGES} terbaru</dd>
            </div>
            <div className="rounded-md border border-line bg-bg p-3">
              <dt className={label}>Token</dt>
              <dd className="mt-1 font-mono text-xl text-fg">~{tokens.toLocaleString("id-ID")}</dd>
              <dd className="font-mono text-[10px] text-faint">perkiraan · karakter ÷ 4</dd>
            </div>
          </dl>

          <section aria-labelledby="inspector-context">
            <div className="flex items-center justify-between">
              <h3 id="inspector-context" className={label}>
                Konteks terlampir ({context.items.length}/{MAX_CONTEXT_ITEMS})
              </h3>
              <button
                type="button"
                onClick={onPickContext}
                disabled={busy}
                className="inline-flex min-h-9 items-center px-1 font-mono text-[11px] text-accent hover:underline disabled:opacity-50 pointer-coarse:min-h-11"
              >
                {context.items.length === 0 ? "Pilih" : "Ubah"}
              </button>
            </div>
            {context.items.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted">
                Tidak ada memory atau proyek terlampir. Memory yang disematkan pun tidak ikut kecuali kamu memilihnya.
              </p>
            ) : (
              <>
                <ul className="mt-1.5 space-y-1.5">
                  {context.items.map((item) => (
                    <li key={`${item.kind}:${item.id}`} className="flex items-start gap-2 rounded-md border border-line bg-bg py-2 pr-1 pl-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-fg">{item.title}</p>
                        <p className="font-mono text-[10px] text-faint">
                          {CONTEXT_KIND_LABEL[item.kind]} · {chars(item.chars)}
                          {item.truncated && <span className="text-warn"> · dipotong</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Lepas ${item.title} dari konteks`}
                        disabled={busy}
                        onClick={() => onDetach(item)}
                        className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg disabled:opacity-50 pointer-coarse:size-11"
                      >
                        <Icon name="close" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                {context.truncated && (
                  <p role="note" className="mt-2 flex items-start gap-2 text-[12px] text-warn">
                    <Icon name="warning" className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Sebagian dipotong agar muat (memory maks {MAX_MEMORY_CHARS.toLocaleString("id-ID")} karakter per item, seluruh
                      konteks maks {MAX_BUNDLE_CHARS.toLocaleString("id-ID")}). Bagian yang hilang ditandai di teks.
                    </span>
                  </p>
                )}
                <details className="group mt-2 rounded-md border border-line bg-bg">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-3 font-mono text-[11px] text-muted hover:text-fg pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
                    <span>Teks konteks yang dikirim · {chars(context.chars)}</span>
                    <Icon name="chevronDown" className="size-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <pre
                    tabIndex={0}
                    aria-label="Teks pesan konteks"
                    className="max-h-80 overflow-auto border-t border-line px-3 py-2 font-mono text-[11px] leading-[18px] whitespace-pre-wrap text-muted [overflow-wrap:anywhere]"
                  >
                    {context.text}
                  </pre>
                </details>
              </>
            )}
          </section>

          <section>
            <h3 className={label}>Provider</h3>
            {provider ? (
              <div className="mt-1.5 rounded-md border border-line bg-bg p-3 text-[13px]">
                <p className="font-mono text-[12px] text-fg">{provider.label}</p>
                {provider.isMock && (
                  <p className="mt-1 text-muted">Tiruan untuk pengembangan. Berjalan di server Nexora dan tidak memanggil layanan luar.</p>
                )}
                {provider.price && (
                  <p className="mt-1 text-muted">
                    Anthropic API, berbayar dari akun API-mu: <span className="font-mono text-[12px] text-fg">{provider.price}</span>.
                    Biaya nyata tiap balasan tampil di bawahnya.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-[13px] text-muted">Tidak ada provider terpilih.</p>
            )}
          </section>

          <section className="min-h-0">
            <h3 className={label}>Pesan yang akan dikirim</h3>
            {sent.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted">Belum ada. Pesan yang kamu tulis akan muncul di sini.</p>
            ) : (
              <ol className="mt-1.5 space-y-1.5">
                {sent.map((m, i) => (
                  <li key={i} className="rounded-md border border-line bg-bg px-3 py-2">
                    <p className="flex justify-between font-mono text-[10px] text-faint">
                      <span>{m.role === "user" ? "kamu" : m.role === "assistant" ? "asisten" : "sistem · konteks"}</span>
                      <span>~{estimateTokens(m.content)}</span>
                    </p>
                    <p className="line-clamp-2 text-[12px] [overflow-wrap:anywhere] text-muted">{m.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
