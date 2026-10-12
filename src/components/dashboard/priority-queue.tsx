"use client";

import { useState } from "react";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-row";
import { Icon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ProjectOption, Task } from "@/features/tasks/schema";

type Scope = "all" | "today" | "overdue";

/**
 * Today's queue: what is late plus what is due today, with the same task rows as everywhere else.
 * The tabs only filter what is already on the page; "C" jumps to the quick-add box.
 */
export function PriorityQueue({
  overdue,
  dueToday,
  today,
  projects,
}: {
  overdue: Task[];
  dueToday: Task[];
  today: string;
  projects: ProjectOption[];
}) {
  const [scope, setScope] = useState<Scope>("all");
  const shown = scope === "overdue" ? overdue : scope === "today" ? dueToday : [...overdue, ...dueToday];
  const tabs: { id: Scope; label: string; count?: number; late?: boolean }[] = [
    { id: "all", label: "Semua" },
    { id: "today", label: "Hari ini" },
    { id: "overdue", label: "Terlambat", count: overdue.length, late: overdue.length > 0 },
  ];

  return (
    <section aria-labelledby="queue-title" className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="[&>div]:mb-0">
          <SectionHeading id="queue-title" title="Prioritas hari ini" count={overdue.length + dueToday.length} />
        </div>
        <div role="group" aria-label="Tampilkan" className="flex items-center gap-0.5 rounded-md bg-raised p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={scope === t.id}
              onClick={() => setScope(t.id)}
              className={
                "inline-flex min-h-7 items-center gap-1 rounded-sm px-2.5 font-mono text-[11px] font-medium transition-colors pointer-coarse:min-h-11 " +
                (scope === t.id ? "bg-overlay text-accent" : t.late ? "text-danger hover:bg-overlay" : "text-muted hover:text-fg")
              }
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && <span>({t.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="border-t border-line">
          <TaskList bare tasks={shown} today={today} projects={projects} showDate={false} />
        </div>
      ) : (
        <p className="flex items-center gap-2 border-t border-line px-4 py-6 text-[13px] text-muted">
          <Icon name="check" className="size-4 text-ok" />
          {scope === "overdue" ? "Tidak ada task terlambat." : "Tidak ada task untuk hari ini."}
        </p>
      )}

      <div className="border-t border-line bg-bg/40 p-3">
        <QuickAddTask due="today" placeholder="Tambah task untuk hari ini…" shortcut="c" />
      </div>
    </section>
  );
}
