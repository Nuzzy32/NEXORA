import type { TaskStatus } from "@/features/tasks/schema";

/**
 * 20px status marker: empty ring (todo), half-filled cyan ring (in progress), emerald check (done).
 * An overdue ring turns rose. The status name stays available as text elsewhere, never icon-only.
 */
export function StatusIcon({ status, late = false }: { status: TaskStatus; late?: boolean }) {
  if (status === "done") {
    return (
      <span className="grid size-[18px] place-items-center rounded-full bg-ok text-ok-ink">
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="size-[18px] transition-colors" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r="8.25"
        fill="none"
        stroke={late ? "var(--danger)" : status === "in_progress" ? "var(--accent)" : "var(--muted)"}
        strokeWidth="1.5"
        className="group-hover/check:stroke-[var(--ok)]"
      />
      {status === "in_progress" && <path d="M10 5.5a4.5 4.5 0 0 1 0 9Z" fill="var(--accent)" />}
    </svg>
  );
}
