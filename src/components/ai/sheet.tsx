"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/** Side drawer for narrow screens: a native modal <dialog> (focus trap, Esc), content mounted only while open. */
export function Sheet({
  open,
  onClose,
  side,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={
        "m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none overflow-y-auto border-y-0 border-line-strong bg-surface p-0 text-fg " +
        (side === "left" ? "mr-auto border-r" : "ml-auto border-l")
      }
    >
      {open && (
        <div className="flex min-h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
            <button
              type="button"
              aria-label="Tutup"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg pointer-coarse:size-11"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      )}
    </dialog>
  );
}
