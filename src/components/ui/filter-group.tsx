import Link from "next/link";

/** Row of filter chips. Each chip is a link, so the filter lives in the URL (shareable, back-button friendly). */
export function FilterGroup<T extends string>({
  label,
  hideLabel = false,
  options,
  current,
  build,
}: {
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** `count` shows a small mono number after the label. */
  options: readonly { value: T; label: string; count?: number }[];
  current: T;
  build: (value: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className={hideLabel ? "sr-only" : "mr-1 font-mono text-[11px] tracking-[0.04em] text-faint uppercase"}>
        {label}
      </span>
      {options.map((o) => {
        const on = o.value === current;
        return (
          <Link
            key={o.value}
            href={build(o.value)}
            aria-current={on ? "true" : undefined}
            className={
              "inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] font-medium tracking-[0.02em] transition-colors pointer-coarse:min-h-11 " +
              (on ? "bg-accent font-semibold text-accent-ink" : "bg-raised text-muted hover:text-fg")
            }
          >
            {o.label}
            {o.count !== undefined && <span className={on ? "opacity-75" : "text-faint"}>{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
