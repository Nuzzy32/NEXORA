import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import type { projectStats } from "@/features/projects/stats";
import type { TrackingStats } from "@/features/projects/tracking";
import { ProgressBar } from "./progress-bar";

type Stats = ReturnType<typeof projectStats>;

/** Six real totals. Milestones and risks cover running projects only; with none recorded they read an honest 0. */
export function ProjectStats({ stats, decisions, tracking: t }: { stats: Stats; decisions: number; tracking: TrackingStats }) {
  const cards: { label: string; icon: IconName; value: number; hint: string; bar?: number; tone?: string }[] = [
    {
      label: "Proyek aktif",
      icon: "projects",
      value: stats.active,
      hint: `dari ${stats.projects} proyek`,
      bar: stats.projects === 0 ? 0 : Math.round((stats.active / stats.projects) * 100),
    },
    {
      label: "Task terbuka",
      icon: "list",
      value: stats.open,
      hint: `dari ${stats.total} task`,
      bar: stats.total === 0 ? 0 : 100 - stats.donePct,
    },
    { label: "Task selesai", icon: "check", value: stats.done, hint: `${stats.donePct}% dari semua task`, bar: stats.donePct },
    { label: "Keputusan tercatat", icon: "flag", value: decisions, hint: "catatan jenis keputusan" },
    {
      label: "Milestone",
      icon: "flag",
      value: t.milestonesDone,
      hint: t.milestonesTotal === 0 ? "belum ada milestone" : `selesai dari ${t.milestonesTotal}`,
      bar: t.milestonesTotal === 0 ? undefined : Math.round((t.milestonesDone / t.milestonesTotal) * 100),
    },
    {
      label: "Risiko terbuka",
      icon: "warning",
      value: t.risksOpen,
      hint: t.risksTotal === 0 ? "belum ada risiko" : t.risksOpen === 0 ? "semua teratasi" : `dari ${t.risksTotal} risiko`,
      tone: t.risksOpen > 0 ? "text-warn" : "",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="rise flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
          style={{ "--i": i + 1 } as CSSProperties}
        >
          <dt className="flex items-center justify-between gap-2 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">
            {c.label}
            <Icon name={c.icon} className="size-4 shrink-0 text-faint" />
          </dt>
          <dd className="flex flex-col gap-2">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className={`text-[1.75rem] leading-8 font-semibold tracking-[-0.03em] tabular-nums ${c.tone ?? ""}`}>{c.value}</span>
              <span className="font-mono text-[11px] text-muted">{c.hint}</span>
            </span>
            {c.bar !== undefined && <ProgressBar value={c.bar} className="h-1" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
