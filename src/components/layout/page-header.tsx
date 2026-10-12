import type { ReactNode } from "react";

/** Same title + primary-action row on every screen. Geist headline with a mono eyebrow. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: ReactNode;
  /** Small mono line above the title (a date, a section). */
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="rise flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 font-mono text-[11px] tracking-[0.04em] text-faint uppercase">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-[-0.025em] md:text-[2.5rem] md:leading-[3rem] md:tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
