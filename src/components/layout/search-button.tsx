"use client";

import { Icon } from "@/components/ui/icons";

const openPalette = () => window.dispatchEvent(new Event("nexora:open-palette"));

/** Opens the command palette (<CommandPalette /> listens for this event). Wide field on desktop, icon on phones. */
export function SearchButton({ variant }: { variant: "field" | "icon" }) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label="Cari"
        aria-haspopup="dialog"
        onClick={openPalette}
        className="grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg"
      >
        <Icon name="search" />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Cari"
      aria-keyshortcuts="Meta+K Control+K"
      aria-haspopup="dialog"
      onClick={openPalette}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-[13px] text-faint transition-colors hover:border-line-strong hover:text-fg"
    >
      <Icon name="search" className="size-4" />
      <span className="flex-1 text-left">Cari…</span>
      <kbd className="kbd">⌘K</kbd>
    </button>
  );
}
