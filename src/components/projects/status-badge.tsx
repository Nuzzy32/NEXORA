import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/features/projects/schema";

const TONE: Record<ProjectStatus, string> = {
  active: "text-accent bg-accent/10",
  on_hold: "text-info bg-info/10",
  completed: "text-ok bg-ok/10",
  archived: "text-muted bg-raised",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 font-mono text-[11px] leading-4 tracking-[0.02em] uppercase ${TONE[status]}`}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
