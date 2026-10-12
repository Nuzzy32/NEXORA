import type { CSSProperties } from "react";
import Link from "next/link";
import { FormDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { MEMORY_CATEGORY_LABEL, type MemoryItem } from "@/features/memory/schema";
import type { ProjectOption } from "@/features/tasks/schema";
import { projectColor } from "@/lib/color";
import { formatDate, localDate } from "@/lib/date";
import { CopyContextButton, DeleteMemoryBody, PinButton } from "./memory-actions";
import { MemoryDialogBody } from "./memory-dialog-body";
import { iconButtonClass } from "./styles";

export function MemoryCard({
  item,
  projects,
  today,
  index,
}: {
  item: MemoryItem;
  projects: ProjectOption[];
  today: string;
  index: number;
}) {
  const project = item.project_id ? projects.find((p) => p.id === item.project_id) : undefined;
  const updatedLabel = formatDate(localDate(item.updated_at), today);

  return (
    <li className="rise" style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      <article className="relative overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong">
        {/* Pinned items carry the accent edge, the same mark as high-priority tasks. */}
        {item.pinned && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
        <FormDialog
          title="Memory"
          triggerLabel={`Buka memory: ${item.title}`}
          triggerClassName="block w-full min-w-0 p-4 text-left hover:bg-raised/50 md:p-5"
          trigger={
            <>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded-md bg-raised px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-fg uppercase">
                  {MEMORY_CATEGORY_LABEL[item.category]}
                </span>
                {item.tags.map((t) => (
                  <span key={t} className="font-mono text-[11px] text-faint">#{t}</span>
                ))}
              </span>
              <span className="mt-3 block text-[15px] leading-snug font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">
                {item.title}
              </span>
              <span className="mt-2 line-clamp-3 block rounded-md bg-bg/70 p-3 font-mono text-[13px] leading-relaxed text-muted [overflow-wrap:anywhere]">
                {item.content}
              </span>
            </>
          }
        >
          <MemoryDialogBody item={item} projects={projects} updatedLabel={updatedLabel} />
        </FormDialog>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-bg/40 px-4 py-1.5 md:px-5">
          <p className="flex min-w-0 flex-wrap items-center gap-x-3 font-mono text-[11px] text-faint">
            {project && (
              <Link
                href={`/projects/${project.id}`}
                className="inline-flex min-h-8 min-w-0 items-center gap-1.5 text-muted hover:text-fg pointer-coarse:min-h-11"
              >
                <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: projectColor(project.id) }} />
                <span className="truncate">{project.name}</span>
              </Link>
            )}
            <span>Diperbarui {updatedLabel}</span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <CopyContextButton item={item} />
            <PinButton id={item.id} pinned={item.pinned} />
            <FormDialog
              title="Edit memory"
              triggerLabel={`Edit memory: ${item.title}`}
              triggerClassName={iconButtonClass + " text-muted hover:bg-overlay hover:text-fg"}
              trigger={<Icon name="edit" className="size-4" />}
            >
              <MemoryDialogBody item={item} projects={projects} updatedLabel={updatedLabel} startEditing />
            </FormDialog>
            <FormDialog
              title="Hapus memory"
              triggerLabel={`Hapus memory: ${item.title}`}
              triggerClassName={iconButtonClass + " text-muted hover:bg-danger/10 hover:text-danger"}
              trigger={<Icon name="trash" className="size-4" />}
            >
              <DeleteMemoryBody id={item.id} title={item.title} />
            </FormDialog>
          </div>
        </div>
      </article>
    </li>
  );
}
