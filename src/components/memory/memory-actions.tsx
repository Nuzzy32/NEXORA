"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useCloseOnSuccess, useDialogClose } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { deleteMemory, setMemoryPinned } from "@/features/memory/actions";
import { memoryAsContext, type MemoryItem } from "@/features/memory/schema";
import { IDLE } from "@/lib/action-state";
import { iconButtonClass } from "./styles";

/** Copies the item as plain text to the clipboard. Browser only: nothing is sent to a server or to an AI. */
export function CopyContextButton({ item }: { item: MemoryItem }) {
  const { notify } = useToast();
  return (
    <button
      type="button"
      title="Salin sebagai konteks"
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs text-fg transition-colors hover:bg-overlay max-sm:size-8 max-sm:justify-center max-sm:px-0 pointer-coarse:min-h-11 max-sm:pointer-coarse:size-11"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(memoryAsContext(item));
          notify("Disalin ke clipboard");
        } catch {
          notify("Gagal menyalin. Izinkan akses clipboard di browser.", { tone: "error" });
        }
      }}
    >
      <Icon name="copy" className="size-4" />
      <span className="max-sm:sr-only">Salin sebagai konteks</span>
    </button>
  );
}

/** Pin / unpin: flips at once, snaps back if the server refuses, and the toast can undo it. */
export function PinButton({ id, pinned }: { id: string; pinned: boolean }) {
  const [value, setValue] = useOptimistic<boolean, boolean>(pinned, (_, next) => next);
  const [, start] = useTransition();
  const { notify } = useToast();

  return (
    <button
      type="button"
      aria-pressed={value}
      aria-label="Sematkan"
      title={value ? "Lepas sematan" : "Sematkan"}
      className={iconButtonClass + (value ? " text-accent hover:bg-overlay" : " text-muted hover:bg-overlay hover:text-fg")}
      onClick={() =>
        start(async () => {
          const next = !value;
          setValue(next);
          try {
            await setMemoryPinned(id, next);
            notify(next ? "Disematkan" : "Sematan dilepas", {
              action: { label: "Urungkan", run: () => setMemoryPinned(id, !next) },
            });
          } catch {
            notify("Gagal mengubah sematan.", { tone: "error" });
          }
        })
      }
    >
      <Icon name="pin" className="size-4" />
    </button>
  );
}

/** Body of the delete dialog: permanent deletion stays behind an explicit confirm (D-014). */
export function DeleteMemoryBody({ id, title }: { id: string; title: string }) {
  const [state, formAction, pending] = useActionState(deleteMemory.bind(null, id), IDLE);
  useCloseOnSuccess(state, "Memory dihapus");
  const close = useDialogClose();
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm [overflow-wrap:anywhere]">
        Hapus “{title}” secara permanen? Ini tidak bisa dibatalkan.
      </p>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Menghapus…" : "Ya, hapus"}
        </Button>
      </div>
    </form>
  );
}
