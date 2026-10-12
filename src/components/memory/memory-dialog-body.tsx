"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDialogClose } from "@/components/ui/dialog";
import { MEMORY_CATEGORY_LABEL, type MemoryItem } from "@/features/memory/schema";
import type { ProjectOption } from "@/features/tasks/schema";
import { MemoryForm } from "./memory-form";

/** Opens to read (full text, no accidental typing); "Edit" switches to the form in place. `startEditing` skips the read step. */
export function MemoryDialogBody({
  item,
  projects,
  updatedLabel,
  startEditing = false,
}: {
  item: MemoryItem;
  projects: ProjectOption[];
  updatedLabel: string;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const close = useDialogClose();

  if (editing) return <MemoryForm item={item} projects={projects} />;

  return (
    <article className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          <span className="rounded-md bg-raised px-1.5 py-0.5 tracking-wider text-fg uppercase">{MEMORY_CATEGORY_LABEL[item.category]}</span>
          <span>Diperbarui {updatedLabel}</span>
        </div>
        <h3 className="mt-3 text-xl leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{item.title}</h3>
        {item.tags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-2 font-mono text-[11px] text-faint">
            {item.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        )}
      </header>
      <div className="rounded-md border border-line bg-bg p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-fg/90 [overflow-wrap:anywhere]">
        {item.content}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          Tutup
        </Button>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </article>
  );
}
