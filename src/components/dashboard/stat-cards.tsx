import type { CSSProperties } from "react";
import Link from "next/link";

export type Stat = {
  label: string;
  value: number;
  unit: string;
  /** Small pill on the right (e.g. "2 terlambat"). */
  chip?: { text: string; late?: boolean };
  /** Bar fill and the sentence under it; the bar is decoration, the sentence carries the numbers. */
  progress: { done: number; total: number; caption: string };
  href: string;
};

/** The day in a few real numbers: label, figure, one pill, a hairline bar with a caption. */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <section aria-label="Ringkasan" className="grid gap-3 sm:grid-cols-3">
      {stats.map((s, i) => {
        const pct = s.progress.total === 0 ? 0 : Math.min(100, Math.round((s.progress.done / s.progress.total) * 100));
        return (
          <Link
            key={s.label}
            href={s.href}
            className="rise flex flex-col justify-between rounded-lg border border-line bg-surface p-4 transition-colors hover:bg-raised"
            style={{ "--i": i + 1 } as CSSProperties}
          >
            <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">{s.label}</span>
            <span className="mt-3 flex items-baseline justify-between gap-2">
              <span className="flex items-baseline gap-2">
                <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">{s.value}</span>
                <span className="font-mono text-[11px] text-muted">{s.unit}</span>
              </span>
              {s.chip && (
                <span
                  className={
                    "rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold " +
                    (s.chip.late ? "bg-danger/15 text-danger" : "bg-raised text-muted")
                  }
                >
                  {s.chip.text}
                </span>
              )}
            </span>
            <span aria-hidden className="mt-3 block h-1 overflow-hidden rounded-full bg-line-strong">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </span>
            <span className="mt-1.5 font-mono text-[11px] text-muted">{s.progress.caption}</span>
          </Link>
        );
      })}
    </section>
  );
}
