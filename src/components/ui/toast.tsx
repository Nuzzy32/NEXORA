"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastAction = { label: string; run: () => void | Promise<void> };
type ToastOptions = { tone?: "default" | "error"; action?: ToastAction };
type ToastState = { id: number; message: string; tone: "default" | "error"; action?: ToastAction };
type ToastApi = { notify: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastApi>({ notify: () => {} });

/** `notify("Task selesai", { action: { label: "Urungkan", run } })`. One toast at a time; a new one replaces the old. */
export const useToast = () => useContext(ToastContext);

// Errors stay longest, then undo offers, then plain confirmations.
const DURATION = { error: 10_000, action: 8_000, plain: 4_000 } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);

  const hideAfter = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const notify = useCallback<ToastApi["notify"]>(
    (message, options) => {
      const tone = options?.tone ?? "default";
      setToast({ id: ++nextId.current, message, tone, action: options?.action });
      hideAfter(tone === "error" ? DURATION.error : options?.action ? DURATION.action : DURATION.plain);
    },
    [hideAfter],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext value={api}>
      {children}
      {/* Always mounted so screen readers pick up the text change; sits above the mobile tab bar. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center md:inset-x-auto md:right-0 md:bottom-6 md:left-[220px]"
      >
        {toast && (
          <div
            key={toast.id}
            // Hover or focus pauses the countdown, so the Undo button never vanishes under the pointer.
            onMouseEnter={() => window.clearTimeout(timer.current)}
            onMouseLeave={() => hideAfter(3_000)}
            onFocus={() => window.clearTimeout(timer.current)}
            onBlur={() => hideAfter(3_000)}
            className={
              "toast-in pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border bg-overlay py-1.5 pr-1.5 pl-3.5 text-[13px] shadow-[0_16px_40px_-12px_rgb(0_0_0/0.7)] " +
              (toast.tone === "error" ? "border-danger/50" : "border-line-strong")
            }
          >
            <span className={toast.tone === "error" ? "text-danger" : "text-fg"}>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="inline-flex min-h-9 shrink-0 items-center rounded-md px-3 font-mono text-[11px] font-semibold tracking-[0.02em] text-accent uppercase hover:bg-raised"
                onClick={async () => {
                  const { run } = toast.action!;
                  setToast(null);
                  try {
                    await run();
                  } catch {
                    notify("Gagal membatalkan. Coba lagi.", { tone: "error" });
                  }
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Tutup"
              className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
              onClick={() => setToast(null)}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </ToastContext>
  );
}
