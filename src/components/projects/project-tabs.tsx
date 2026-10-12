import Link from "next/link";
import type { ProjectTab } from "@/features/projects/schema";

/** Section switcher. Plain links keep the tab in the URL (deep link, back button). */
export function ProjectTabs({
  projectId,
  current,
  openTasks,
  notes,
}: {
  projectId: string;
  current: ProjectTab;
  openTasks: number;
  notes: number;
}) {
  const tabs: { key: ProjectTab; label: string; count?: number; href: string }[] = [
    { key: "overview", label: "Overview", href: `/projects/${projectId}?tab=overview` },
    { key: "tasks", label: "Tasks", count: openTasks, href: `/projects/${projectId}` },
    { key: "notes", label: "Keputusan & Catatan", count: notes, href: `/projects/${projectId}?tab=notes` },
  ];
  return (
    <nav
      aria-label="Bagian proyek"
      className="rise -mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ "--i": 1 } as React.CSSProperties}
    >
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap transition-colors duration-200 pointer-coarse:min-h-11 " +
              (active ? "bg-raised font-medium text-accent" : "text-muted hover:bg-surface hover:text-fg")
            }
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-overlay px-1.5 font-mono text-[11px] leading-4 text-muted">{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
