import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import type { Note } from "@/features/projects/schema";
import { isOverdue } from "@/features/projects/tracking";
import { DueLabel, KindBadge } from "./note-kind-badge";

/** Short list of milestones or risks on the Overview tab; each row opens the matching filter of the notes tab. */
export function TrackingList({
  items,
  kind,
  projectId,
  today,
  emptyTitle,
  emptyHint,
}: {
  items: Note[];
  kind: "milestone" | "risk";
  projectId: string;
  today: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  if (items.length === 0) return <EmptyState icon={kind === "milestone" ? "flag" : "warning"} title={emptyTitle} hint={emptyHint} />;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {items.map((n) => (
        <li key={n.id}>
          <Link
            href={`/projects/${projectId}?tab=notes&kind=${kind}`}
            className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-raised"
          >
            <span className={"min-w-0 flex-1 basis-40 truncate text-sm font-medium " + (isOverdue(n, today) ? "text-fg" : "")}>{n.title}</span>
            <KindBadge kind={n.kind} />
            <DueLabel note={n} today={today} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
