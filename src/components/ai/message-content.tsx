"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { parseBlocks } from "@/features/ai/blocks";

/** Prose with `inline code`, and fenced code blocks with a copy button. Plain text only: nothing is parsed as HTML. */
export function MessageContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 [overflow-wrap:anywhere]">
      {parseBlocks(content).map((b, i) =>
        b.kind === "code" ? (
          <CodeBlock key={i} lang={b.lang} code={b.code} />
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.text.split(/(`[^`\n]+`)/).map((part, j) =>
              part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
                <code key={j} className="rounded-sm bg-raised px-1 py-0.5 font-mono text-[0.9em] text-accent">
                  {part.slice(1, -1)}
                </code>
              ) : (
                <Fragment key={j}>{part}</Fragment>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-bg">
      <div className="flex h-9 items-center justify-between bg-raised px-3 font-mono text-[11px] text-muted">
        <span>{lang || "kode"}</span>
        <button
          type="button"
          onClick={onCopy}
          className="-mr-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 transition-colors hover:text-fg pointer-coarse:min-h-11"
        >
          <Icon name={copy === "done" ? "check" : "copy"} className="size-3.5" />
          <span aria-live="polite">{copy === "done" ? "Disalin" : copy === "failed" ? "Gagal menyalin" : "Salin"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-5 text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
